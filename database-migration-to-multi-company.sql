-- ============================================
-- MIGRATION SCRIPT: Single Company to Multi-Company
-- This script migrates existing data to the new multi-company structure
-- ============================================

-- IMPORTANT: Backup your database before running this migration!
-- Run: npm run export-db

BEGIN;

-- ============================================
-- STEP 1: Create new tables and functions
-- ============================================
-- (Run database-schema-multi-company.sql first, then this file)

-- ============================================
-- STEP 2: Backup existing data
-- ============================================
CREATE TEMP TABLE temp_old_users AS 
SELECT * FROM tender_users;

-- ============================================
-- STEP 3: Create the new junction table if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS tender_user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender_user_companies_unique UNIQUE (user_id, company_id)
);

-- ============================================
-- STEP 4: Migrate existing users to new structure
-- ============================================

-- First, check if company_id column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tender_users' AND column_name = 'company_id'
  ) THEN
    -- Migrate all existing user-company relationships to junction table
    INSERT INTO tender_user_companies (
      user_id, 
      company_id, 
      role, 
      is_default,
      is_active,
      accepted_at
    )
    SELECT 
      id as user_id,
      company_id,
      role,
      true as is_default, -- Their current company becomes default
      is_active,
      CURRENT_TIMESTAMP as accepted_at
    FROM temp_old_users
    WHERE company_id IS NOT NULL
    ON CONFLICT (user_id, company_id) DO NOTHING;

    RAISE NOTICE 'Migrated % user-company relationships', 
      (SELECT COUNT(*) FROM tender_user_companies);

    -- Remove company_id and role columns from tender_users
    ALTER TABLE tender_users DROP COLUMN IF EXISTS company_id CASCADE;
    ALTER TABLE tender_users DROP COLUMN IF EXISTS role CASCADE;
    
    RAISE NOTICE 'Removed company_id and role columns from tender_users';
  ELSE
    RAISE NOTICE 'Column company_id does not exist in tender_users. Already migrated.';
  END IF;
END $$;

-- ============================================
-- STEP 5: Verify migration
-- ============================================
DO $$
DECLARE
  user_count INTEGER;
  company_link_count INTEGER;
  orphan_count INTEGER;
BEGIN
  -- Count users
  SELECT COUNT(*) INTO user_count FROM tender_users;
  
  -- Count user-company links
  SELECT COUNT(*) INTO company_link_count FROM tender_user_companies;
  
  -- Count users without any company
  SELECT COUNT(*) INTO orphan_count 
  FROM tender_users u
  WHERE NOT EXISTS (
    SELECT 1 FROM tender_user_companies uc WHERE uc.user_id = u.id
  );
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total Users: %', user_count;
  RAISE NOTICE 'User-Company Links: %', company_link_count;
  RAISE NOTICE 'Users without company: %', orphan_count;
  RAISE NOTICE '==============================================';
  
  IF orphan_count > 0 THEN
    RAISE WARNING '% users have no company assigned!', orphan_count;
  END IF;
END $$;

-- ============================================
-- STEP 6: Show migration summary
-- ============================================
SELECT 
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM tender_users) as total_users,
  (SELECT COUNT(*) FROM tender_companies) as total_companies,
  (SELECT COUNT(*) FROM tender_user_companies) as user_company_links,
  (SELECT COUNT(*) FROM tender_tenders) as total_tenders;

-- ============================================
-- STEP 7: Test queries
-- ============================================

-- Test: Show all users with their companies
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

-- Test: Show all companies with user count
SELECT 
  c.company_name,
  c.company_email,
  COUNT(uc.user_id) as user_count,
  json_agg(
    json_build_object(
      'name', u.full_name,
      'email', u.email,
      'role', uc.role
    )
  ) as users
FROM tender_companies c
LEFT JOIN tender_user_companies uc ON c.id = uc.company_id AND uc.is_active = true
LEFT JOIN tender_users u ON uc.user_id = u.id
GROUP BY c.id, c.company_name, c.company_email
ORDER BY c.company_name;

COMMIT;

-- ============================================
-- POST-MIGRATION CLEANUP (Optional)
-- ============================================

-- Drop temporary tables
-- DROP TABLE IF EXISTS temp_old_users;

-- ============================================
-- ROLLBACK PLAN (In case of issues)
-- ============================================

/*
-- To rollback (only if you haven't committed):
ROLLBACK;

-- To manually rollback after commit:
-- 1. Restore from your backup using the export files
-- 2. Or recreate the old structure:

ALTER TABLE tender_users ADD COLUMN company_id UUID;
ALTER TABLE tender_users ADD COLUMN role VARCHAR(50) DEFAULT 'user';

UPDATE tender_users u
SET company_id = (
  SELECT company_id 
  FROM tender_user_companies uc 
  WHERE uc.user_id = u.id AND uc.is_default = true
  LIMIT 1
),
role = (
  SELECT role 
  FROM tender_user_companies uc 
  WHERE uc.user_id = u.id AND uc.is_default = true
  LIMIT 1
);

DROP TABLE tender_user_companies CASCADE;
*/

-- ============================================
-- NOTES
-- ============================================
-- 1. All existing users maintain their current company access
-- 2. Their existing company becomes their "default" company
-- 3. Users can now be added to multiple companies
-- 4. Each user-company relationship has its own role
-- 5. Row Level Security policies ensure data isolation
-- 6. All tenders remain unchanged
-- 7. All tender history remains unchanged

