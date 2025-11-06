const express = require('express');
const {
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    payBalance
} = require('../controllers/customer.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();


// @route   POST /api/customers
// @route   GET  /api/customers
router.route('/')
    .post(protect, authorize('Admin', 'Manager'), createCustomer)
    .get(getCustomers); // Publicly viewable

// @route   GET    /api/customers/:id
// @route   PUT    /api/customers/:id
// @route   DELETE /api/customers/:id
router.route('/:id')
    .get(getCustomerById) // Publicly viewable
    .put(protect, authorize('Admin', 'Manager'), updateCustomer)
    .delete(protect, authorize('Admin'), deleteCustomer);

// @route   POST /api/customers/:id/pay-balance
router.route('/:id/pay-balance')
    .post(protect, authorize('Admin', 'Manager', 'Staff'),payBalance);

module.exports = router;