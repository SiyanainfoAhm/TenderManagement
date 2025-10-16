-- ============================================
-- Add Existing User to Another Company
-- This script adds an existing user to your company
-- ============================================

-- STEP 1: Check if the user exists
SELECT 
  id as user_id,
  full_name,
  email,
  'User exists! Copy the user_id from above' as next_step
FROM tender1_users 
WHERE email = 'demouser1@example.com';

-- If you see a result above, the user exists!
-- Note the user_id for the next step.

-- ============================================

-- STEP 2: Add user to Demo Company
-- This uses DO block to automatically get the IDs

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_your_id UUID;
BEGIN
  -- Get the user ID for demouser1@example.com
  SELECT id INTO v_user_id 
  FROM tender1_users 
  WHERE email = 'demouser1@example.com';
  
  -- Get the Demo Company ID
  SELECT id INTO v_company_id 
  FROM tender1_companies 
  WHERE company_name = 'Demo Company';
  
  -- Get your user ID (demo@example.com)
  SELECT id INTO v_your_id 
  FROM tender1_users 
  WHERE email = 'demo@example.com';
  
  -- Check if all IDs were found
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User demouser1@example.com not found!';
  END IF;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Demo Company not found!';
  END IF;
  
  IF v_your_id IS NULL THEN
    RAISE EXCEPTION 'Your user (demo@example.com) not found!';
  END IF;
  
  -- Add the user to the company
  PERFORM tender1_add_user_to_company(
    v_user_id,
    v_company_id,
    'user',  -- Role: 'admin', 'user', or 'viewer'
    v_your_id
  );
  
  RAISE NOTICE 'User added successfully!';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Company ID: %', v_company_id;
END $$;

-- ============================================

-- STEP 3: Verify the user was added
SELECT 
  u.full_name,
  u.email,
  c.company_name,
  uc.role,
  uc.is_active,
  'User successfully added to company!' as status
FROM tender1_user_companies uc
JOIN tender1_users u ON uc.user_id = u.id
JOIN tender1_companies c ON uc.company_id = c.id
WHERE u.email = 'demouser1@example.com'
  AND c.company_name = 'Demo Company';

-- ============================================
-- Success!
-- The user can now login and see both companies in the company switcher
-- ============================================

