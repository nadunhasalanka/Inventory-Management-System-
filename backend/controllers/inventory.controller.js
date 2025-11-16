const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction = require('../models/Transaction.model');
const Product = require('../models/Product.model');
const InventoryLocation = require('../models/Inventory_Locations.model');
const asyncHandler = require('../middleware/asyncHandler');

//  @route   GET /api/inventory/summary
//  @desc    List products with aggregated stock across locations
exports.getInventorySummary = asyncHandler(async (req, res) => {
    // Optional filters from query: category_id, active
    const match = {};
    if (req.query.category_id) {
        match.category_id = req.query.category_id;
    }
    if (typeof req.query.is_active !== 'undefined') {
        match.is_active = req.query.is_active === 'true';
    }

    const pipeline = [
        { $match: match },
        {
            $lookup: {
                from: 'inventorystocks',
                localField: '_id',
                foreignField: 'product_id',
                as: 'stocks'
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'category_id',
                foreignField: '_id',
                as: 'category_obj'
            }
        },
        {
            $addFields: {
                total_stock: { $sum: '$stocks.current_quantity' },
                category_name: { $arrayElemAt: ['$category_obj.name', 0] }
            }
        },
        {
            $project: {
                _id: 1,
                sku: 1,
                name: 1,
                is_active: 1,
                unit_cost: 1,
                selling_price: 1,
                category_id: 1,
                category_name: 1,
                total_stock: { $ifNull: ['$total_stock', 0] },
                updatedAt: 1,
                createdAt: 1
            }
        },
        { $sort: { updatedAt: -1 } }
    ];

    const results = await Product.aggregate(pipeline);
    return res.status(200).json({ success: true, count: results.length, data: results });
});

//  @route   GET /api/inventory/high-stock?min=4
//  @desc    List products whose aggregated stock exceeds a minimum threshold (default 4)
exports.getHighStockInventory = asyncHandler(async (req, res) => {
    const min = Number(req.query.min || 4);
    if (isNaN(min) || min < 0) {
        return res.status(400).json({ success: false, message: 'min must be a non-negative number.' });
    }

    const pipeline = [
        {
            $lookup: {
                from: 'inventorystocks',
                localField: '_id',
                foreignField: 'product_id',
                as: 'stocks'
            }
        },
        {
            $addFields: {
                total_stock: { $sum: '$stocks.current_quantity' }
            }
        },
        { $match: { total_stock: { $gte: min } } },
        {
            $project: {
                _id: 1,
                sku: 1,
                name: 1,
                selling_price: 1,
                total_stock: { $ifNull: ['$total_stock', 0] }
            }
        },
        { $sort: { total_stock: -1 } }
    ];

    const data = await Product.aggregate(pipeline);
    return res.status(200).json({ success: true, count: data.length, data });
});

//  @route   POST /api/inventory/adjust
exports.adjustStock = asyncHandler(async (req, res, next) => {
    const { product_id, location_id, new_quantity } = req.body;
    const user_id = req.user.id;

    const newQuantityNum = Number(new_quantity);
    if (newQuantityNum == null || newQuantityNum < 0 || isNaN(newQuantityNum)) {
        return res.status(400).json({ success: false, message: 'New quantity must be a number 0 or greater.' });
    }

    const product = await Product.findById(product_id).select('unit_cost');
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Validate location exists
    const location = await InventoryLocation.findById(location_id).select('_id');
    if (!location) {
        return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    const stockItem = await InventoryStock.findOne({
        product_id: product_id,
        location_id: location_id
    });

    const old_quantity = stockItem ? stockItem.current_quantity : 0;
    const quantity_delta = newQuantityNum - old_quantity;

    if (quantity_delta === 0) {
        return res.status(400).json({ success: false, message: 'No change in quantity. Adjustment not needed.' });
    }

    // It finds the document and updates it, OR creates it if it doesn't exist.
    const updatedStockItem = await InventoryStock.findOneAndUpdate(
        { product_id: product_id, location_id: location_id }, // The filter to find the item
        { 
            $set: { current_quantity: newQuantityNum }, // The update to apply
            $setOnInsert: { // Fields to set *only* if a new document is created
                product_id: product_id,
                location_id: location_id,
                min_stock_level: 0 
            }
        },
        { 
            new: true,       // Return the *new* (updated) document
            upsert: true,    // Create the document if it doesn't exist
            runValidators: true 
        }
    );

    await Transaction.create({
        type: 'ADJUST',
        product_id: product_id,
        location_id: location_id,
        quantity_delta: quantity_delta, 
        cost_at_time_of_tx: product.unit_cost, 
        balance_after: newQuantityNum,
        user_id: user_id,
        source_type: 'ManualAdjustment',
        source_id: updatedStockItem._id 
    });

    res.status(200).json({
        success: true,
        data: updatedStockItem
    });
});

//  @route   GET /api/inventory/product/:id/locations
//  @desc    Stock distribution for a single product across all locations
exports.getProductStockDistribution = asyncHandler(async (req, res) => {
    const productId = req.params.id;
    if (!productId) {
        return res.status(400).json({ success: false, message: 'Product id is required' });
    }

    // Verify product exists (light check)
    const productExists = await Product.findById(productId).select('_id name sku');
    if (!productExists) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Aggregate inventory stocks for this product and enrich with location details
    const pipeline = [
        { $match: { product_id: productExists._id } },
        {
            $lookup: {
                from: 'inventorylocations',
                localField: 'location_id',
                foreignField: '_id',
                as: 'location'
            }
        },
        { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                product_id: 1,
                location_id: 1,
                current_quantity: 1,
                min_stock_level: 1,
                max_stock_level: 1,
                batches_count: { $size: { $ifNull: ['$batches', []] } },
                location_name: '$location.name',
                location_type: '$location.type',
                location_address: '$location.address'
            }
        },
        { $sort: { current_quantity: -1 } }
    ];

    const distribution = await InventoryStock.aggregate(pipeline);
    const total = distribution.reduce((sum, d) => sum + (d.current_quantity || 0), 0);

    res.status(200).json({
        success: true,
        data: {
            product: { _id: productExists._id, name: productExists.name, sku: productExists.sku },
            total_quantity: total,
            locations: distribution
        }
    });
});