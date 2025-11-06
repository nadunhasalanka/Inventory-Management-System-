const mongoose = require('mongoose');
const SalesOrder = require('../models/SalesOrder.model');
const Customer = require('../models/Customer.model');
const Product = require('../models/Product.model');
const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction = require('../models/Transaction.model');
const ReturnsExchange = require('../models/Returns_Exchange.model');
const asyncHandler = require('../middleware/asyncHandler');

// @route   POST /api/sales-orders
exports.createSalesOrder = asyncHandler(async (req, res, next) => {
    const { customer_id, payment_status, line_items: requested_items } = req.body;

    if (!requested_items || requested_items.length === 0) {
        return res.status(400).json({ success: false, message: 'No line items provided.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const customer = await Customer.findById(customer_id).session(session);
        if (!customer) {
            throw new Error('Customer not found');
        }

        const validated_line_items = [];
        let calculated_grand_total = 0;

        for (const item of requested_items) {
            
            const product = await Product.findById(item.product_id).session(session);
            if (!product) {
                throw new Error(`Product with ID ${item.product_id} not found.`);
            }

            const correct_unit_price = product.selling_price;
            const correct_total_price = correct_unit_price * item.quantity;
            
            validated_line_items.push({
                product_id: product._id,
                sku: product.sku,
                name: product.name,
                quantity: item.quantity,
                unit_price: correct_unit_price,  
                total_price: correct_total_price 
            });

            calculated_grand_total += correct_total_price;
        }

        const so = (await SalesOrder.create([{
            ...req.body, // (includes order_number, etc.)
            customer_id: customer_id,
            payment_status: payment_status,
            line_items: validated_line_items,     
            grand_total: calculated_grand_total, 
            status: 'New'
        }], { session: session }))[0];

        if (payment_status === 'Pending Credit') {
            await Customer.findByIdAndUpdate(
                customer_id,
                // Use *our* calculated total, not the one from the request
                { $inc: { current_balance: calculated_grand_total } },
                { session: session }
            );
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, data: so });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
});

//  @route   GET /api/sales-orders
exports.getSalesOrders = asyncHandler(async (req, res, next) => {
    const sos = await SalesOrder.find({})
        .populate('customer_id', 'name email');
    res.status(200).json({ success: true, count: sos.length, data: sos });
});

//  @route   GET /api/sales-orders/:id
exports.getSalesOrderById = asyncHandler(async (req, res, next) => {
    const so = await SalesOrder.findById(req.params.id)
        .populate('customer_id', 'name email credit_limit current_balance');

    if (!so) {
        return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }
    res.status(200).json({ success: true, data: so });
});

//  @route   PUT /api/sales-orders/:id
exports.updateSalesOrder = asyncHandler(async (req, res, next) => {
    let so = await SalesOrder.findById(req.params.id);
    if (!so) {
        return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }
    
    if (so.status === 'Fulfilled') {
         return res.status(400).json({ success: false, message: 'Cannot update an order that is already fulfilled.' });
    }

    so = await SalesOrder.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    res.status(200).json({ success: true, data: so });
});


//  @route   POST /api/sales-orders/:id/fulfill
exports.fulfillSalesOrder = asyncHandler(async (req, res, next) => {
    // Body should contain which items are being fulfilled from which location
    // { location_id: "...", items_to_fulfill: [{ line_item_id, product_id, quantity }] }
    const { location_id, items_to_fulfill } = req.body;
    const user_id = req.user.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const so = await SalesOrder.findById(req.params.id).session(session);
        if (!so) { throw new Error('Sales Order not found'); }
        if (so.status === 'Fulfilled') { throw new Error('This order is already fulfilled.'); }

        for (const item of items_to_fulfill) {
            
            const soLineItem = so.line_items.find(
                (line) => line._id.toString() === item.line_item_id
            );
            if (!soLineItem) { throw new Error(`Line item ${item.line_item_id} not found on this SO.`); }

            const stockItem = await InventoryStock.findOne({
                product_id: item.product_id,
                location_id: location_id
            }).session(session);

            if (!stockItem || stockItem.current_quantity < item.quantity) {
                throw new Error(`Not enough stock for ${soLineItem.name}. Only ${stockItem ? stockItem.current_quantity : 0} available.`);
            }

            const newQuantity = stockItem.current_quantity - item.quantity;
            stockItem.current_quantity = newQuantity;
            await stockItem.save({ session: session });

            await Transaction.create([{
                type: 'OUT',
                product_id: item.product_id,
                location_id: location_id,
                quantity_delta: -item.quantity, 
                cost_at_time_of_tx: soLineItem.unit_price, 
                balance_after: newQuantity,
                user_id: user_id,
                source_type: 'SalesOrder',
                source_id: so._id
            }], { session: session });
        }

        // For now, we assume this request fulfills the whole order.)
        so.status = 'Fulfilled';
        await so.save({ session: session });

        // If everything was successful, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, data: so });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        
        res.status(400).json({ success: false, message: err.message });
    }
});

//  @route   GET /api/sales-orders/:id/refundable-items
exports.getRefundableItems = asyncHandler(async (req, res, next) => {
    
    const so = await SalesOrder.findById(req.params.id)
        .populate('line_items.product_id', 'allow_returns'); // Populate product's return policy

    if (!so) {
        return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }

    const existingReturns = await ReturnsExchange.find({ 
        sales_order_id: req.params.id 
    });

    const refundableItems = [];

    for (const lineItem of so.line_items) {
        
        if (!lineItem.product_id.allow_returns) {
            continue; 
        }

        let quantityAlreadyReturned = 0;
        existingReturns.forEach(ret => {
            ret.return_line_items.forEach(line => {
                if (line.product_id.toString() === lineItem.product_id._id.toString()) {
                    quantityAlreadyReturned += line.quantity;
                }
            });
        });

        const quantityAvailableToReturn = lineItem.quantity - quantityAlreadyReturned;

        if (quantityAvailableToReturn > 0) {
            refundableItems.push({
                line_item_id: lineItem._id,
                product_id: lineItem.product_id._id,
                name: lineItem.name,
                sku: lineItem.sku,
                quantity_ordered: lineItem.quantity,
                quantity_available_to_return: quantityAvailableToReturn,
                unit_price: lineItem.unit_price 
            });
        }
    }

    res.status(200).json({
        success: true,
        data: refundableItems
    });
});