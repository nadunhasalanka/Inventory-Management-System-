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

// Send Purchase Order email to supplier
exports.sendPurchaseOrderEmail = async (poData) => {
  try {
    const transporter = createTransporter();
    const template = await loadTemplate('purchaseOrder');

    // Prepare data for template
    const emailData = {
      poNumber: poData.po_number,
      supplierName: poData.supplier.name,
      companyName: process.env.COMPANY_NAME || 'Your Company',
      orderDate: poData.order_date,
      expectedDeliveryDate: poData.expected_delivery_date || null,
      paymentTerms: poData.supplier.terms || null,
      items: poData.line_items.map(item => ({
        name: item.name || 'Unknown Product',
        sku: item.sku || 'N/A',
        quantity: item.quantity_ordered || 0,
        unitCost: item.unit_cost || 0,
        total: item.total_cost || 0,
      })),
      subtotal: poData.subtotal || 0,
      taxAmount: poData.tax_amount || 0,
      total: poData.total || poData.subtotal || 0,
      notes: poData.notes || null,
      contactEmail: process.env.CONTACT_EMAIL || process.env.EMAIL_USER,
      contactPhone: process.env.CONTACT_PHONE || '',
      currentYear: new Date().getFullYear(),
    };

    const htmlContent = template(emailData);

    const mailOptions = {
      from: `"${emailData.companyName} Purchasing" <${process.env.EMAIL_USER}>`,
      to: poData.supplier.email,
      subject: `Purchase Order ${poData.po_number} - ${emailData.companyName}`,
      html: htmlContent,
      // Plain text fallback
      text: `
Dear ${poData.supplier.name},

Purchase Order: ${poData.po_number}
Order Date: ${new Date(poData.order_date).toLocaleDateString()}
${poData.expected_delivery_date ? `Expected Delivery: ${new Date(poData.expected_delivery_date).toLocaleDateString()}` : ''}

Items Ordered:
${poData.line_items.map(item => 
  `- ${item.name} (SKU: ${item.sku}) - Qty: ${item.quantity_ordered} @ Rs ${(item.unit_cost || 0).toFixed(2)} = Rs ${(item.total_cost || 0).toFixed(2)}`
).join('\n')}

Subtotal: Rs ${(poData.subtotal || 0).toFixed(2)}
${poData.tax_amount ? `Tax: Rs ${(poData.tax_amount || 0).toFixed(2)}` : ''}
Total: Rs ${((poData.total || poData.subtotal) || 0).toFixed(2)}

${poData.notes ? `Notes: ${poData.notes}` : ''}

Please confirm receipt and let us know if you have any questions.

Thank you,
${emailData.companyName} Purchasing Team
${emailData.contactEmail}
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Purchase Order email sent:', {
      poNumber: poData.po_number,
      supplier: poData.supplier.name,
      email: poData.supplier.email,
      messageId: info.messageId
    });
    
    return {
      success: true,
      messageId: info.messageId,
      email: poData.supplier.email,
    };
  } catch (error) {
    console.error('❌ Error sending PO email:', error);
    return {
      success: false,
      error: error.message,
      email: poData.supplier?.email,
    };
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
