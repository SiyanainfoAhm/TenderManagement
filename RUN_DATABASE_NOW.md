# 🚀 Run Database Script - Step by Step

## 📋 What You'll Do:

Apply the fresh database with your exact scenario (2 companies, 5 users, multi-company access).

---

## ✅ Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Login to your account
3. Select your project: `ecvqhfbiwqmqgiqfxheu`
4. Click **"SQL Editor"** in the left sidebar
5. Click **"New Query"** button (top-right)

---

### Step 2: Copy the SQL Script

1. In VS Code, open file: `database-schema-with-sample-data.sql`
2. Press **Ctrl+A** (Select All)
3. Press **Ctrl+C** (Copy)

---

### Step 3: Paste and Run

1. Go back to Supabase SQL Editor
2. Click in the query editor area
3. Press **Ctrl+V** (Paste)
4. You should see ~536 lines of SQL
5. Click the **"RUN"** button (or press Ctrl+Enter)
6. Wait ~15-20 seconds

---

### Step 4: Verify Success

**You should see output like:**

```
┌───────────────────────────────────────────────────┐
│ full_name       │ email              │ companies │
├─────────────────┼────────────────────┼───────────┤
│ Demo Admin 1    │ demo@admin1.com    │ [...]     │
│ Demo Admin 2    │ demo@admin2.com    │ [...]     │
│ User 1 Admin 1  │ user1@admin1.com   │ [...]     │
│ User 1 Admin 2  │ user1@admin2.com   │ [...]     │
│ User 2 Admin 1  │ user2@admin1.com   │ [...]     │ ← Has 2 companies!
└─────────────────┴────────────────────┴───────────┘

Database setup complete with multi-company scenario!
```

---

### Step 5: Verify User2 Has Multiple Companies

**Run this query to confirm:**

```sql
-- Check user2@admin1.com has access to both companies
SELECT 
  u.full_name,
  u.email,
  c.company_name,
  uc.role,
  uc.is_default
FROM tender1_users u
JOIN tender1_user_companies uc ON u.id = uc.user_id
JOIN tender1_companies c ON uc.company_id = c.id
WHERE u.email = 'user2@admin1.com'
ORDER BY uc.is_default DESC;
```

**Expected Result:**
```
User 2 Admin 1 | user2@admin1.com | Company 1 | user | true
User 2 Admin 1 | user2@admin1.com | Company 2 | user | false
```

✅ **Perfect! User has access to BOTH companies!**

---

## 🎯 What Gets Created:

### Companies:
- ✅ Company 1
- ✅ Company 2

### Users:
- ✅ demo@admin1.com (Company 1 Admin)
- ✅ user1@admin1.com (Company 1 User)
- ✅ user2@admin1.com (Company 1 & 2 User) ⭐
- ✅ demo@admin2.com (Company 2 Admin)
- ✅ user1@admin2.com (Company 2 User)

### User-Company Links:
- ✅ 6 relationships created
- ✅ 1 user with multi-company access

---

## ✅ Success Checklist

After running the script:

- [ ] No errors shown in SQL Editor
- [ ] See "Database setup complete" message
- [ ] Table shows all 5 users
- [ ] user2@admin1.com appears twice (2 companies)
- [ ] All users have companies assigned
- [ ] Verification query shows correct data

---

## 🐛 Troubleshooting

### Error: "permission denied"
**Solution:** Make sure you're logged in to the correct Supabase project

### Error: "relation already exists"
**Solution:** Script includes DROP statements, should work. If not, tables were already created successfully.

### No output shown
**Solution:** Scroll down in the results panel to see the output table

### Some users missing
**Solution:** Re-run the script (it has DROP statements at the beginning)

---

## 🎉 After Successful Run

**Immediately test:**

1. Go to your app: http://localhost:5174
2. Open browser console (F12)
3. Clear cache:
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```
4. Refresh page
5. Login with: `user2@admin1.com` / `user2123`
6. **Look for company switcher** - should show 2 companies!
7. Click it and switch between companies!

---

## 🚀 Ready?

**File to run:** `database-schema-with-sample-data.sql`

**Time needed:** ~2 minutes

**Let me know once you've run it and I'll help you test!** 🎉

