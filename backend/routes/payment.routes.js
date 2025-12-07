const express = require('express');
const {
    createPayment,
    getPayments,
    getPaymentById,
    getSupplierPayments
} = require('../controllers/payment.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route   POST /api/payments
// @route   GET  /api/payments
router.route('/')
    .post(protect, authorize('Admin', 'Manager'), createPayment)
    .get(protect, getPayments);

// @route   GET /api/payments/supplier/:supplierId
router.get('/supplier/:supplierId', protect, getSupplierPayments);

// @route   GET /api/payments/:id
router.get('/:id', protect, getPaymentById);

module.exports = router;
