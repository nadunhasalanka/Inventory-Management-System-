const express = require('express');
const userController = require('../controllers/user.controller'); // Import controller

const router = express.Router();

router.get('/', userController.getUsers);      // GET to /api/users
router.post('/', userController.createUser);    // POST to /api/users

module.exports = router;