-- ============================================
-- FIX: tender1_authenticate_user function
-- Fixes GROUP BY clause error
-- ============================================

-- Drop and recreate the function with correct SQL
DROP FUNCTION IF EXISTS tender1_authenticate_user(text, text);

CREATE OR REPLACE FUNCTION tender1_authenticate_user(
  user_email TEXT,
  user_password TEXT
)
RETURNS TABLE (
  user_id UUID,
  full_name VARCHAR,
  email VARCHAR,
  is_active BOOLEAN,
  companies JSONB
) AS $$
DECLARE
  user_record RECORD;
  user_companies JSONB;
BEGIN
  -- Find user by email
  SELECT u.*
  INTO user_record
  FROM tender1_users u
  WHERE u.email = user_email AND u.is_active = true;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  -- Verify password
  IF NOT tender1_verify_password(user_password, user_record.password_hash) THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  -- Get all companies for this user (FIXED: proper aggregation)
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'company_id', c.id,
        'company_name', c.company_name,
        'company_email', c.company_email,
        'role', uc.role,
        'is_active', uc.is_active,
        'is_default', uc.is_default
      ) ORDER BY uc.is_default DESC, c.company_name
    )::jsonb,
    '[]'::jsonb
  )
  INTO user_companies
  FROM tender1_user_companies uc
  JOIN tender1_companies c ON uc.company_id = c.id
  WHERE uc.user_id = user_record.id 
    AND uc.is_active = true 
    AND c.is_active = true;

  -- Update last login
  UPDATE tender1_users SET last_login = CURRENT_TIMESTAMP WHERE id = user_record.id;

  -- Return user data with companies
  RETURN QUERY
  SELECT 
    user_record.id,
    user_record.full_name,
    user_record.email,
    user_record.is_active,
    user_companies;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function (uncomment to test)
-- SELECT * FROM tender1_authenticate_user('demo@example.com', 'demo123');

SELECT 'Function tender1_authenticate_user fixed successfully!' as status;

