const Customer = require('../models/Customer.model');
const SalesOrder = require('../models/SalesOrder.model'); // We need this for validation
const asyncHandler = require('../middleware/asyncHandler');
const Payment = require('../models/Payment.model');
const mongoose = require('mongoose');

//  @route   POST /api/customers
exports.createCustomer = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    const emailExists = await Customer.findOne({ email });
    if (emailExists) {
        return res.status(400).json({ success: false, message: `Customer with email ${email} already exists` });
    }

    const customer = await Customer.create(req.body);

    res.status(201).json({
        success: true,
        data: customer
    });
});

//  @route   GET /api/customers
exports.getCustomers = asyncHandler(async (req, res, next) => {
    const customers = await Customer.find({}); 

    res.status(200).json({
        success: true,
        count: customers.length,
        data: customers
    });
});

//  @route   GET /api/customers/:id
exports.getCustomerById = asyncHandler(async (req, res, next) => {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
        return res.status(404).json({ success: false, message: `Customer not found with ID ${req.params.id}` });
    }

    // --- Future Logic ---
    // When you build SalesOrders, you can populate them here:
    // const orders = await SalesOrder.find({ customer_id: customer._id });
    // const responseData = { ...customer.toObject(), orders };
    // res.status(200).json({ success: true, data: responseData });

    res.status(200).json({
        success: true,
        data: customer
    });
});

//  @route   PUT /api/customers/:id
exports.updateCustomer = asyncHandler(async (req, res, next) => {
    let customer = await Customer.findById(req.params.id);

    if (!customer) {
        return res.status(404).json({ success: false, message: `Customer not found with ID ${req.params.id}` });
    }

    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: customer
    });
});

//  @route   DELETE /api/customers/:id
exports.deleteCustomer = asyncHandler(async (req, res, next) => {
    const orderInUse = await SalesOrder.findOne({ customer_id: req.params.id });

    if (orderInUse) {
        return res.status(400).json({ 
            success: false, 
            message: 'Cannot delete customer. They have existing sales orders.' 
        });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
        return res.status(440).json({ success: false, message: `Customer not found with ID ${req.params.id}` });
    }

    await customer.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});


// @route   POST /api/customers/:id/pay-balance
// @desc    Pay customer's total balance (distributes across all unpaid orders)
exports.payBalance = asyncHandler(async (req, res, next) => {
    const { amount_paid } = req.body;
    const user_id = req.user.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const customer = await Customer.findById(req.params.id).session(session);
        if (!customer) {
            throw new Error('Customer not found');
        }

        if (amount_paid <= 0) {
            throw new Error('Payment amount must be greater than zero.');
        }

        if (amount_paid > customer.current_balance) {
            throw new Error(`Payment (${amount_paid}) exceeds the total balance (${customer.current_balance}).`);
        }

        // Get all unpaid/partially paid orders for this customer
        const unpaidOrders = await SalesOrder.find({
            customer_id: customer._id,
            payment_status: { $in: ['Pending Credit', 'Partially Paid'] },
            credit_outstanding: { $gt: 0 }
        }).sort({ order_date: 1 }).session(session); // Pay oldest first

        let remainingPayment = amount_paid;

        // Distribute payment across orders
        for (const order of unpaidOrders) {
            if (remainingPayment <= 0) break;

            const paymentForThisOrder = Math.min(remainingPayment, order.credit_outstanding);
            
            order.credit_outstanding -= paymentForThisOrder;
            order.amount_paid_cash += paymentForThisOrder;

            // Update payment status based on remaining balance
            if (order.credit_outstanding === 0) {
                order.payment_status = 'Paid';
            } else if (order.amount_paid_cash > 0 && order.credit_outstanding > 0) {
                order.payment_status = 'Partially Paid';
            }

            await order.save({ session });
            remainingPayment -= paymentForThisOrder;
        }

        // Update customer balance
        const updatedCustomer = await Customer.findByIdAndUpdate(
            req.params.id,
            { $inc: { current_balance: -amount_paid } },
            { new: true, session: session }
        );

        // Create payment record
        await Payment.create([{
            entity_type: 'Customer',
            entity_id: customer._id,
            amount: amount_paid,
            type: 'Credit Payment',
            date: new Date(),
            method: 'Cash'
        }], { session: session });
        
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, data: updatedCustomer });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
});

