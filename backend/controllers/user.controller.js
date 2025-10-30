const User = require('../models/User.model');
const asyncHandler = require('../middleware/asyncHandler');

exports.getUsers = asyncHandler(async (req, res) => {
    const users = await User.find(); 
    res.status(200).json({
        success: true,
        count: users.length,
        data: users
    });
});

// GET /api/users/:id
// (Gets a single user by ID)
exports.getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({
        success: true,
        data: user
    });
});

// Example POST /api/users
exports.createUser = (req, res) => {
    const newUser = req.body;
    // 1. In a real app, you would call: userService.saveUser(newUser)
    
    res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser
    });
};