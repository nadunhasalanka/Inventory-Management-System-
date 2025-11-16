const User = require('../models/User.model');
const InventoryLocation = require('../models/Inventory_Locations.model');
const asyncHandler = require('../middleware/asyncHandler');
const formatUser = require('../utils/formatUser');

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

// PUT /api/users/me/location
// Update the logged-in user's active location
exports.updateMyLocation = asyncHandler(async (req, res) => {
    const { location_id } = req.body;

    if (!location_id) {
        return res.status(400).json({ success: false, message: 'location_id is required' });
    }

    const location = await InventoryLocation.findById(location_id);
    if (!location) {
        return res.status(404).json({ success: false, message: 'Location not found' });
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { active_location_id: location._id, active_location_set_at: new Date() },
        { new: true, runValidators: true }
    ).populate('active_location_id');

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
        success: true,
        user: formatUser(user)
    });
});

// PUT /api/users/me/profile
// Update the logged-in user's profile information
exports.updateMyProfile = asyncHandler(async (req, res) => {
    const { first_name, last_name, username, email } = req.body;

    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;

    const user = await User.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true, runValidators: true }
    ).populate('active_location_id');

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
        success: true,
        user: formatUser(user)
    });
});