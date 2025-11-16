# 📧 Email Service - Quick Reference

## 🚀 Quick Start (2 Minutes)

### 1. Update `.env`:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
COMPANY_NAME=Your Company
```

### 2. Get Gmail App Password:
https://myaccount.google.com/apppasswords

### 3. Restart Backend:
```bash
npm run dev
```

### 4. Test:
```bash
curl -X POST http://localhost:3001/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email": "test@example.com"}'
```

---

## 📡 API Endpoints

```javascript
// Send to one customer
POST /api/notifications/customers/:id/send-reminder

// Send to all overdue customers
POST /api/notifications/send-all-reminders?minDaysOverdue=7

// Test email
POST /api/notifications/test-email
Body: { "email": "test@example.com" }

// Check status
GET /api/notifications/status
```

---

## 🎨 Frontend Code (Copy & Paste)

### In IndebtedClients.jsx:

```javascript
// Add import at top:
import { EmailOutlined as EmailIcon } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import api from '../utils/api';

// Add mutation inside component:
const emailMutation = useMutation({
  mutationFn: (customerId) => 
    api.post(`/api/notifications/customers/${customerId}/send-reminder`),
  onSuccess: () => alert('Email sent in background!'),
});

// Add button next to WhatsApp button:
<IconButton
  color="primary"
  onClick={() => emailMutation.mutate(customerData.customer._id)}
  title="Send Email Reminder"
  disabled={emailMutation.isLoading}
>
  <EmailIcon />
</IconButton>
```

---

## ⏰ Cron Schedule Reference

```bash
# Every day at 9 AM
EMAIL_SCHEDULE=0 9 * * *

# Every Monday at 9 AM
EMAIL_SCHEDULE=0 9 * * 1

# 1st and 15th at 9 AM
EMAIL_SCHEDULE=0 9 1,15 * *

# Twice daily (9 AM and 3 PM)
EMAIL_SCHEDULE=0 9,15 * * *
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid login" | Use Gmail App Password, not regular password |
| "Must issue STARTTLS" | Check SMTP settings in email.service.js |
| Emails go to spam | Use professional email service (SendGrid) |
| "Too many emails" | Increase delay in controller (200ms → 500ms) |

---

## 📊 Console Logs to Watch

```bash
# On startup:
✅ Email configuration validated
✅ Email scheduler started with schedule: 0 9 * * *

# When sending:
📧 Sending reminders to 15 customers...
✅ Email sent to John Doe
✅ Batch email send completed: 15 sent, 0 failed
```

---

## 📁 Files Created

- `services/email.service.js` - Email logic
- `controllers/notification.controller.js` - API handlers
- `routes/notification.routes.js` - Routes
- `jobs/emailScheduler.js` - Cron scheduler
- `templates/emails/overduePayment.html` - Email template

---

## 💡 Key Benefits

✅ **Non-blocking** - API responds instantly
✅ **Automatic** - Cron job runs daily/weekly
✅ **Rate-limited** - Safe for Gmail (500/day limit)
✅ **Professional** - Beautiful HTML email template
✅ **Scalable** - Easy to upgrade to SendGrid later

---

## 📖 Full Docs

See `EMAIL_SETUP_GUIDE.md` for complete documentation.
