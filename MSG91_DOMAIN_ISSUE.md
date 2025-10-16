# ⚠️ MSG91 Domain Restriction Issue

## 🔍 The Error

```
554 5.7.1 Domain ok5pr0.mailer91.com is not allowed to send: 
Default domains are for test purposes only. 
Please add your own domain or send email to company users 
who have accepted invite and are enabled.
```

## 📝 What This Means

MSG91's default domain (`ok5pr0.mailer91.com`) is restricted and can only send to:
- ✅ Verified company email addresses
- ✅ Users who have accepted invites in MSG91 dashboard
- ❌ Not to random email addresses (like gmail.com)

## ✅ Solutions

### Option 1: Add Your Own Domain (Production Ready)

**Steps:**
1. Login to MSG91 dashboard
2. Go to Email Settings
3. Add your custom domain (e.g., `yourdomain.com`)
4. Verify domain via DNS records
5. Use `noreply@yourdomain.com` as sender

**Time:** 15-20 minutes

### Option 2: Add Test Recipients in MSG91

**Steps:**
1. Login to MSG91 dashboard
2. Go to Email → Recipients
3. Add test email addresses
4. Verify/accept them
5. Can send to those addresses

**Time:** 5 minutes

### Option 3: Use Different Email Service (Quick)

**Brevo (Free 300/day):**
- No domain verification needed
- Works immediately
- Can send to any email
- Free tier more generous for testing

---

## 💡 Recommendation

**For Testing:** Use Brevo (quick, no domain needed)  
**For Production:** Setup custom domain in MSG91

---

## 🎯 Next Step

I'll add a "Test Email" button that sends to `saxena.jatin1987@gmail.com` so you can verify the email template even if MSG91 blocks it.

