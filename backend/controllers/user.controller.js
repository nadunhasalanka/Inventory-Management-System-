const User = require('../models/User.model');
const InventoryLocation = require('../models/Inventory_Locations.model');
const asyncHandler = require('../middleware/asyncHandler');
const formatUser = require('../utils/formatUser');
const crypto = require('crypto');

// In-memory store for verification codes (in production, use Redis or database)
const verificationCodes = new Map();

// Helper to generate 6-digit code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to send verification email
const sendVerificationEmail = async (email, code, userName) => {
    const emailService = require('../services/email.service');
    await emailService.sendPasswordVerificationEmail(email, code, userName);
};

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

// POST /api/users - Admin creates a new user
exports.createUser = asyncHandler(async (req, res) => {
    const { username, email, password, role, first_name, last_name } = req.body;

    // Validation
    if (!username || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username, email, and password are required' 
        });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        return res.status(400).json({ 
            success: false, 
            message: 'User with this email or username already exists' 
        });
    }

    // Create user
    const user = await User.create({
        username,
        email,
        password,
        role: role || 'Staff',
        first_name,
        last_name,
        is_active: true
    });

    // Send welcome email with credentials
    try {
        const emailService = require('../services/email.service');
        await emailService.sendNewUserCredentials(email, username, password, first_name || username);
    } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail user creation if email fails
    }

    res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            is_active: user.is_active,
            createdAt: user.createdAt
        }
    });
});

// PUT /api/users/:id - Admin updates a user
exports.updateUser = asyncHandler(async (req, res) => {
    const { username, email, password, role, first_name, last_name, is_active } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update fields
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (is_active !== undefined) user.is_active = is_active;
    if (password) user.password = password; // Will be hashed by pre-save hook

    await user.save();

    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            is_active: user.is_active,
            updatedAt: user.updatedAt
        }
    });
});

// DELETE /api/users/:id - Admin deletes a user
exports.deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
        return res.status(400).json({ 
            success: false, 
            message: 'You cannot delete your own account' 
        });
    }

    await user.deleteOne();

    res.status(200).json({
        success: true,
        message: 'User deleted successfully'
    });
});

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

// POST /api/users/me/password/request-code
// Request verification code to change password
exports.requestPasswordChangeCode = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.email) {
        return res.status(400).json({ 
            success: false, 
            message: 'No email address associated with your account. Please contact administrator.' 
        });
    }

    // Generate 6-digit verification code
    const code = generateVerificationCode();
    
    // Store code with expiration (10 minutes)
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    verificationCodes.set(user._id.toString(), {
        code,
        expiresAt,
        attempts: 0
    });

    // Send email
    try {
        await sendVerificationEmail(user.email, code, user.first_name || user.username);
        
        res.status(200).json({
            success: true,
            message: `Verification code sent to ${user.email.replace(/(.{2}).*(@.*)/, '$1***$2')}`
        });
    } catch (error) {
        // Remove code if email fails
        verificationCodes.delete(user._id.toString());
        console.error('Failed to send verification email:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to send verification email. Please try again.' 
        });
    }
});

// POST /api/users/me/password/verify-code
// Verify the code before password change
exports.verifyPasswordChangeCode = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
        return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const storedData = verificationCodes.get(userId);

    if (!storedData) {
        return res.status(400).json({ 
            success: false, 
            message: 'No verification code requested or code has expired' 
        });
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
        verificationCodes.delete(userId);
        return res.status(400).json({ 
            success: false, 
            message: 'Verification code has expired. Please request a new one.' 
        });
    }

    // Check attempts (max 3)
    if (storedData.attempts >= 3) {
        verificationCodes.delete(userId);
        return res.status(400).json({ 
            success: false, 
            message: 'Too many failed attempts. Please request a new code.' 
        });
    }

    // Verify code
    if (storedData.code !== code) {
        storedData.attempts += 1;
        return res.status(400).json({ 
            success: false, 
            message: `Invalid verification code. ${3 - storedData.attempts} attempts remaining.` 
        });
    }

    // Code is valid - mark as verified
    storedData.verified = true;

    res.status(200).json({
        success: true,
        message: 'Verification successful. You can now change your password.'
    });
});

// PUT /api/users/me/password/change
// Change password after verification
exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
            success: false, 
            message: 'Current password and new password are required' 
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ 
            success: false, 
            message: 'New password must be at least 6 characters long' 
        });
    }

    // Check if code was verified
    const storedData = verificationCodes.get(userId);
    if (!storedData || !storedData.verified) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please verify your email first by entering the verification code' 
        });
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
        return res.status(400).json({ 
            success: false, 
            message: 'Current password is incorrect' 
        });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Clean up verification code
    verificationCodes.delete(userId);

    res.status(200).json({
        success: true,
        message: 'Password changed successfully'
    });
});