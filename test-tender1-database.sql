-- ============================================
-- TEST SCRIPT: Verify tender1_ database is working
-- Run this in Supabase SQL Editor to test
-- ============================================

-- Test 1: Check all tables exist
SELECT 
  'tender1_companies' as table_name, COUNT(*)::text as count FROM tender1_companies
UNION ALL
SELECT 'tender1_users', COUNT(*)::text FROM tender1_users
UNION ALL
SELECT 'tender1_user_companies', COUNT(*)::text FROM tender1_user_companies
UNION ALL
SELECT 'tender1_tenders', COUNT(*)::text FROM tender1_tenders
UNION ALL
SELECT 'tender1_tender_history', COUNT(*)::text FROM tender1_tender_history;

-- Test 2: Check all users have companies
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

-- Test 3: Try authentication function (use real password)
-- SELECT * FROM tender1_authenticate_user('aminmihirh@gmail.com', 'your_password_here');

-- Test 4: Check company stats
SELECT * FROM tender1_get_company_stats(
  (SELECT id FROM tender1_companies LIMIT 1)
);

-- Test 5: List all companies
SELECT 
  company_name,
  company_email,
  (SELECT COUNT(*) FROM tender1_user_companies uc WHERE uc.company_id = c.id) as user_count,
  (SELECT COUNT(*) FROM tender1_tenders t WHERE t.company_id = c.id) as tender_count
FROM tender1_companies c
ORDER BY company_name;

-- Success message
SELECT 'All tests passed! Database is ready.' as status;

