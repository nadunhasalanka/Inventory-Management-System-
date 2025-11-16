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

//  @route   GET /api/inventory/adjustments
//  @desc    Get stock adjustment history with pagination
exports.getAdjustments = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 10, 
        product_id, 
        location_id,
        sort = '-timestamp'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = { type: 'ADJUST' };
    if (product_id) filter.product_id = product_id;
    if (location_id) filter.location_id = location_id;

    // Get total count
    const total = await Transaction.countDocuments(filter);

    // Fetch adjustments with pagination
    const pipeline = [
        { $match: filter },
        {
            $lookup: {
                from: 'products',
                localField: 'product_id',
                foreignField: '_id',
                as: 'product'
            }
        },
        {
            $lookup: {
                from: 'inventorylocations',
                localField: 'location_id',
                foreignField: '_id',
                as: 'location'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                timestamp: 1,
                quantity_delta: 1,
                balance_after: 1,
                cost_at_time_of_tx: 1,
                source_id: 1,
                'product.name': 1,
                'product.sku': 1,
                'product._id': 1,
                'location.name': 1,
                'location.type': 1,
                'location._id': 1,
                'user.name': 1,
                'user.email': 1
            }
        },
        { $sort: sort === '-timestamp' ? { timestamp: -1 } : { timestamp: 1 } },
        { $skip: skip },
        { $limit: limitNum }
    ];

    const adjustments = await Transaction.aggregate(pipeline);

    res.status(200).json({
        success: true,
        count: adjustments.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: adjustments
    });
});

//  @route   GET /api/inventory/batches
//  @desc    Get all batches across products with pagination
exports.getBatches = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 10, 
        product_id, 
        location_id,
        expiring_soon,
        sort = '-batches.received_date'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build match filter
    const matchStage = {};
    if (product_id) matchStage.product_id = product_id;
    if (location_id) matchStage.location_id = location_id;

    // Base pipeline
    const pipeline = [
        { $match: matchStage },
        { $unwind: { path: '$batches', preserveNullAndEmptyArrays: false } },
    ];

    // Filter expiring soon (within 30 days)
    if (expiring_soon === 'true') {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        pipeline.push({
            $match: {
                'batches.expire_date': { 
                    $lte: futureDate,
                    $gte: new Date()
                }
            }
        });
    }

    // Lookups
    pipeline.push(
        {
            $lookup: {
                from: 'products',
                localField: 'product_id',
                foreignField: '_id',
                as: 'product'
            }
        },
        {
            $lookup: {
                from: 'inventorylocations',
                localField: 'location_id',
                foreignField: '_id',
                as: 'location'
            }
        },
        {
            $lookup: {
                from: 'suppliers',
                localField: 'batches.supplier_id',
                foreignField: '_id',
                as: 'supplier'
            }
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: '$batches._id',
                batch_number: '$batches.batch_number',
                quantity: '$batches.quantity',
                unit_cost: '$batches.unit_cost',
                received_date: '$batches.received_date',
                expire_date: '$batches.expire_date',
                grn_id: '$batches.grn_id',
                product_id: '$product._id',
                product_name: '$product.name',
                product_sku: '$product.sku',
                location_id: '$location._id',
                location_name: '$location.name',
                location_type: '$location.type',
                supplier_id: '$supplier._id',
                supplier_name: '$supplier.name',
                days_until_expiry: {
                    $cond: {
                        if: '$batches.expire_date',
                        then: {
                            $divide: [
                                { $subtract: ['$batches.expire_date', new Date()] },
                                1000 * 60 * 60 * 24
                            ]
                        },
                        else: null
                    }
                }
            }
        }
    );

    // Count total for pagination (before skip/limit)
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await InventoryStock.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Add sorting and pagination
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    pipeline.push(
        { $sort: { [sortField]: sortOrder } },
        { $skip: skip },
        { $limit: limitNum }
    );

    const batches = await InventoryStock.aggregate(pipeline);

    res.status(200).json({
        success: true,
        count: batches.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: batches
    });
});