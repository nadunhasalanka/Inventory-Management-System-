const mongoose = require('mongoose');
const SalesOrder = require('../models/SalesOrder.model');
const asyncHandler = require('../middleware/asyncHandler');

// @route   GET /api/sales/history
exports.getSalesHistory = asyncHandler(async (req, res, next) => {
    const {
        page = 1,
        limit = 25,
        startDate,
        endDate,
        paymentMethod,
        search
    } = req.query;

    // Build filter
    const filter = {};

    // Date range filter
    if (startDate || endDate) {
        filter.created_at = {};
        if (startDate) {
            filter.created_at.$gte = new Date(startDate);
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            filter.created_at.$lte = endOfDay;
        }
    }

    // Payment method filter
    if (paymentMethod) {
        filter['payment.type'] = paymentMethod;
    }

    // Search filter (customer name or invoice number)
    if (search) {
        filter.$or = [
            { invoice_number: { $regex: search, $options: 'i' } },
            { order_number: { $regex: search, $options: 'i' } }
        ];
    }

    try {
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const total = await SalesOrder.countDocuments(filter);

        // Get sales with pagination
        const sales = await SalesOrder.find(filter)
            .populate('customer_id', 'name email phone')
            .populate('line_items.product_id', 'name sku')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Transform data to match frontend expectations
        const transformedSales = sales.map(sale => {
            const saleObj = sale.toObject();
            return {
                ...saleObj,
                invoice_number: saleObj.order_number || `SO-${saleObj._id.toString().slice(-6)}`,
                total_amount: saleObj.grand_total,
                paymentMethod: saleObj.payment?.type || 'Cash',
                items: saleObj.line_items || []
            };
        });

        res.status(200).json({
            success: true,
            data: {
                sales: transformedSales,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching sales history'
        });
    }
});
