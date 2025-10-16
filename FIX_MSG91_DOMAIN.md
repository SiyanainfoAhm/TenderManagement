# 🔧 Fix MSG91 Domain Restriction

## ⚠️ Current Issue

MSG91 default domain (`ok5pr0.mailer91.com`) can't send to external emails like Gmail without verification.

**Error:** "Default domains are for test purposes only"

---

## ✅ Quick Fix - Add Test Recipient

### Step 1: Login to MSG91 Dashboard

1. Go to: https://msg91.com
2. Login with your account

### Step 2: Add Test Email

1. Go to **Email** section
2. Find **"Test Recipients"** or **"Allowed Recipients"**
3. Add email: `saxena.jatin1987@gmail.com`
4. Verify the email (MSG91 will send verification)
5. Accept verification

### Step 3: Test Again

1. Go back to your app: http://192.168.1.83:5175
2. Users page
3. Click **"Test Email"** button
4. Should send successfully now!

**Time:** 5 minutes

---

## 🎯 Alternative: Use Custom Domain (Production)

### For Production Use:

**Setup your own domain:**

1. **Buy a domain** (if you don't have one)
   - GoDaddy, Namecheap, etc.
   - Example: `tendermanager.com`

2. **Add domain in MSG91:**
   - Go to MSG91 → Email → Domains
   - Click "Add Domain"
   - Enter your domain

3. **Verify domain:**
   - Add DNS records (SPF, DKIM, DMARC)
   - MSG91 provides the records
   - Add them in your domain registrar

4. **Use custom sender:**
   - Change sender to: `noreply@yourdomain.com`
   - Can send to any email!

**Time:** 20-30 minutes  
**Benefit:** Professional, no restrictions

---

## 💡 Temporary Solution: Use Brevo Instead

**Brevo has no domain restrictions!**

### Quick Setup:

1. **Sign up:** https://brevo.com
2. **Get API key:** Settings → SMTP & API
3. **Update email server:**

**Change in `server/email-server.js`:**

```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@example.com',  // Your Brevo login
    pass: 'your-brevo-smtp-key'       // From Brevo dashboard
  }
})
```

**Benefits:**
- ✅ 300 emails/day free
- ✅ No domain verification needed
- ✅ Can send to any email immediately
- ✅ Works for testing instantly

**Time:** 10 minutes

---

## 🎯 My Recommendation

**For Quick Testing (Right Now):**

### Option A: Add saxena.jatin1987@gmail.com to MSG91
- Login to MSG91
- Add as test recipient
- Verify email
- Test immediately

### Option B: Switch to Brevo (Easier)
- Sign up for Brevo (free)
- Get SMTP key
- Update email server
- Send to any email!

---

## 🚀 What to Do Now

**Choose one:**

1. **MSG91 + Add Test Recipient** (5 min)
   - Keep MSG91
   - Add your Gmail to allowed list
   - Test with restricted emails

2. **Switch to Brevo** (10 min)
   - Easier for testing
   - No restrictions
   - 300 emails/day free

3. **Setup Custom Domain** (30 min)
   - Professional solution
   - For production
   - No restrictions

---

## ✅ Test Email Button Added!

**Location:** Users page, top-right  
**Sends to:** saxena.jatin1987@gmail.com  
**Purpose:** Test email system  

**Once MSG91 is configured, click "Test Email" button to verify!**

---

**Which option do you prefer?** Let me know and I'll help you set it up! 🚀

