const jwt = require('jsonwebtoken');
// const User = require('../models/User.model'); // Need access to the User model

exports.protect = async (req, res, next) => {
    let token;

    // --- THIS IS THE NEW LOGIC ---
    // 1. Read the token from the httpOnly cookie
    if (req.cookies.token) {
        token = req.cookies.token;
    }
    // --- END OF NEW LOGIC ---

    // (The old header logic is now gone)

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route (No Token)' });
    }

    try {
        // (This logic is the same)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.user = { 
            id: decoded.id, 
            role: decoded.role 
        };

        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Not authorized to access this route (Invalid Token)' });
    }
};