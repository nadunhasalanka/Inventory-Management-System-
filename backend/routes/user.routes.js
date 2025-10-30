const express = require('express');
const userController = require('../controllers/user.controller'); // Import controller

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// router.get('/', userController.getUsers);      // GET to /api/users
router.post('/', userController.createUser);    // POST to /api/users

router.get('/:id', protect, userController.getUserById);
router.get('/', protect, authorize('Admin'), userController.getUsers);

module.exports = router;