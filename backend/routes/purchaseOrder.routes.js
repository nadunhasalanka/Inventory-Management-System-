const express = require('express');
const {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder,
    receivePurchaseOrderStock
} = require('../controllers/purchaseOrder.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route   POST /api/purchase-orders
// @route   GET  /api/purchase-orders
router.route('/')
    .post(protect, authorize('Admin', 'Manager'), createPurchaseOrder)
    .get(protect, getPurchaseOrders);

// @route   GET    /api/purchase-orders/:id
// @route   PUT    /api/purchase-orders/:id
// @route   DELETE /api/purchase-orders/:id
router.route('/:id')
    .get(protect, getPurchaseOrderById)
    .put(protect, authorize('Admin', 'Manager'), updatePurchaseOrder)
    .delete(protect, authorize('Admin'), deletePurchaseOrder);

// @route   POST /api/purchase-orders/:id/receive
router.post(
    '/:id/receive',
    protect,
    authorize('Admin', 'Manager', 'WarehouseStaff'),
    receivePurchaseOrderStock
);

module.exports = router;