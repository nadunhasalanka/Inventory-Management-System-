const Product = require('../models/Product.model');
const Category = require('../models/Category.model');
const InventoryStock = require('../models/Inventory_Stock.model');
const asyncHandler = require('../middleware/asyncHandler');

//  @route   POST /api/products
exports.createProduct = asyncHandler(async (req, res, next) => {
    const { name, sku, category_id } = req.body;

    // 1. Validation (Example: check if SKU already exists)
    const skuExists = await Product.findOne({ sku });
    if (skuExists) {
        return res.status(400).json({ success: false, message: `SKU ${sku} already exists` });
    }

    // 2. Check if Category exists
    const category = await Category.findById(category_id);
    if (!category) {
        return res.status(400).json({ success: false, message: `Category with ID ${category_id} not found` });
    }

    // 3. Create the product
    const product = await Product.create(req.body);

    res.status(201).json({
        success: true,
        data: product
    });
});

//  @route   GET /api/products
exports.getProducts = asyncHandler(async (req, res, next) => {
    const query = req.query.category_id ? { category_id: req.query.category_id } : {};

    const products = await Product.find(query)
        .populate('category_id', 'name');

    res.status(200).json({
        success: true,
        count: products.length,
        data: products
    });
});

//  @route   GET /api/products/:id
exports.getProductById = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id)
        .populate('category_id', 'name');

    if (!product) {
        return res.status(404).json({ success: false, message: `Product not found with ID ${req.params.id}` });
    }

    const stockLevels = await InventoryStock.find({ product_id: product._id })
        .populate('location_id', 'name type'); 

    const responseData = {
        ...product.toObject(), 
        stock_levels: stockLevels
    };

    res.status(200).json({
        success: true,
        data: responseData
    });
});

// @route   PUT /api/products/:id
exports.updateProduct = asyncHandler(async (req, res, next) => {
    let product = await Product.findById(req.params.id);

    if (!product) {
        return res.status(404).json({ success: false, message: `Product not found with ID ${req.params.id}` });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true 
    });

    res.status(200).json({
        success: true,
        data: product
    });
});


// @route   DELETE /api/products/:id

exports.deleteProduct = asyncHandler(async (req, res, next) => {
    const stock = await InventoryStock.findOne({ 
        product_id: req.params.id, 
        current_quantity: { $gt: 0 }
    });

    if (stock) {
        return res.status(400).json({ 
            success: false, 
            message: 'Cannot delete product. It has active stock in a location.' 
        });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
        return res.status(404).json({ success: false, message: `Product not found with ID ${req.params.id}` });
    }

    await product.deleteOne(); 
    // (Optional: You might also want to delete the 'InventoryStock' 
    // documents associated with it, even if they are 0)

    res.status(200).json({
        success: true,
        data: {}
    });
});