// @route   POST /api/customers/:id/pay-order
// @desc    Pay for a specific sales order
exports.payOrder = asyncHandler(async (req, res, next) => {
    const { order_id, amount_paid } = req.body;
    const customer_id = req.params.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const customer = await Customer.findById(customer_id).session(session);
        if (!customer) {
            throw new Error('Customer not found');
        }

        const order = await SalesOrder.findById(order_id).session(session);
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.customer_id.toString() !== customer_id) {
            throw new Error('Order does not belong to this customer');
        }

        if (amount_paid <= 0) {
            throw new Error('Payment amount must be greater than zero.');
        }

        if (amount_paid > order.credit_outstanding) {
            throw new Error(`Payment (${amount_paid}) exceeds the outstanding balance (${order.credit_outstanding}).`);
        }

        // Update order
        order.credit_outstanding -= amount_paid;
        order.amount_paid_cash += amount_paid;

        // Update payment status
        if (order.credit_outstanding === 0) {
            order.payment_status = 'Paid';
        } else if (order.amount_paid_cash > 0 && order.credit_outstanding > 0) {
            order.payment_status = 'Partially Paid';
        }

        await order.save({ session });

        // Update customer balance
        const updatedCustomer = await Customer.findByIdAndUpdate(
            customer_id,
            { $inc: { current_balance: -amount_paid } },
            { new: true, session: session }
        );

        // Create payment record
        await Payment.create([{
            entity_type: 'Customer',
            entity_id: customer._id,
            amount: amount_paid,
            type: 'Credit Payment',
            date: new Date(),
            method: 'Cash',
            notes: `Payment for order ${order.order_number}`
        }], { session: session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ 
            success: true, 
            data: {
                customer: updatedCustomer,
                order: order
            }
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
});

// @route   GET /api/customers/:id/credit-orders
// @desc    Get all credit sales orders for a customer
exports.getCreditOrders = asyncHandler(async (req, res, next) => {
    const orders = await SalesOrder.find({
        customer_id: req.params.id,
        payment_type: { $in: ['Credit', 'Split'] },
        payment_status: { $in: ['Pending Credit', 'Partially Paid', 'Paid'] }
    }).sort({ order_date: -1 }); // Newest first

    res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
    });
});

// @route   GET /api/customers/overdue/list
// @desc    Get all customers with overdue payments
exports.getOverdueCustomers = asyncHandler(async (req, res, next) => {
    const today = new Date();
    
    // Find all orders that are overdue (past allowed_until date) and still have outstanding balance
    const overdueOrders = await SalesOrder.find({
        payment_status: { $in: ['Pending Credit', 'Partially Paid'] },
        credit_outstanding: { $gt: 0 },
        allowed_until: { $lt: today }
    }).populate('customer_id').sort({ allowed_until: 1 }); // Oldest overdue first

    // Group orders by customer and calculate totals
    const customerMap = new Map();
    
    for (const order of overdueOrders) {
        if (!order.customer_id) continue;
        
        const customerId = order.customer_id._id.toString();
        
        if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
                customer: order.customer_id,
                totalOutstanding: 0,
                overdueOrders: [],
                oldestOverdueDate: order.allowed_until || order.due_date,
                ordersCount: 0
            });
        }
        
        const customerData = customerMap.get(customerId);
        customerData.totalOutstanding += order.credit_outstanding || 0;
        customerData.overdueOrders.push(order);
        customerData.ordersCount += 1;
        
        // Track oldest overdue date
        const orderDate = order.allowed_until || order.due_date;
        if (orderDate < customerData.oldestOverdueDate) {
            customerData.oldestOverdueDate = orderDate;
        }
    }
    
    // Convert map to array and calculate days overdue
    const overdueCustomers = Array.from(customerMap.values()).map(data => {
        const daysOverdue = Math.floor((today - new Date(data.oldestOverdueDate)) / (1000 * 60 * 60 * 24));
        return {
            customer: data.customer,
            totalOutstanding: data.totalOutstanding,
            ordersCount: data.ordersCount,
            oldestOverdueDate: data.oldestOverdueDate,
            daysOverdue: daysOverdue,
            overdueOrders: data.overdueOrders
        };
    });
    
    // Sort by most overdue first
    overdueCustomers.sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.status(200).json({
        success: true,
        count: overdueCustomers.length,
        data: overdueCustomers
    });
});