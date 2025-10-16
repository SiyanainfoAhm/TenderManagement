# 🏢 Multi-Company Access Implementation Guide

## 📋 Overview

This guide explains how to implement and use the multi-company access feature in the Tender Management System. The new architecture allows:

- **One user to access multiple companies**
- **Secure data isolation between companies**
- **Role-based access per company**
- **Easy company switching**
- **Proper audit trail and security**

---

## 🔄 What Changed?

### Before (Single Company):
```
User → belongs to ONE Company
```

### After (Multi-Company):
```
User ↔ Junction Table ↔ Multiple Companies
```

---

## 🗄️ Database Changes

### New Table: `tender_user_companies`

Junction table that defines which users have access to which companies:

```sql
CREATE TABLE tender_user_companies (
  id UUID PRIMARY KEY,
  user_id UUID,              -- User who has access
  company_id UUID,            -- Company they can access
  role VARCHAR(50),           -- Their role in this company ('admin', 'user', 'viewer')
  is_active BOOLEAN,          -- Is this access active?
  is_default BOOLEAN,         -- Is this their default company?
  invited_by UUID,            -- Who invited them
  accepted_at TIMESTAMP,      -- When they accepted the invitation
  ...
);
```

### Modified Table: `tender_users`

**Removed:**
- `company_id` column (users no longer belong to one company)
- `role` column (role is now per-company in junction table)

**Unchanged:**
- All other user fields remain the same

### New Roles:
- **admin**: Full control over company data, can manage users
- **user**: Can manage tenders, limited administrative access
- **viewer**: Read-only access to company data

---

## 🚀 Migration Steps

### Step 1: Backup Current Database
```bash
npm run export-db
```

This creates a complete backup in `database-exports/` folder.

### Step 2: Run New Schema
```sql
-- In Supabase SQL Editor, run:
-- 1. Open database-schema-multi-company.sql
-- 2. Copy all contents
-- 3. Paste and run in SQL Editor
```

### Step 3: Run Migration Script
```sql
-- In Supabase SQL Editor, run:
-- 1. Open database-migration-to-multi-company.sql
-- 2. Copy all contents
-- 3. Paste and run in SQL Editor
```

### Step 4: Verify Migration
```sql
-- Check that all users were migrated
SELECT 
  u.full_name,
  u.email,
  COUNT(uc.company_id) as company_count
FROM tender_users u
LEFT JOIN tender_user_companies uc ON u.id = uc.user_id
GROUP BY u.id, u.full_name, u.email;
```

---

## 🔐 Security Features

### Row Level Security (RLS)

All tables now have RLS policies that ensure:

1. **Users can only see companies they have access to**
```sql
-- Users see only their companies
SELECT * FROM tender_companies; 
-- Returns only companies where user has access via tender_user_companies
```

2. **Tenders are isolated by company**
```sql
-- Users see only tenders from their companies
SELECT * FROM tender_tenders WHERE company_id = 'selected-company';
-- RLS automatically filters to companies user has access to
```

3. **Users can only see other users in their companies**
```sql
-- Returns only users who share at least one company
SELECT * FROM tender_users;
```

### Session-based Security

The application sets a session variable for the current user:
```sql
SET LOCAL app.current_user_id = 'user-uuid';
```

All RLS policies use this variable to enforce access control.

---

## 💻 Frontend Implementation

### 1. Updated TypeScript Types

**New Types:**
```typescript
// User with multiple companies
interface User {
  id: string
  full_name: string
  email: string
  companies: UserCompanyAccess[]  // Array of accessible companies
}

// Company access details
interface UserCompanyAccess {
  company_id: string
  company_name: string
  role: 'admin' | 'user' | 'viewer'
  is_default: boolean
}

// User with selected company
interface UserWithCompany extends User {
  selectedCompany: UserCompanyAccess | null
}
```

### 2. Auth Context Changes

