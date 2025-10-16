# 📧 Setup Gmail for Production Email Sending

## Problem
MSG91 default domain (`ok5pr0.mailer91.com`) is for testing only and doesn't work in production.

## Solution: Use Gmail SMTP (Free & Easy)

---

## Step 1: Generate Gmail App Password

### 1.1. Enable 2-Factor Authentication
1. Go to: https://myaccount.google.com/security
2. Click **2-Step Verification**
3. Follow the steps to enable 2FA (if not already enabled)

### 1.2. Create App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with your Gmail account
3. **App name**: Enter `Tender Management App`
4. Click **Create**
5. **Copy the 16-character password** (looks like: `xxxx xxxx xxxx xxxx`)
6. **Save this password** - you'll need it for Vercel environment variables

---

## Step 2: Update Vercel Environment Variables

### 2.1. Go to Vercel Dashboard
1. Open: https://vercel.com/siyanainfos-projects/tender_management
2. Click **Settings** tab
3. Click **Environment Variables** in the left sidebar

### 2.2. Add Environment Variables

**Add Variable 1:**
- **Name**: `GMAIL_USER`
- **Value**: Your Gmail address (e.g., `your-email@gmail.com`)
- **Environment**: Production, Preview, Development (check all)
- Click **Save**

**Add Variable 2:**
- **Name**: `GMAIL_APP_PASSWORD`
- **Value**: The 16-character app password from Step 1.2 (e.g., `abcd efgh ijkl mnop`)
- **Environment**: Production, Preview, Development (check all)
- Click **Save**

---

## Step 3: Redeploy Application

After adding environment variables, you need to redeploy:

### Option A: Redeploy from Vercel Dashboard
1. Go to: https://vercel.com/siyanainfos-projects/tender_management
2. Click **Deployments** tab
3. Click the **...** (three dots) on the latest deployment
4. Click **Redeploy**
5. Confirm redeploy

### Option B: Redeploy from Terminal
```bash
# Make sure you're in the project directory
cd D:\Projects\TenderManagement\newtenderapp

# Commit the changes
git add api/send-email.js
git commit -m "Switch to Gmail SMTP for production email sending"
git push origin main

# Deploy to Vercel
vercel --prod
```

---

## Step 4: Test Email Sending

### 4.1. Test Invitation Email
1. Go to your deployed app: https://tendermanagement-ms3go3p03-siyanainfos-projects.vercel.app
2. Login as admin
3. Go to **Users** page
4. Click **Add User**
5. Enter an email address and click **Save**
6. Check if invitation email is sent successfully

### 4.2. Check for Errors
- Open browser console (F12)
- Look for any email-related errors
- If error occurs, check Vercel logs:
  - Go to: https://vercel.com/siyanainfos-projects/tender_management
  - Click **Deployments**
  - Click on latest deployment
  - Click **Functions** tab
  - Click on `api/send-email`
  - Check logs for errors

---

## Alternative Options

If Gmail doesn't work for you, here are alternatives:

### Option 2: Use Resend.com (Recommended for Production)
- **Free tier**: 100 emails/day, 3,000/month
- **Pros**: Built for transactional emails, better deliverability
- **Setup**: https://resend.com/docs/send-with-nodejs

### Option 3: Use SendGrid
- **Free tier**: 100 emails/day
- **Pros**: Enterprise-grade, detailed analytics
- **Setup**: https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs

### Option 4: Configure Custom Domain on MSG91
- **Cost**: Paid (MSG91 requires custom domain verification)
- **Steps**:
  1. Purchase a domain (e.g., yourdomain.com)
  2. Add domain to MSG91
  3. Verify domain ownership (DNS records)
  4. Update `api/send-email.js` with your domain

---

## Gmail SMTP Limits

### Free Gmail Account
- **Limit**: 500 emails per day
- **Suitable for**: Small to medium applications

### Google Workspace Account
- **Limit**: 2,000 emails per day
- **Cost**: $6/user/month
- **Suitable for**: Larger applications

---

## Troubleshooting

### Error: "Invalid credentials"
- Double-check your Gmail address in `GMAIL_USER`
- Verify the app password is correct (16 characters, no spaces)
- Make sure you're using an **App Password**, not your regular Gmail password

### Error: "Less secure app access"
- This error shouldn't occur with App Passwords
- If it does, enable "Less secure app access" in Gmail settings (not recommended)
- Better solution: Use App Password (as described above)

### Error: "Daily sending quota exceeded"
- You've hit Gmail's 500 emails/day limit
- Wait 24 hours or upgrade to Google Workspace
- Or switch to a different email service (Resend, SendGrid)

### Email goes to spam
- Add SPF and DKIM records to your domain (if you have one)
- Use a professional email address (e.g., noreply@yourdomain.com)
- Avoid spam trigger words in subject line

---

## Summary

### What We Changed
✅ Switched from MSG91 default domain to Gmail SMTP
✅ Used environment variables for credentials (secure)
✅ Updated `api/send-email.js` to use Gmail

### What You Need to Do
1. ✅ Generate Gmail App Password
2. ✅ Add `GMAIL_USER` and `GMAIL_APP_PASSWORD` to Vercel
3. ✅ Redeploy application
4. ✅ Test email sending

### Production-Ready
Your application will now send emails via Gmail in production! 🎉

---

## Need Help?

If you encounter issues:
1. Check Vercel logs (as described in Step 4.2)
2. Verify environment variables are set correctly
3. Test with a different Gmail account
4. Consider using Resend.com or SendGrid as alternatives

**Email sending should work perfectly after these changes!** ✉️

