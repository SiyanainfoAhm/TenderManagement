-- ============================================
-- TENDER MANAGEMENT SYSTEM - MULTI-COMPANY DATABASE SCHEMA
-- Enhanced for Multi-Company Access with Secure Data Isolation
-- Supabase PostgreSQL Database
-- All tables, functions, and constraints use 'tender_' prefix
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLE: tender_companies
-- Stores company information (unchanged)
-- ============================================
CREATE TABLE IF NOT EXISTS tender_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL UNIQUE,
  company_email VARCHAR(255) NOT NULL UNIQUE,
  company_phone VARCHAR(50),
  company_address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender_companies_name_check CHECK (length(company_name) >= 2),
  CONSTRAINT tender_companies_email_check CHECK (company_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================
-- TABLE: tender_users (MODIFIED)
-- Stores user accounts - now WITHOUT company_id
-- Users can belong to multiple companies via junction table
-- ============================================
CREATE TABLE IF NOT EXISTS tender_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender_users_name_check CHECK (length(full_name) >= 2),
  CONSTRAINT tender_users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_tender_users_email ON tender_users(email);

-- ============================================
-- TABLE: tender_user_companies (NEW)
-- Junction table for many-to-many relationship
-- Defines which users have access to which companies and their roles
-- ============================================
CREATE TABLE IF NOT EXISTS tender_user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES tender_users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES tender_companies(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  invited_by UUID REFERENCES tender_users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender_user_companies_unique UNIQUE (user_id, company_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tender_user_companies_user ON tender_user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_tender_user_companies_company ON tender_user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_tender_user_companies_active ON tender_user_companies(user_id, is_active);

-- ============================================
-- TABLE: tender_tenders (UNCHANGED)
-- Stores tender information
-- ============================================
CREATE TABLE IF NOT EXISTS tender_tenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES tender_companies(id) ON DELETE CASCADE,
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
  assigned_to UUID REFERENCES tender_users(id) ON DELETE SET NULL,
  not_bidding_reason TEXT,
  created_by UUID REFERENCES tender_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender_tenders_name_check CHECK (length(tender_name) >= 3)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tender_tenders_company ON tender_tenders(company_id);
CREATE INDEX IF NOT EXISTS idx_tender_tenders_status ON tender_tenders(status);
CREATE INDEX IF NOT EXISTS idx_tender_tenders_assigned ON tender_tenders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tender_tenders_last_date ON tender_tenders(last_date);
CREATE INDEX IF NOT EXISTS idx_tender_tenders_created_at ON tender_tenders(created_at DESC);

-- ============================================
-- TABLE: tender_tender_history (UNCHANGED)
-- Audit trail for tender changes
-- ============================================
CREATE TABLE IF NOT EXISTS tender_tender_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tender_tenders(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES tender_users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed')),
  old_values JSONB,
  new_values JSONB,
  change_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for history queries
CREATE INDEX IF NOT EXISTS idx_tender_history_tender ON tender_tender_history(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_history_created ON tender_tender_history(created_at DESC);

-- ============================================
-- TABLE: tender_company_invitations (NEW)
-- Tracks pending invitations to join companies
-- ============================================
CREATE TABLE IF NOT EXISTS tender_company_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES tender_companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  invited_by UUID NOT NULL REFERENCES tender_users(id) ON DELETE CASCADE,
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender_invitations_unique UNIQUE (company_id, email)
);

-- Index for invitation lookups
CREATE INDEX IF NOT EXISTS idx_tender_invitations_token ON tender_company_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_tender_invitations_email ON tender_company_invitations(email);

-- ============================================
-- FUNCTION: tender_hash_password (UNCHANGED)
-- Hashes password using pgcrypto
-- ============================================
CREATE OR REPLACE FUNCTION tender_hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_verify_password (UNCHANGED)
-- Verifies password against hash
-- ============================================
CREATE OR REPLACE FUNCTION tender_verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_authenticate_user (MODIFIED)
-- Authenticates user and returns user data with all companies
-- ============================================
CREATE OR REPLACE FUNCTION tender_authenticate_user(
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
  FROM tender_users u
  WHERE u.email = user_email AND u.is_active = true;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  -- Verify password
  IF NOT tender_verify_password(user_password, user_record.password_hash) THEN
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
  FROM tender_user_companies uc
  JOIN tender_companies c ON uc.company_id = c.id
  WHERE uc.user_id = user_record.id 
    AND uc.is_active = true 
    AND c.is_active = true
  ORDER BY uc.is_default DESC, c.company_name;

  -- Update last login
  UPDATE tender_users SET last_login = CURRENT_TIMESTAMP WHERE id = user_record.id;

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
-- FUNCTION: tender_create_user (MODIFIED)
-- Creates a new user and optionally links to a company
-- ============================================
CREATE OR REPLACE FUNCTION tender_create_user(
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
  -- Insert new user (without company_id)
  INSERT INTO tender_users (full_name, email, password_hash)
  VALUES (p_full_name, p_email, tender_hash_password(p_password))
  RETURNING id INTO new_user_id;

  -- If company_id provided, link user to company
  IF p_company_id IS NOT NULL THEN
    INSERT INTO tender_user_companies (user_id, company_id, role, is_default, accepted_at)
    VALUES (new_user_id, p_company_id, p_role, true, CURRENT_TIMESTAMP);
  END IF;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_add_user_to_company (NEW)
-- Links an existing user to a company
-- ============================================
CREATE OR REPLACE FUNCTION tender_add_user_to_company(
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
    SELECT 1 FROM tender_user_companies WHERE user_id = p_user_id
  ) INTO is_first_company;

  -- Insert user-company relationship
  INSERT INTO tender_user_companies (
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
    is_first_company, -- First company is default
    p_invited_by,
    CURRENT_TIMESTAMP
  )
  RETURNING id INTO new_link_id;

  RETURN new_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_remove_user_from_company (NEW)
-- Removes a user's access to a company
-- ============================================
CREATE OR REPLACE FUNCTION tender_remove_user_from_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  company_count INTEGER;
BEGIN
  -- Delete the user-company relationship
  DELETE FROM tender_user_companies 
  WHERE user_id = p_user_id AND company_id = p_company_id;

  -- Check if user still has other companies
  SELECT COUNT(*) INTO company_count
  FROM tender_user_companies
  WHERE user_id = p_user_id;

  -- If user has no companies left, deactivate the user
  IF company_count = 0 THEN
    UPDATE tender_users SET is_active = false WHERE id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_set_default_company (NEW)
-- Sets a company as the user's default
-- ============================================
CREATE OR REPLACE FUNCTION tender_set_default_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove default flag from all user's companies
  UPDATE tender_user_companies 
  SET is_default = false 
  WHERE user_id = p_user_id;

  -- Set the specified company as default
  UPDATE tender_user_companies 
  SET is_default = true 
  WHERE user_id = p_user_id AND company_id = p_company_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_get_user_companies (NEW)
-- Gets all companies for a user
-- ============================================
CREATE OR REPLACE FUNCTION tender_get_user_companies(p_user_id UUID)
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
  FROM tender_user_companies uc
  JOIN tender_companies c ON uc.company_id = c.id
  WHERE uc.user_id = p_user_id 
    AND uc.is_active = true 
    AND c.is_active = true
  ORDER BY uc.is_default DESC, c.company_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_check_user_company_access (NEW)
-- Checks if a user has access to a company
-- ============================================
CREATE OR REPLACE FUNCTION tender_check_user_company_access(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM tender_user_companies uc
    JOIN tender_companies c ON uc.company_id = c.id
    WHERE uc.user_id = p_user_id 
      AND uc.company_id = p_company_id
      AND uc.is_active = true
      AND c.is_active = true
  ) INTO has_access;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_get_company_stats (UNCHANGED)
-- Gets statistics for company dashboard
-- ============================================
CREATE OR REPLACE FUNCTION tender_get_company_stats(p_company_id UUID)
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
     FROM tender_user_companies uc 
     WHERE uc.company_id = p_company_id AND uc.is_active = true),
    COUNT(*) FILTER (WHERE last_date >= CURRENT_DATE AND last_date <= CURRENT_DATE + INTERVAL '7 days')
  FROM tender_tenders
  WHERE company_id = p_company_id
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_update_timestamp (UNCHANGED)
-- Auto-updates updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION tender_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DROP TRIGGER IF EXISTS tender_companies_update_timestamp ON tender_companies;
CREATE TRIGGER tender_companies_update_timestamp
  BEFORE UPDATE ON tender_companies
  FOR EACH ROW EXECUTE FUNCTION tender_update_timestamp();

DROP TRIGGER IF EXISTS tender_users_update_timestamp ON tender_users;
CREATE TRIGGER tender_users_update_timestamp
  BEFORE UPDATE ON tender_users
  FOR EACH ROW EXECUTE FUNCTION tender_update_timestamp();

DROP TRIGGER IF EXISTS tender_user_companies_update_timestamp ON tender_user_companies;
CREATE TRIGGER tender_user_companies_update_timestamp
  BEFORE UPDATE ON tender_user_companies
  FOR EACH ROW EXECUTE FUNCTION tender_update_timestamp();

DROP TRIGGER IF EXISTS tender_tenders_update_timestamp ON tender_tenders;
CREATE TRIGGER tender_tenders_update_timestamp
  BEFORE UPDATE ON tender_tenders
  FOR EACH ROW EXECUTE FUNCTION tender_update_timestamp();

-- ============================================
-- TRIGGER: tender_log_tender_changes (UNCHANGED)
-- Logs changes to tender_tender_history
-- ============================================
CREATE OR REPLACE FUNCTION tender_log_tender_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tender_tender_history (tender_id, changed_by, action, new_values, change_description)
    VALUES (NEW.id, NEW.created_by, 'created', to_jsonb(NEW), 'Tender created');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO tender_tender_history (tender_id, changed_by, action, old_values, new_values, change_description)
      VALUES (NEW.id, NEW.created_by, 'status_changed', 
              jsonb_build_object('status', OLD.status), 
              jsonb_build_object('status', NEW.status),
              'Status changed from ' || OLD.status || ' to ' || NEW.status);
    ELSE
      INSERT INTO tender_tender_history (tender_id, changed_by, action, old_values, new_values, change_description)
      VALUES (NEW.id, NEW.created_by, 'updated', to_jsonb(OLD), to_jsonb(NEW), 'Tender updated');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tender_tenders_log_changes ON tender_tenders;
CREATE TRIGGER tender_tenders_log_changes
  AFTER INSERT OR UPDATE ON tender_tenders
  FOR EACH ROW EXECUTE FUNCTION tender_log_tender_changes();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures data isolation between companies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tender_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_tender_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_company_invitations ENABLE ROW LEVEL SECURITY;

-- Note: These policies require setting a session variable for the current user
-- Set in application: SET LOCAL app.current_user_id = 'user-uuid';

-- ============================================
-- RLS POLICY: Companies
-- Users can only see companies they have access to
-- ============================================
DROP POLICY IF EXISTS tender_companies_select_policy ON tender_companies;
CREATE POLICY tender_companies_select_policy ON tender_companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id 
      FROM tender_user_companies 
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS tender_companies_insert_policy ON tender_companies;
CREATE POLICY tender_companies_insert_policy ON tender_companies
  FOR INSERT
  WITH CHECK (true); -- Anyone can create a company

DROP POLICY IF EXISTS tender_companies_update_policy ON tender_companies;
CREATE POLICY tender_companies_update_policy ON tender_companies
  FOR UPDATE
  USING (
    id IN (
      SELECT company_id 
      FROM tender_user_companies 
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND role = 'admin'
        AND is_active = true
    )
  );

-- ============================================
-- RLS POLICY: Users
-- Users can see other users in their companies
-- ============================================
DROP POLICY IF EXISTS tender_users_select_policy ON tender_users;
CREATE POLICY tender_users_select_policy ON tender_users
  FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT u.id
      FROM tender_users u
      JOIN tender_user_companies uc1 ON u.id = uc1.user_id
      JOIN tender_user_companies uc2 ON uc1.company_id = uc2.company_id
      WHERE uc2.user_id = current_setting('app.current_user_id', true)::uuid
        AND uc1.is_active = true
        AND uc2.is_active = true
    )
    OR id = current_setting('app.current_user_id', true)::uuid
  );

DROP POLICY IF EXISTS tender_users_update_policy ON tender_users;
CREATE POLICY tender_users_update_policy ON tender_users
  FOR UPDATE
  USING (id = current_setting('app.current_user_id', true)::uuid);

-- ============================================
-- RLS POLICY: User-Company Relationships
-- Users can see relationships for their companies
-- ============================================
DROP POLICY IF EXISTS tender_user_companies_select_policy ON tender_user_companies;
CREATE POLICY tender_user_companies_select_policy ON tender_user_companies
  FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id', true)::uuid
    OR company_id IN (
      SELECT company_id 
      FROM tender_user_companies 
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS tender_user_companies_insert_policy ON tender_user_companies;
CREATE POLICY tender_user_companies_insert_policy ON tender_user_companies
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM tender_user_companies 
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND role = 'admin'
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS tender_user_companies_update_policy ON tender_user_companies;
CREATE POLICY tender_user_companies_update_policy ON tender_user_companies
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM tender_user_companies 
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND role = 'admin'
        AND is_active = true
    )
  );

-- ============================================
-- RLS POLICY: Tenders
-- Users can only see tenders from their companies
-- ============================================
DROP POLICY IF EXISTS tender_tenders_select_policy ON tender_tenders;
CREATE POLICY tender_tenders_select_policy ON tender_tenders
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM tender_user_companies 
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS tender_tenders_insert_policy ON tender_tenders;
CREATE POLICY tender_tenders_insert_policy ON tender_tenders
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM tender_user_companies 
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS tender_tenders_update_policy ON tender_tenders;
CREATE POLICY tender_tenders_update_policy ON tender_tenders
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM tender_user_companies 
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS tender_tenders_delete_policy ON tender_tenders;
CREATE POLICY tender_tenders_delete_policy ON tender_tenders
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM tender_user_companies 
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND role IN ('admin')
        AND is_active = true
    )
  );

