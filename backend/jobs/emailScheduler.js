const cron = require('node-cron');
const { validateEmailConfig } = require('../services/email.service.js');

// Import the controller function
let sendAllOverdueRemindersBackground;

// Dynamic import to avoid circular dependencies
const initScheduler = async () => {
  
  // Create a background version that doesn't need req/res
  sendAllOverdueRemindersBackground = async () => {
    try {
      console.log('🕐 Scheduled email reminder job started...');
      
      const Customer = require('../models/Customer.model.js');
      const SalesOrder = require('../models/SalesOrder.model.js');
      const { sendOverdueReminderEmail } = require('../services/email.service.js');
      
      // Fetch overdue customers
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueOrders = await SalesOrder.find({
        payment_status: { $in: ['Pending Credit', 'Partially Paid'] },
        credit_outstanding: { $gt: 0 },
        allowed_until: { $lt: today },
      })
        .populate('customer_id')
        .sort({ allowed_until: 1 });

      // Group by customer
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

      const overdueCustomers = Array.from(customerMap.values()).map((item) => {
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

      // Filter customers with email
      const customersWithEmail = overdueCustomers.filter((c) => c.customer.email);

      console.log(`📧 Sending reminders to ${customersWithEmail.length} customers...`);

      let successCount = 0;
      let failureCount = 0;

      // Send emails
      for (const customerData of customersWithEmail) {
        try {
          const result = await sendOverdueReminderEmail(customerData);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
          
          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error sending email to ${customerData.customer.name}:`, error);
          failureCount++;
        }
      }

      console.log(`✅ Scheduled job completed: ${successCount} sent, ${failureCount} failed`);
    } catch (error) {
      console.error('❌ Error in scheduled email job:', error);
    }
  };
};

// Schedule configuration
const scheduleConfig = {
  // Daily at 9:00 AM
  daily: '0 9 * * *',
  
  // Every Monday at 9:00 AM
  weekly: '0 9 * * 1',
  
  // 1st and 15th of each month at 9:00 AM
  biweekly: '0 9 1,15 * *',
  
  // Every day at 9:00 AM and 3:00 PM
  twiceDaily: '0 9,15 * * *',
};

// Start the scheduler
exports.startEmailScheduler = async () => {
  try {
    // Validate email configuration before starting
    try {
      validateEmailConfig();
      console.log('✅ Email configuration validated');
    } catch (error) {
      console.warn('⚠️  Email configuration incomplete:', error.message);
      console.warn('⚠️  Scheduler will not send emails until configuration is complete');
      return;
    }

    // Initialize the scheduler
    await initScheduler();

    // Choose your schedule from scheduleConfig above
    const selectedSchedule = process.env.EMAIL_SCHEDULE || scheduleConfig.daily;

    // Schedule the job
    cron.schedule(selectedSchedule, sendAllOverdueRemindersBackground, {
      timezone: process.env.TIMEZONE || 'America/New_York', // Set your timezone
    });

    console.log(`✅ Email scheduler started with schedule: ${selectedSchedule}`);
    console.log(`📧 Reminders will be sent automatically at scheduled times`);
  } catch (error) {
    console.error('❌ Error starting email scheduler:', error);
  }
};

// Stop the scheduler (for graceful shutdown)
exports.stopEmailScheduler = () => {
  cron.getTasks().forEach((task) => task.stop());
  console.log('Email scheduler stopped');
};

// Manual trigger (for testing)
exports.triggerSchedulerManually = async () => {
  console.log('🧪 Manually triggering email scheduler...');
  await initScheduler();
  await sendAllOverdueRemindersBackground();
};
