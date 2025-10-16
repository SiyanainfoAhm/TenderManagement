-- ============================================
-- TENDER MANAGEMENT DATABASE EXPORT
-- Generated: 2025-10-14T04:42:31.649Z
-- Supabase URL: https://ecvqhfbiwqmqgiqfxheu.supabase.co
-- ============================================

-- Export Summary:
-- tender_companies: ERROR - relation "public.tender_companies" does not exist
-- tender_users: ERROR - relation "public.tender_users" does not exist
-- tender_tenders: ERROR - relation "public.tender_tenders" does not exist
-- tender_tender_history: ERROR - relation "public.tender_tender_history" does not exist

-- ============================================

-- ============================================
-- DATABASE SCHEMA
-- ============================================

-- ============================================
-- TENDER MANAGEMENT SYSTEM - DATABASE SCHEMA
-- CLEAN INSTALLATION (Drops existing objects first)
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- DROP EXISTING OBJECTS (if any)
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS tender_companies_update_timestamp ON tender_companies CASCADE;
DROP TRIGGER IF EXISTS tender_users_update_timestamp ON tender_users CASCADE;
DROP TRIGGER IF EXISTS tender_tenders_update_timestamp ON tender_tenders CASCADE;
DROP TRIGGER IF EXISTS tender_tenders_log_changes ON tender_tenders CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS tender_log_tender_changes() CASCADE;
DROP FUNCTION IF EXISTS tender_update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS tender_get_company_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS tender_update_user_password(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS tender_create_user(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS tender_authenticate_user(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS tender_verify_password(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS tender_hash_password(TEXT) CASCADE;

-- Drop tables (cascade will drop foreign keys)
DROP TABLE IF EXISTS tender_tender_history CASCADE;
DROP TABLE IF EXISTS tender_tenders CASCADE;
DROP TABLE IF EXISTS tender_users CASCADE;
DROP TABLE IF EXISTS tender_companies CASCADE;

-- ============================================
-- TABLE: tender_companies
-- Stores company information
-- ============================================
CREATE TABLE tender_companies (
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
-- TABLE: tender_users
-- Stores user accounts with authentication
-- ============================================
CREATE TABLE tender_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES tender_companies(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender_users_name_check CHECK (length(full_name) >= 2),
  CONSTRAINT tender_users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT tender_users_unique_company_email UNIQUE (company_id, email)
);

-- Index for faster user lookups
CREATE INDEX idx_tender_users_company ON tender_users(company_id);
CREATE INDEX idx_tender_users_email ON tender_users(email);

-- ============================================
-- TABLE: tender_tenders
-- Stores tender information
-- ============================================
CREATE TABLE tender_tenders (
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
CREATE INDEX idx_tender_tenders_company ON tender_tenders(company_id);
CREATE INDEX idx_tender_tenders_status ON tender_tenders(status);
CREATE INDEX idx_tender_tenders_assigned ON tender_tenders(assigned_to);
CREATE INDEX idx_tender_tenders_last_date ON tender_tenders(last_date);
CREATE INDEX idx_tender_tenders_created_at ON tender_tenders(created_at DESC);

-- ============================================
-- TABLE: tender_tender_history
-- Audit trail for tender changes
-- ============================================
CREATE TABLE tender_tender_history (
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
CREATE INDEX idx_tender_history_tender ON tender_tender_history(tender_id);
CREATE INDEX idx_tender_history_created ON tender_tender_history(created_at DESC);

-- ============================================
-- FUNCTION: tender_hash_password
-- Hashes password using pgcrypto
-- ============================================
CREATE FUNCTION tender_hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_verify_password
-- Verifies password against hash
-- ============================================
CREATE FUNCTION tender_verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_authenticate_user
-- Authenticates user and returns user data
-- ============================================
CREATE FUNCTION tender_authenticate_user(
  user_email TEXT,
  user_password TEXT
)
RETURNS TABLE (
  user_id UUID,
  company_id UUID,
  company_name VARCHAR,
  full_name VARCHAR,
  email VARCHAR,
  role VARCHAR,
  is_active BOOLEAN
) AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find user by email
  SELECT u.*, c.company_name
  INTO user_record
  FROM tender_users u
  JOIN tender_companies c ON u.company_id = c.id
  WHERE u.email = user_email AND u.is_active = true AND c.is_active = true;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  -- Verify password
  IF NOT tender_verify_password(user_password, user_record.password_hash) THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  -- Update last login
  UPDATE tender_users SET last_login = CURRENT_TIMESTAMP WHERE id = user_record.id;

  -- Return user data
  RETURN QUERY
  SELECT 
    user_record.id,
    user_record.company_id,
    user_record.company_name,
    user_record.full_name,
    user_record.email,
    user_record.role,
    user_record.is_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_create_user
-- Creates a new user with hashed password
-- ============================================
CREATE FUNCTION tender_create_user(
  p_company_id UUID,
  p_full_name VARCHAR,
  p_email VARCHAR,
  p_password TEXT,
  p_role VARCHAR DEFAULT 'user'
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Insert new user
  INSERT INTO tender_users (company_id, full_name, email, password_hash, role)
  VALUES (p_company_id, p_full_name, p_email, tender_hash_password(p_password), p_role)
  RETURNING id INTO new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_update_user_password
-- Updates user password
-- ============================================
CREATE FUNCTION tender_update_user_password(
  p_user_id UUID,
  p_old_password TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_hash TEXT;
BEGIN
  -- Get current password hash
  SELECT password_hash INTO current_hash
  FROM tender_users
  WHERE id = p_user_id;

  -- Verify old password
  IF NOT tender_verify_password(p_old_password, current_hash) THEN
    RAISE EXCEPTION 'Current password is incorrect';
  END IF;

  -- Update to new password
  UPDATE tender_users
  SET password_hash = tender_hash_password(p_new_password),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: tender_get_company_stats
-- Gets statistics for company dashboard
-- ============================================
CREATE FUNCTION tender_get_company_stats(p_company_id UUID)
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
    COUNT(*) FILTER (WHERE status != 'not-bidding'),
    COUNT(*) FILTER (WHERE status = 'submitted'),
    COUNT(*) FILTER (WHERE status = 'not-bidding'),
    (SELECT COUNT(*) FROM tender_users WHERE company_id = p_company_id AND is_active = true),
    COUNT(*) FILTER (WHERE last_date >= CURRENT_DATE AND last_date <= CURRENT_DATE + INTERVAL '7 days')
  FROM tender_tenders
  WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: tender_update_timestamp
-- Auto-updates updated_at timestamp
-- ============================================
CREATE FUNCTION tender_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER tender_companies_update_timestamp
  BEFORE UPDATE ON tender_companies
  FOR EACH ROW EXECUTE FUNCTION tender_update_timestamp();

CREATE TRIGGER tender_users_update_timestamp
  BEFORE UPDATE ON tender_users
  FOR EACH ROW EXECUTE FUNCTION tender_update_timestamp();

CREATE TRIGGER tender_tenders_update_timestamp
  BEFORE UPDATE ON tender_tenders
  FOR EACH ROW EXECUTE FUNCTION tender_update_timestamp();

-- ============================================
-- TRIGGER: tender_log_tender_changes
-- Logs changes to tender_tender_history
-- ============================================
CREATE FUNCTION tender_log_tender_changes()
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

CREATE TRIGGER tender_tenders_log_changes
  AFTER INSERT OR UPDATE ON tender_tenders
  FOR EACH ROW EXECUTE FUNCTION tender_log_tender_changes();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tender_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_tender_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS tender_companies_select_policy ON tender_companies;
DROP POLICY IF EXISTS tender_companies_insert_policy ON tender_companies;
DROP POLICY IF EXISTS tender_companies_update_policy ON tender_companies;

DROP POLICY IF EXISTS tender_users_select_policy ON tender_users;
DROP POLICY IF EXISTS tender_users_insert_policy ON tender_users;
DROP POLICY IF EXISTS tender_users_update_policy ON tender_users;

DROP POLICY IF EXISTS tender_tenders_select_policy ON tender_tenders;
DROP POLICY IF EXISTS tender_tenders_insert_policy ON tender_tenders;
DROP POLICY IF EXISTS tender_tenders_update_policy ON tender_tenders;
DROP POLICY IF EXISTS tender_tenders_delete_policy ON tender_tenders;

DROP POLICY IF EXISTS tender_history_select_policy ON tender_tender_history;
DROP POLICY IF EXISTS tender_history_insert_policy ON tender_tender_history;

-- Create policies
CREATE POLICY tender_companies_select_policy ON tender_companies FOR SELECT USING (true);
CREATE POLICY tender_companies_insert_policy ON tender_companies FOR INSERT WITH CHECK (true);
CREATE POLICY tender_companies_update_policy ON tender_companies FOR UPDATE USING (true);

CREATE POLICY tender_users_select_policy ON tender_users FOR SELECT USING (true);
CREATE POLICY tender_users_insert_policy ON tender_users FOR INSERT WITH CHECK (true);
CREATE POLICY tender_users_update_policy ON tender_users FOR UPDATE USING (true);

CREATE POLICY tender_tenders_select_policy ON tender_tenders FOR SELECT USING (true);
CREATE POLICY tender_tenders_insert_policy ON tender_tenders FOR INSERT WITH CHECK (true);
CREATE POLICY tender_tenders_update_policy ON tender_tenders FOR UPDATE USING (true);
CREATE POLICY tender_tenders_delete_policy ON tender_tenders FOR DELETE USING (true);

CREATE POLICY tender_history_select_policy ON tender_tender_history FOR SELECT USING (true);
CREATE POLICY tender_history_insert_policy ON tender_tender_history FOR INSERT WITH CHECK (true);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert a sample company
INSERT INTO tender_companies (company_name, company_email, company_phone, company_address)
VALUES ('Demo Company', 'contact@democompany.com', '+91-9876543210', '123 Business Park, Mumbai, India')
ON CONFLICT (company_email) DO NOTHING;

-- Get the company ID for sample data
DO $$
DECLARE
  demo_company_id UUID;
BEGIN
  SELECT id INTO demo_company_id FROM tender_companies WHERE company_email = 'contact@democompany.com';
  
  -- Insert a sample admin user (password: admin123)
  INSERT INTO tender_users (company_id, full_name, email, password_hash, role)
  VALUES (demo_company_id, 'Admin User', 'admin@democompany.com', tender_hash_password('admin123'), 'admin')
  ON CONFLICT (email) DO NOTHING;
  
  -- Insert a sample regular user (password: user123)
  INSERT INTO tender_users (company_id, full_name, email, password_hash, role)
  VALUES (demo_company_id, 'Test User', 'user@democompany.com', tender_hash_password('user123'), 'user')
  ON CONFLICT (email) DO NOTHING;
END $$;

-- ============================================
-- GRANTS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  'tender_companies' as table_name, COUNT(*) as row_count FROM tender_companies
UNION ALL
SELECT 'tender_users', COUNT(*) FROM tender_users
UNION ALL
SELECT 'tender_tenders', COUNT(*) FROM tender_tenders
UNION ALL
SELECT 'tender_tender_history', COUNT(*) FROM tender_tender_history;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '📊 Tables created: 4';
  RAISE NOTICE '⚙️ Functions created: 6';
  RAISE NOTICE '🔔 Triggers created: 5';
  RAISE NOTICE '👥 Demo users created: 2';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 Demo Credentials:';
  RAISE NOTICE '   Admin: admin@democompany.com / admin123';
  RAISE NOTICE '   User:  user@democompany.com / user123';
END $$;



-- ============================================
-- DATABASE DATA
-- ============================================
