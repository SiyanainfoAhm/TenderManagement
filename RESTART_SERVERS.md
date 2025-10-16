# 🔄 Restart Servers with Gmail Configuration

## ✅ Gmail SMTP Configured!

I've updated the email server to use your Gmail credentials:
- **Email:** jollyhires.dev@gmail.com
- **Password:** Configured
- **Service:** Gmail SMTP

---

## 🔄 Restart Required

The email server needs to restart to apply Gmail configuration.

### Step 1: Stop Current Servers

**In the terminal where servers are running:**
- Press **Ctrl + C** to stop both servers

### Step 2: Restart with Gmail

**Run:**
```bash
npm run dev:all
```

**You should see:**
```
[1] 📧 Email Server Started!
[1] 🌐 Server running on: http://localhost:3001
[1] ✅ SMTP Server is ready to send emails
[0] ➜  Local:   http://localhost:5175/
[0] ➜  Network: http://192.168.1.83:5175/
```

---

## 🧪 Test Email Now!

### Step 1: Open Application

Go to: http://192.168.1.83:5175

### Step 2: Login

- Email: `demo@admin1.com`
- Password: `demo123`

### Step 3: Go to Users Page

Click "Users" in sidebar

### Step 4: Click "Test Email" Button

**You should see:**
- Button shows loading state
- Terminal shows: "📧 Sending email to: saxena.jatin1987@gmail.com"
- Terminal shows: "✅ Email sent successfully!"
- Alert: "Test email sent successfully!"

### Step 5: Check Inbox

**Check:** saxena.jatin1987@gmail.com inbox
- Email from: "Tender Manager <jollyhires.dev@gmail.com>"
- Subject: "Test Email - Tender Manager Invitation System"
- Beautiful HTML email
- Should arrive within 1-2 minutes!

---

## ⚠️ Important Note

**If Gmail blocks the login:**

Google might block "less secure app" access. You need to:

1. **Enable 2-Step Verification:**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Create app password for "Tender Manager"
   - Use that 16-character password instead

**Let me know if you get a Gmail authentication error!**

---

## 🎯 Next Steps

1. **Stop servers** (Ctrl+C in terminal)
2. **Restart:** `npm run dev:all`
3. **Test:** Click "Test Email" button
4. **Check:** saxena.jatin1987@gmail.com inbox

---

**Restart the servers now and test the email!** 🚀

