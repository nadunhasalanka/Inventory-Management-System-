// This file must be standalone for Vercel serverless
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

// Environment variables are set in Vercel dashboard
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        console.log('Using cached database connection');
        return cachedDb;
    }

    if (!MONGO_URI) {
        console.error('MONGO_URI is not defined');
        throw new Error('MONGO_URI environment variable is required');
    }

    try {
        console.log('Connecting to MongoDB...');
        const connection = await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 1, // Important for serverless
            minPoolSize: 0
        });
        cachedDb = connection;
        console.log('MongoDB Connected successfully');
        return connection;
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        throw error;
    }
}

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Load all routes from backend
console.log('Loading routes...');
try {
    console.log('Loading user routes...');
    const userRoutes = require('../backend/routes/user.routes');
    console.log('Loading auth routes...');
    const authRoutes = require('../backend/routes/auth.routes');
    console.log('Loading product routes...');
    const productRoutes = require('../backend/routes/product.routes');
    console.log('Loading category routes...');
    const categoryRoutes = require('../backend/routes/category.routes');
    console.log('Loading customer routes...');
    const customerRoutes = require('../backend/routes/customer.routes');
    console.log('Loading supplier routes...');
    const supplierRoutes = require('../backend/routes/supplier.routes');
    console.log('Loading location routes...');
    const locationRoutes = require('../backend/routes/inventoryLocation.routes');
    console.log('Loading inventory routes...');
    const inventoryRoutes = require('../backend/routes/inventory.routes');
    console.log('Loading stock transfer routes...');
    const stockTransferRoutes = require('../backend/routes/stockTransfer.routes');
    console.log('Loading purchase order routes...');
    const purchaseOrderRoutes = require('../backend/routes/purchaseOrder.routes');
    console.log('Loading sales order routes...');
    const salesOrderRoutes = require('../backend/routes/salesOrder.routes');
    console.log('Loading payment routes...');
    const paymentRoutes = require('../backend/routes/payment.routes');
    console.log('Loading analytics routes...');
    const analyticsRoutes = require('../backend/routes/analytics.routes');
    console.log('Loading sales routes...');
    const salesRoutes = require('../backend/routes/sales.routes');
    console.log('Loading checkout routes...');
    const checkoutRoutes = require('../backend/routes/checkout.routes');
    console.log('Loading returns routes...');
    const returnsRoutes = require('../backend/routes/returns.routes');
    console.log('Loading returns exchange routes...');
    const returnsExchangeRoutes = require('../backend/routes/returnsExchange.routes');
    console.log('Loading notification routes...');
    const notificationRoutes = require('../backend/routes/notification.routes');

    console.log('Mounting routes...');
    // Mount routes (no /api prefix needed - Vercel already routes /api/* to this function)
    app.use('/users', userRoutes);
    app.use('/auth', authRoutes);
    app.use('/products', productRoutes);
    app.use('/categories', categoryRoutes);
    app.use('/customers', customerRoutes);
    app.use('/suppliers', supplierRoutes);
    app.use('/locations', locationRoutes);
    app.use('/inventory', inventoryRoutes);
    app.use('/stock-transfers', stockTransferRoutes);
    app.use('/purchase-orders', purchaseOrderRoutes);
    app.use('/sales-orders', salesOrderRoutes);
    app.use('/payments', paymentRoutes);
    app.use('/analytics', analyticsRoutes);
    app.use('/sales', salesRoutes);
    app.use('/checkout', checkoutRoutes);
    app.use('/returns', returnsRoutes);
    app.use('/returns-exchange', returnsExchangeRoutes);
    app.use('/notifications', notificationRoutes);

    console.log('All routes loaded and mounted successfully');
} catch (error) {
    console.error('Error loading routes:', error);
    console.error('Error stack:', error.stack);
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        message: 'Server is running',
        dbConnected: mongoose.connection.readyState === 1
    });
});

// Wrapper to ensure DB connection before handling requests
module.exports = async (req, res) => {
    try {
        await connectToDatabase();

        // Remove /api prefix from the URL since routes are mounted without it
        const originalUrl = req.url;
        if (originalUrl.startsWith('/api/')) {
            req.url = originalUrl.replace('/api', '');
        } else if (originalUrl.startsWith('/api')) {
            req.url = originalUrl.replace('/api', '');
        }

        // Ensure URL starts with /
        if (!req.url.startsWith('/')) {
            req.url = '/' + req.url;
        }

        console.log('Processing request:', req.url);

        return app(req, res);
    } catch (error) {
        console.error('Handler error:', error);
        res.status(500).json({
            error: 'Server error',
            message: error.message
        });
    }
};
