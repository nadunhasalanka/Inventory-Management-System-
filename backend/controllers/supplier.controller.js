const Supplier = require('../models/Supplier.model');
const PurchaseOrder = require('../models/Purchase_Order.model'); 
const asyncHandler = require('../middleware/asyncHandler');

//  @route   POST /api/suppliers
exports.createSupplier = asyncHandler(async (req, res, next) => {
    const { name } = req.body;

    const nameExists = await Supplier.findOne({ name });
    if (nameExists) {
        return res.status(400).json({ success: false, message: `Supplier with name ${name} already exists` });
    }

    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, data: supplier });
});

//  @route   GET /api/suppliers
exports.getSuppliers = asyncHandler(async (req, res, next) => {
    const suppliers = await Supplier.find({}); 
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
});

//  @route   GET /api/suppliers/:id
exports.getSupplierById = asyncHandler(async (req, res, next) => {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
        return res.status(404).json({ success: false, message: `Supplier not found with ID ${req.params.id}` });
    }
    res.status(200).json({ success: true, data: supplier });
});

//  @route   PUT /api/suppliers/:id
exports.updateSupplier = asyncHandler(async (req, res, next) => {
    let supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
        return res.status(404).json({ success: false, message: `Supplier not found with ID ${req.params.id}` });
    }

    supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    res.status(200).json({ success: true, data: supplier });
});

//  @route   DELETE /api/suppliers/:id
exports.deleteSupplier = asyncHandler(async (req, res, next) => {
    const orderInUse = await PurchaseOrder.findOne({ supplier_id: req.params.id });

    if (orderInUse) {
        return res.status(400).json({ 
            success: false, 
            message: 'Cannot delete supplier. They have existing purchase orders.' 
        });
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
        return res.status(404).json({ success: false, message: `Supplier not found with ID ${req.params.id}` });
    }

    await supplier.deleteOne();
    res.status(200).json({ success: true, data: {} });
});