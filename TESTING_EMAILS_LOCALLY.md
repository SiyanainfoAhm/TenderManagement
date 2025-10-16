# ✅ Testing Emails Locally - Complete Guide

## 🎉 Email Server Now Running!

I've set up a local email server that works on your IP:port!

---

## 🚀 What's Running Now

### Two Servers:

**1. Frontend (Vite):**
- URL: http://localhost:5174
- Your React app

**2. Email Server (Express):**
- URL: http://localhost:3001
- Handles email sending via MSG91 SMTP
- API endpoint: http://localhost:3001/api/send-email

---

## ✅ How to Use

### Option A: Run Both Servers Together (Recommended)

**Single command runs both:**
```bash
npm run dev:all
```

**This starts:**
- ✅ Vite dev server on port 5174 (or 5173)
- ✅ Email server on port 3001
- ✅ Both run simultaneously

---

### Option B: Run Separately

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Email Server:**
```bash
npm run dev:email
```

---

## 🧪 Testing Email Invitations

### Step 1: Make Sure Both Servers Are Running

Check these URLs work:
- Frontend: http://localhost:5174
- Email API: http://localhost:3001/health

### Step 2: Fix RLS Policies (If Not Done)

**Run in Supabase SQL Editor:**
- File: `fix-rls-policies.sql`
- This allows invitation creation

### Step 3: Test Invitation Flow

1. **Login** to http://localhost:5174
   - Email: `demo@admin1.com`
   - Password: `demo123`

2. **Go to Users page**

3. **Click "Invite User"**

4. **Enter email:**
   - Try: `test@example.com` (new user)
   - Or: `user1@admin2.com` (existing user)

5. **Select role:** User or Admin

6. **Click "Search User"**

7. **Click "Confirm & Send Invitation"**

8. **Check the terminal/console**
   - You should see email server logs
   - "📧 Sending email to: test@example.com"
   - "✅ Email sent successfully!"

9. **Check email inbox!**
   - Email should arrive (if email is real)
   - Click invitation link
   - Test accept/reject

---

## 📧 Email Server Logs

**When invitation is sent, you'll see:**

```
📧 Sending email to: test@example.com
📝 Subject: You've been invited to join Company 1 on Tender Manager
✅ Email sent successfully!
📨 Message ID: <abc123@mailer91.com>
📬 Response: 250 OK
```

---

## 🔍 Troubleshooting

### Email server not starting?

**Check if running:**
```bash
# In a new terminal:
curl http://localhost:3001/health
```

**Should return:**
```json
{"status":"ok","service":"Email Server"}
```

### Port 3001 already in use?

**Change port in `server/email-server.js`:**
```javascript
const PORT = 3002  // Change to different port
```

### Email not sending?

**Check logs in email server terminal:**
- Look for errors
- Check MSG91 SMTP connection
- Verify credentials

### Frontend can't reach email server?

**Check CORS is enabled:**
- Already configured in `server/email-server.js`
- Should allow requests from localhost:5174

---

## 🎯 Network Access

### Accessing from Other Devices:

**Frontend:**
```
Local: http://localhost:5174
Network: http://192.168.1.83:5174
```

**Email API:**
```
Local: http://localhost:3001
Network: http://192.168.1.83:3001
```

**Update emailService.ts to use network IP if needed:**
```typescript
const response = await fetch('http://192.168.1.83:3001/api/send-email', {
  // ...
})
```

---

## ✅ Current Setup

**Running:**
- ✅ Frontend on http://localhost:5174
- ✅ Email server on http://localhost:3001
- ✅ MSG91 SMTP configured
- ✅ Ready to send emails!

**Commands:**
- `npm run dev` - Frontend only
- `npm run dev:email` - Email server only
- `npm run dev:all` - Both together ⭐

---

## 🧪 Quick Test

**Test email server directly:**

```bash
# In a new terminal or PowerShell:
curl -X POST http://localhost:3001/api/send-email -H "Content-Type: application/json" -d "{\"to\":\"your-email@example.com\",\"subject\":\"Test\",\"html\":\"<h1>Test Email</h1>\"}"
```

**Or use Postman/Insomnia:**
- URL: http://localhost:3001/api/send-email
- Method: POST
- Body (JSON):
```json
{
  "to": "your-email@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello from Tender Manager!</h1>"
}
```

---

## 📊 System Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│  React Frontend     │         │  Email Server        │
│  localhost:5174     │────────▶│  localhost:3001      │
│                     │ POST    │                      │
│  Invite User Button │ /api    │  nodemailer          │
└─────────────────────┘         └──────────┬───────────┘
                                           │
                                           │ SMTP
                                           ▼
                                ┌──────────────────────┐
                                │  MSG91 SMTP          │
                                │  smtp.mailer91.com   │
                                │                      │
                                │  Sends Email ✉️      │
                                └──────────────────────┘
```

---

## 🎉 Benefits of Local Email Server

### For Development:
- ✅ Test emails on localhost
- ✅ See email server logs in real-time
- ✅ Debug email sending issues
- ✅ No need to deploy to test
- ✅ Works on your local network
- ✅ Fast iteration

### For Testing:
- ✅ Test with real emails
- ✅ Verify email template
- ✅ Check MSG91 integration
- ✅ Test accept/reject flow
- ✅ Complete end-to-end testing

---

## 📝 Summary

**Email Server:** ✅ Running on port 3001  
**Frontend:** ✅ Running on port 5174  
**MSG91 SMTP:** ✅ Configured  
**Status:** ✅ Ready to send emails locally!  

---

## 🚀 Next Steps

1. **Make sure both servers are running:**
   ```bash
   npm run dev:all
   ```

2. **Test invitation:**
   - Go to Users page
   - Click "Invite User"
   - Enter email
   - Send invitation
   - **Check email inbox!** 📧

3. **Watch logs:**
   - Check terminal for email server logs
   - Should see "Email sent successfully!"

---

**Both servers should be running now!**

**Test the invitation flow and check your email inbox!** 🎉

Let me know if emails are being sent now! 📧

