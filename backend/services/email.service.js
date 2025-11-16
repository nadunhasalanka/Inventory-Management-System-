const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs/promises');
const path = require('path');

// Email configuration
const createTransporter = () => {
  // For development: Use Gmail
  // For production: Switch to SendGrid, AWS SES, or Resend
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: process.env.EMAIL_PASSWORD, // Your Gmail App Password (not regular password!)
    },
  });
};

// Load and compile email template
const loadTemplate = async (templateName) => {
  try {
    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(templateContent);
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw error;
  }
};

// Format currency
handlebars.registerHelper('currency', (value) => {
  return `$${parseFloat(value || 0).toFixed(2)}`;
});

// Format date
handlebars.registerHelper('formatDate', (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// Comparison helpers
handlebars.registerHelper('gt', (a, b) => {
  return a > b;
});

handlebars.registerHelper('lt', (a, b) => {
  return a < b;
});

handlebars.registerHelper('eq', (a, b) => {
  return a === b;
});

// Send overdue payment reminder email
exports.sendOverdueReminderEmail = async (customerData) => {
  try {
    const transporter = createTransporter();
    const template = await loadTemplate('overduePayment');

    // Prepare data for template
    const emailData = {
      customerName: customerData.customer.name,
      companyName: process.env.COMPANY_NAME || 'Your Company',
      totalOutstanding: customerData.totalOutstanding,
      ordersCount: customerData.ordersCount,
      daysOverdue: customerData.daysOverdue,
      orders: customerData.overdueOrders.map(order => ({
        orderNumber: order.order_number,
        orderDate: order.order_date || order.createdAt,
        dueDate: order.allowed_until,
        amount: order.credit_outstanding,
        daysOverdue: Math.floor(
          (new Date() - new Date(order.allowed_until || order.due_date)) / (1000 * 60 * 60 * 24)
        ),
      })),
      paymentInstructions: process.env.PAYMENT_INSTRUCTIONS || 'Please contact us to arrange payment.',
      contactEmail: process.env.CONTACT_EMAIL || process.env.EMAIL_USER,
      contactPhone: process.env.CONTACT_PHONE || '',
      currentYear: new Date().getFullYear(),
    };

    const htmlContent = template(emailData);

    const mailOptions = {
      from: `"${emailData.companyName}" <${process.env.EMAIL_USER}>`,
      to: customerData.customer.email,
      subject: `Payment Reminder: $${customerData.totalOutstanding.toFixed(2)} Outstanding - ${emailData.companyName}`,
      html: htmlContent,
      // Plain text fallback
      text: `
Dear ${customerData.customer.name},

This is a reminder about your overdue payment.

Total Outstanding: $${customerData.totalOutstanding.toFixed(2)}
Number of Overdue Orders: ${customerData.ordersCount}
Days Overdue: ${customerData.daysOverdue}

Please contact us at ${emailData.contactEmail} to arrange payment as soon as possible.

Thank you,
${emailData.companyName}
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      email: customerData.customer.email,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message,
      email: customerData.customer.email,
    };
  }
};

// Send test email (for configuration testing)
exports.sendTestEmail = async (recipientEmail) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: 'Test Email - Email Service Configuration',
      html: '<h1>Email Service Working!</h1><p>Your email configuration is set up correctly.</p>',
      text: 'Email Service Working! Your email configuration is set up correctly.',
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
};

// Validate email configuration
exports.validateEmailConfig = () => {
  const requiredEnvVars = ['EMAIL_USER', 'EMAIL_PASSWORD'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing email configuration: ${missing.join(', ')}`);
  }
  
  return true;
};
