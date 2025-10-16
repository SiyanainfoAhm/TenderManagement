-- ============================================
-- TENDER MANAGEMENT DATABASE EXPORT
-- Generated: 2025-10-14T04:52:28.978Z
-- Supabase URL: https://ecvqhfbiwqmqgiqfxheu.supabase.co
-- ============================================

-- Export Summary:
-- tender_companies: 1 rows
-- tender_users: 4 rows
-- tender_tenders: 5 rows
-- tender_tender_history: 21 rows

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

-- ============================================
-- DATA: tender_companies (1 rows)
-- ============================================

INSERT INTO tender_companies (id, company_name, company_email, company_phone, company_address, is_active, created_at, updated_at)
VALUES ('d900385a-98f8-48a6-990c-f18b1a3a460b', 'Ceorra Technologies', 'ceorraahmedabad@gmail.com', NULL, NULL, true, '2025-10-10T05:10:23.59975+00:00', '2025-10-10T05:10:23.59975+00:00')
ON CONFLICT DO NOTHING;


-- ============================================
-- DATA: tender_users (4 rows)
-- ============================================

INSERT INTO tender_users (id, company_id, full_name, email, password_hash, role, is_active, last_login, created_at, updated_at)
VALUES ('1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'd900385a-98f8-48a6-990c-f18b1a3a460b', 'Deven Patel', 'ceorraahmedabad@gmail.com', '', 'admin', true, NULL, '2025-10-10T05:10:23.816074+00:00', '2025-10-10T06:01:16.392812+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_users (id, company_id, full_name, email, password_hash, role, is_active, last_login, created_at, updated_at)
VALUES ('d21dd7c5-9bbd-436b-8ffc-d1f5aed7671f', 'd900385a-98f8-48a6-990c-f18b1a3a460b', 'Mihir Patel', 'aminmihirh@gmail.com', '$2a$10$IPEAbXEaRohHM24lgMKT6Ob/5vHu/xmv3MN64cz3G1ZjKAQ3G.RW2', 'admin', true, NULL, '2025-10-10T06:23:06.484567+00:00', '2025-10-10T06:23:06.484567+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_users (id, company_id, full_name, email, password_hash, role, is_active, last_login, created_at, updated_at)
VALUES ('3a1f6d4e-0c47-4a25-80e9-fd473ce397d1', 'd900385a-98f8-48a6-990c-f18b1a3a460b', 'asd', 'ads@gmail.com', '$2a$10$t80CCZiwIAKa2RVrvk2JHujOkoOZWw6XeKX5h0EZbaxi6spjyOTKq', 'admin', false, NULL, '2025-10-13T03:03:38.608832+00:00', '2025-10-13T03:04:52.097311+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_users (id, company_id, full_name, email, password_hash, role, is_active, last_login, created_at, updated_at)
VALUES ('f062febc-6920-4617-acf4-052ffc6117f0', 'd900385a-98f8-48a6-990c-f18b1a3a460b', 'Shashank Sharma', 'siyana.social@gmail.com', '$2a$10$6I8bGaspiK7jj6AhdflIT.zTVnmnxEXxgDK.xi0GC68K/9rbKwUna', 'admin', true, NULL, '2025-10-13T03:49:42.414756+00:00', '2025-10-13T03:49:42.414756+00:00')
ON CONFLICT DO NOTHING;


-- ============================================
-- DATA: tender_tenders (5 rows)
-- ============================================

INSERT INTO tender_tenders (id, company_id, tender247_id, gem_eprocure_id, portal_link, tender_name, source, location, last_date, msme_exempted, startup_exempted, emd_amount, tender_fees, tender_cost, tender_notes, status, assigned_to, not_bidding_reason, created_by, created_at, updated_at)
VALUES ('b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a', 'd900385a-98f8-48a6-990c-f18b1a3a460b', '92851313', '93/2025-26:227558:', 'https://tender.nprocure.com/', 'selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation', 'tender247', 'Gandhinagar', '2025-10-14', false, false, 291000, 5900, 0, 'Asked COTS based app, we does not have that, We have only 3 Month to Developed it

2nd We are Qualified in Eligible Criteria, but when you will see the Technical evolution There is High Criteria, other competitor May Score more. Its Includes Hybrid Manpower of 3.

we have 4 Days only
', 'study', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', NULL, '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', '2025-10-10T05:44:42.384881+00:00', '2025-10-10T06:42:19.449167+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tenders (id, company_id, tender247_id, gem_eprocure_id, portal_link, tender_name, source, location, last_date, msme_exempted, startup_exempted, emd_amount, tender_fees, tender_cost, tender_notes, status, assigned_to, not_bidding_reason, created_by, created_at, updated_at)
VALUES ('7c74bbe3-61a6-42c3-8496-c00b82d90906', 'd900385a-98f8-48a6-990c-f18b1a3a460b', '92966876', '229107', 'https://tender.nprocure.com/', 'appointment of agency for design development & maintenance of various websites for gmdc', 'tender247', 'Ahmedabad', '2025-10-30', true, false, 500000, 17700, 0, 'Website + CMS in Last 5 years
Each Project Should 30 Lakh
L1
6 Websites


SOW
.NET Core framework with a backend database on MySQL or PostgreSQL.
Could MeitY Empaneled
Audir Reails 
SEO
Paid Search Campaign > Busget they say
Compatibility: Site must be compatible with Google Chrome, Microsoft® Internet Explorer 8.0 or higher, Microsoft Edge, Mozilla Firefox, and Safari 5.0 or higher.
each website 8 weeks', 'pre-bid', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', NULL, '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', '2025-10-10T05:46:31.044262+00:00', '2025-10-14T03:11:21.62977+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tenders (id, company_id, tender247_id, gem_eprocure_id, portal_link, tender_name, source, location, last_date, msme_exempted, startup_exempted, emd_amount, tender_fees, tender_cost, tender_notes, status, assigned_to, not_bidding_reason, created_by, created_at, updated_at)
VALUES ('517d240c-f247-483b-924d-8fdc6073fed4', 'd900385a-98f8-48a6-990c-f18b1a3a460b', '93104625', '2025-26/Website:230485:', 'https://tender.nprocure.com/', 'request for proposal (rfp) for appointment of agency for design and development of website.', 'tender247', 'Gandhinagar', '2025-11-03', false, false, 150000, 1770, 0, '1 to 5 Projects Required in Last 5 Years of State/Central Govt + Multi Languages 
Not have Team Composition As Required 
Need to lanuch in 90 Days
Small Scope of work

', 'pre-bid', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', NULL, '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', '2025-10-10T05:50:49.306231+00:00', '2025-10-10T06:28:54.700566+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tenders (id, company_id, tender247_id, gem_eprocure_id, portal_link, tender_name, source, location, last_date, msme_exempted, startup_exempted, emd_amount, tender_fees, tender_cost, tender_notes, status, assigned_to, not_bidding_reason, created_by, created_at, updated_at)
VALUES ('0fa55294-cc9a-4a56-b18c-f6517286b2c3', 'd900385a-98f8-48a6-990c-f18b1a3a460b', '92808396', NULL, NULL, 'request for proposal (rfp) selection of an agency for hrms solution requirement', 'tender247', 'Uttrakhand', NULL, false, false, 0, 0, 0, NULL, 'submitted', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', NULL, '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', '2025-10-13T03:53:25.740425+00:00', '2025-10-13T03:53:25.740425+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tenders (id, company_id, tender247_id, gem_eprocure_id, portal_link, tender_name, source, location, last_date, msme_exempted, startup_exempted, emd_amount, tender_fees, tender_cost, tender_notes, status, assigned_to, not_bidding_reason, created_by, created_at, updated_at)
VALUES ('de923b2f-341e-4817-8fb9-37c82cbec808', 'd900385a-98f8-48a6-990c-f18b1a3a460b', NULL, NULL, NULL, 'Hiring of Agency for IT Projects- Milestone basis', 'gem', 'Hyderabad', NULL, true, true, 50000, 0, 0, NULL, 'submitted', 'f062febc-6920-4617-acf4-052ffc6117f0', NULL, '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', '2025-10-13T03:55:16.779771+00:00', '2025-10-13T03:55:16.779771+00:00')
ON CONFLICT DO NOTHING;


-- ============================================
-- DATA: tender_tender_history (21 rows)
-- ============================================

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('18d9bafe-47e4-4027-a697-8ccb4ee3fcbb', 'b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'created', NULL, '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T05:44:42.384881+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":null,"msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender created', '2025-10-10T05:44:42.384881+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('369fac7e-d0c0-4c6b-bb77-41247d61813e', '7c74bbe3-61a6-42c3-8496-c00b82d90906', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'created', NULL, '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":null,"status":"study","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-10T05:46:31.044262+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":null,"msme_exempted":false,"gem_eprocure_id":"GMDC/IT/Websites/01/25-26:229107:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender created', '2025-10-10T05:46:31.044262+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('6221bdf3-07c2-463e-990a-b52e14b7b2b9', '517d240c-f247-483b-924d-8fdc6073fed4', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'created', NULL, '{"id":"517d240c-f247-483b-924d-8fdc6073fed4","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-11-03","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:50:49.306231+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":150000,"updated_at":"2025-10-10T05:50:49.306231+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":1770,"tender_name":"request for proposal (rfp) for appointment of agency for design and development of website.","tender247_id":"93104625","tender_notes":null,"msme_exempted":false,"gem_eprocure_id":"2025-26/Website:230485:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender created', '2025-10-10T05:50:49.306231+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('5a28d38e-b567-4843-9751-81b5c7768c1f', '7c74bbe3-61a6-42c3-8496-c00b82d90906', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'status_changed', '{"status":"study"}'::jsonb, '{"status":"pre-bid"}'::jsonb, 'Status changed from study to pre-bid', '2025-10-10T05:57:01.167339+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('86b5b4af-6b52-40b5-b502-f6250d14f1d9', 'b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T05:44:42.384881+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":null,"msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T06:04:09.166879+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":"Asked COTS based app, we does not have that, We have only 3 Month to Developed it\n\n2nd We are Qualified in Eligible Criteria, but when you will see the Technical evolution There is High Criteria, other competitor May Score more.","msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-10T06:04:09.166879+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('9310fb15-e312-4668-8f65-1f6adee9655c', 'b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T06:04:09.166879+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":"Asked COTS based app, we does not have that, We have only 3 Month to Developed it\n\n2nd We are Qualified in Eligible Criteria, but when you will see the Technical evolution There is High Criteria, other competitor May Score more.","msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T06:10:35.61884+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":"Asked COTS based app, we does not have that, We have only 3 Month to Developed it\n\n2nd We are Qualified in Eligible Criteria, but when you will see the Technical evolution There is High Criteria, other competitor May Score more. Its Includes Hybrid Manpower of 3.","msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-10T06:10:35.61884+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('f1c6d548-7113-4392-92ef-4ff41118bd3b', '517d240c-f247-483b-924d-8fdc6073fed4', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"517d240c-f247-483b-924d-8fdc6073fed4","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-11-03","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:50:49.306231+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":150000,"updated_at":"2025-10-10T05:50:49.306231+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":1770,"tender_name":"request for proposal (rfp) for appointment of agency for design and development of website.","tender247_id":"93104625","tender_notes":null,"msme_exempted":false,"gem_eprocure_id":"2025-26/Website:230485:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"517d240c-f247-483b-924d-8fdc6073fed4","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-11-03","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:50:49.306231+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":150000,"updated_at":"2025-10-10T06:15:30.408999+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":1770,"tender_name":"request for proposal (rfp) for appointment of agency for design and development of website.","tender247_id":"93104625","tender_notes":"1 to 5 Projects Required in Last 5 Years of State/Central Govt + Multi Languages \nNot have Team Composition As Required \nNeed to lanuch in 90 Days\n","msme_exempted":false,"gem_eprocure_id":"2025-26/Website:230485:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-10T06:15:30.408999+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('416b930c-2ec5-442d-a3e0-390065722995', '517d240c-f247-483b-924d-8fdc6073fed4', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"517d240c-f247-483b-924d-8fdc6073fed4","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-11-03","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:50:49.306231+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":150000,"updated_at":"2025-10-10T06:15:30.408999+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":1770,"tender_name":"request for proposal (rfp) for appointment of agency for design and development of website.","tender247_id":"93104625","tender_notes":"1 to 5 Projects Required in Last 5 Years of State/Central Govt + Multi Languages \nNot have Team Composition As Required \nNeed to lanuch in 90 Days\n","msme_exempted":false,"gem_eprocure_id":"2025-26/Website:230485:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"517d240c-f247-483b-924d-8fdc6073fed4","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-11-03","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:50:49.306231+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":150000,"updated_at":"2025-10-10T06:15:41.159367+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":1770,"tender_name":"request for proposal (rfp) for appointment of agency for design and development of website.","tender247_id":"93104625","tender_notes":"1 to 5 Projects Required in Last 5 Years of State/Central Govt + Multi Languages \nNot have Team Composition As Required \nNeed to lanuch in 90 Days\nSmall Scope of work\n\n","msme_exempted":false,"gem_eprocure_id":"2025-26/Website:230485:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-10T06:15:41.159367+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('17a84065-ec7e-45b9-9cb6-9f937ac2b6d4', '517d240c-f247-483b-924d-8fdc6073fed4', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'status_changed', '{"status":"study"}'::jsonb, '{"status":"pre-bid"}'::jsonb, 'Status changed from study to pre-bid', '2025-10-10T06:24:38.58768+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('a1c5f393-d318-4672-b118-c94ca7544d34', '517d240c-f247-483b-924d-8fdc6073fed4', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"517d240c-f247-483b-924d-8fdc6073fed4","source":null,"status":"pre-bid","location":"Gandhinagar","last_date":"2025-11-03","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:50:49.306231+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":150000,"updated_at":"2025-10-10T06:24:38.58768+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":1770,"tender_name":"request for proposal (rfp) for appointment of agency for design and development of website.","tender247_id":"93104625","tender_notes":"1 to 5 Projects Required in Last 5 Years of State/Central Govt + Multi Languages \nNot have Team Composition As Required \nNeed to lanuch in 90 Days\nSmall Scope of work\n\n","msme_exempted":false,"gem_eprocure_id":"2025-26/Website:230485:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"517d240c-f247-483b-924d-8fdc6073fed4","source":"tender247","status":"pre-bid","location":"Gandhinagar","last_date":"2025-11-03","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:50:49.306231+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":150000,"updated_at":"2025-10-10T06:28:54.700566+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":1770,"tender_name":"request for proposal (rfp) for appointment of agency for design and development of website.","tender247_id":"93104625","tender_notes":"1 to 5 Projects Required in Last 5 Years of State/Central Govt + Multi Languages \nNot have Team Composition As Required \nNeed to lanuch in 90 Days\nSmall Scope of work\n\n","msme_exempted":false,"gem_eprocure_id":"2025-26/Website:230485:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-10T06:28:54.700566+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('9a325816-ae73-4b50-b0c3-2dbe28169df1', '7c74bbe3-61a6-42c3-8496-c00b82d90906', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":null,"status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-10T05:57:01.167339+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n","msme_exempted":false,"gem_eprocure_id":"GMDC/IT/Websites/01/25-26:229107:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":null,"status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-10T06:29:01.461913+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n","msme_exempted":false,"gem_eprocure_id":"GMDC/IT/Websites/01/25-26:229107:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-10T06:29:01.461913+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('f78a5eda-6fbe-46f3-a0fd-c70891e1a970', '7c74bbe3-61a6-42c3-8496-c00b82d90906', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":null,"status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-10T06:29:01.461913+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n","msme_exempted":false,"gem_eprocure_id":"GMDC/IT/Websites/01/25-26:229107:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":"tender247","status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-10T06:29:07.440464+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n","msme_exempted":false,"gem_eprocure_id":"GMDC/IT/Websites/01/25-26:229107:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-10T06:29:07.440464+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('b6ae56fa-8bc6-40eb-bc1d-69c12a5e6911', 'b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T06:10:35.61884+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":"Asked COTS based app, we does not have that, We have only 3 Month to Developed it\n\n2nd We are Qualified in Eligible Criteria, but when you will see the Technical evolution There is High Criteria, other competitor May Score more. Its Includes Hybrid Manpower of 3.","msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T06:29:14.331587+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":"Asked COTS based app, we does not have that, We have only 3 Month to Developed it\n\n2nd We are Qualified in Eligible Criteria, but when you will see the Technical evolution There is High Criteria, other competitor May Score more. Its Includes Hybrid Manpower of 3.","msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-10T06:29:14.331587+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('b3915fe4-2086-4a17-88fd-1509c2770bcb', 'b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":null,"status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T06:29:14.331587+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":"Asked COTS based app, we does not have that, We have only 3 Month to Developed it\n\n2nd We are Qualified in Eligible Criteria, but when you will see the Technical evolution There is High Criteria, other competitor May Score more. Its Includes Hybrid Manpower of 3.","msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":"tender247","status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T06:29:22.508952+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":"Asked COTS based app, we does not have that, We have only 3 Month to Developed it\n\n2nd We are Qualified in Eligible Criteria, but when you will see the Technical evolution There is High Criteria, other competitor May Score more. Its Includes Hybrid Manpower of 3.","msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-10T06:29:22.508952+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('dbd61eff-4954-4562-8cc0-4a91d4636d9c', 'b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":"tender247","status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T06:29:22.508952+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":"Asked COTS based app, we does not have that, We have only 3 Month to Developed it\n\n2nd We are Qualified in Eligible Criteria, but when you will see the Technical evolution There is High Criteria, other competitor May Score more. Its Includes Hybrid Manpower of 3.","msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"b0ccbb87-cb7e-4f6b-bec0-cb93f63fd73a","source":"tender247","status":"study","location":"Gandhinagar","last_date":"2025-10-14","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:44:42.384881+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":291000,"updated_at":"2025-10-10T06:42:19.449167+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":5900,"tender_name":"selection of agency for design, development, operation, maintenance support of software applications for gandhinagar municipal corporation","tender247_id":"92851313","tender_notes":"Asked COTS based app, we does not have that, We have only 3 Month to Developed it\n\n2nd We are Qualified in Eligible Criteria, but when you will see the Technical evolution There is High Criteria, other competitor May Score more. Its Includes Hybrid Manpower of 3.\n\nwe have 4 Days only\n","msme_exempted":false,"gem_eprocure_id":"93/2025-26:227558:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-10T06:42:19.449167+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('89e39b8f-099a-4941-b2f5-63b0a07df931', '0fa55294-cc9a-4a56-b18c-f6517286b2c3', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'created', NULL, '{"id":"0fa55294-cc9a-4a56-b18c-f6517286b2c3","source":"tender247","status":"submitted","location":"Uttrakhand","last_date":null,"company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-13T03:53:25.740425+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":0,"updated_at":"2025-10-13T03:53:25.740425+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":null,"tender_cost":0,"tender_fees":0,"tender_name":"request for proposal (rfp) selection of an agency for hrms solution requirement","tender247_id":"92808396","tender_notes":null,"msme_exempted":false,"gem_eprocure_id":null,"startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender created', '2025-10-13T03:53:25.740425+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('e98310ed-2d67-43db-bb31-8bb0fd11afdd', 'de923b2f-341e-4817-8fb9-37c82cbec808', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'created', NULL, '{"id":"de923b2f-341e-4817-8fb9-37c82cbec808","source":"gem","status":"submitted","location":"Hyderabad","last_date":null,"company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-13T03:55:16.779771+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":50000,"updated_at":"2025-10-13T03:55:16.779771+00:00","assigned_to":"f062febc-6920-4617-acf4-052ffc6117f0","portal_link":null,"tender_cost":0,"tender_fees":0,"tender_name":"Hiring of Agency for IT Projects- Milestone basis","tender247_id":null,"tender_notes":null,"msme_exempted":true,"gem_eprocure_id":null,"startup_exempted":true,"not_bidding_reason":null}'::jsonb, 'Tender created', '2025-10-13T03:55:16.779771+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('3e8ada16-6a57-4ba3-8dd9-83c92dafad67', '7c74bbe3-61a6-42c3-8496-c00b82d90906', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":"tender247","status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-10T06:29:07.440464+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n","msme_exempted":false,"gem_eprocure_id":"GMDC/IT/Websites/01/25-26:229107:","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":"tender247","status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-13T05:56:22.395299+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n","msme_exempted":false,"gem_eprocure_id":"229107","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-13T05:56:22.395299+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('c4e34ca7-777c-42a5-98b5-e2f8ae9a1187', '7c74bbe3-61a6-42c3-8496-c00b82d90906', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":"tender247","status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-13T05:56:22.395299+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n","msme_exempted":false,"gem_eprocure_id":"229107","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":"tender247","status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-13T05:56:33.724046+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n","msme_exempted":true,"gem_eprocure_id":"229107","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-13T05:56:33.724046+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('da661831-866d-4fed-a4a7-15ffefc560f3', '7c74bbe3-61a6-42c3-8496-c00b82d90906', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":"tender247","status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-13T05:56:33.724046+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n","msme_exempted":true,"gem_eprocure_id":"229107","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":"tender247","status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-14T03:01:54.948857+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n\n\nSOW\n.NET Core framework with a backend database on MySQL or PostgreSQL.\nCould MeitY Empaneled\nAudir Reails \nSEO\nPaid Search Campaign > Busget they say\nCompatibility: Site must be compatible with Google Chrome, Microsoft® Internet Explorer 8.0 or higher, Microsoft Edge, Mozilla Firefox, and Safari 5.0 or higher.\neach website 8 weeks","msme_exempted":true,"gem_eprocure_id":"229107","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-14T03:01:54.948857+00:00')
ON CONFLICT DO NOTHING;

INSERT INTO tender_tender_history (id, tender_id, changed_by, action, old_values, new_values, change_description, created_at)
VALUES ('19e21dfc-638f-471c-a476-dd204ef1d505', '7c74bbe3-61a6-42c3-8496-c00b82d90906', '1589a6c5-b3b2-4257-b0db-ebb2624b38b1', 'updated', '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":"tender247","status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-14T03:01:54.948857+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n\n\nSOW\n.NET Core framework with a backend database on MySQL or PostgreSQL.\nCould MeitY Empaneled\nAudir Reails \nSEO\nPaid Search Campaign > Busget they say\nCompatibility: Site must be compatible with Google Chrome, Microsoft® Internet Explorer 8.0 or higher, Microsoft Edge, Mozilla Firefox, and Safari 5.0 or higher.\neach website 8 weeks","msme_exempted":true,"gem_eprocure_id":"229107","startup_exempted":false,"not_bidding_reason":null}'::jsonb, '{"id":"7c74bbe3-61a6-42c3-8496-c00b82d90906","source":"tender247","status":"pre-bid","location":"Ahmedabad","last_date":"2025-10-30","company_id":"d900385a-98f8-48a6-990c-f18b1a3a460b","created_at":"2025-10-10T05:46:31.044262+00:00","created_by":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","emd_amount":500000,"updated_at":"2025-10-14T03:11:21.62977+00:00","assigned_to":"1589a6c5-b3b2-4257-b0db-ebb2624b38b1","portal_link":"https://tender.nprocure.com/","tender_cost":0,"tender_fees":17700,"tender_name":"appointment of agency for design development & maintenance of various websites for gmdc","tender247_id":"92966876","tender_notes":"Website + CMS in Last 5 years\nEach Project Should 30 Lakh\nL1\n6 Websites\n\n\nSOW\n.NET Core framework with a backend database on MySQL or PostgreSQL.\nCould MeitY Empaneled\nAudir Reails \nSEO\nPaid Search Campaign > Busget they say\nCompatibility: Site must be compatible with Google Chrome, Microsoft® Internet Explorer 8.0 or higher, Microsoft Edge, Mozilla Firefox, and Safari 5.0 or higher.\neach website 8 weeks","msme_exempted":true,"gem_eprocure_id":"229107","startup_exempted":false,"not_bidding_reason":null}'::jsonb, 'Tender updated', '2025-10-14T03:11:21.62977+00:00')
ON CONFLICT DO NOTHING;

