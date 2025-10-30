const User = require('../models/User.model');


exports.getUsers = async (req, res) => {
try {
        const users = await User.find(); 
        
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// GET /api/users/:id
// (Gets a single user by ID)
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

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