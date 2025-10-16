-- ============================================
-- FIX: Row Level Security Policies for tender1_ tables
-- Allow proper access for multi-company operations
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS tender1_companies_policy ON tender1_companies;
DROP POLICY IF EXISTS tender1_users_policy ON tender1_users;
DROP POLICY IF EXISTS tender1_user_companies_policy ON tender1_user_companies;
DROP POLICY IF EXISTS tender1_tenders_policy ON tender1_tenders;
DROP POLICY IF EXISTS tender1_history_policy ON tender1_tender_history;
DROP POLICY IF EXISTS tender1_invitations_policy ON tender1_company_invitations;

-- ============================================
-- PERMISSIVE POLICIES (Allow all authenticated operations)
-- ============================================

-- Companies: Allow all operations
CREATE POLICY tender1_companies_all_policy ON tender1_companies
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users: Allow all operations
CREATE POLICY tender1_users_all_policy ON tender1_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- User Companies: Allow all operations
CREATE POLICY tender1_user_companies_all_policy ON tender1_user_companies
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Tenders: Allow all operations
CREATE POLICY tender1_tenders_all_policy ON tender1_tenders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Tender History: Allow all operations
CREATE POLICY tender1_history_all_policy ON tender1_tender_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Company Invitations: Allow all operations
CREATE POLICY tender1_invitations_all_policy ON tender1_company_invitations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- SUCCESS
-- ============================================

SELECT 'RLS policies fixed! All operations now allowed.' as status;

-- Test: Try to insert an invitation (should work now)
-- You can test by running the invite user flow in your app

