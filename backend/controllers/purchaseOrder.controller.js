const mongoose = require('mongoose');
const PurchaseOrder = require('../models/Purchase_Order.model');
const Supplier = require('../models/Supplier.model');
const Product = require('../models/Product.model');
const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction =require('../models/Transaction.model');
const asyncHandler = require('../middleware/asyncHandler');

// --- HELPER FUNCTION ---
// We'll use this in create and update to keep products in sync
const updateProductCosts = async (line_items, session) => {
    for (const item of line_items) {
        if (item.product_id && item.unit_cost) {
            await Product.findByIdAndUpdate(
                item.product_id,
                { unit_cost: item.unit_cost },
                { session: session }
            );
        }
    }
};

/**
 * @desc    Create a new purchase order
 * @route   POST /api/purchase-orders
 * @access  Private (Admin, Manager)
 */
exports.createPurchaseOrder = asyncHandler(async (req, res, next) => {
    const { supplier_id, line_items } = req.body;

    // Start a session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const supplier = await Supplier.findById(supplier_id).session(session);
        if (!supplier) {
            throw new Error('Supplier not found');
        }

        // --- NEW LOGIC: Update product costs ---
        if (line_items && line_items.length > 0) {
            await updateProductCosts(line_items, session);
        }

        // Create PO
        const po = (await PurchaseOrder.create([{
            ...req.body,
            status: 'Draft'
        }], { session: session }))[0]; // create returns an array

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, data: po });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
});

/**
 * @desc    Get all purchase orders
 * @route   GET /api/purchase-orders
 * @access  Private (All Roles)
 */
exports.getPurchaseOrders = asyncHandler(async (req, res, next) => {
    const pos = await PurchaseOrder.find({})
        .populate('supplier_id', 'name');

    res.status(200).json({ success: true, count: pos.length, data: pos });
});

/**
 * @desc    Get a single purchase order
 * @route   GET /api/purchase-orders/:id
 * @access  Private (All Roles)
 */
exports.getPurchaseOrderById = asyncHandler(async (req, res, next) => {
    const po = await PurchaseOrder.findById(req.params.id)
        .populate('supplier_id', 'name')
        .populate('line_items.product_id', 'name sku unit_cost'); // Added unit_cost

    if (!po) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }
    res.status(200).json({ success: true, data: po });
});

/**
 * @desc    Update a purchase order (e.g., add items, change status)
 * @route   PUT /api/purchase-orders/:id
 * @access  Private (Admin, Manager)
 */
exports.updatePurchaseOrder = asyncHandler(async (req, res, next) => {
    const { line_items } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let po = await PurchaseOrder.findById(req.params.id).session(session);

        if (!po) {
            throw new Error('Purchase Order not found');
        }
        if (po.status === 'Received') {
             throw new Error('Cannot update a PO that is already received.');
        }

        // --- NEW LOGIC: Update product costs ---
        if (line_items && line_items.length > 0) {
            await updateProductCosts(line_items, session);
        }

        po = await PurchaseOrder.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
            session: session
        });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, data: po });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
});

/**
 * @desc    Delete a purchase order
 * @route   DELETE /api/purchase-orders/:id
 * @access  Private (Admin)
 */
exports.deletePurchaseOrder = asyncHandler(async (req, res, next) => {
    // This doesn't need a transaction
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }
    if (po.status !== 'Draft') {
        return res.status(400).json({ success: false, message: 'Cannot delete a PO that is not in Draft status.' });
    }

    await po.deleteOne();
    res.status(200).json({ success: true, data: {} });
});


// --- WORKFLOW Function (This was already correct) ---

/**
 * @desc    Receive stock from a purchase order
 * @route   POST /api/purchase-orders/:id/receive
 * @access  Private (Admin, Manager, WarehouseStaff)
 */
exports.receivePurchaseOrderStock = asyncHandler(async (req, res, next) => {
    const { grn_number, location_id, received_items } = req.body; 
    const user_id = req.user.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const po = await PurchaseOrder.findById(req.params.id).session(session);
        if (!po) { throw new Error('Purchase Order not found'); }
        if (po.status === 'Received') { throw new Error('This PO has already been fully received.'); }

        for (const item of received_items) {
            const poLineItem = po.line_items.find(
                (line) => line._id.toString() === item.line_item_id
            );
            if (!poLineItem) { throw new Error(`Line item ${item.line_item_id} not found on this PO.`); }

            // Check for over-receiving
            let quantityAlreadyReceived = 0;
            po.goods_receipts.forEach(grn => {
                grn.items.forEach(grnItem => {
                    if (grnItem.line_item_id.toString() === item.line_item_id) {
                        quantityAlreadyReceived += grnItem.quantity_received;
                    }
                });
            });

            const quantityRemaining = poLineItem.quantity_ordered - quantityAlreadyReceived;
            if (item.quantity_received > quantityRemaining) {
                throw new Error(`Cannot receive ${item.quantity_received} items for ${poLineItem.name}. Only ${quantityRemaining} are remaining.`);
            }

            // Update Stock
            const stockUpdate = await InventoryStock.findOneAndUpdate(
                { product_id: item.product_id, location_id: location_id },
                { 
                    $inc: { current_quantity: item.quantity_received },
                    $setOnInsert: { product_id: item.product_id, location_id: location_id }
                },
                { upsert: true, new: true, session: session }
            );

            // Create Transaction Log
            await Transaction.create([{ 
                type: 'IN',
                product_id: item.product_id,
                location_id: location_id,
                quantity_delta: item.quantity_received,
                cost_at_time_of_tx: poLineItem.unit_cost,
                balance_after: stockUpdate.current_quantity,
                user_id: user_id,
                source_type: 'PurchaseOrder',
                source_id: po._id
            }], { session: session });

            // Update Product Cost (Last-In Cost)
            await Product.findByIdAndUpdate(item.product_id, 
                { unit_cost: poLineItem.unit_cost },
                { session: session }
            );
        }

        // Add the new GRN to the PO
        po.goods_receipts.push({
            grn_number: grn_number,
            location_id: location_id,
            inspected_by: user_id,
            items: received_items
        });

        // Recalculate the entire PO's status
        updatePOStatus(po); // Helper function below

        await po.save({ session: session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, data: po });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
});

// Helper function for PO status
function updatePOStatus(po) {
    let totalOrdered = 0;
    let totalReceived = 0;
    po.line_items.forEach(line => { totalOrdered += line.quantity_ordered; });
    po.goods_receipts.forEach(grn => {
        grn.items.forEach(item => { totalReceived += item.quantity_received; });
    });

    if (totalReceived === 0) { po.status = 'Sent'; }
    else if (totalReceived >= totalOrdered) { po.status = 'Received'; }
    else { po.status = 'Partially Received'; }
}