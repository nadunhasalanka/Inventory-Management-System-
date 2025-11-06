const express = require('express');
const { adjustStock } = require('../controllers/inventory.controller');

// Import your auth middleware
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route   POST /api/inventory/adjust
router.post('/adjust', protect, authorize('Admin', 'Manager'), adjustStock);

module.exports = router;