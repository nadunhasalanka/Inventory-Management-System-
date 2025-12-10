require('dotenv').config({ path: '../backend/.env' });
const connectDB = require('../backend/config/db');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

// Import routes
const authRoutes = require('../backend/routes/authRoutes');
const userRoutes = require('../backend/routes/userRoutes');
const itemRoutes = require('../backend/routes/itemRoutes');
const categoryRoutes = require('../backend/routes/categoryRoutes');
const locationRoutes = require('../backend/routes/locationRoutes');
const supplierRoutes = require('../backend/routes/supplierRoutes');
const purchaseOrderRoutes = require('../backend/routes/purchaseOrderRoutes');
const creditPaymentRoutes = require('../backend/routes/creditPaymentRoutes');
const saleRoutes = require('../backend/routes/saleRoutes');
const activityLogRoutes = require('../backend/routes/activityLogRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/credit-payments', creditPaymentRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok', message: 'Server is running' });
});

// Export for Vercel
module.exports = app;
