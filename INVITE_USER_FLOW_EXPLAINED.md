# 👥 Invite User Flow - Complete Explanation

## 🎯 What is "Invite Existing User"?

When you want to add someone to your company who **already has an account** in the system (they're in another company), you use the "Invite Existing User" feature.

---

## 🔄 Complete Flow (Step-by-Step)

### Step 1: Admin Opens Invite Modal

**Location:** Users page  
**Action:** Click "Invite Existing User" button (outline button, top-right)

**What happens:**
- Modal opens
- Shows form with email input and role selector

---

### Step 2: Admin Enters Email

**Admin enters:** `user1@admin2.com`

**Form fields:**
- **User Email:** `user1@admin2.com`
- **Role in This Company:** Select from dropdown (Admin/User/Viewer)

**Admin clicks:** "Search User" button

---

### Step 3: System Searches Database

**Backend checks:**

```sql
-- 1. Does user exist in tender1_users?
SELECT id, full_name, email FROM tender1_users WHERE email = 'user1@admin2.com';

-- 2. Do they already have access to this company?
SELECT * FROM tender1_user_companies 
WHERE user_id = '[found-user-id]' AND company_id = '[your-company-id]';
```

**Three possible outcomes:**

#### Outcome A: User Not Found ❌
**Message:** "No user found with email: user1@admin2.com. Please use 'Add User' to create a new account."

**What to do:** Use "Add New User" button instead

#### Outcome B: User Already Has Access ❌
**Message:** "User 1 Admin 2 (user1@admin2.com) already has access to Company 1 as user."

**What to do:** Close modal, user is already in your company

#### Outcome C: User Found, No Access ✅
**What happens:** Moves to confirmation screen

---

### Step 4: Confirmation Screen

**Shows:**
- ✅ User's full name: "User 1 Admin 2"
- ✅ User's email: "user1@admin2.com"
- ✅ Selected role: "User"
- ✅ Your company: "Company 1"

**Buttons:**
- "Back" - Go back to edit
- "Confirm & Add User" - Proceed

**Admin clicks:** "Confirm & Add User"

---

### Step 5: System Adds User to Company

**Backend executes:**

```sql
SELECT tender1_add_user_to_company(
  'user-id',           -- User to add
  'company-id',        -- Your company
  'user',              -- Their role
  'your-user-id'       -- Who invited them
);
```

**What this does:**
- Creates entry in `tender1_user_companies` table
- Links user to your company
- Sets their role
- Records who invited them
- Timestamp when added

---

### Step 6: Success!

**Shows:**
- ✅ Green checkmark
- ✅ "User Added Successfully!"
- ✅ "User 1 Admin 2 now has access to Company 1."

**After 2 seconds:**
- Modal closes automatically
- Users list refreshes
- New user appears in the list

---

## 📊 Visual Flow Diagram

```
┌─────────────────────────────────────────┐
│ 1. Admin clicks "Invite Existing User" │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Modal opens with email input         │
│    - Enter email                         │
│    - Select role                         │
│    - Click "Search User"                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. System searches database             │
│    - Check if user exists                │
│    - Check if already has access         │
└──────────────┬──────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    Not Found    Found
         │           │
         ▼           ▼
    ┌────────┐  ┌─────────────────────────┐
    │ Error  │  │ 4. Confirmation screen  │
    │Message │  │    - Show user details   │
    └────────┘  │    - Show role           │
                │    - Confirm button      │
                └──────────┬───────────────┘
                           │
                           ▼
                ┌──────────────────────────┐
                │ 5. Add to company        │
                │    - Insert into DB       │
                │    - Update access        │
                └──────────┬───────────────┘
                           │
                           ▼
                ┌──────────────────────────┐
                │ 6. Success!              │
                │    - Show confirmation    │
                │    - Refresh list         │
                │    - Close modal          │
                └──────────────────────────┘
```

---

## 🎬 Example Scenarios

### Scenario 1: Adding User from Another Company

**Initial State:**
- Company 1 has: demo@admin1.com, user1@admin1.com, user2@admin1.com
- Company 2 has: demo@admin2.com, user1@admin2.com, user2@admin1.com

**You (demo@admin1.com) want to add user1@admin2.com to Company 1:**

1. Go to Users page
2. Click "Invite Existing User"
3. Enter: `user1@admin2.com`
4. Select role: "User"
5. Click "Search User"
6. See: "User 1 Admin 2" found
7. Click "Confirm & Add User"
8. ✅ Success!

**Result:**
- user1@admin2.com now has access to Company 1 AND Company 2
- Can switch between companies
- Different role per company possible

---

### Scenario 2: User Already Exists in Your Company

**You try to invite:** `user1@admin1.com`

**System response:**
"User 1 Admin 1 (user1@admin1.com) already has access to Company 1 as user."

**What to do:** 
- Close modal
- User is already in your company
- No action needed

---

### Scenario 3: Email Doesn't Exist

**You try to invite:** `newperson@example.com`

**System response:**
"No user found with email: newperson@example.com. Please use 'Add User' to create a new account."

**What to do:**
- Close invite modal
- Click "Add New User" button instead
- Create new account with that email

---

## 🔐 Security & Permissions

### Who Can Invite Users?
- ✅ **Admin** role only
- ❌ Regular users can't invite
- ❌ Viewers can't invite

### What Roles Can You Assign?
When inviting, you can assign:
- **Admin** - Full company access
- **User** - Can manage tenders
- **Viewer** - Read-only access

### Can You Invite Anyone?
- ✅ Any user who exists in the system
- ✅ Users from other companies
- ❌ Can't invite if they already have access
- ❌ Can't invite if email doesn't exist (use Add User)

---

## 💡 When to Use Each Feature

### Use "Add New User" when:
- ✅ Email is completely new
- ✅ Creating fresh account
- ✅ User has never used the system

### Use "Invite Existing User" when:
- ✅ Email already exists (in another company)
- ✅ User works with multiple companies
- ✅ Want to share team member with partner company
- ✅ User is consultant/contractor working across companies

---

## 📊 Database Changes

### Before Invite:
```
user1@admin2.com
  └── Company 2 (user)
```

### After Invite to Company 1:
```
user1@admin2.com
  ├── Company 1 (user) ← ADDED via Invite!
  └── Company 2 (user)
```

**Database record created:**
```sql
INSERT INTO tender1_user_companies (
  user_id,      -- user1@admin2.com's ID
  company_id,   -- Company 1's ID
  role,         -- 'user'
  is_default,   -- false (Company 2 was their original)
  invited_by,   -- demo@admin1.com's ID
  accepted_at   -- Current timestamp
)
```

---

## 🎯 Real-World Use Cases

### Use Case 1: Consultant
**Scenario:** John is a consultant working with 3 client companies

**Solution:**
- Create account in Company A
- Company B admin invites John
- Company C admin invites John
- John now has ONE account, access to 3 companies

### Use Case 2: Partnership
**Scenario:** Company 1 and Company 2 partner on a project, need to share 2 team members

**Solution:**
- User works in Company 1
- Company 2 admin invites user
- User2 works in Company 2
- Company 1 admin invites user2
- Both can now access both companies

### Use Case 3: Employee Transfer
**Scenario:** Employee moves from Company A to Company B

**Solution:**
- Company B admin invites employee
- Employee now has access to both
- Can switch between them
- Later, Company A can remove access if needed

---

## ✅ Benefits of This Flow

1. **User-Friendly:** Simple 3-step process
2. **Secure:** Only admins can invite
3. **Prevents Duplicates:** Search before adding
4. **Flexible:** Assign any role
5. **Tracked:** Records who invited whom
6. **Immediate:** User gets access instantly

---

## 🎉 Summary

**The Invite Flow:**
1. Click button → Open modal
2. Enter email → Search
3. Confirm → Add to company
4. Success → User has access

**Simple, secure, and powerful!**

---

**Ready to test it?**

1. Run: `database-schema-with-sample-data.sql` in Supabase
2. Login as: `demo@admin1.com` / `demo123`
3. Go to Users page
4. Click: "Invite Existing User"
5. Invite: `user1@admin2.com`
6. Watch the flow! 🚀

