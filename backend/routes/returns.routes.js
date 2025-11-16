const express = require('express');
const { createReturn, getReturns, getReturnById } = require('../controllers/returns.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route POST /api/returns
router.post('/', protect, authorize('Admin', 'Manager', 'Staff'), createReturn);
// @route GET /api/returns
router.get('/', protect, getReturns);
// @route GET /api/returns/:id
router.get('/:id', protect, getReturnById);

module.exports = router;
