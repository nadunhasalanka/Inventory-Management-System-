# 📧 Email Notification Service - Setup Guide

## ✅ What's Been Implemented

### Files Created:
1. **`services/email.service.js`** - Core email sending logic using Nodemailer
2. **`templates/emails/overduePayment.html`** - Professional HTML email template
3. **`controllers/notification.controller.js`** - API endpoints for sending emails
4. **`routes/notification.routes.js`** - Route definitions
5. **`jobs/emailScheduler.js`** - Automatic scheduled email sending (cron job)

### Features:
- ✅ Non-blocking email sending (instant API response)
- ✅ Beautiful HTML email templates
- ✅ Send to specific customer or all overdue customers
- ✅ Automatic daily/weekly scheduling
- ✅ Rate limiting (200ms between emails)
- ✅ Email logging to console
- ✅ Test email functionality

---

## 🚀 Setup Instructions

### Step 1: Configure Gmail for Sending Emails

#### Option A: Using Gmail (Easiest for Development)

1. **Enable 2-Factor Authentication** on your Gmail account:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**:
   - Visit https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Update `.env` file**:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # Your 16-char app password
   COMPANY_NAME=Your Company Name
   CONTACT_EMAIL=support@yourcompany.com
   CONTACT_PHONE=+1-234-567-8900
   ```

#### Option B: Using Custom SMTP (For Production)

Edit `services/email.service.js`:
```javascript
return nodemailer.createTransporter({
  host: 'smtp.yourprovider.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

---

### Step 2: Test Email Configuration

Start your backend server:
```bash
cd backend
npm run dev
```

Test the email service using curl or Postman:
```bash
curl -X POST http://localhost:3001/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"email": "your-test-email@gmail.com"}'
```

You should receive a test email. If successful, setup is complete! ✅

---

## 📡 API Endpoints

### 1. Send Test Email
**POST** `/api/notifications/test-email`
```json
{
  "email": "test@example.com"
}
```
**Response:**
```json
{
  "message": "Test email sent successfully",
  "messageId": "<unique-id>"
}
```

---

### 2. Send Reminder to Specific Customer
**POST** `/api/notifications/customers/:customerId/send-reminder`

**Response** (Immediate):
```json
{
  "message": "Email reminder is being sent in the background",
  "status": "processing",
  "customerId": "12345"
}
```

---

### 3. Send Reminders to All Overdue Customers
**POST** `/api/notifications/send-all-reminders?minDaysOverdue=7`

**Query Parameters:**
- `minDaysOverdue` (optional) - Only send to customers overdue by X days

**Response** (Immediate):
```json
{
  "message": "Email reminders are being sent in the background",
  "status": "processing",
  "totalCustomers": 25,
  "estimatedTime": "5 seconds"
}
```

---

### 4. Get Email Status
**GET** `/api/notifications/status`

**Response:**
```json
{
  "message": "Email logging system is active",
  "note": "Check server console logs for email sending status"
}
```

---

## ⏰ Automatic Scheduling

The email scheduler automatically runs based on your `.env` configuration:

### Schedule Options (Edit `EMAIL_SCHEDULE` in `.env`):

```bash
# Daily at 9:00 AM
EMAIL_SCHEDULE=0 9 * * *

# Every Monday at 9:00 AM
EMAIL_SCHEDULE=0 9 * * 1

# 1st and 15th of each month at 9:00 AM
EMAIL_SCHEDULE=0 9 1,15 * *

# Every day at 9:00 AM and 3:00 PM
EMAIL_SCHEDULE=0 9,15 * * *
```

### Cron Syntax:
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday=0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

---

## 🖥️ Frontend Integration

### Add to `services/notificationsApi.js`:

```javascript
import api from '../utils/api';

// Send reminder to specific customer
export const sendCustomerReminder = (customerId) => {
  return api.post(`/api/notifications/customers/${customerId}/send-reminder`);
};

// Send reminders to all overdue customers
export const sendAllReminders = (minDaysOverdue = 0) => {
  return api.post(`/api/notifications/send-all-reminders?minDaysOverdue=${minDaysOverdue}`);
};

// Test email configuration
export const sendTestEmail = (email) => {
  return api.post('/api/notifications/test-email', { email });
};
```

### Add Button to IndebtedClients.jsx:

```javascript
import { sendCustomerReminder, sendAllReminders } from '../services/notificationsApi';
import { useMutation } from '@tanstack/react-query';

// Inside your component:
const emailMutation = useMutation({
  mutationFn: sendCustomerReminder,
  onSuccess: () => {
    alert('Email reminder sent in the background!');
  },
});

// In the UI:
<Button
  startIcon={<EmailIcon />}
  onClick={() => emailMutation.mutate(customerId)}
  disabled={emailMutation.isLoading}
>
  Send Email Reminder
</Button>
```

---

## 📊 Console Logs

Watch your backend console for email sending status:

```bash
✅ Email configuration validated
✅ Email scheduler started with schedule: 0 9 * * *
📧 Reminders will be sent automatically at scheduled times

# When sending emails:
📧 Sending reminders to 15 customers...
✅ Email sent to John Doe
✅ Email sent to Jane Smith
...
✅ Scheduled job completed: 15 sent, 0 failed
```

---

## 🔥 Common Issues & Solutions

### Issue: "Invalid login" error
**Solution:** Make sure you're using Gmail App Password, not your regular password.

### Issue: "530 5.7.0 Must issue a STARTTLS command first"
**Solution:** Check your SMTP settings. For Gmail, use the settings shown in Step 1.

### Issue: Emails going to spam
**Solution:**
1. Add SPF and DKIM records to your domain
2. Use a professional email service (SendGrid, AWS SES)
3. Ask recipients to whitelist your email

### Issue: Rate limiting / "Too many emails"
**Solution:** Increase the delay in `notification.controller.js`:
```javascript
await new Promise((resolve) => setTimeout(resolve, 500)); // Increase from 200ms to 500ms
```

---

## 🎯 Next Steps (Optional Enhancements)

1. **Create EmailLog Model** for database tracking:
   - Track sent emails
   - Store success/failure status
   - View email history in UI

2. **Upgrade to SendGrid/Resend** for production:
   - Better deliverability
   - Higher sending limits
   - Email analytics

3. **Add Queue System (Bull + Redis)**:
   - Guaranteed email delivery
   - Automatic retries
   - Job progress tracking

4. **Email Preferences**:
   - Let customers opt-out
   - Choose notification frequency
   - Unsubscribe links

---

## 🧪 Testing Checklist

- [ ] Update `.env` with email credentials
- [ ] Restart backend server
- [ ] Send test email using API
- [ ] Check email received successfully
- [ ] Test sending to specific customer
- [ ] Test sending to all overdue customers
- [ ] Verify rate limiting (check logs)
- [ ] Confirm scheduler is active (check logs)
- [ ] Test manual trigger from UI (if added)

---

## 📝 Email Template Customization

Edit `templates/emails/overduePayment.html` to customize:
- Colors and branding
- Company logo
- Payment instructions
- Footer content
- Email copy/text

---

## 🚀 You're All Set!

Your email notification system is now:
- ✅ Non-blocking (instant API responses)
- ✅ Automatically scheduled
- ✅ Rate-limited (safe for Gmail limits)
- ✅ Professional HTML templates
- ✅ Ready for production

**Need help?** Check the console logs or refer to this guide.
