-- ============================================
-- COMPLETE DATA MIGRATION: tender_* → tender1_*
-- Migrates all data from old tables to new multi-company structure
-- ============================================

BEGIN;

-- ============================================
-- Step 1: Verify Source Tables Exist
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tender_companies') THEN
        RAISE EXCEPTION 'Source table tender_companies does not exist!';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tender_users') THEN
        RAISE EXCEPTION 'Source table tender_users does not exist!';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tender_tenders') THEN
        RAISE EXCEPTION 'Source table tender_tenders does not exist!';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tender_tender_history') THEN
        RAISE EXCEPTION 'Source table tender_tender_history does not exist!';
    END IF;
    
    RAISE NOTICE 'All source tables verified successfully!';
END $$;

-- ============================================
-- Step 2: Backup Current Data (Optional)
-- ============================================
-- Uncomment the following lines if you want to backup current tender1_* data first
/*
CREATE TABLE IF NOT EXISTS backup_tender1_companies AS SELECT * FROM tender1_companies;
CREATE TABLE IF NOT EXISTS backup_tender1_users AS SELECT * FROM tender1_users;
CREATE TABLE IF NOT EXISTS backup_tender1_tenders AS SELECT * FROM tender1_tenders;
CREATE TABLE IF NOT EXISTS backup_tender1_tender_history AS SELECT * FROM tender1_tender_history;
*/

-- ============================================
-- Step 3: Clear Target Tables (Optional)
-- ============================================
-- Uncomment if you want to start fresh
/*
DELETE FROM tender1_tender_history;
DELETE FROM tender1_tenders;
DELETE FROM tender1_user_companies;
DELETE FROM tender1_users;
DELETE FROM tender1_companies;
*/

-- ============================================
-- Step 4: Migrate Companies
-- ============================================
INSERT INTO tender1_companies (
    id, company_name, company_email, company_phone, company_address,
    is_active, created_at, updated_at
)
SELECT 
    id, 
    company_name, 
    company_email, 
    company_phone, 
    company_address,
    COALESCE(is_active, true) as is_active,
    COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
    COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at
FROM tender_companies
ON CONFLICT (company_email) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    company_phone = EXCLUDED.company_phone,
    company_address = EXCLUDED.company_address,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Step 5: Migrate Users
-- ============================================
INSERT INTO tender1_users (
    id, full_name, email, password_hash,
    is_active, last_login, created_at, updated_at
)
SELECT 
    id, 
    full_name, 
    email, 
    password_hash,
    COALESCE(is_active, true) as is_active,
    last_login,
    COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
    COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at
FROM tender_users
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active,
    last_login = EXCLUDED.last_login,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Step 6: Create User-Company Relationships
-- ============================================
-- This handles the many-to-many relationship that was previously stored in tender_users.company_id
INSERT INTO tender1_user_companies (
    user_id, company_id, role, is_default, is_active, accepted_at, created_at
)
SELECT 
    u.id as user_id,
    u.company_id,
    COALESCE(u.role, 'user') as role,
    true as is_default,  -- Their current company becomes default
    COALESCE(u.is_active, true) as is_active,
    CURRENT_TIMESTAMP as accepted_at,
    COALESCE(u.created_at, CURRENT_TIMESTAMP) as created_at
FROM tender_users u
WHERE u.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    accepted_at = EXCLUDED.accepted_at;

