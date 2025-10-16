# 📧 Invitation System - Implementation Plan

## 🎯 How It Will Work

### Complete Flow:

```
1. Admin invites user
   ↓
2. System creates invitation record
   ↓
3. Email sent to user with invitation link
   ↓
4. User clicks link in email
   ↓
5. User sees invitation page
   ↓
6. User can Accept or Reject
   ↓
7a. Accept → Gets access to company
7b. Reject → Invitation declined
```

---

## 📊 Database Changes Needed

### Table: tender1_company_invitations (Already Exists!)

This table will store pending invitations:

```sql
CREATE TABLE tender1_company_invitations (
  id UUID,
  company_id UUID,              -- Which company
  email VARCHAR(255),            -- Who to invite
  role VARCHAR(50),              -- Their role
  invited_by UUID,               -- Who invited them
  invitation_token VARCHAR(255), -- Unique token for email link
  expires_at TIMESTAMP,          -- Expiration (e.g., 7 days)
  accepted BOOLEAN,              -- Has it been accepted?
  accepted_at TIMESTAMP,         -- When accepted
  created_at TIMESTAMP
);
```

**Already created!** ✅

---

## 🔧 Implementation Steps

### Step 1: Email Service Setup

**Options:**
1. **Supabase Auth Email** (Recommended - Free)
2. **SendGrid** (Professional)
3. **Resend** (Modern, developer-friendly)
4. **NodeMailer** (Self-hosted)

**I recommend:** Supabase Edge Functions + Resend (easy setup)

---

### Step 2: Invitation Creation

When admin clicks "Invite":

```typescript
// 1. Create invitation record
const invitation = {
  company_id: selectedCompany.company_id,
  email: 'user@example.com',
  role: 'user',
  invited_by: currentUser.id,
  invitation_token: generateUniqueToken(), // Random UUID
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  accepted: false
}

// 2. Insert into database
await supabase.from('tender1_company_invitations').insert(invitation)

// 3. Send email
await sendInvitationEmail({
  to: 'user@example.com',
  companyName: 'Company 1',
  inviterName: 'Demo Admin',
  invitationLink: `https://yourapp.com/invitations/${invitation.invitation_token}`
})
```

---

### Step 3: Email Template

**Subject:** "You've been invited to join [Company Name] on Tender Manager"

**Body:**
```html
Hi there,

Demo Admin has invited you to join Company 1 on Tender Manager.

Role: User
Company: Company 1

Click the link below to accept this invitation:
[Accept Invitation]

This invitation expires in 7 days.

If you don't want to join, you can ignore this email.
```

---

### Step 4: Invitation Page

**URL:** `/invitations/:token`

**What user sees:**

```
┌──────────────────────────────────────┐
│        🏢                            │
│                                      │
│  You've Been Invited!                │
│                                      │
│  Demo Admin has invited you to join  │
│  Company 1 as a User.                │
│                                      │
│  Company: Company 1                  │
│  Role: User                           │
│  Invited by: Demo Admin              │
│                                      │
│  [Reject Invitation] [Accept & Join] │
└──────────────────────────────────────┘
```

---

### Step 5: Accept/Reject Logic

**If Accept:**
```typescript
// 1. Verify token is valid and not expired
// 2. Check if user is logged in
//    - If not logged in → redirect to login/signup
//    - If logged in → proceed
// 3. Add user to company via tender1_add_user_to_company()
// 4. Mark invitation as accepted
// 5. Redirect to dashboard with new company
```

**If Reject:**
```typescript
// 1. Mark invitation as rejected
// 2. Show message: "Invitation declined"
// 3. Delete invitation record (optional)
```

---

## 📝 Implementation Complexity

### Simple Version (No Email - For Now):
- ✅ Create invitation record in database
- ✅ Show "Invitation sent" message
- ✅ Admin can see pending invitations
- ❌ No email (manual link sharing)
- User visits `/invitations/[token]` manually

### Full Version (With Email):
- ✅ Create invitation record
- ✅ Send automated email
- ✅ User clicks link in email
- ✅ Accept/reject page
- ✅ Automatic access grant

---

## 🎯 Which Version Would You Like?

### Option A: Simple (1 hour)
- No email integration
- Create invitation in database
- Admin shares link manually
- User can accept via link
- Works immediately

### Option B: With Email Integration (2-3 hours)
- Full email integration
- Automated email sending
- Professional workflow
- Requires email service setup

### Option C: Current "Instant Add" (Already Working)
- Keep current system
- No email, no pending invitations
- Admin adds user → instant access
- Simplest option

---

## 💡 My Recommendation

**For now:** Keep the current "Instant Add" feature (Option C)

**Why:**
- Already working
- Simple and fast
- No email service needed
- Admin has full control

**Later:** Add invitation system when needed
- When you want email notifications
- When users should approve access
- When you need audit trail of invitations

---

## 🚀 Current System (What You Have Now)

**"Invite Existing User" = Instant Access**

When admin invites:
1. Searches for user
2. Confirms
3. **Immediately grants access**
4. User can login and switch companies

**No email, no pending state, instant access!**

---

## 🤔 What Would You Prefer?

**Option 1:** Keep it as is (instant access) - Simple ✅

**Option 2:** Add email invitation system - Professional but complex 📧

**Option 3:** Hybrid - Create invitation record + instant access + optional email

---

Let me know which approach you prefer, and I'll implement it! 🚀

