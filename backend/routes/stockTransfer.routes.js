const express = require('express');
const {
    createTransfer,
    getTransfers,
    getTransferById,
    completeTransfer,
    cancelTransfer,
    updateTransferStatus
} = require('../controllers/stockTransfer.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route   POST /api/stock-transfers
// @route   GET  /api/stock-transfers
router.route('/')
    .post(protect, authorize('Admin', 'Manager'), createTransfer)
    .get(protect, getTransfers);

// @route   GET    /api/stock-transfers/:id
router.route('/:id')
    .get(protect, getTransferById);

// @route   PUT    /api/stock-transfers/:id/complete
router.put('/:id/complete', protect, authorize('Admin', 'Manager'), completeTransfer);

// @route   PUT    /api/stock-transfers/:id/cancel
router.put('/:id/cancel', protect, authorize('Admin', 'Manager'), cancelTransfer);

// @route   PUT    /api/stock-transfers/:id/status
router.put('/:id/status', protect, authorize('Admin', 'Manager'), updateTransferStatus);

module.exports = router;
