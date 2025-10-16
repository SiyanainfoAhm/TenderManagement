# 🎯 Setup Fresh Database - Your Scenario

## 📊 What This Creates

### Company 1:
- **Name:** Company 1
- **Admin:** demo@admin1.com (password: `demo123`)
- **User:** user1@admin1.com (password: `user1123`)
- **User:** user2@admin1.com (password: `user2123`) ⭐ Multi-company access

### Company 2:
- **Name:** Company 2
- **Admin:** demo@admin2.com (password: `demo123`)
- **User:** user1@admin2.com (password: `user1123`)
- **User:** user2@admin1.com (password: `user2123`) ⭐ Multi-company access

### ⭐ Multi-Company User:
**user2@admin1.com** has access to BOTH companies!
- Company 1 (User role, default)
- Company 2 (User role)
- Can switch between them via dropdown!

---

## 🚀 How to Apply

### Step 1: Run the Script in Supabase

1. Open Supabase SQL Editor
2. Click "New Query"
3. Open file: `database-schema-with-sample-data.sql`
4. Copy ALL contents (Ctrl+A, Ctrl+C)
5. Paste in SQL Editor (Ctrl+V)
6. Click **RUN** button
7. Wait ~10 seconds

**Expected Output:**
```
Database setup complete with multi-company scenario!
```

Plus a table showing all users and their companies!

---

## ✅ What Gets Created

### Tables:
- ✅ tender1_companies (2 companies)
- ✅ tender1_users (5 users)
- ✅ tender1_user_companies (6 access links)
- ✅ tender1_tenders (empty, ready for data)
- ✅ tender1_tender_history (empty)
- ✅ tender1_company_invitations (empty)

### Functions:
- ✅ All 10 database functions
- ✅ All triggers
- ✅ Row Level Security

---

## 🧪 Test Accounts

### Test 1: Single Company Admin
**Login:** `demo@admin1.com` / `demo123`
- Should see: Company 1 only
- Role: Admin
- Can add users
- Can manage tenders

### Test 2: Single Company User
**Login:** `user1@admin1.com` / `user1123`
- Should see: Company 1 only
- Role: User
- Limited permissions
- No "Users" menu

### Test 3: Multi-Company User ⭐
**Login:** `user2@admin1.com` / `user2123`
- Should see: **Company switcher dropdown**
- Can access: Company 1 AND Company 2
- Can switch between companies
- Data changes when switching
- This demonstrates multi-company access!

### Test 4: Company 2 Admin
**Login:** `demo@admin2.com` / `demo123`
- Should see: Company 2 only
- Role: Admin
- Can manage Company 2

---

## 🎨 Visual Representation

```
Users in Database:
├── demo@admin1.com
│   └── Company 1 (admin) ✓
├── user1@admin1.com
│   └── Company 1 (user) ✓
├── user2@admin1.com  ⭐ MULTI-COMPANY
│   ├── Company 1 (user, default) ✓
│   └── Company 2 (user) ✓
├── demo@admin2.com
│   └── Company 2 (admin) ✓
└── user1@admin2.com
    └── Company 2 (user) ✓
```

---

## 🎯 Testing Multi-Company Access

### Login as: `user2@admin1.com` / `user2123`

**You should see:**

1. **Top Bar:**
   - Company switcher showing "Company 1"
   - Dropdown arrow
   - Role badge: "User"

2. **Click Company Switcher:**
   - Dropdown shows:
     - ✓ Company 1 (selected)
     - Company 2

3. **Switch to Company 2:**
   - Click "Company 2"
   - Page reloads
   - Now showing Company 2 data
   - Switcher shows "Company 2"

4. **Switch Back:**
   - Click switcher
   - Select "Company 1"
   - Back to Company 1 data

**This is multi-company access in action!** 🎉

---

## 📋 Password Summary

All passwords follow pattern: `[email-prefix]123`

- demo@admin1.com → `demo123`
- user1@admin1.com → `user1123`
- user2@admin1.com → `user2123`
- demo@admin2.com → `demo123`
- user1@admin2.com → `user1123`

---

## 🔐 Roles Explained

### Admin:
- ✅ See all 3 menu items (Dashboard, Tenders, Users)
- ✅ Can add/edit/delete users
- ✅ Full company management
- ✅ Can assign tenders

### User:
- ✅ See 2 menu items (Dashboard, Tenders)
- ❌ No Users menu
- ✅ Can manage tenders
- ❌ Cannot add users

### Viewer:
- ✅ See 1 menu item (Dashboard only)
- ❌ Read-only access
- ❌ Cannot modify anything

---

## ✅ Success Criteria

After running the script:

- [ ] 2 companies created
- [ ] 5 users created
- [ ] 6 user-company links created
- [ ] Can login with all 5 accounts
- [ ] user2@admin1.com sees company switcher
- [ ] user2@admin1.com can switch between companies
- [ ] Admins see Users menu
- [ ] Regular users don't see Users menu
- [ ] All data isolated per company

---

## 🐛 Troubleshooting

### Error: "relation already exists"
**Meaning:** Tables already exist  
**Solution:** Script includes DROP statements, should work fine

### Can't see company switcher
**Issue:** User only has one company  
**Solution:** Login with `user2@admin1.com` (multi-company user)

### Users menu not showing
**Issue:** Logged in as regular user, not admin  
**Solution:** Login with admin account (demo@admin1.com or demo@admin2.com)

---

## 🎉 What You Get

After running this script:

✅ **Clean database** - All old data removed  
✅ **Perfect scenario** - Exactly as you specified  
✅ **Multi-company demo** - user2@admin1.com in both companies  
✅ **Different roles** - Admin and user examples  
✅ **Ready to test** - All test accounts ready  
✅ **Production structure** - Real multi-company architecture  

---

## 🚀 Next Steps

**1. Run the script in Supabase**  
**2. Refresh your browser app**  
**3. Clear localStorage:** `localStorage.clear()`  
**4. Test each account:**
   - Start with `user2@admin1.com` to see multi-company switching!

---

**Ready to set up your fresh database?** 

Just run `database-schema-with-sample-data.sql` in Supabase SQL Editor! 🎉

