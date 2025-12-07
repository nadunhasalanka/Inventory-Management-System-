const express = require('express');
const {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} = require('../controllers/product.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.route('/')
    .post(protect, authorize('Admin', 'Manager'), createProduct)
    .get(getProducts);

// @route   GET    /api/products/:id
// @route   PUT    /api/products/:id
// @route   DELETE /api/products/:id
router.route('/:id')
    .get(getProductById)
    .put(protect, authorize('Admin', 'Manager'), updateProduct)
    .delete(protect, authorize('Admin'), deleteProduct);

module.exports = router;