const Customer = require('../models/Customer.model.js');
const SalesOrder = require('../models/SalesOrder.model.js');
const { sendOverdueReminderEmail, sendTestEmail } = require('../services/email.service.js');

// Helper function to fetch overdue customers (reuse from existing controller)
const fetchOverdueCustomersData = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueOrders = await SalesOrder.find({
      payment_status: { $in: ['Pending Credit', 'Partially Paid'] },
      credit_outstanding: { $gt: 0 },
      allowed_until: { $lt: today },
    })
      .populate('customer_id')
      .sort({ allowed_until: 1 });

    // Group orders by customer
    const customerMap = new Map();

    overdueOrders.forEach((order) => {
      const customerId = order.customer_id._id.toString();

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer: order.customer_id,
          overdueOrders: [],
          totalOutstanding: 0,
          oldestOverdueDate: order.allowed_until,
        });
      }

      const customerData = customerMap.get(customerId);
      customerData.overdueOrders.push(order);
      customerData.totalOutstanding += order.credit_outstanding || 0;
    });

    // Convert to array and add additional info
    const result = Array.from(customerMap.values()).map((item) => {
      const oldestDate = new Date(item.oldestOverdueDate);
      const daysOverdue = Math.floor((today - oldestDate) / (1000 * 60 * 60 * 24));

      return {
        customer: item.customer,
        overdueOrders: item.overdueOrders,
        totalOutstanding: item.totalOutstanding,
        ordersCount: item.overdueOrders.length,
        daysOverdue,
        oldestOverdueDate: item.oldestOverdueDate,
      };
    });

    // Sort by days overdue (most overdue first)
    result.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return result;
  } catch (error) {
    console.error('Error fetching overdue customers:', error);
    throw error;
  }
};

// Create email log model (optional but recommended for tracking)
const EmailLog = {
  async create(logData) {
    // For now, just console log. You can create a proper model later
    console.log('📧 Email Log:', JSON.stringify(logData, null, 2));
    return logData;
  },
};

// Send reminder to specific customer
exports.sendCustomerReminder = async (req, res) => {
  try {
    const { id } = req.params; // customer ID

    // Respond immediately
    res.status(200).json({
      message: 'Email reminder is being sent in the background',
      status: 'processing',
      customerId: id,
    });

    // Process email in background (non-blocking)
    setImmediate(async () => {
      try {
        // Fetch customer's overdue data
        const allOverdueCustomers = await fetchOverdueCustomersData();
        const customerData = allOverdueCustomers.find(
          (item) => item.customer._id.toString() === id
        );

        if (!customerData) {
          console.log(`No overdue orders found for customer ${id}`);
          await EmailLog.create({
            customer_id: id,
            email_type: 'overdue_reminder',
            status: 'skipped',
            error_message: 'No overdue orders found',
            sent_at: new Date(),
          });
          return;
        }

        if (!customerData.customer.email) {
          console.log(`No email address for customer ${id}`);
          await EmailLog.create({
            customer_id: id,
            email_type: 'overdue_reminder',
            status: 'failed',
            error_message: 'No email address',
            sent_at: new Date(),
          });
          return;
        }

        // Send email
        const result = await sendOverdueReminderEmail(customerData);

        // Log result
        await EmailLog.create({
          customer_id: id,
          email_type: 'overdue_reminder',
          status: result.success ? 'sent' : 'failed',
          error_message: result.error || null,
          email_address: result.email,
          sent_at: new Date(),
          message_id: result.messageId || null,
        });

        console.log(
          `✅ Email ${result.success ? 'sent' : 'failed'} to ${customerData.customer.name}`
        );
      } catch (error) {
        console.error('Error sending customer reminder:', error);
        await EmailLog.create({
          customer_id: id,
          email_type: 'overdue_reminder',
          status: 'failed',
          error_message: error.message,
          sent_at: new Date(),
        });
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send reminders to all overdue customers
exports.sendAllOverdueReminders = async (req, res) => {
  try {
    const { minDaysOverdue = 0 } = req.query; // Optional filter

    // Fetch overdue customers
    const overdueCustomers = await fetchOverdueCustomersData();

    // Filter by minimum days overdue if specified
    const customersToNotify = minDaysOverdue
      ? overdueCustomers.filter((c) => c.daysOverdue >= parseInt(minDaysOverdue))
      : overdueCustomers;

    // Filter out customers without email
    const customersWithEmail = customersToNotify.filter((c) => c.customer.email);

    // Respond immediately
    res.status(200).json({
      message: 'Email reminders are being sent in the background',
      status: 'processing',
      totalCustomers: customersWithEmail.length,
      estimatedTime: `${Math.ceil(customersWithEmail.length * 0.2)} seconds`,
    });

    // Process emails in background (non-blocking)
    setImmediate(async () => {
      let successCount = 0;
      let failureCount = 0;

      console.log(`📧 Starting batch email send to ${customersWithEmail.length} customers...`);

      for (const customerData of customersWithEmail) {
        try {
          // Send email
          const result = await sendOverdueReminderEmail(customerData);

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }

          // Log result
          await EmailLog.create({
            customer_id: customerData.customer._id,
            email_type: 'overdue_reminder',
            status: result.success ? 'sent' : 'failed',
            error_message: result.error || null,
            email_address: result.email,
            sent_at: new Date(),
            message_id: result.messageId || null,
          });

          // Rate limiting: Wait 200ms between emails to avoid hitting limits
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error sending email to ${customerData.customer.name}:`, error);
          failureCount++;

          await EmailLog.create({
            customer_id: customerData.customer._id,
            email_type: 'overdue_reminder',
            status: 'failed',
            error_message: error.message,
            email_address: customerData.customer.email,
            sent_at: new Date(),
          });
        }
      }

      console.log(
        `✅ Batch email send completed: ${successCount} sent, ${failureCount} failed`
      );
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get email sending status/history (simple version)
exports.getEmailStatus = async (req, res) => {
  try {
    // This is a placeholder. In production, you'd query an EmailLog model
    res.status(200).json({
      message: 'Email logging system is active',
      note: 'Check server console logs for email sending status',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send test email
exports.sendTestEmailController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const result = await sendTestEmail(email);

    res.status(200).json({
      message: 'Test email sent successfully',
      messageId: result.messageId,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to send test email',
      error: error.message,
    });
  }
};
