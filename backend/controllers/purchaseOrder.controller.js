const mongoose = require('mongoose');
const PurchaseOrder = require('../models/Purchase_Order.model');
const Supplier = require('../models/Supplier.model');
const Product = require('../models/Product.model');
const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction =require('../models/Transaction.model');
const asyncHandler = require('../middleware/asyncHandler');
const { sendPurchaseOrderEmail } = require('../services/email.service');

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

        // Send email to supplier (async, non-blocking)
        // Don't wait for email to complete - just log result
        if (supplier.contact_info?.email) {
            sendPurchaseOrderEmail({
                po_number: po.po_number,
                supplier: {
                    name: supplier.name,
                    email: supplier.contact_info.email,
                    terms: supplier.terms
                },
                order_date: po.order_date,
                expected_delivery_date: po.expected_delivery_date,
                line_items: po.line_items,
                subtotal: po.subtotal,
                tax_amount: po.tax_amount,
                total: po.total,
                notes: po.notes
            }).then(result => {
                if (result.success) {
                    console.log(`✅ PO email sent to ${supplier.name} (${result.email})`);
                } else {
                    console.error(`❌ Failed to send PO email to ${supplier.name}:`, result.error);
                }
            }).catch(err => {
                console.error('❌ Email sending error:', err);
            });
        } else {
            console.warn(`⚠️ No email address for supplier: ${supplier.name}`);
        }

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
        .populate('supplier_id', 'name')
        .populate('line_items.product_id', 'name sku unit_cost');

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

            // Get current inventory stock (for weighted average calculation)
            let inventoryStock = await InventoryStock.findOne(
                { product_id: item.product_id, location_id: location_id }
            ).session(session);

            // Get current product (for cost calculation)
            const product = await Product.findById(item.product_id).session(session);

            // Calculate weighted average cost
            const oldQuantity = inventoryStock ? inventoryStock.current_quantity : 0;
            const oldCost = product.unit_cost || 0;
            const newQuantity = item.quantity_received;
            const newCost = poLineItem.unit_cost;

            const oldValue = oldQuantity * oldCost;
            const newValue = newQuantity * newCost;
            const totalValue = oldValue + newValue;
            const totalQuantity = oldQuantity + newQuantity;
            const weightedAvgCost = totalQuantity > 0 ? totalValue / totalQuantity : newCost;

            // Generate batch number if not provided
            const batchNumber = `BATCH-${Date.now()}-${item.product_id.toString().slice(-6)}`;

            // Update Stock - add batch with cost
            if (!inventoryStock) {
                inventoryStock = await InventoryStock.create([{
                    product_id: item.product_id,
                    location_id: location_id,
                    current_quantity: newQuantity,
                    batches: [{
                        batch_number: batchNumber,
                        quantity: newQuantity,
                        unit_cost: newCost,
                        received_date: new Date(),
                        grn_id: po._id,
                        supplier_id: po.supplier_id,
                        expire_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Default 1 year
                    }]
                }], { session: session });
                inventoryStock = inventoryStock[0];
            } else {
                // Add new batch
                inventoryStock.batches.push({
                    batch_number: batchNumber,
                    quantity: newQuantity,
                    unit_cost: newCost,
                    received_date: new Date(),
                    grn_id: po._id,
                    supplier_id: po.supplier_id,
                    expire_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                });
                inventoryStock.current_quantity += newQuantity;
                await inventoryStock.save({ session: session });
            }

            // Create Transaction Log
            await Transaction.create([{ 
                type: 'IN',
                product_id: item.product_id,
                location_id: location_id,
                quantity_delta: item.quantity_received,
                cost_at_time_of_tx: poLineItem.unit_cost,
                balance_after: inventoryStock.current_quantity,
                user_id: user_id,
                source_type: 'PurchaseOrder',
                source_id: po._id
            }], { session: session });

            // Update Product with weighted average cost and cost history
            product.cost_history.push({
                date: new Date(),
                quantity_received: newQuantity,
                unit_cost: newCost,
                total_value: newValue,
                grn_id: po._id,
                supplier_id: po.supplier_id,
                running_avg_cost: weightedAvgCost
            });
            product.unit_cost = weightedAvgCost;
            product.last_purchase_cost = newCost;
            product.last_purchase_date = new Date();
            await product.save({ session: session });
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