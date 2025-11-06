const mongoose = require('mongoose');
const SalesOrder = require('../models/SalesOrder.model');
const Customer = require('../models/Customer.model');
const Product = require('../models/Product.model');
const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction = require('../models/Transaction.model');
const asyncHandler = require('../middleware/asyncHandler');

//  @route   POST /api/checkout
exports.processCheckout = asyncHandler(async (req, res, next) => {
    
    const {
        customer_id, location_id, line_items,
        payment_type, amount_paid_cash, amount_to_credit
    } = req.body;
    const user_id = req.user.id;

    if (!line_items || line_items.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const customer = await Customer.findById(customer_id).session(session);
        if (!customer) { throw new Error('Customer not found'); }
        
        const validated_line_items = [];
        let calculated_grand_total = 0;

        for (const item of line_items) {
            const product = await Product.findById(item.product_id).session(session);
            if (!product) { throw new Error(`Product ${item.product_id} not found.`); }

            const stockItem = await InventoryStock.findOne({ 
                product_id: item.product_id, 
                location_id: location_id 
            }).session(session);

            if (!stockItem || stockItem.current_quantity < item.quantity) {
                throw new Error(`Not enough stock for ${product.name}. Only ${stockItem ? stockItem.current_quantity : 0} available.`);
            }

            const correct_unit_price = product.selling_price;
            const correct_total_price = correct_unit_price * item.quantity;
            
            validated_line_items.push({
                product_id: product._id, sku: product.sku, name: product.name,
                quantity: item.quantity, unit_price: correct_unit_price, total_price: correct_total_price
            });
            calculated_grand_total += correct_total_price;
        }

        let payment_status = 'Paid';
        let customerBalanceUpdate = 0;

        if (payment_type === 'Credit') {
            payment_status = 'Pending Credit';
            customerBalanceUpdate = calculated_grand_total;
        } else if (payment_type === 'Split') {
            payment_status = 'Partially Paid';
            
            const totalPayment = (amount_paid_cash || 0) + (amount_to_credit || 0);
            
            if (totalPayment !== calculated_grand_total) {
                throw new Error(
                    `Payment split total (${totalPayment}) does not match the cart total (${calculated_grand_total}).`
                );
            }
            customerBalanceUpdate = amount_to_credit;
        }
        
        if (customerBalanceUpdate > 0) {
            
            if (customer.credit_limit === 0) {
                throw new Error(`Customer ${customer.name} is not authorized for credit sales.`);
            }

            const available_credit = customer.credit_limit - customer.current_balance;
            
            if (customerBalanceUpdate > available_credit) {
                throw new Error(
                    `Credit limit exceeded. Available: ${available_credit}, Requested: ${customerBalanceUpdate}`
                );
            }
        }

        const so = (await SalesOrder.create([{
            order_number: `POS-${Date.now()}`,
            customer_id: customer_id,
            payment_status: payment_status,
            line_items: validated_line_items,
            grand_total: calculated_grand_total,
            status: 'Fulfilled'
        }], { session: session }))[0];

        if (customerBalanceUpdate > 0) {
            await Customer.findByIdAndUpdate(
                customer_id,
                { $inc: { current_balance: customerBalanceUpdate } },
                { session: session }
            );
        }

        for (const item of validated_line_items) {
            const stockItem = await InventoryStock.findOneAndUpdate(
                { product_id: item.product_id, location_id: location_id },
                { $inc: { current_quantity: -item.quantity } },
                { new: true, session: session }
            );

            await Transaction.create([{
                type: 'OUT',
                product_id: item.product_id,
                location_id: location_id,
                quantity_delta: -item.quantity,
                cost_at_time_of_tx: item.unit_price,
                balance_after: stockItem.current_quantity,
                user_id: user_id,
                source_type: 'SalesOrder',
                source_id: so._id
            }], { session: session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, data: so });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
});