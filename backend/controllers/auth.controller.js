const User = require('../models/User.model');
const jwt = require('jsonwebtoken');

// Register a new user
// @route POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;

        const user = await User.create({
            username, email, password, first_name, last_name 
        });

        // const token = user.getSignedJwtToken();

        // res.status(201).json({ success: true, token, user: { id: user._id, role: user.role, email: user.email } });

        res.status(201).json({ success: true, message: 'User registered successfully. Please log in.' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Login a User
// @route POST /api/auth/login
exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please enter email and password' });
    }

    try {
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = user.getSignedJwtToken();

        res.cookie('token', token, {
            httpOnly: true, // <-- Cannot be accessed by JavaScript
            secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
            sameSite: 'strict', // <-- Helps prevent CSRF
            maxAge: 1 * 24 * 60 * 60 * 1000 // 1 day expiry (matches your JWT_EXPIRY)
        });
        
        // 2. Send the user data (without the token)
        res.status(200).json({ 
            success: true, 
            user: { 
                id: user._id, 
                role: user.role, 
                email: user.email 
            }
        });

        // res.status(200).json({ success: true, token, user: { id: user._id, role: user.role, email: user.email } });

    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

exports.logout = (req, res, next) => {
    // We clear the cookie by setting it to 'none' and making it expire
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
        httpOnly: true
    });
    
    res.status(200).json({ 
        success: true, 
        data: {}
    });
};

exports.getMe = async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
        success: true,
        user: {
            id: user._id,
            role: user.role,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name
        }
    });
};