const Payment = require('../models/Payment.model');
const PurchaseOrder = require('../models/Purchase_Order.model');
const asyncHandler = require('../middleware/asyncHandler');

// @route   POST /api/payments
exports.createPayment = asyncHandler(async (req, res, next) => {
    const payment = await Payment.create(req.body);
    res.status(201).json({ success: true, data: payment });
});

// @route   GET /api/payments
exports.getPayments = asyncHandler(async (req, res, next) => {
    const { entity_type, entity_id, type } = req.query;
    
    const filter = {};
    if (entity_type) filter.entity_type = entity_type;
    if (entity_id) filter.entity_id = entity_id;
    if (type) filter.type = type;
    
    const payments = await Payment.find(filter).sort({ date: -1 });
    res.status(200).json({ success: true, count: payments.length, data: payments });
});

// @route   GET /api/payments/:id
exports.getPaymentById = asyncHandler(async (req, res, next) => {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
        return res.status(404).json({ success: false, message: `Payment not found with ID ${req.params.id}` });
    }
    
    res.status(200).json({ success: true, data: payment });
});

// @route   GET /api/payments/supplier/:supplierId
exports.getSupplierPayments = asyncHandler(async (req, res, next) => {
    // Get all POs for this supplier
    const purchaseOrders = await PurchaseOrder.find({ supplier_id: req.params.supplierId });
    const poIds = purchaseOrders.map(po => po._id);
    
    // Get all payments for these POs
    const payments = await Payment.find({
        entity_type: 'PurchaseOrder',
        entity_id: { $in: poIds },
        type: 'Supplier Payment'
    }).sort({ date: -1 });
    
    res.status(200).json({ success: true, count: payments.length, data: payments });
});
