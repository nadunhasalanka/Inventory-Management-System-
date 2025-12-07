const express = require('express');
const {
    processDirectReturn
} = require('../controllers/returnsExchange.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route   POST /api/returns
router.route('/')
    .post(protect, authorize('Admin', 'Manager', 'Staff'), processDirectReturn);

// (Add back GET routes if you need them)
// router.route('/').get(protect, getReturns);
// router.route('/:id').get(protect, getReturnById);

module.exports = router;