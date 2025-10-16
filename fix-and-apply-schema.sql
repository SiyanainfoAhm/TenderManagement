-- ============================================
-- FIX SCRIPT: Drop existing functions before applying new schema
-- Run this FIRST, then run database-schema-multi-company.sql
-- ============================================

-- Drop existing functions that will be replaced
DROP FUNCTION IF EXISTS tender_authenticate_user(text, text) CASCADE;
DROP FUNCTION IF EXISTS tender_create_user(uuid, varchar, varchar, text, varchar) CASCADE;
DROP FUNCTION IF EXISTS tender_get_company_stats(uuid) CASCADE;

-- Also drop any other conflicting functions
DROP FUNCTION IF EXISTS tender_get_user_companies(uuid) CASCADE;
DROP FUNCTION IF EXISTS tender_add_user_to_company(uuid, uuid, varchar, uuid) CASCADE;
DROP FUNCTION IF EXISTS tender_remove_user_from_company(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS tender_set_default_company(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS tender_check_user_company_access(uuid, uuid) CASCADE;

-- Drop the new table if it exists from a previous attempt
DROP TABLE IF EXISTS tender_company_invitations CASCADE;
DROP TABLE IF EXISTS tender_user_companies CASCADE;

-- Success message
SELECT 'Cleanup complete! Now run database-schema-multi-company.sql' as status;

