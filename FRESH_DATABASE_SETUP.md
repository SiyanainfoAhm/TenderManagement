# 🎉 Fresh Database Setup with tender1_ Prefix

## ✅ Advantages of Fresh Database

- ✅ **No conflicts** with existing `tender_` tables
- ✅ **Side-by-side** - old and new databases coexist
- ✅ **Safe migration** - can test before switching
- ✅ **Easy rollback** - just use old tables if needed
- ✅ **Clean prefix** - `tender1_` for all new tables

---

## 📋 Setup Steps

### Step 1: Create Fresh Database (5 minutes)

**In Supabase SQL Editor:**

1. Click **New Query**
2. Open file: `database-schema-fresh-multi-company.sql`
3. Copy ALL contents
4. Paste in SQL Editor
5. Click **RUN**
6. Wait ~30 seconds

**Expected Output:**
```
Fresh Multi-Company Database Created with tender1_ prefix!
You can now migrate data or use this fresh database
```

---

### Step 2: Migrate Your Data (2 minutes)

**In Supabase SQL Editor:**

1. Click **New Query** again
2. Open file: `migrate-data-to-tender1.sql`
3. Copy ALL contents
4. Paste in SQL Editor
5. Click **RUN**
6. Wait ~10 seconds

**Expected Output:**
```
Migration Complete!
companies: 1
users: 4
user_company_links: 4
tenders: 5
history_records: 21
```

Plus a list of all users with their companies!

---

### Step 3: Verify Data

**Run this query in SQL Editor:**

```sql
-- Check everything was migrated
SELECT 
  'Companies' as table_name, COUNT(*)::text as count FROM tender1_companies
UNION ALL
SELECT 'Users', COUNT(*)::text FROM tender1_users
UNION ALL
SELECT 'User-Company Links', COUNT(*)::text FROM tender1_user_companies
UNION ALL
SELECT 'Tenders', COUNT(*)::text FROM tender1_tenders
UNION ALL
SELECT 'History', COUNT(*)::text FROM tender1_tender_history;
```

**Expected:**
- Companies: 1
- Users: 4
- User-Company Links: 4
- Tenders: 5
- History: 21

---

## 🎯 What You Get

### New Tables (tender1_ prefix):
1. ✅ `tender1_companies` - Company information
2. ✅ `tender1_users` - Users (multi-company ready)
3. ✅ `tender1_user_companies` - **NEW!** Junction table
4. ✅ `tender1_tenders` - Tender data
5. ✅ `tender1_tender_history` - Audit trail
6. ✅ `tender1_company_invitations` - **NEW!** Invitations

### New Functions (tender1_ prefix):
1. ✅ `tender1_authenticate_user()` - Multi-company login
2. ✅ `tender1_create_user()` - Create with company link
3. ✅ `tender1_add_user_to_company()` - **NEW!** Add to company
4. ✅ `tender1_remove_user_from_company()` - **NEW!** Remove from company
5. ✅ `tender1_set_default_company()` - **NEW!** Set default
6. ✅ `tender1_get_user_companies()` - **NEW!** Get companies
7. ✅ `tender1_check_user_company_access()` - **NEW!** Check access
8. ✅ `tender1_get_company_stats()` - Dashboard stats
9. ✅ `tender1_hash_password()` - Password hashing
10. ✅ `tender1_verify_password()` - Password verification

### Features:
- ✅ Multi-company access for users
- ✅ Different roles per company
- ✅ Company switcher ready
- ✅ Secure data isolation (RLS)
- ✅ All your data migrated
- ✅ Audit trail maintained

---

## 📊 Data Migration Summary

**From (tender_):**
- 1 Company → `tender_companies`
- 4 Users → `tender_users` (with company_id and role)
- 5 Tenders → `tender_tenders`
- 21 History → `tender_tender_history`

**To (tender1_):**
- 1 Company → `tender1_companies`
- 4 Users → `tender1_users` (no company_id, no role)
- **4 Links → `tender1_user_companies` (NEW!)**
- 5 Tenders → `tender1_tenders`
- 21 History → `tender1_tender_history`

**Key Change:** Users now linked to companies via junction table!

---

## 🔐 Sample Data Included

The schema includes a demo account for testing:
- **Email:** `demo@example.com`
- **Password:** `demo123`
- **Company:** Demo Company
- **Role:** Admin

You can test with this before using your real accounts.

---

## ⚠️ Important Notes

1. **Old tables untouched** - Your `tender_` tables remain unchanged
2. **Side-by-side** - Both databases coexist
3. **Test first** - Test with new tables before switching app
4. **Update app** - App needs to use `tender1_` prefix (I'll help!)
5. **Rollback easy** - Just keep using old tables if needed

---

## 🚀 Next Steps

After database setup:

### Option A: Test First (Recommended)
1. Keep app using old `tender_` tables
2. Test queries on new `tender1_` tables
3. Verify everything works
4. Then update app to use `tender1_`

### Option B: Switch Immediately
1. Update app to use `tender1_` prefix
2. Test login and features
3. Fix any issues
4. Delete old tables when confident

---

## 📝 Files to Run (IN ORDER)

1. ✅ `database-schema-fresh-multi-company.sql` **(Creates new tables)**
2. ✅ `migrate-data-to-tender1.sql` **(Copies your data)**

**That's it!** Just 2 files, ~7 minutes total.

---

## 🎉 Success Criteria

After running both files:
- [x] No errors in SQL Editor
- [x] Migration summary shows correct counts
- [x] Users list shows all 4 users with companies
- [x] Demo account can be tested
- [x] All data preserved

---

## 💡 Tips

1. **Run in order** - Schema first, then migration
2. **Check output** - Look for success messages
3. **Verify counts** - Compare old vs new table counts
4. **Test demo** - Try demo account first
5. **Keep backup** - You have backup from earlier

---

## 🐛 Troubleshooting

### "relation already exists"
**Meaning:** Tables already created  
**Action:** Skip to migration script

### "duplicate key" errors
**Meaning:** Data already migrated  
**Action:** You're done! Check verification query

### Count mismatch
**Meaning:** Some data didn't migrate  
**Action:** Check which table, let me know

---

**Ready to create your fresh multi-company database?** 🚀

**Time Required:** ~7 minutes  
**Risk:** Zero (old tables untouched)  
**Benefit:** Fresh, clean multi-company system!

