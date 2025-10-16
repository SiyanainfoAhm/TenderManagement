# 🚀 Apply Multi-Company Migration - INSTRUCTIONS

## ⚠️ STEP 0: BACKUP FIRST! (CRITICAL)

Run this command NOW:
```bash
npm run export-db
```

Wait for it to complete. Verify files were created in `database-exports/` folder.

---

## 📝 STEP 1: Apply New Schema

### Open Supabase:
1. Go to https://supabase.com/dashboard
2. Select your project: `ecvqhfbiwqmqgiqfxheu`
3. Click **SQL Editor** in left sidebar
4. Click **New Query** button

### Run Schema:
1. Open file: `database-schema-multi-company.sql`
2. **Copy ALL contents** (Ctrl+A, Ctrl+C)
3. **Paste in SQL Editor** (Ctrl+V)
4. Click **RUN** button (or press Ctrl+Enter)
5. Wait for completion (~30 seconds)

### Expected Output:
```
Multi-Company Schema Ready
Run migration script to migrate existing data
```

---

## 📝 STEP 2: Run Migration

### In Same SQL Editor:
1. Click **New Query** button again
2. Open file: `database-migration-to-multi-company.sql`
3. **Copy ALL contents**
4. **Paste in SQL Editor**
5. Click **RUN** button
6. Wait for completion (~10-30 seconds)

### Expected Output:
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

## ✅ STEP 3: Verify Migration

### Run Verification Query:

Paste and run this in SQL Editor:

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
You should see all 4 users with their company access:
- Deven Patel → Ceorra Technologies (admin, default)
- Mihir Patel → Ceorra Technologies (admin, default)
- Shashank Sharma → Ceorra Technologies (admin, default)
- asd → Ceorra Technologies (admin, default)

---

## 🎉 SUCCESS!

If you see the expected results, your database is now multi-company enabled!

**Next:** I'll update the frontend code to support company switching.

---

## 🐛 Troubleshooting

### Error: "relation already exists"
**Cause:** Schema already applied  
**Solution:** Skip to Step 2 (migration)

### Error: "column does not exist: company_id"
**Cause:** Already migrated  
**Solution:** You're done! Check verification query

### Error: Connection timeout
**Cause:** Network issue  
**Solution:** Check internet, try again

---

## 📞 Ready for Next Step?

Once database migration is complete, let me know and I'll:
1. Update AuthContext for company management
2. Create Company Switcher component
3. Update all services and pages

Type "done" when migration is complete! ✅

