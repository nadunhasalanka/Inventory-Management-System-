const express = require('express');
const {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} = require('../controllers/category.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route   POST /api/categories
// @route   GET  /api/categories
router.route('/')
    .post(protect, authorize('Admin', 'Manager'), createCategory)
    .get(getCategories);

// @route   GET    /api/categories/:id
// @route   PUT    /api/categories/:id
// @route   DELETE /api/categories/:id
router.route('/:id')
    .get(getCategoryById)
    .put(protect, authorize('Admin', 'Manager'), updateCategory)
    .delete(protect, authorize('Admin'), deleteCategory);

module.exports = router;