-- ============================================
-- RLS POLICY: Tender History
-- Users can see history for tenders they can access
-- ============================================
DROP POLICY IF EXISTS tender_history_select_policy ON tender_tender_history;
CREATE POLICY tender_history_select_policy ON tender_tender_history
  FOR SELECT
  USING (
    tender_id IN (
      SELECT t.id 
      FROM tender_tenders t
      JOIN tender_user_companies uc ON t.company_id = uc.company_id
      WHERE uc.user_id = current_setting('app.current_user_id', true)::uuid
        AND uc.is_active = true
    )
  );

DROP POLICY IF EXISTS tender_history_insert_policy ON tender_tender_history;
CREATE POLICY tender_history_insert_policy ON tender_tender_history
  FOR INSERT
  WITH CHECK (
    tender_id IN (
      SELECT t.id 
      FROM tender_tenders t
      JOIN tender_user_companies uc ON t.company_id = uc.company_id
      WHERE uc.user_id = current_setting('app.current_user_id', true)::uuid
        AND uc.is_active = true
    )
  );

-- ============================================
-- GRANTS (Adjust based on your Supabase setup)
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- COMPLETE
-- ============================================

SELECT 
  'Multi-Company Schema Ready' as status,
  'Run migration script to migrate existing data' as next_step;

