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

        const token = user.getSignedJwtToken();

        res.status(201).json({ success: true, token, user: { id: user._id, role: user.role, email: user.email } });
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

        res.status(200).json({ success: true, token, user: { id: user._id, role: user.role, email: user.email } });

    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};