const express = require('express');
const {
    createSalesOrder,
    getSalesOrders,
    getSalesOrderById,
    updateSalesOrder,
    fulfillSalesOrder,
    getRefundableItems
} = require('../controllers/salesOrder.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route   POST /api/sales-orders
// @route   GET  /api/sales-orders
router.route('/')
    .post(protect, authorize('Admin', 'Manager', 'Staff'), createSalesOrder)
    .get(protect, getSalesOrders);

// @route   GET    /api/sales-orders/:id
// @route   PUT    /api/sales-orders/:id
router.route('/:id')
    .get(protect, getSalesOrderById)
    .put(protect, authorize('Admin', 'Manager', 'Staff'), updateSalesOrder);

// @route   POST /api/sales-orders/:id/fulfill
router.post(
    '/:id/fulfill',
    protect,
    authorize('Admin', 'Manager', 'WarehouseStaff'),
    fulfillSalesOrder
);

// @route   GET /api/sales-orders/:id/refundable-items
router.get(
    '/:id/refundable-items',
    protect, // Anyone logged in can check
    getRefundableItems
);

getRefundableItems

module.exports = router;