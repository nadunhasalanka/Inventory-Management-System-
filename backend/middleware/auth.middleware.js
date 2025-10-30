const jwt = require('jsonwebtoken');
const User = require('../models/User.model'); // Need access to the User model

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route (No Token)' });
    }

    try {
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