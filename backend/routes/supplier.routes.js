const express = require('express');
const {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier
} = require('../controllers/supplier.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();


// @route   POST /api/suppliers
// @route   GET  /api/suppliers
router.route('/')
    .post(protect, authorize('Admin', 'Manager'), createSupplier)
    .get(protect, getSuppliers); // <-- 'protect' ADDED HERE

// @route   GET    /api/suppliers/:id
// @route   PUT    /api/suppliers/:id
// @route   DELETE /api/suppliers/:id
router.route('/:id')
    .get(protect, getSupplierById)
    .put(protect, authorize('Admin', 'Manager'), updateSupplier)
    .delete(protect, authorize('Admin'), deleteSupplier);

module.exports = router;