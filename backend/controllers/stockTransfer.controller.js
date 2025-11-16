const StockTransfer = require('../models/StockTransfer.model');
const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction = require('../models/Transaction.model');
const Product = require('../models/Product.model');
const InventoryLocation = require('../models/Inventory_Locations.model');
const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');

// Generate unique transfer number
const generateTransferNumber = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `TRF-${year}${month}`;
    
    const lastTransfer = await StockTransfer.findOne({
        transfer_number: new RegExp(`^${prefix}`)
    }).sort({ transfer_number: -1 });
    
    let sequence = 1;
    if (lastTransfer) {
        const lastSeq = parseInt(lastTransfer.transfer_number.split('-').pop());
        sequence = lastSeq + 1;
    }
    
    return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

// @route   POST /api/stock-transfers
// @desc    Create a new stock transfer
exports.createTransfer = asyncHandler(async (req, res) => {
    const { product_id, from_location_id, to_location_id, quantity, expected_date, notes } = req.body;
    const user_id = req.user.id;

    // Validate inputs
    if (!product_id || !from_location_id || !to_location_id || !quantity) {
        return res.status(400).json({ 
            success: false, 
            message: 'Product, from location, to location, and quantity are required' 
        });
    }

    if (from_location_id === to_location_id) {
        return res.status(400).json({ 
            success: false, 
            message: 'Source and destination locations must be different' 
        });
    }

    const quantityNum = Number(quantity);
    if (isNaN(quantityNum) || quantityNum < 1) {
        return res.status(400).json({ 
            success: false, 
            message: 'Quantity must be a positive number' 
        });
    }

    // Verify product exists
    const product = await Product.findById(product_id);
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Verify locations exist
    const fromLocation = await InventoryLocation.findById(from_location_id);
    const toLocation = await InventoryLocation.findById(to_location_id);
    
    if (!fromLocation) {
        return res.status(404).json({ success: false, message: 'Source location not found' });
    }
    if (!toLocation) {
        return res.status(404).json({ success: false, message: 'Destination location not found' });
    }

    // Check if source location has enough stock
    const sourceStock = await InventoryStock.findOne({
        product_id: product_id,
        location_id: from_location_id
    });

    if (!sourceStock || sourceStock.current_quantity < quantityNum) {
        return res.status(400).json({ 
            success: false, 
            message: `Insufficient stock at ${fromLocation.name}. Available: ${sourceStock?.current_quantity || 0}` 
        });
    }

    // Generate transfer number
    const transfer_number = await generateTransferNumber();

    // Create transfer
    const transfer = await StockTransfer.create({
        transfer_number,
        product_id,
        from_location_id,
        to_location_id,
        quantity: quantityNum,
        initiated_by: user_id,
        expected_date,
        notes
    });

    // Populate for response
    await transfer.populate([
        { path: 'product_id', select: 'name sku' },
        { path: 'from_location_id', select: 'name type' },
        { path: 'to_location_id', select: 'name type' },
        { path: 'initiated_by', select: 'name email' }
    ]);

    res.status(201).json({ 
        success: true, 
        message: `Transfer ${transfer_number} created successfully`,
        data: transfer 
    });
});

// @route   GET /api/stock-transfers
// @desc    Get all stock transfers with pagination and filters
exports.getTransfers = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 10, 
        status, 
        product_id, 
        from_location_id, 
        to_location_id,
        sort = '-createdAt'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (product_id) filter.product_id = product_id;
    if (from_location_id) filter.from_location_id = from_location_id;
    if (to_location_id) filter.to_location_id = to_location_id;

    // Get total count for pagination
    const total = await StockTransfer.countDocuments(filter);

    // Fetch transfers with pagination
    const transfers = await StockTransfer.find(filter)
        .populate('product_id', 'name sku')
        .populate('from_location_id', 'name type')
        .populate('to_location_id', 'name type')
        .populate('initiated_by', 'name email')
        .populate('completed_by', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        success: true,
        count: transfers.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: transfers
    });
});

// @route   GET /api/stock-transfers/:id
// @desc    Get single transfer by ID
exports.getTransferById = asyncHandler(async (req, res) => {
    const transfer = await StockTransfer.findById(req.params.id)
        .populate('product_id', 'name sku unit_cost')
        .populate('from_location_id', 'name type address')
        .populate('to_location_id', 'name type address')
        .populate('initiated_by', 'name email')
        .populate('completed_by', 'name email');

    if (!transfer) {
        return res.status(404).json({ 
            success: false, 
            message: 'Transfer not found' 
        });
    }

    res.status(200).json({ success: true, data: transfer });
});

