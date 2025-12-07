const express = require('express');
const userController = require('../controllers/user.controller'); // Import controller

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// Admin routes - User management
router.get('/', protect, authorize('Admin'), userController.getUsers);
router.post('/', protect, authorize('Admin'), userController.createUser);
router.put('/:id', protect, authorize('Admin'), userController.updateUser);
router.delete('/:id', protect, authorize('Admin'), userController.deleteUser);

// User profile routes
router.get('/:id', protect, userController.getUserById);
router.put('/me/location', protect, userController.updateMyLocation);
router.put('/me/profile', protect, userController.updateMyProfile);

// Password change with email verification
router.post('/me/password/request-code', protect, userController.requestPasswordChangeCode);
router.post('/me/password/verify-code', protect, userController.verifyPasswordChangeCode);
router.put('/me/password/change', protect, userController.changePassword);

module.exports = router;