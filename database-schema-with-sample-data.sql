-- ============================================
-- FRESH TENDER MANAGEMENT SYSTEM - MULTI-COMPANY
-- With Sample Data Per Your Scenario
-- Prefix: tender1_
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CLEANUP: Drop existing tender1_ tables and functions
-- ============================================

-- Drop tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS tender1_company_invitations CASCADE;
DROP TABLE IF EXISTS tender1_tender_history CASCADE;
DROP TABLE IF EXISTS tender1_tenders CASCADE;
DROP TABLE IF EXISTS tender1_user_companies CASCADE;
DROP TABLE IF EXISTS tender1_users CASCADE;
DROP TABLE IF EXISTS tender1_companies CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS tender1_authenticate_user(text, text) CASCADE;
DROP FUNCTION IF EXISTS tender1_create_user(varchar, varchar, text, uuid, varchar) CASCADE;
DROP FUNCTION IF EXISTS tender1_add_user_to_company(uuid, uuid, varchar, uuid) CASCADE;
DROP FUNCTION IF EXISTS tender1_remove_user_from_company(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS tender1_set_default_company(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS tender1_get_user_companies(uuid) CASCADE;
DROP FUNCTION IF EXISTS tender1_check_user_company_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS tender1_get_company_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS tender1_update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS tender1_log_tender_changes() CASCADE;
DROP FUNCTION IF EXISTS tender1_hash_password(text) CASCADE;
DROP FUNCTION IF EXISTS tender1_verify_password(text, text) CASCADE;

-- ============================================
-- TABLE: tender1_companies
-- ============================================
CREATE TABLE tender1_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL UNIQUE,
  company_email VARCHAR(255) NOT NULL UNIQUE,
  company_phone VARCHAR(50),
  company_address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender1_companies_name_check CHECK (length(company_name) >= 2),
  CONSTRAINT tender1_companies_email_check CHECK (company_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================
-- TABLE: tender1_users
-- ============================================
CREATE TABLE tender1_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender1_users_name_check CHECK (length(full_name) >= 2),
  CONSTRAINT tender1_users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_tender1_users_email ON tender1_users(email);

-- ============================================
-- TABLE: tender1_user_companies (Junction Table)
-- ============================================
CREATE TABLE tender1_user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES tender1_users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES tender1_companies(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  invited_by UUID REFERENCES tender1_users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender1_user_companies_unique UNIQUE (user_id, company_id)
);

CREATE INDEX idx_tender1_user_companies_user ON tender1_user_companies(user_id);
CREATE INDEX idx_tender1_user_companies_company ON tender1_user_companies(company_id);
CREATE INDEX idx_tender1_user_companies_active ON tender1_user_companies(user_id, is_active);

-- ============================================
-- TABLE: tender1_tenders
-- ============================================
CREATE TABLE tender1_tenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES tender1_companies(id) ON DELETE CASCADE,
  tender247_id VARCHAR(100),
  gem_eprocure_id VARCHAR(100),
  portal_link TEXT,
  tender_name VARCHAR(500) NOT NULL,
  source VARCHAR(100) CHECK (source IN ('tender247', 'gem', 'nprocure', 'eprocure', 'other')),
  location VARCHAR(255),
  last_date DATE,
  msme_exempted BOOLEAN DEFAULT false,
  startup_exempted BOOLEAN DEFAULT false,
  emd_amount DECIMAL(15, 2) DEFAULT 0,
  tender_fees DECIMAL(15, 2) DEFAULT 0,
  tender_cost DECIMAL(15, 2) DEFAULT 0,
  tender_notes TEXT,
  status VARCHAR(50) DEFAULT 'study' CHECK (status IN ('study', 'pre-bid', 'corrigendum', 'not-bidding', 'assigned', 'submitted')),
  assigned_to UUID REFERENCES tender1_users(id) ON DELETE SET NULL,
  not_bidding_reason TEXT,
  created_by UUID REFERENCES tender1_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender1_tenders_name_check CHECK (length(tender_name) >= 3)
);

CREATE INDEX idx_tender1_tenders_company ON tender1_tenders(company_id);
CREATE INDEX idx_tender1_tenders_status ON tender1_tenders(status);
CREATE INDEX idx_tender1_tenders_assigned ON tender1_tenders(assigned_to);
CREATE INDEX idx_tender1_tenders_last_date ON tender1_tenders(last_date);
CREATE INDEX idx_tender1_tenders_created_at ON tender1_tenders(created_at DESC);

-- ============================================
-- TABLE: tender1_tender_history
-- ============================================
CREATE TABLE tender1_tender_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tender1_tenders(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES tender1_users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed')),
  old_values JSONB,
  new_values JSONB,
  change_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tender1_history_tender ON tender1_tender_history(tender_id);
CREATE INDEX idx_tender1_history_created ON tender1_tender_history(created_at DESC);

-- ============================================
-- TABLE: tender1_company_invitations
-- ============================================
CREATE TABLE tender1_company_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES tender1_companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  invited_by UUID NOT NULL REFERENCES tender1_users(id) ON DELETE CASCADE,
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender1_invitations_unique UNIQUE (company_id, email)
);

CREATE INDEX idx_tender1_invitations_token ON tender1_company_invitations(invitation_token);
CREATE INDEX idx_tender1_invitations_email ON tender1_company_invitations(email);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION tender1_hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tender1_verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  SELECT u.* INTO user_record
  FROM tender1_users u
  WHERE u.email = user_email AND u.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  IF NOT tender1_verify_password(user_password, user_record.password_hash) THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

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

  UPDATE tender1_users SET last_login = CURRENT_TIMESTAMP WHERE id = user_record.id;

  RETURN QUERY SELECT user_record.id, user_record.full_name, user_record.email, user_record.is_active, user_companies;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tender1_create_user(
  p_full_name VARCHAR,
  p_email VARCHAR,
  p_password TEXT,
  p_company_id UUID DEFAULT NULL,
  p_role VARCHAR DEFAULT 'admin'
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  INSERT INTO tender1_users (full_name, email, password_hash)
  VALUES (p_full_name, p_email, tender1_hash_password(p_password))
  RETURNING id INTO new_user_id;

  IF p_company_id IS NOT NULL THEN
    INSERT INTO tender1_user_companies (user_id, company_id, role, is_default, accepted_at)
    VALUES (new_user_id, p_company_id, p_role, true, CURRENT_TIMESTAMP);
  END IF;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tender1_add_user_to_company(
  p_user_id UUID,
  p_company_id UUID,
  p_role VARCHAR DEFAULT 'user',
  p_invited_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_link_id UUID;
  is_first_company BOOLEAN;
BEGIN
  SELECT NOT EXISTS(SELECT 1 FROM tender1_user_companies WHERE user_id = p_user_id) INTO is_first_company;

  INSERT INTO tender1_user_companies (user_id, company_id, role, is_default, invited_by, accepted_at)
  VALUES (p_user_id, p_company_id, p_role, is_first_company, p_invited_by, CURRENT_TIMESTAMP)
  RETURNING id INTO new_link_id;

  RETURN new_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tender1_remove_user_from_company(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE company_count INTEGER;
BEGIN
  DELETE FROM tender1_user_companies WHERE user_id = p_user_id AND company_id = p_company_id;
  SELECT COUNT(*) INTO company_count FROM tender1_user_companies WHERE user_id = p_user_id;
  IF company_count = 0 THEN
    UPDATE tender1_users SET is_active = false WHERE id = p_user_id;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tender1_set_default_company(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE tender1_user_companies SET is_default = false WHERE user_id = p_user_id;
  UPDATE tender1_user_companies SET is_default = true WHERE user_id = p_user_id AND company_id = p_company_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tender1_get_user_companies(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name VARCHAR,
  company_email VARCHAR,
  role VARCHAR,
  is_active BOOLEAN,
  is_default BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.company_name, c.company_email, uc.role, uc.is_active, uc.is_default
  FROM tender1_user_companies uc
  JOIN tender1_companies c ON uc.company_id = c.id
  WHERE uc.user_id = p_user_id AND uc.is_active = true AND c.is_active = true
  ORDER BY uc.is_default DESC, c.company_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tender1_check_user_company_access(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM tender1_user_companies uc
    JOIN tender1_companies c ON uc.company_id = c.id
    WHERE uc.user_id = p_user_id AND uc.company_id = p_company_id
      AND uc.is_active = true AND c.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tender1_get_company_stats(p_company_id UUID)
RETURNS TABLE (
  total_tenders BIGINT,
  submitted_bids BIGINT,
  not_bidding BIGINT,
  active_users BIGINT,
  upcoming_deadlines BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'submitted'),
    COUNT(*) FILTER (WHERE status = 'not-bidding'),
    (SELECT COUNT(DISTINCT uc.user_id) FROM tender1_user_companies uc WHERE uc.company_id = p_company_id AND uc.is_active = true),
    COUNT(*) FILTER (WHERE last_date >= CURRENT_DATE AND last_date <= CURRENT_DATE + INTERVAL '7 days')
  FROM tender1_tenders WHERE company_id = p_company_id AND created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tender1_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tender1_companies_update_timestamp BEFORE UPDATE ON tender1_companies
  FOR EACH ROW EXECUTE FUNCTION tender1_update_timestamp();
CREATE TRIGGER tender1_users_update_timestamp BEFORE UPDATE ON tender1_users
  FOR EACH ROW EXECUTE FUNCTION tender1_update_timestamp();
CREATE TRIGGER tender1_user_companies_update_timestamp BEFORE UPDATE ON tender1_user_companies
  FOR EACH ROW EXECUTE FUNCTION tender1_update_timestamp();
CREATE TRIGGER tender1_tenders_update_timestamp BEFORE UPDATE ON tender1_tenders
  FOR EACH ROW EXECUTE FUNCTION tender1_update_timestamp();

CREATE OR REPLACE FUNCTION tender1_log_tender_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tender1_tender_history (tender_id, changed_by, action, new_values, change_description)
    VALUES (NEW.id, NEW.created_by, 'created', to_jsonb(NEW), 'Tender created');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO tender1_tender_history (tender_id, changed_by, action, old_values, new_values, change_description)
      VALUES (NEW.id, NEW.created_by, 'status_changed', 
              jsonb_build_object('status', OLD.status), 
              jsonb_build_object('status', NEW.status),
              'Status changed from ' || OLD.status || ' to ' || NEW.status);
    ELSE
      INSERT INTO tender1_tender_history (tender_id, changed_by, action, old_values, new_values, change_description)
      VALUES (NEW.id, NEW.created_by, 'updated', to_jsonb(OLD), to_jsonb(NEW), 'Tender updated');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tender1_tenders_log_changes AFTER INSERT OR UPDATE ON tender1_tenders
  FOR EACH ROW EXECUTE FUNCTION tender1_log_tender_changes();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE tender1_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender1_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender1_user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender1_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender1_tender_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender1_company_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tender1_companies_policy ON tender1_companies FOR ALL USING (true);
CREATE POLICY tender1_users_policy ON tender1_users FOR ALL USING (true);
CREATE POLICY tender1_user_companies_policy ON tender1_user_companies FOR ALL USING (true);
CREATE POLICY tender1_tenders_policy ON tender1_tenders FOR ALL USING (true);
CREATE POLICY tender1_history_policy ON tender1_tender_history FOR ALL USING (true);

-- ============================================
-- SAMPLE DATA - YOUR SCENARIO
-- ============================================

-- Insert Companies
INSERT INTO tender1_companies (company_name, company_email) VALUES
  ('Company 1', 'contact@company1.com'),
  ('Company 2', 'contact@company2.com');

-- Insert Users (all passwords are the email prefix + '123')
-- Example: demo@admin1.com password is 'demo123'
INSERT INTO tender1_users (full_name, email, password_hash) VALUES
  ('Demo Admin 1', 'demo@admin1.com', tender1_hash_password('demo123')),
  ('User 1 Admin 1', 'user1@admin1.com', tender1_hash_password('user1123')),
  ('User 2 Admin 1', 'user2@admin1.com', tender1_hash_password('user2123')),
  ('Demo Admin 2', 'demo@admin2.com', tender1_hash_password('demo123')),
  ('User 1 Admin 2', 'user1@admin2.com', tender1_hash_password('user1123'));

-- Setup variables for company and user IDs
DO $$
DECLARE
  company1_id UUID;
  company2_id UUID;
  demo_admin1_id UUID;
  user1_admin1_id UUID;
  user2_admin1_id UUID;
  demo_admin2_id UUID;
  user1_admin2_id UUID;
BEGIN
  -- Get company IDs
  SELECT id INTO company1_id FROM tender1_companies WHERE company_name = 'Company 1';
  SELECT id INTO company2_id FROM tender1_companies WHERE company_name = 'Company 2';
  
  -- Get user IDs
  SELECT id INTO demo_admin1_id FROM tender1_users WHERE email = 'demo@admin1.com';
  SELECT id INTO user1_admin1_id FROM tender1_users WHERE email = 'user1@admin1.com';
  SELECT id INTO user2_admin1_id FROM tender1_users WHERE email = 'user2@admin1.com';
  SELECT id INTO demo_admin2_id FROM tender1_users WHERE email = 'demo@admin2.com';
  SELECT id INTO user1_admin2_id FROM tender1_users WHERE email = 'user1@admin2.com';
  
  -- ==========================================
  -- Company 1 Access
  -- ==========================================
  
  -- demo@admin1.com → Company 1 (Admin, Default)
  INSERT INTO tender1_user_companies (user_id, company_id, role, is_default, accepted_at)
  VALUES (demo_admin1_id, company1_id, 'admin', true, CURRENT_TIMESTAMP);
  
  -- user1@admin1.com → Company 1 (User, Default)
  INSERT INTO tender1_user_companies (user_id, company_id, role, is_default, accepted_at)
  VALUES (user1_admin1_id, company1_id, 'user', true, CURRENT_TIMESTAMP);
  
  -- user2@admin1.com → Company 1 (User, Default for now)
  INSERT INTO tender1_user_companies (user_id, company_id, role, is_default, accepted_at)
  VALUES (user2_admin1_id, company1_id, 'user', true, CURRENT_TIMESTAMP);
  
  -- ==========================================
  -- Company 2 Access
  -- ==========================================
  
  -- demo@admin2.com → Company 2 (Admin, Default)
  INSERT INTO tender1_user_companies (user_id, company_id, role, is_default, accepted_at)
  VALUES (demo_admin2_id, company2_id, 'admin', true, CURRENT_TIMESTAMP);
  
  -- user1@admin2.com → Company 2 (User, Default)
  INSERT INTO tender1_user_companies (user_id, company_id, role, is_default, accepted_at)
  VALUES (user1_admin2_id, company2_id, 'user', true, CURRENT_TIMESTAMP);
  
  -- user2@admin1.com → Company 2 (User, NOT default)
  -- This is the MULTI-COMPANY ACCESS user!
  INSERT INTO tender1_user_companies (user_id, company_id, role, is_default, accepted_at)
  VALUES (user2_admin1_id, company2_id, 'user', false, CURRENT_TIMESTAMP);
  
  RAISE NOTICE 'Sample data created successfully!';
END $$;

-- ============================================
-- GRANTS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- VERIFICATION: Show all users and their companies
-- ============================================
SELECT 
  u.full_name,
  u.email,
  json_agg(
    json_build_object(
      'company', c.company_name,
      'role', uc.role,
      'is_default', uc.is_default
    ) ORDER BY uc.is_default DESC
  ) as companies
FROM tender1_users u
LEFT JOIN tender1_user_companies uc ON u.id = uc.user_id
LEFT JOIN tender1_companies c ON uc.company_id = c.id
GROUP BY u.id, u.full_name, u.email
ORDER BY u.email;

-- ============================================
-- LOGIN CREDENTIALS SUMMARY
-- ============================================
/*
COMPANY 1 Users:
- demo@admin1.com / demo123 (Admin)
- user1@admin1.com / user1123 (User)
- user2@admin1.com / user2123 (User) → Also has access to Company 2!

COMPANY 2 Users:
- demo@admin2.com / demo123 (Admin)
- user1@admin2.com / user1123 (User)
- user2@admin1.com / user2123 (User) → Multi-company access!

MULTI-COMPANY ACCESS:
- user2@admin1.com can access BOTH Company 1 and Company 2
- When logged in, they can switch between companies using the dropdown
- Company 1 is their default company
*/

SELECT 'Database setup complete with multi-company scenario!' as status;

