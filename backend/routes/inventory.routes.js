const express = require('express');
const { adjustStock, getInventorySummary, getHighStockInventory, getProductStockDistribution } = require('../controllers/inventory.controller');

// Import your auth middleware
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route   GET /api/inventory/summary
router.get('/summary', protect, getInventorySummary);
// @route   GET /api/inventory/high-stock?min=4
router.get('/high-stock', protect, getHighStockInventory);
// @route   GET /api/inventory/product/:id/locations
router.get('/product/:id/locations', protect, getProductStockDistribution);

// @route   POST /api/inventory/adjust
router.post('/adjust', protect, authorize('Admin', 'Manager'), adjustStock);

module.exports = router;