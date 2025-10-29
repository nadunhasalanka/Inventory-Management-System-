require('dotenv').config();
const connectDB = require('./config/db');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const userRoutes = require('./routes/user.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

const PORT = process.env.PORT || 3001;

app.use(helmet());

// Simple request logger to help debug routing
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

app.use(cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Ensure preflight requests are handled
// Express 5 no longer supports '*' in route paths with path-to-regexp; use a regex
app.options(/.*/, cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health endpoint(s)
app.all(['/api/health', '/health'], (req, res) => {
    res.json({ success: true, status: 'ok' });
});

// Use the authentication routes
app.use('/api/auth', authRoutes);

// --- Route Middleware ---
app.use('/api/users', userRoutes);


// 1. Catch 404 - If a request reaches here, no route handled it
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `The resource at ${req.originalUrl} was not found.`
    });
});

// 2. Global Error Handler (Express recognizes this as an error handler
//    because it takes the four arguments: err, req, res, next)
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack); // Expert tip: log the full stack trace

    // Determine the status code and message
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        success: false,
        error: {
            message: message,
            // Only send the stack trace in development mode for debugging
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
        }
    });
});

connectDB();

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on : ${PORT}`);
});