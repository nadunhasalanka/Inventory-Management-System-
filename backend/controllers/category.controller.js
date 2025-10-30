const Category = require('../models/Category.model');
const Product = require('../models/Product.model'); // We need this for validation
const asyncHandler = require('../middleware/asyncHandler');


//  @route   POST /api/categories
exports.createCategory = asyncHandler(async (req, res, next) => {
    console.log('RECEIVED BODY:', req.body);
    
    const { name } = req.body;

    const nameExists = await Category.findOne({ name });
    if (nameExists) {
        return res.status(400).json({ success: false, message: `Category '${name}' already exists` });
    }

    const category = await Category.create(req.body);

    res.status(201).json({
        success: true,
        data: category
    });
});

//  @route   GET /api/categories
exports.getCategories = asyncHandler(async (req, res, next) => {
    // We populate 'parent_id' to show the parent category's name
    const categories = await Category.find({})
        .populate('parent_id', 'name'); 

    res.status(200).json({
        success: true,
        count: categories.length,
        data: categories
    });
});

//  @route   GET /api/categories/:id
exports.getCategoryById = asyncHandler(async (req, res, next) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        return res.status(404).json({ success: false, message: `Category not found with ID ${req.params.id}` });
    }

    const products = await Product.find({ category_id: category._id })
        .select('name sku selling_price'); // Only select a few fields

    const responseData = {
        ...category.toObject(),
        products: products
    };

    res.status(200).json({
        success: true,
        data: responseData
    });
});

//  @route   PUT /api/categories/:id
exports.updateCategory = asyncHandler(async (req, res, next) => {
    let category = await Category.findById(req.params.id);

    if (!category) {
        return res.status(404).json({ success: false, message: `Category not found with ID ${req.params.id}` });
    }

    // Update the category
    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: category
    });
});

//  @route   DELETE /api/categories/:id
exports.deleteCategory = asyncHandler(async (req, res, next) => {
    // Check if any product is using this category
    const productInUse = await Product.findOne({ category_id: req.params.id });

    if (productInUse) {
        return res.status(400).json({ 
            success: false, 
            message: 'Cannot delete category. It is being used by one or more products.' 
        });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
        return res.status(404).json({ success: false, message: `Category not found with ID ${req.params.id}` });
    }

    await category.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});