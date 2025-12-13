const express = require('express');
const { getSalesHistory } = require('../controllers/sales.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// @route   GET /api/sales/history
// @desc    Get sales history with filters and pagination
// @access  Protected
router.get('/history', protect, getSalesHistory);

module.exports = router;
