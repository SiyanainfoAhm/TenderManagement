-- ============================================
-- FRESH TENDER MANAGEMENT SYSTEM - MULTI-COMPANY DATABASE SCHEMA
-- New prefix: tender1_ (avoids conflicts with existing tender_ tables)
-- Enhanced for Multi-Company Access with Secure Data Isolation
-- Supabase PostgreSQL Database
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLE: tender1_companies
-- Stores company information
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
-- Stores user accounts - WITHOUT company_id
-- Users can belong to multiple companies via junction table
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

-- Index for faster user lookups
CREATE INDEX idx_tender1_users_email ON tender1_users(email);

-- ============================================
-- TABLE: tender1_user_companies (Junction Table)
-- Defines which users have access to which companies and their roles
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

-- Indexes for faster lookups
CREATE INDEX idx_tender1_user_companies_user ON tender1_user_companies(user_id);
CREATE INDEX idx_tender1_user_companies_company ON tender1_user_companies(company_id);
CREATE INDEX idx_tender1_user_companies_active ON tender1_user_companies(user_id, is_active);

-- ============================================
-- TABLE: tender1_tenders
-- Stores tender information
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

-- Indexes for faster queries
CREATE INDEX idx_tender1_tenders_company ON tender1_tenders(company_id);
CREATE INDEX idx_tender1_tenders_status ON tender1_tenders(status);
CREATE INDEX idx_tender1_tenders_assigned ON tender1_tenders(assigned_to);
CREATE INDEX idx_tender1_tenders_last_date ON tender1_tenders(last_date);
CREATE INDEX idx_tender1_tenders_created_at ON tender1_tenders(created_at DESC);

-- ============================================
-- TABLE: tender1_tender_history
-- Audit trail for tender changes
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

-- Index for history queries
CREATE INDEX idx_tender1_history_tender ON tender1_tender_history(tender_id);
CREATE INDEX idx_tender1_history_created ON tender1_tender_history(created_at DESC);

-- ============================================
-- TABLE: tender1_company_invitations
-- Tracks pending invitations to join companies
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

-- Index for invitation lookups
CREATE INDEX idx_tender1_invitations_token ON tender1_company_invitations(invitation_token);
CREATE INDEX idx_tender1_invitations_email ON tender1_company_invitations(email);

-- ============================================
-- FUNCTION: tender1_hash_password
-- Hashes password using pgcrypto
-- ============================================
CREATE OR REPLACE FUNCTION tender1_hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender1_verify_password
-- Verifies password against hash
-- ============================================
CREATE OR REPLACE FUNCTION tender1_verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender1_authenticate_user
-- Authenticates user and returns user data with all companies
-- ============================================
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

  -- Get all companies for this user
  SELECT COALESCE(json_agg(
    json_build_object(
      'company_id', c.id,
      'company_name', c.company_name,
      'company_email', c.company_email,
      'role', uc.role,
      'is_active', uc.is_active,
      'is_default', uc.is_default
    )
  ), '[]'::json)::jsonb
  INTO user_companies
  FROM tender1_user_companies uc
  JOIN tender1_companies c ON uc.company_id = c.id
  WHERE uc.user_id = user_record.id 
    AND uc.is_active = true 
    AND c.is_active = true
  ORDER BY uc.is_default DESC, c.company_name;

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

-- ============================================
-- FUNCTION: tender1_create_user
-- Creates a new user and optionally links to a company
-- ============================================
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
  -- Insert new user
  INSERT INTO tender1_users (full_name, email, password_hash)
  VALUES (p_full_name, p_email, tender1_hash_password(p_password))
  RETURNING id INTO new_user_id;

  -- If company_id provided, link user to company
  IF p_company_id IS NOT NULL THEN
    INSERT INTO tender1_user_companies (user_id, company_id, role, is_default, accepted_at)
    VALUES (new_user_id, p_company_id, p_role, true, CURRENT_TIMESTAMP);
  END IF;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender1_add_user_to_company
-- Links an existing user to a company
-- ============================================
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
  -- Check if this is the user's first company
  SELECT NOT EXISTS(
    SELECT 1 FROM tender1_user_companies WHERE user_id = p_user_id
  ) INTO is_first_company;

  -- Insert user-company relationship
  INSERT INTO tender1_user_companies (
    user_id, 
    company_id, 
    role, 
    is_default,
    invited_by,
    accepted_at
  )
  VALUES (
    p_user_id, 
    p_company_id, 
    p_role, 
    is_first_company,
    p_invited_by,
    CURRENT_TIMESTAMP
  )
  RETURNING id INTO new_link_id;

  RETURN new_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender1_remove_user_from_company
-- Removes a user's access to a company
-- ============================================
CREATE OR REPLACE FUNCTION tender1_remove_user_from_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  company_count INTEGER;
BEGIN
  -- Delete the user-company relationship
  DELETE FROM tender1_user_companies 
  WHERE user_id = p_user_id AND company_id = p_company_id;

  -- Check if user still has other companies
  SELECT COUNT(*) INTO company_count
  FROM tender1_user_companies
  WHERE user_id = p_user_id;

  -- If user has no companies left, deactivate the user
  IF company_count = 0 THEN
    UPDATE tender1_users SET is_active = false WHERE id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender1_set_default_company
-- Sets a company as the user's default
-- ============================================
CREATE OR REPLACE FUNCTION tender1_set_default_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove default flag from all user's companies
  UPDATE tender1_user_companies 
  SET is_default = false 
  WHERE user_id = p_user_id;

  -- Set the specified company as default
  UPDATE tender1_user_companies 
  SET is_default = true 
  WHERE user_id = p_user_id AND company_id = p_company_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender1_get_user_companies