-- ============================================
-- Step 7: Show Status Mapping Preview
-- ============================================
SELECT 
    'Status Mapping Preview' as section,
    status as old_status,
    CASE 
        WHEN status = 'study' THEN 'under-study'
        WHEN status = 'corrigendum' THEN 'wait-for-corrigendum'
        WHEN status = 'new' THEN 'new'
        WHEN status = 'on-hold' THEN 'on-hold'
        WHEN status = 'will-bid' THEN 'will-bid'
        WHEN status = 'pre-bid' THEN 'pre-bid'
        WHEN status = 'not-bidding' THEN 'not-bidding'
        WHEN status = 'assigned' THEN 'assigned'
        WHEN status = 'in-preparation' THEN 'in-preparation'
        WHEN status = 'submitted' THEN 'submitted'
        WHEN status = 'under-evaluation' THEN 'under-evaluation'
        WHEN status = 'qualified' THEN 'qualified'
        WHEN status = 'not-qualified' THEN 'not-qualified'
        WHEN status = 'won' THEN 'won'
        WHEN status = 'lost' THEN 'lost'
        ELSE 'new'
    END as new_status,
    COUNT(*) as count
FROM tender_tenders 
GROUP BY status 
ORDER BY count DESC;

-- ============================================
-- Step 8: Migrate Tenders
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
    id, 
    company_id, 
    tender247_id, 
    gem_eprocure_id, 
    portal_link,
    tender_name, 
    source, 
    location, 
    last_date,
    COALESCE(msme_exempted, false) as msme_exempted,
    COALESCE(startup_exempted, false) as startup_exempted,
    COALESCE(emd_amount, 0) as emd_amount,
    COALESCE(tender_fees, 0) as tender_fees,
    COALESCE(tender_cost, 0) as tender_cost,
    tender_notes,
    -- Map old status values to new status values
    CASE 
        WHEN status = 'study' THEN 'under-study'
        WHEN status = 'corrigendum' THEN 'wait-for-corrigendum'
        WHEN status = 'new' THEN 'new'
        WHEN status = 'on-hold' THEN 'on-hold'
        WHEN status = 'will-bid' THEN 'will-bid'
        WHEN status = 'pre-bid' THEN 'pre-bid'
        WHEN status = 'not-bidding' THEN 'not-bidding'
        WHEN status = 'assigned' THEN 'assigned'
        WHEN status = 'in-preparation' THEN 'in-preparation'
        WHEN status = 'submitted' THEN 'submitted'
        WHEN status = 'under-evaluation' THEN 'under-evaluation'
        WHEN status = 'qualified' THEN 'qualified'
        WHEN status = 'not-qualified' THEN 'not-qualified'
        WHEN status = 'won' THEN 'won'
        WHEN status = 'lost' THEN 'lost'
        ELSE 'new'  -- Default to 'new' for any unrecognized status
    END as status,
    assigned_to, 
    not_bidding_reason, 
    created_by,
    COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
    COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at
FROM tender_tenders
ON CONFLICT (id) DO UPDATE SET
    tender247_id = EXCLUDED.tender247_id,
    gem_eprocure_id = EXCLUDED.gem_eprocure_id,
    portal_link = EXCLUDED.portal_link,
    tender_name = EXCLUDED.tender_name,
    source = EXCLUDED.source,
    location = EXCLUDED.location,
    last_date = EXCLUDED.last_date,
    msme_exempted = EXCLUDED.msme_exempted,
    startup_exempted = EXCLUDED.startup_exempted,
    emd_amount = EXCLUDED.emd_amount,
    tender_fees = EXCLUDED.tender_fees,
    tender_cost = EXCLUDED.tender_cost,
    tender_notes = EXCLUDED.tender_notes,
    status = EXCLUDED.status,
    assigned_to = EXCLUDED.assigned_to,
    not_bidding_reason = EXCLUDED.not_bidding_reason,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Step 9: Migrate Tender History
-- ============================================
INSERT INTO tender1_tender_history (
    id, tender_id, changed_by, action,
    old_values, new_values, change_description, created_at
)
SELECT 
    id, 
    tender_id, 
    changed_by, 
    action,
    old_values, 
    new_values, 
    change_description, 
    COALESCE(created_at, CURRENT_TIMESTAMP) as created_at
FROM tender_tender_history
ON CONFLICT (id) DO UPDATE SET
    tender_id = EXCLUDED.tender_id,
    changed_by = EXCLUDED.changed_by,
    action = EXCLUDED.action,
    old_values = EXCLUDED.old_values,
    new_values = EXCLUDED.new_values,
    change_description = EXCLUDED.change_description;

