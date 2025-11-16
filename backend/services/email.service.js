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

// Send password verification code email
exports.sendPasswordVerificationEmail = async (email, code, userName) => {
  try {
    const transporter = createTransporter();
    
    const companyName = process.env.COMPANY_NAME || 'Your Company';
    
    // Simple HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .code-box { background: white; border: 2px solid #4caf50; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-size: 32px; font-weight: bold; color: #4caf50; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Change Verification</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${userName}</strong>,</p>
      
      <p>You have requested to change your password for your ${companyName} account.</p>
      
      <p>Please use the following verification code to proceed:</p>
      
      <div class="code-box">
        <div class="code">${code}</div>
        <p style="margin: 10px 0 0; color: #666; font-size: 14px;">This code will expire in 10 minutes</p>
      </div>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong> If you did not request this password change, please ignore this email and ensure your account is secure.
      </div>
      
      <p>For security reasons:</p>
      <ul>
        <li>This code can only be used once</li>
        <li>You have 3 attempts to enter the correct code</li>
        <li>The code will expire after 10 minutes</li>
      </ul>
      
      <p>If you need assistance, please contact our support team.</p>
      
      <p>Best regards,<br><strong>${companyName} Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"${companyName}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Password Change Verification Code - ${companyName}`,
      html: htmlContent,
      text: `
Hello ${userName},

You have requested to change your password for your ${companyName} account.

Your verification code is: ${code}

This code will expire in 10 minutes and can only be used once.
You have 3 attempts to enter the correct code.

If you did not request this password change, please ignore this email.

Best regards,
${companyName} Team
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password verification email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw error;
  }
};

// Send new user credentials email
exports.sendNewUserCredentials = async (email, username, password, userName) => {
  const companyName = process.env.COMPANY_NAME || 'POS System';
  const systemUrl = process.env.SYSTEM_URL || 'http://localhost:3000';

  const mailOptions = {
    from: `"${companyName}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Welcome to ${companyName} - Your Account Details`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .credentials-box {
            background: white;
            border: 2px solid #4caf50;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .credential-item {
            margin: 15px 0;
            padding: 10px;
            background: #f5f5f5;
            border-left: 4px solid #4caf50;
          }
          .credential-label {
            font-weight: bold;
            color: #4caf50;
            font-size: 14px;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .credential-value {
            font-size: 18px;
            font-family: 'Courier New', monospace;
            color: #333;
            word-break: break-all;
          }
          .button {
            display: inline-block;
            background: #4caf50;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Welcome to ${companyName}!</h1>
        </div>
        
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          
          <p>Your account has been created successfully! An administrator has set up your access to our system.</p>
          
          <div class="credentials-box">
            <h3 style="color: #4caf50; margin-top: 0;">Your Login Credentials</h3>
            
            <div class="credential-item">
              <div class="credential-label">Username</div>
              <div class="credential-value">${username}</div>
            </div>
            
            <div class="credential-item">
              <div class="credential-label">Email</div>
              <div class="credential-value">${email}</div>
            </div>
            
            <div class="credential-item">
              <div class="credential-label">Temporary Password</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${systemUrl}" class="button">Login to Your Account</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This is your temporary password</li>
              <li>Please change your password immediately after your first login</li>
              <li>Go to your profile settings to update your password</li>
              <li>Never share your password with anyone</li>
              <li>Keep this email secure or delete it after changing your password</li>
            </ul>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Click the button above or visit: <a href="${systemUrl}">${systemUrl}</a></li>
            <li>Login with your username and temporary password</li>
            <li>Navigate to your profile settings</li>
            <li>Change your password to something secure and memorable</li>
          </ol>
          
          <p>If you have any questions or need assistance, please contact your system administrator.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>${companyName} Team</strong>
          </p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to ${companyName}!

Hello ${userName},

Your account has been created successfully! An administrator has set up your access to our system.

YOUR LOGIN CREDENTIALS:
Username: ${username}
Email: ${email}
Temporary Password: ${password}

IMPORTANT SECURITY NOTICE:
- This is your temporary password
- Please change your password immediately after your first login
- Go to your profile settings to update your password
- Never share your password with anyone

NEXT STEPS:
1. Visit: ${systemUrl}
2. Login with your username and temporary password
3. Navigate to your profile settings
4. Change your password to something secure and memorable

If you have any questions or need assistance, please contact your system administrator.

Best regards,
${companyName} Team

This is an automated message. Please do not reply to this email.
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ New user credentials email sent successfully to:', email);
  } catch (error) {
    console.error('❌ Error sending new user credentials email:', error);
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

