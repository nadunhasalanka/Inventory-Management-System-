const express = require('express');
const {
  sendCustomerReminder,
  sendAllOverdueReminders,
  getEmailStatus,
  sendTestEmailController,
} = require('../controllers/notification.controller.js');
const { protect } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/role.middleware.js');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Send test email (for configuration testing)
router.post('/test-email', sendTestEmailController);

// Get email sending status/history
router.get('/status', getEmailStatus);

// Send reminder to specific customer (all authenticated users can send)
router.post('/customers/:id/send-reminder', sendCustomerReminder);

// Send reminders to all overdue customers (all authenticated users can send)
// Query params: ?minDaysOverdue=7 (optional)
router.post('/send-all-reminders', sendAllOverdueReminders);

module.exports = router;