**New Features:**
```typescript
interface AuthContextType {
  user: UserWithCompany | null
  selectedCompany: UserCompanyAccess | null
  switchCompany: (companyId: string) => Promise<void>
  refreshUserCompanies: () => Promise<void>
  // ... existing methods
}
```

### 3. Company Switcher Component

A new component in the top bar allows users to:
- See all their companies
- Switch between companies
- See their role in each company
- Identify their default company

---

## 📝 Code Examples

### Authentication (Login)

**Before:**
```typescript
const userData = {
  id: 'user-id',
  company_id: 'company-id',
  company_name: 'Company Name',
  role: 'admin'
}
```

**After:**
```typescript
const userData = {
  id: 'user-id',
  full_name: 'John Doe',
  email: 'john@example.com',
  companies: [
    {
      company_id: 'company-1-id',
      company_name: 'Company 1',
      role: 'admin',
      is_default: true
    },
    {
      company_id: 'company-2-id',
      company_name: 'Company 2',
      role: 'user',
      is_default: false
    }
  ],
  selectedCompany: { /* default company */ }
}
```

### Fetching Tenders

**Before:**
```typescript
const tenders = await tenderService.getAllTenders(user.company_id)
```

**After:**
```typescript
// Use selected company
const tenders = await tenderService.getAllTenders(
  user.selectedCompany.company_id
)
```

### Adding User to Company

**New Functionality:**
```typescript
// Invite user to join company
await userService.inviteUserToCompany(
  'user-email@example.com',
  companyId,
  'user' // role
)

// Add existing user to company
await userService.addUserToCompany(
  userId,
  companyId,
  'admin'
)
```

---

## 🎯 User Workflows

### Workflow 1: User with Multiple Companies

1. User logs in
2. System loads all companies user has access to
3. User's default company is auto-selected
4. User can switch to any other company using dropdown
5. All data (tenders, users, dashboard) updates to show selected company

### Workflow 2: Adding User to Existing Company

1. Admin goes to Users page
2. Clicks "Invite User"
3. Enters email and selects role
4. System sends invitation
5. User receives email with invitation link
6. User clicks link and joins company
7. User now has access to multiple companies

### Workflow 3: Creating New User

1. Admin creates new user
2. User is automatically added to admin's current company
3. User can later be invited to additional companies

### Workflow 4: Switching Companies

1. User clicks company name in top bar
2. Dropdown shows all accessible companies
3. User selects different company
4. UI updates to show new company's data
5. Selection is saved as user's preference

---

## 🔧 Database Functions

### Get User Companies
```sql
SELECT * FROM tender_get_user_companies('user-uuid');
```

Returns all companies a user has access to.

### Check Access
```sql
SELECT tender_check_user_company_access('user-uuid', 'company-uuid');
```

Returns `true` if user has access to company.

### Set Default Company
```sql
SELECT tender_set_default_company('user-uuid', 'company-uuid');
```

Sets a company as the user's default.

### Add User to Company
```sql
SELECT tender_add_user_to_company(
  'user-uuid',
  'company-uuid',
  'admin',
  'inviter-uuid'
);
```

Links a user to a company with specified role.

### Remove User from Company
```sql
SELECT tender_remove_user_from_company('user-uuid', 'company-uuid');
```

Removes user's access to a company.

---

## 📊 Data Migration Summary

### What Gets Migrated:

✅ **All users** → Converted to multi-company structure  
✅ **User-company relationships** → Moved to junction table  
✅ **User roles** → Preserved per company  
✅ **Default company** → Current company becomes default  
✅ **All tenders** → Unchanged, still linked to companies  
✅ **All history** → Unchanged, audit trail preserved  

### What Doesn't Change:

- Company data
- Tender data
- Tender history
- User authentication (email/password or OAuth)
- User basic info (name, email)

---

## 🧪 Testing Checklist

### Post-Migration Tests:

