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
    if (cachedDb) {
        return cachedDb;
    }

    try {
        const connection = await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        cachedDb = connection;
        console.log('MongoDB Connected');
        return connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
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
try {
    const userRoutes = require('../backend/routes/user.routes');
    const authRoutes = require('../backend/routes/auth.routes');
    const productRoutes = require('../backend/routes/product.routes');
    const categoryRoutes = require('../backend/routes/category.routes');
    const customerRoutes = require('../backend/routes/customer.routes');
    const supplierRoutes = require('../backend/routes/supplier.routes');
    const locationRoutes = require('../backend/routes/inventoryLocation.routes');
    const inventoryRoutes = require('../backend/routes/inventory.routes');
    const stockTransferRoutes = require('../backend/routes/stockTransfer.routes');
    const purchaseOrderRoutes = require('../backend/routes/purchaseOrder.routes');
    const salesOrderRoutes = require('../backend/routes/salesOrder.routes');
    const paymentRoutes = require('../backend/routes/payment.routes');

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
} catch (error) {
    console.error('Error loading routes:', error);
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
        return app(req, res);
    } catch (error) {
        console.error('Handler error:', error);
        res.status(500).json({
            error: 'Server error',
            message: error.message
        });
    }
};
