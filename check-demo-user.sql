-- ============================================
-- Check demo user details
-- ============================================

-- Check user in tender1_users table
SELECT 
  id,
  full_name,
  email,
  is_active,
  created_at
FROM tender1_users
WHERE email = 'demo@example.com';

-- Check user's company access and role
SELECT 
  u.full_name,
  u.email,
  c.company_name,
  uc.role,
  uc.is_active,
  uc.is_default
FROM tender1_users u
JOIN tender1_user_companies uc ON u.id = uc.user_id
JOIN tender1_companies c ON uc.company_id = c.id
WHERE u.email = 'demo@example.com';

-- Test authentication
SELECT * FROM tender1_authenticate_user('demo@example.com', 'demo123');

