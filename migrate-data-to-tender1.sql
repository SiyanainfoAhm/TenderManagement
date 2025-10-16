-- ============================================
-- DATA MIGRATION: Copy from tender_ to tender1_
-- This migrates your existing data to the new multi-company structure
-- Run this AFTER running database-schema-fresh-multi-company.sql
-- ============================================

BEGIN;

-- ============================================
-- Step 1: Migrate Companies
-- ============================================
INSERT INTO tender1_companies (
  id, company_name, company_email, company_phone, company_address,
  is_active, created_at, updated_at
)
SELECT 
  id, company_name, company_email, company_phone, company_address,
  is_active, created_at, updated_at
FROM tender_companies
ON CONFLICT (company_email) DO NOTHING;

-- ============================================
-- Step 2: Migrate Users (without company_id and role)
-- ============================================
INSERT INTO tender1_users (
  id, full_name, email, password_hash,
  is_active, last_login, created_at, updated_at
)
SELECT 
  id, full_name, email, password_hash,
  is_active, last_login, created_at, updated_at
FROM tender_users
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Step 3: Create User-Company Relationships
-- ============================================
INSERT INTO tender1_user_companies (
  user_id, company_id, role, is_default, is_active, accepted_at, created_at
)
SELECT 
  id as user_id,
  company_id,
  role,
  true as is_default,  -- Their current company becomes default
  is_active,
  CURRENT_TIMESTAMP as accepted_at,
  created_at
FROM tender_users
WHERE company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- ============================================
-- Step 4: Migrate Tenders
-- ============================================
INSERT INTO tender1_tenders (
  id, company_id, tender247_id, gem_eprocure_id, portal_link,
  tender_name, source, location, last_date,
  msme_exempted, startup_exempted,
  emd_amount, tender_fees, tender_cost, tender_notes,
  status, assigned_to, not_bidding_reason, created_by,
  created_at, updated_at
)
SELECT 
  id, company_id, tender247_id, gem_eprocure_id, portal_link,
  tender_name, source, location, last_date,
  msme_exempted, startup_exempted,
  emd_amount, tender_fees, tender_cost, tender_notes,
  status, assigned_to, not_bidding_reason, created_by,
  created_at, updated_at
FROM tender_tenders;

-- ============================================
-- Step 5: Migrate Tender History
-- ============================================
INSERT INTO tender1_tender_history (
  id, tender_id, changed_by, action,
  old_values, new_values, change_description, created_at
)
SELECT 
  id, tender_id, changed_by, action,
  old_values, new_values, change_description, created_at
FROM tender_tender_history;

COMMIT;

-- ============================================
-- Verification
-- ============================================

-- Show migration summary
SELECT 
  'Migration Complete!' as status,
  (SELECT COUNT(*) FROM tender1_companies) as companies,
  (SELECT COUNT(*) FROM tender1_users) as users,
  (SELECT COUNT(*) FROM tender1_user_companies) as user_company_links,
  (SELECT COUNT(*) FROM tender1_tenders) as tenders,
  (SELECT COUNT(*) FROM tender1_tender_history) as history_records;

-- Show all users with their companies
SELECT 
  u.full_name,
  u.email,
  json_agg(
    json_build_object(
      'company', c.company_name,
      'role', uc.role,
      'is_default', uc.is_default
    )
  ) as companies
FROM tender1_users u
LEFT JOIN tender1_user_companies uc ON u.id = uc.user_id
LEFT JOIN tender1_companies c ON uc.company_id = c.id
GROUP BY u.id, u.full_name, u.email
ORDER BY u.full_name;

-- ============================================
-- Test Authentication
-- ============================================

-- Test function (replace with actual credentials)
-- SELECT * FROM tender1_authenticate_user('aminmihirh@gmail.com', 'your_password');

