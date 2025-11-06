const express = require('express');
const { processCheckout } = require('../controllers/checkout.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.post(
    '/',
    protect,
    authorize('Admin', 'Manager', 'Staff'), // All staff can use the checkout
    processCheckout
);

module.exports = router;