const SalesOrder = require('../models/SalesOrder.model');
const Customer = require('../models/Customer.model');
const Product = require('../models/Product.model');
const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction = require('../models/Transaction.model');
const Payment = require('../models/Payment.model');
const AuditLog = require('../models/Audit_Log.model');
const PurchaseOrder = require('../models/Purchase_Order.model');
const asyncHandler = require('../middleware/asyncHandler');

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard statistics for admin
exports.getDashboardStats = asyncHandler(async (req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Total Sales (current month)
    const salesThisMonth = await SalesOrder.aggregate([
        {
            $match: {
                created_at: { $gte: startOfMonth },
                status: { $in: ['Pending', 'Processing', 'Shipped', 'Delivered'] }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$grand_total' },
                count: { $sum: 1 }
            }
        }
    ]);

    const salesLastMonth = await SalesOrder.aggregate([
        {
            $match: {
                created_at: { $gte: startOfLastMonth, $lte: endOfLastMonth },
                status: { $in: ['Pending', 'Processing', 'Shipped', 'Delivered'] }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$grand_total' }
            }
        }
    ]);

    const currentSales = salesThisMonth[0]?.total || 0;
    const lastSales = salesLastMonth[0]?.total || 0;
    const salesChange = lastSales > 0 ? ((currentSales - lastSales) / lastSales) * 100 : 0;

    // Total Customers
    const totalCustomers = await Customer.countDocuments({ is_active: true });

    // Low Stock Items (below reorder_level)
    const lowStockItems = await InventoryStock.aggregate([
        {
            $lookup: {
                from: 'products',
                localField: 'product_id',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' },
        {
            $match: {
                $expr: { $lt: ['$current_quantity', '$product.reorder_level'] }
            }
        },
        { $count: 'count' }
    ]);

    const lowStockCount = lowStockItems[0]?.count || 0;

    // Pending Orders
    const pendingOrders = await SalesOrder.countDocuments({
        status: { $in: ['Pending', 'Processing'] }
    });

    // Revenue by Category (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const revenueByCategory = await SalesOrder.aggregate([
        {
            $match: {
                created_at: { $gte: thirtyDaysAgo },
                status: { $in: ['Delivered', 'Shipped'] }
            }
        },
        { $unwind: '$line_items' },
        {
            $lookup: {
                from: 'products',
                localField: 'line_items.product_id',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' },
        {
            $lookup: {
                from: 'categories',
                localField: 'product.category_id',
                foreignField: '_id',
                as: 'category'
            }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: '$category.name',
                revenue: { $sum: '$line_items.total_price' }
            }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
    ]);

    // Top Products (last 30 days by quantity sold)
    const topProducts = await SalesOrder.aggregate([
        {
            $match: {
                created_at: { $gte: thirtyDaysAgo },
                status: { $in: ['Delivered', 'Shipped'] }
            }
        },
        { $unwind: '$line_items' },
        {
            $group: {
                _id: '$line_items.product_id',
                name: { $first: '$line_items.name' },
                totalQuantity: { $sum: '$line_items.quantity' },
                totalRevenue: { $sum: '$line_items.total_price' }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
    ]);

    // Sales Trend (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const salesTrend = await SalesOrder.aggregate([
        {
            $match: {
                created_at: { $gte: sevenDaysAgo }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
                },
                sales: { $sum: '$grand_total' },
                orders: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Recent Activity (last 10 audit logs)
    const recentActivity = await AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('user_id', 'name email')
        .lean();

    res.json({
        success: true,
        data: {
            kpis: {
                totalSales: {
                    value: currentSales,
                    count: salesThisMonth[0]?.count || 0,
                    change: salesChange.toFixed(1)
                },
                totalCustomers: {
                    value: totalCustomers
                },
                lowStockItems: {
                    value: lowStockCount
                },
                pendingOrders: {
                    value: pendingOrders
                }
            },
            revenueByCategory,
            topProducts,
            salesTrend,
            recentActivity
        }
    });
});

// @route   GET /api/analytics/transactions
// @desc    Get transaction log with filters
exports.getTransactionLog = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        type,
        productId,
        locationId,
        userId,
        page = 1,
        limit = 50
    } = req.query;

    const match = {};

    if (startDate || endDate) {
        match.timestamp = {};
        if (startDate) match.timestamp.$gte = new Date(startDate);
        if (endDate) match.timestamp.$lte = new Date(endDate);
    }

    if (type) match.type = type;
    if (productId) match.product_id = productId;
    if (locationId) match.location_id = locationId;
    if (userId) match.user_id = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(match)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('product_id', 'sku name')
        .populate('location_id', 'location_name')
        .populate('user_id', 'name email')
        .lean();

    const total = await Transaction.countDocuments(match);

    // Calculate summary stats
    const summary = await Transaction.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalQuantity: { $sum: '$quantity_delta' }
            }
        }
    ]);

    res.json({
        success: true,
        data: {
            transactions,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
            },
            summary
        }
    });
});

// @route   GET /api/analytics/payments
// @desc    Get all payments with filters
exports.getAllPayments = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        method,
        type,
        entityType,
        page = 1,
        limit = 50
    } = req.query;

    const match = {};

    if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = new Date(startDate);
        if (endDate) match.date.$lte = new Date(endDate);
    }

    if (method) match.method = method;
    if (type) match.type = type;
    if (entityType) match.entity_type = entityType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const payments = await Payment.find(match)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // Populate entity details based on entity_type
    for (let payment of payments) {
        if (payment.entity_type === 'SalesOrder') {
            const order = await SalesOrder.findById(payment.entity_id)
                .populate('customer_id', 'name email')
                .lean();
            payment.entityDetails = {
                orderNumber: order?.order_number,
                customer: order?.customer_id
            };
        } else if (payment.entity_type === 'PurchaseOrder') {
            const po = await PurchaseOrder.findById(payment.entity_id)
                .populate('supplier_id', 'name contact_email')
                .lean();
            payment.entityDetails = {
                poNumber: po?.po_number,
                supplier: po?.supplier_id
            };
        }
    }

    const total = await Payment.countDocuments(match);

    // Calculate summary stats
    const summary = await Payment.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$method',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);

    const totalCollected = await Payment.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ]);

    res.json({
        success: true,
        data: {
            payments,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
            },
            summary,
            totalCollected: totalCollected[0]?.total || 0
        }
    });
});
