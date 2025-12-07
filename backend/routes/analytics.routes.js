const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const analyticsController = require('../controllers/analytics.controller');

// Admin-only routes
router.get(
    '/dashboard',
    protect,
    authorize('Admin'),
    analyticsController.getDashboardStats
);

router.get(
    '/transactions',
    protect,
    authorize('Admin'),
    analyticsController.getTransactionLog
);

router.get(
    '/payments',
    protect,
    authorize('Admin'),
    analyticsController.getAllPayments
);

module.exports = router;