- [ ] All users can log in
- [ ] Users see their companies list
- [ ] Default company is selected on login
- [ ] Company switching works
- [ ] Tenders show correct data per company
- [ ] Users page shows correct users per company
- [ ] Dashboard stats are company-specific
- [ ] RLS prevents unauthorized access
- [ ] Google OAuth still works
- [ ] New user creation works
- [ ] User invitation works

### Security Tests:

- [ ] User cannot see data from unauthorized companies
- [ ] User cannot access tenders from other companies
- [ ] Admin actions are restricted to their companies
- [ ] RLS policies are enforced
- [ ] Session management is secure

---

## 🐛 Troubleshooting

### Issue: User has no companies after migration

**Solution:**
```sql
-- Check if user exists in junction table
SELECT * FROM tender_user_companies WHERE user_id = 'user-uuid';

-- If not found, manually add user to their company
INSERT INTO tender_user_companies (user_id, company_id, role, is_default, accepted_at)
VALUES ('user-uuid', 'company-uuid', 'admin', true, CURRENT_TIMESTAMP);
```

### Issue: RLS blocking all queries

**Solution:**
```sql
-- Temporarily disable RLS for testing
ALTER TABLE tender_tenders DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing
ALTER TABLE tender_tenders ENABLE ROW LEVEL SECURITY;
```

### Issue: User can't switch companies

**Check:**
1. User has active access to target company
2. Company is active
3. Frontend is calling `switchCompany()` correctly
4. localStorage is updating `selectedCompany`

### Issue: Duplicate users appearing

**Cause:** User exists in multiple companies  
**Expected:** This is correct behavior - users can access multiple companies

---

## 📈 Performance Considerations

### Indexes
All necessary indexes are created for:
- User lookups by email
- Company lookups by user
- User lookups by company
- Tender queries by company

### Query Optimization
- Use `selectedCompany.company_id` to filter queries
- Avoid loading data from all companies at once
- Cache company list in AuthContext

---

## 🔮 Future Enhancements

### Potential Features:
1. **Company Roles & Permissions:** More granular permissions
2. **Company Groups:** Group related companies
3. **Cross-Company Reports:** Aggregate data across companies
4. **Company Branding:** Custom themes per company
5. **Company Settings:** Individual settings per company
6. **Activity Feed:** See which company you're active in
7. **Company Invitations UI:** Better invitation management

---

## 📚 Related Files

- **Schema:** `database-schema-multi-company.sql`
- **Migration:** `database-migration-to-multi-company.sql`
- **Types:** `src/types/index.ts`
- **Database Docs:** `DATABASE_DOCUMENTATION.md`

---

## ✅ Implementation Checklist

### Backend (Database):
- [x] Create new schema with multi-company support
- [x] Create migration script
- [x] Implement RLS policies
- [x] Create helper functions
- [x] Test migration locally

### Frontend (To Be Implemented):
- [ ] Update AuthContext for multi-company
- [ ] Create CompanySwitcher component
- [ ] Update all services to use selectedCompany
- [ ] Update all pages/components
- [ ] Add company management UI
- [ ] Add user invitation flow
- [ ] Test all features
- [ ] Update documentation

### Deployment:
- [ ] Backup production database
- [ ] Run migration on production
- [ ] Deploy updated frontend
- [ ] Verify all users can access their data
- [ ] Monitor for issues

---

## 🎓 Best Practices

1. **Always use selectedCompany**: Never hard-code company IDs
2. **Check access before operations**: Use `tender_check_user_company_access()`
3. **Handle company switching gracefully**: Clear caches, reload data
4. **Test with multiple companies**: Always test with users who have 2+ companies
5. **Preserve default company**: Users should land on their preferred company
6. **Audit trail**: Log company switches and access changes
7. **Security first**: Never bypass RLS policies in production

---

**Status:** Schema and migration scripts ready  
**Next Step:** Implement frontend components  
**Version:** 2.0 (Multi-Company)  
**Last Updated:** October 14, 2025

