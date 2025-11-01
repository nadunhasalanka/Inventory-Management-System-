const Customer = require('../models/Customer.model');
const SalesOrder = require('../models/SalesOrder.model'); // We need this for validation
const asyncHandler = require('../middleware/asyncHandler');

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
    // Check if any sales order is using this customer
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