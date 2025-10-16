# 🚀 Apply Multi-Company Migration - Step-by-Step

## ✅ Step 1: Backup Complete!

Your backup is saved in: `database-exports/tender-management-full-export-2025-10-14T04-52-28-364Z.sql`

**Keep this file safe!** You can restore from it if anything goes wrong.

---

## 📝 Step 2: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your project: **ecvqhfbiwqmqgiqfxheu**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** button

---

## 🔧 Step 3: Apply New Schema

### Instructions:
1. Keep Supabase SQL Editor open
2. Open this file in your project: `database-schema-multi-company.sql`
3. **Select ALL text** (Ctrl+A)
4. **Copy** (Ctrl+C)
5. **Paste** into Supabase SQL Editor (Ctrl+V)
6. Click **RUN** button (or press Ctrl+Enter)
7. Wait ~30 seconds for completion

### Expected Success Message:
```
Multi-Company Schema Ready
Run migration script to migrate existing data
```

### If You See Errors:
- **"relation already exists"**: That's OK! Schema already applied. Continue to Step 4.
- **Connection timeout**: Check your internet, try again
- **Other errors**: Stop and let me know the error message

---

## 🔄 Step 4: Run Migration Script

### Instructions:
1. In Supabase SQL Editor, click **New Query** button again
2. Open this file in your project: `database-migration-to-multi-company.sql`
3. **Select ALL text** (Ctrl+A)
4. **Copy** (Ctrl+C)
5. **Paste** into Supabase SQL Editor (Ctrl+V)
6. Click **RUN** button (or press Ctrl+Enter)
7. Wait ~10-30 seconds for completion

### Expected Success Message:
```
MIGRATION VERIFICATION
==============================================
Total Users: 4
User-Company Links: 4
Users without company: 0
==============================================

Migration Complete
```

---

## ✅ Step 5: Verify Migration

### Run this verification query in SQL Editor:

```sql
-- Verify all users have companies
SELECT 
  u.full_name,
  u.email,
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'company', c.company_name,
        'role', uc.role,
        'is_default', uc.is_default
      )
    )
    FROM tender_user_companies uc
    JOIN tender_companies c ON uc.company_id = c.id
    WHERE uc.user_id = u.id),
    '[]'::json
  ) as companies
FROM tender_users u
ORDER BY u.full_name;
```

### Expected Result:
You should see all 4 users with their companies:
- **asd** → Ceorra Technologies (admin, default)
- **Deven Patel** → Ceorra Technologies (admin, default)
- **Mihir Patel** → Ceorra Technologies (admin, default)
- **Shashank Sharma** → Ceorra Technologies (admin, default)

---

## 🎉 Step 6: Test Login

1. Go to your local app: http://localhost:5174/login
2. Try logging in with any existing user
3. You should see the Company Switcher in the top bar!

### Test Credentials:
- Email: `aminmihirh@gmail.com` (Mihir Patel)
- Email: `siyana.social@gmail.com` (Shashank Sharma)
- Email: `ceorraahmedabad@gmail.com` (Deven - OAuth only)

---

## ✅ Success Checklist

After completing all steps:
- [ ] Backup created (✅ Done!)
- [ ] Schema applied in Supabase
- [ ] Migration script run
- [ ] Verification query shows all users have companies
- [ ] Can log in to application
- [ ] Company switcher appears in top bar

---

## 🐛 Troubleshooting

### Problem: "column company_id does not exist"
**Solution:** Already migrated! You're done, just test login.

### Problem: Can't log in after migration
**Solution:** 
1. Clear browser cache/cookies
2. Clear localStorage: Open browser console, type: `localStorage.clear()`
3. Try login again

### Problem: No company switcher visible
**Solution:** 
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser console for errors
3. Make sure you're logged in

### Problem: "Users without company: X" (where X > 0)
**Solution:** Some users weren't migrated properly. Run this:
```sql
-- Manually add users to their default company
INSERT INTO tender_user_companies (user_id, company_id, role, is_default, accepted_at)
SELECT 
  u.id,
  (SELECT id FROM tender_companies LIMIT 1),
  'admin',
  true,
  CURRENT_TIMESTAMP
FROM tender_users u
WHERE NOT EXISTS (
  SELECT 1 FROM tender_user_companies uc WHERE uc.user_id = u.id
);
```

---

## 📞 Need Help?

If you encounter any issues:
1. **Don't panic!** You have a backup
2. Copy the exact error message
3. Let me know what step you're on
4. I'll help you fix it

---

## 🎯 What Happens Next?

After successful migration:
1. ✅ Database is multi-company ready
2. ✅ All users have access to their company
3. ✅ Company switcher works
4. ✅ Data is secure with RLS
5. 🔄 A few pages may need minor updates (I'll help!)

---

**Ready? Let's do this!** 🚀

**Current Step:** Ready to apply schema (Step 3)