COMMIT;

-- ============================================
-- Step 10: Verification and Summary
-- ============================================

-- Show migration summary
SELECT 
    'Migration Complete!' as status,
    (SELECT COUNT(*) FROM tender1_companies) as companies_migrated,
    (SELECT COUNT(*) FROM tender1_users) as users_migrated,
    (SELECT COUNT(*) FROM tender1_user_companies) as user_company_relationships,
    (SELECT COUNT(*) FROM tender1_tenders) as tenders_migrated,
    (SELECT COUNT(*) FROM tender1_tender_history) as history_records_migrated;

-- ============================================
-- Step 11: Data Integrity Checks
-- ============================================

-- Check for orphaned tenders (tenders without valid company)
SELECT 
    'Orphaned Tenders Check' as check_type,
    COUNT(*) as orphaned_count
FROM tender1_tenders t
LEFT JOIN tender1_companies c ON t.company_id = c.id
WHERE c.id IS NULL;

-- Check for orphaned user-company relationships
SELECT 
    'Orphaned User-Company Relationships Check' as check_type,
    COUNT(*) as orphaned_count
FROM tender1_user_companies uc
LEFT JOIN tender1_users u ON uc.user_id = u.id
LEFT JOIN tender1_companies c ON uc.company_id = c.id
WHERE u.id IS NULL OR c.id IS NULL;

-- Check for users without company access
SELECT 
    'Users Without Company Access Check' as check_type,
    COUNT(*) as users_without_company
FROM tender1_users u
LEFT JOIN tender1_user_companies uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL;

-- ============================================
-- Step 12: Sample Data Verification
-- ============================================

-- Show sample companies
SELECT 'Sample Companies' as section, company_name, company_email, is_active 
FROM tender1_companies 
ORDER BY created_at DESC 
LIMIT 5;

-- Show sample users with their company access
SELECT 
    'Sample Users with Company Access' as section,
    u.full_name,
    u.email,
    c.company_name,
    uc.role,
    uc.is_default
FROM tender1_users u
JOIN tender1_user_companies uc ON u.id = uc.user_id
JOIN tender1_companies c ON uc.company_id = c.id
ORDER BY u.created_at DESC 
LIMIT 10;

-- Show sample tenders
SELECT 
    'Sample Tenders' as section,
    tender_name,
    source,
    status,
    c.company_name
FROM tender1_tenders t
JOIN tender1_companies c ON t.company_id = c.id
ORDER BY t.created_at DESC 
LIMIT 5;

-- ============================================
-- Step 13: Migration Statistics
-- ============================================

-- Compare source vs target counts
SELECT 
    'Migration Statistics' as section,
    (SELECT COUNT(*) FROM tender_companies) as source_companies,
    (SELECT COUNT(*) FROM tender1_companies) as target_companies,
    (SELECT COUNT(*) FROM tender_users) as source_users,
    (SELECT COUNT(*) FROM tender1_users) as target_users,
    (SELECT COUNT(*) FROM tender_tenders) as source_tenders,
    (SELECT COUNT(*) FROM tender1_tenders) as target_tenders,
    (SELECT COUNT(*) FROM tender_tender_history) as source_history,
    (SELECT COUNT(*) FROM tender1_tender_history) as target_history;

-- ============================================
-- Step 14: Cleanup Instructions (Optional)
-- ============================================

-- Uncomment the following lines ONLY after verifying the migration was successful
-- and you're confident the new tables work correctly

/*
-- DROP old tables (BE VERY CAREFUL!)
-- DROP TABLE IF EXISTS tender_tender_history;
-- DROP TABLE IF EXISTS tender_tenders;
-- DROP TABLE IF EXISTS tender_users;
-- DROP TABLE IF EXISTS tender_companies;
*/

SELECT 'Migration script completed successfully! Please verify the data integrity checks above.' as final_message;