// @route   PUT /api/stock-transfers/:id/complete
// @desc    Complete a pending transfer (executes stock movement)
exports.completeTransfer = asyncHandler(async (req, res) => {
    const transfer = await StockTransfer.findById(req.params.id)
        .populate('product_id', 'unit_cost');

    if (!transfer) {
        return res.status(404).json({ 
            success: false, 
            message: 'Transfer not found' 
        });
    }

    if (transfer.status !== 'pending' && transfer.status !== 'in-transit') {
        return res.status(400).json({ 
            success: false, 
            message: `Cannot complete transfer with status: ${transfer.status}` 
        });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Get source stock
        const sourceStock = await InventoryStock.findOne({
            product_id: transfer.product_id._id,
            location_id: transfer.from_location_id
        }).session(session);

        if (!sourceStock || sourceStock.current_quantity < transfer.quantity) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient stock at source location' 
            });
        }

        // Deduct from source location using FIFO
        const sortedBatches = [...sourceStock.batches].sort((a, b) => 
            new Date(a.received_date) - new Date(b.received_date)
        );

        let remainingQty = transfer.quantity;
        const updatedBatches = [];
        const transferredBatches = [];

        for (const batch of sortedBatches) {
            if (remainingQty <= 0) {
                updatedBatches.push(batch);
                continue;
            }

            if (batch.quantity <= remainingQty) {
                // Transfer entire batch
                transferredBatches.push({
                    ...batch.toObject(),
                    quantity: batch.quantity
                });
                remainingQty -= batch.quantity;
            } else {
                // Partially transfer batch
                transferredBatches.push({
                    ...batch.toObject(),
                    quantity: remainingQty
                });
                updatedBatches.push({
                    ...batch.toObject(),
                    quantity: batch.quantity - remainingQty
                });
                remainingQty = 0;
            }
        }

        // Update source stock
        await InventoryStock.findOneAndUpdate(
            { product_id: transfer.product_id._id, location_id: transfer.from_location_id },
            {
                $set: { 
                    batches: updatedBatches,
                    current_quantity: sourceStock.current_quantity - transfer.quantity
                }
            },
            { session }
        );

        // Add to destination location
        const destStock = await InventoryStock.findOne({
            product_id: transfer.product_id._id,
            location_id: transfer.to_location_id
        }).session(session);

        if (destStock) {
            // Update existing stock
            await InventoryStock.findOneAndUpdate(
                { product_id: transfer.product_id._id, location_id: transfer.to_location_id },
                {
                    $inc: { current_quantity: transfer.quantity },
                    $push: { batches: { $each: transferredBatches } }
                },
                { session }
            );
        } else {
            // Create new stock record
            await InventoryStock.create([{
                product_id: transfer.product_id._id,
                location_id: transfer.to_location_id,
                current_quantity: transfer.quantity,
                batches: transferredBatches,
                min_stock_level: 0,
                max_stock_level: 0
            }], { session });
        }

        // Create transaction records
        const cost = transfer.product_id.unit_cost || 0;

        // OUT transaction from source
        await Transaction.create([{
            type: 'TRANSFER',
            product_id: transfer.product_id._id,
            location_id: transfer.from_location_id,
            quantity_delta: -transfer.quantity,
            cost_at_time_of_tx: cost,
            balance_after: sourceStock.current_quantity - transfer.quantity,
            user_id: req.user.id,
            source_type: 'Transfer',
            source_id: transfer._id
        }], { session });

        // IN transaction to destination
        const destBalance = destStock ? destStock.current_quantity + transfer.quantity : transfer.quantity;
        await Transaction.create([{
            type: 'TRANSFER',
            product_id: transfer.product_id._id,
            location_id: transfer.to_location_id,
            quantity_delta: transfer.quantity,
            cost_at_time_of_tx: cost,
            balance_after: destBalance,
            user_id: req.user.id,
            source_type: 'Transfer',
            source_id: transfer._id
        }], { session });

        // Update transfer status
        transfer.status = 'completed';
        transfer.completed_by = req.user.id;
        transfer.completed_at = new Date();
        await transfer.save({ session });

        await session.commitTransaction();

        // Populate for response
        await transfer.populate([
            { path: 'product_id', select: 'name sku' },
            { path: 'from_location_id', select: 'name type' },
            { path: 'to_location_id', select: 'name type' },
            { path: 'completed_by', select: 'name email' }
        ]);

        res.status(200).json({ 
            success: true, 
            message: `Transfer ${transfer.transfer_number} completed successfully`,
            data: transfer 
        });

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// @route   PUT /api/stock-transfers/:id/cancel
// @desc    Cancel a pending transfer
exports.cancelTransfer = asyncHandler(async (req, res) => {
    const transfer = await StockTransfer.findById(req.params.id);

    if (!transfer) {
        return res.status(404).json({ 
            success: false, 
            message: 'Transfer not found' 
        });
    }

    if (transfer.status === 'completed') {
        return res.status(400).json({ 
            success: false, 
            message: 'Cannot cancel a completed transfer' 
        });
    }

    if (transfer.status === 'cancelled') {
        return res.status(400).json({ 
            success: false, 
            message: 'Transfer is already cancelled' 
        });
    }

    transfer.status = 'cancelled';
    transfer.cancelled_at = new Date();
    await transfer.save();

    await transfer.populate([
        { path: 'product_id', select: 'name sku' },
        { path: 'from_location_id', select: 'name type' },
        { path: 'to_location_id', select: 'name type' }
    ]);

    res.status(200).json({ 
        success: true, 
        message: `Transfer ${transfer.transfer_number} cancelled`,
        data: transfer 
    });
});

// @route   PUT /api/stock-transfers/:id/status
// @desc    Update transfer status (e.g., mark as in-transit)
exports.updateTransferStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const transfer = await StockTransfer.findById(req.params.id);

    if (!transfer) {
        return res.status(404).json({ 
            success: false, 
            message: 'Transfer not found' 
        });
    }

    const validStatuses = ['pending', 'in-transit', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            success: false, 
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
    }

    transfer.status = status;
    await transfer.save();

    await transfer.populate([
        { path: 'product_id', select: 'name sku' },
        { path: 'from_location_id', select: 'name type' },
        { path: 'to_location_id', select: 'name type' }
    ]);

    res.status(200).json({ 
        success: true, 
        message: 'Transfer status updated',
        data: transfer 
    });
});