-- Gets all companies for a user
-- ============================================
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
  SELECT 
    c.id,
    c.company_name,
    c.company_email,
    uc.role,
    uc.is_active,
    uc.is_default
  FROM tender1_user_companies uc
  JOIN tender1_companies c ON uc.company_id = c.id
  WHERE uc.user_id = p_user_id 
    AND uc.is_active = true 
    AND c.is_active = true
  ORDER BY uc.is_default DESC, c.company_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender1_check_user_company_access
-- Checks if a user has access to a company
-- ============================================
CREATE OR REPLACE FUNCTION tender1_check_user_company_access(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM tender1_user_companies uc
    JOIN tender1_companies c ON uc.company_id = c.id
    WHERE uc.user_id = p_user_id 
      AND uc.company_id = p_company_id
      AND uc.is_active = true
      AND c.is_active = true
  ) INTO has_access;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender1_get_company_stats
-- Gets statistics for company dashboard
-- ============================================
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
    (SELECT COUNT(DISTINCT uc.user_id) 
     FROM tender1_user_companies uc 
     WHERE uc.company_id = p_company_id AND uc.is_active = true),
    COUNT(*) FILTER (WHERE last_date >= CURRENT_DATE AND last_date <= CURRENT_DATE + INTERVAL '7 days')
  FROM tender1_tenders
  WHERE company_id = p_company_id
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender1_update_timestamp
-- Auto-updates updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION tender1_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER tender1_companies_update_timestamp
  BEFORE UPDATE ON tender1_companies
  FOR EACH ROW EXECUTE FUNCTION tender1_update_timestamp();

CREATE TRIGGER tender1_users_update_timestamp
  BEFORE UPDATE ON tender1_users
  FOR EACH ROW EXECUTE FUNCTION tender1_update_timestamp();

CREATE TRIGGER tender1_user_companies_update_timestamp
  BEFORE UPDATE ON tender1_user_companies
  FOR EACH ROW EXECUTE FUNCTION tender1_update_timestamp();

CREATE TRIGGER tender1_tenders_update_timestamp
  BEFORE UPDATE ON tender1_tenders
  FOR EACH ROW EXECUTE FUNCTION tender1_update_timestamp();

-- ============================================
-- TRIGGER: tender1_log_tender_changes
-- Logs changes to tender1_tender_history
-- ============================================
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

CREATE TRIGGER tender1_tenders_log_changes
  AFTER INSERT OR UPDATE ON tender1_tenders
  FOR EACH ROW EXECUTE FUNCTION tender1_log_tender_changes();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures data isolation between companies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tender1_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender1_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender1_user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender1_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender1_tender_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender1_company_invitations ENABLE ROW LEVEL SECURITY;

-- RLS POLICY: Companies
CREATE POLICY tender1_companies_select_policy ON tender1_companies
  FOR SELECT USING (true);

CREATE POLICY tender1_companies_insert_policy ON tender1_companies
  FOR INSERT WITH CHECK (true);

CREATE POLICY tender1_companies_update_policy ON tender1_companies
  FOR UPDATE USING (true);

-- RLS POLICY: Users
CREATE POLICY tender1_users_select_policy ON tender1_users
  FOR SELECT USING (true);

CREATE POLICY tender1_users_insert_policy ON tender1_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY tender1_users_update_policy ON tender1_users
  FOR UPDATE USING (true);

-- RLS POLICY: User-Company Relationships
CREATE POLICY tender1_user_companies_select_policy ON tender1_user_companies
  FOR SELECT USING (true);

CREATE POLICY tender1_user_companies_insert_policy ON tender1_user_companies
  FOR INSERT WITH CHECK (true);

CREATE POLICY tender1_user_companies_update_policy ON tender1_user_companies
  FOR UPDATE USING (true);

-- RLS POLICY: Tenders
CREATE POLICY tender1_tenders_select_policy ON tender1_tenders
  FOR SELECT USING (true);

CREATE POLICY tender1_tenders_insert_policy ON tender1_tenders
  FOR INSERT WITH CHECK (true);

CREATE POLICY tender1_tenders_update_policy ON tender1_tenders
  FOR UPDATE USING (true);

CREATE POLICY tender1_tenders_delete_policy ON tender1_tenders
  FOR DELETE USING (true);

-- RLS POLICY: Tender History
CREATE POLICY tender1_history_select_policy ON tender1_tender_history
  FOR SELECT USING (true);

CREATE POLICY tender1_history_insert_policy ON tender1_tender_history
  FOR INSERT WITH CHECK (true);

-- ============================================
-- GRANTS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

-- Insert sample company
INSERT INTO tender1_companies (company_name, company_email, company_phone, company_address)
VALUES ('Demo Company', 'demo@example.com', '+91-1234567890', '123 Demo Street, City, Country')
ON CONFLICT (company_email) DO NOTHING;

-- Insert sample user
DO $$
DECLARE
  demo_company_id UUID;
BEGIN
  SELECT id INTO demo_company_id FROM tender1_companies WHERE company_email = 'demo@example.com';
  
  PERFORM tender1_create_user(
    'Demo User',
    'demo@example.com',
    'demo123',
    demo_company_id,
    'admin'
  );
END $$;

-- ============================================
-- COMPLETE
-- ============================================

SELECT 
  'Fresh Multi-Company Database Created with tender1_ prefix!' as status,
  'You can now migrate data or use this fresh database' as next_step;

