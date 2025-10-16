# Tender Management System - Database Documentation

## 📊 Database Overview

**Database Type:** PostgreSQL (Supabase)  
**Schema Prefix:** `tender_`  
**Total Tables:** 4  
**Total Functions:** 7  

**Current Data Statistics:**
- Companies: 1
- Users: 4
- Tenders: 5
- History Records: 21

---

## 🗂️ Database Schema

### 1. **tender_companies**
Stores company/organization information.

**Structure:**
```sql
CREATE TABLE tender_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL UNIQUE,
  company_email VARCHAR(255) NOT NULL UNIQUE,
  company_phone VARCHAR(50),
  company_address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Constraints:**
- `company_name` must be unique and at least 2 characters
- `company_email` must be unique and valid email format
- Both name and email have unique constraints

**Current Data:**
- **Ceorra Technologies** (ceorraahmedabad@gmail.com)

---

### 2. **tender_users**
Stores user accounts with authentication.

**Structure:**
```sql
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Relationships:**
- Belongs to ONE company (`company_id` → `tender_companies.id`)
- Cascades delete when company is deleted

**Roles:**
- `admin`: Full access to manage company data, users, and tenders
- `user`: Limited access to view and manage assigned tenders

**Constraints:**
- `email` must be unique across all users
- `full_name` must be at least 2 characters
- `password_hash` can be empty for OAuth users (Google Sign-In)

**Current Users:**
1. **Deven Patel** (ceorraahmedabad@gmail.com) - Admin, OAuth User
2. **Mihir Patel** (aminmihirh@gmail.com) - Admin, Password Auth
3. **Shashank Sharma** (siyana.social@gmail.com) - Admin, Password Auth
4. **asd** (ads@gmail.com) - Admin, Inactive

**Indexes:**
- `idx_tender_users_company` on `company_id`
- `idx_tender_users_email` on `email`

---

### 3. **tender_tenders**
Stores tender/bid information.

**Structure:**
```sql
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Relationships:**
- Belongs to ONE company (`company_id` → `tender_companies.id`)
- Can be assigned to ONE user (`assigned_to` → `tender_users.id`)
- Created by ONE user (`created_by` → `tender_users.id`)

**Tender Sources:**
- `tender247`: Tender247 portal
- `gem`: Government e-Marketplace
- `nprocure`: National Procurement
- `eprocure`: e-Procurement portal
- `other`: Other sources

**Tender Statuses:**
- `study`: Under review/analysis
- `pre-bid`: Pre-bid meeting scheduled
- `corrigendum`: Corrigendum/amendment issued
- `not-bidding`: Decided not to bid (requires `not_bidding_reason`)
- `assigned`: Assigned to a team member
- `submitted`: Bid submitted

**Financial Fields:**
- `emd_amount`: Earnest Money Deposit
- `tender_fees`: Tender document fees
- `tender_cost`: Estimated project cost

**Current Data:**
- 5 active tenders in the system

**Indexes:**
- `idx_tender_tenders_company` on `company_id`
- `idx_tender_tenders_status` on `status`
- `idx_tender_tenders_assigned` on `assigned_to`
- `idx_tender_tenders_last_date` on `last_date`
- `idx_tender_tenders_created_at` on `created_at DESC`

---

### 4. **tender_tender_history**
Audit trail for tender changes (automatically maintained).

**Structure:**
```sql
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
```

**Relationships:**
- Tracks changes to ONE tender (`tender_id` → `tender_tenders.id`)
- Records who made the change (`changed_by` → `tender_users.id`)

**Action Types:**
- `created`: Tender was created
- `updated`: Tender details were updated
- `deleted`: Tender was deleted
- `status_changed`: Tender status was changed (special tracking)

**Current Data:**
- 21 history records tracking all tender changes

**Indexes:**
- `idx_tender_history_tender` on `tender_id`
- `idx_tender_history_created` on `created_at DESC`

---

## 🔧 Database Functions

### 1. **tender_hash_password(password TEXT)**
Hashes a password using bcrypt (blowfish).

**Usage:**
```sql
SELECT tender_hash_password('mypassword123');
```

**Returns:** Hashed password string  
**Security:** Uses bcrypt with cost factor 10

---

### 2. **tender_verify_password(password TEXT, password_hash TEXT)**
Verifies a password against a hash.

**Usage:**
```sql
SELECT tender_verify_password('mypassword123', '$2a$10$...');
```

**Returns:** `true` if password matches, `false` otherwise

---

### 3. **tender_authenticate_user(user_email TEXT, user_password TEXT)**
Authenticates a user and returns their data.

**Usage:**
```sql
SELECT * FROM tender_authenticate_user('user@example.com', 'password123');
```

**Returns:**
- `user_id`: User UUID
- `company_id`: Company UUID
- `company_name`: Company name
- `full_name`: User's full name
- `email`: User's email
- `role`: User's role (admin/user)
- `is_active`: User status

**Behavior:**
- Checks if user exists and is active
- Verifies password hash
- Updates `last_login` timestamp
- Returns user data with company info
- Throws error if invalid credentials

---

### 4. **tender_create_user(...)**
Creates a new user with hashed password.

**Parameters:**
- `p_company_id`: Company UUID
- `p_full_name`: User's full name
- `p_email`: User's email
- `p_password`: Plain text password (will be hashed)
- `p_role`: User role (default: 'user')

**Usage:**
```sql
SELECT tender_create_user(
  'company-uuid',
  'John Doe',
  'john@example.com',
  'password123',
  'admin'
);
```

**Returns:** New user's UUID

---

### 5. **tender_update_user_password(...)**
Updates a user's password (requires old password verification).

**Parameters:**
- `p_user_id`: User UUID
- `p_old_password`: Current password
- `p_new_password`: New password

**Usage:**
```sql
SELECT tender_update_user_password(
  'user-uuid',
  'oldpassword',
  'newpassword'
);
```

**Returns:** `true` if successful  
**Throws error:** If old password is incorrect

---

### 6. **tender_get_company_stats(p_company_id UUID)**
Gets statistics for company dashboard.

**Usage:**
```sql
SELECT * FROM tender_get_company_stats('company-uuid');
```

**Returns:**
- `total_tenders`: Total tenders (excluding not-bidding)
- `submitted_bids`: Count of submitted bids
- `not_bidding`: Count of not-bidding tenders
- `active_users`: Count of active users in company
- `upcoming_deadlines`: Tenders due in next 7 days

---

### 7. **tender_update_timestamp()**
Trigger function that auto-updates `updated_at` field.

**Applied to:**
- `tender_companies`
- `tender_users`
- `tender_tenders`

**Behavior:** Automatically sets `updated_at = CURRENT_TIMESTAMP` on UPDATE

---

## 🔐 Authentication System

### Traditional Login
1. User provides email and password
2. System calls `tender_authenticate_user(email, password)`
3. Function verifies credentials using bcrypt
4. Returns user data with company info
5. Frontend stores user data in `localStorage`

### Google OAuth Login
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth consent screen
3. Google redirects back with authorization code
4. Application exchanges code for access token
5. Fetches user info from Google API
6. Checks if user exists in `tender_users`:
   - **If yes:** Login user
   - **If no:** Create new company and user (signup)
7. Store user data in `localStorage` (no password_hash needed)

**Key Features:**
- Uses direct Google OAuth (not Supabase Auth)
- Stores users in `tender_users` table only
- OAuth users have empty `password_hash`
- First user in company becomes admin
- Supports both password and OAuth authentication

---

## 🔒 Row Level Security (RLS)

RLS is enabled on all tables but uses permissive policies for now.

**Current Policies:**
- All authenticated users can SELECT, INSERT, UPDATE
- DELETE is allowed on tenders only

**Recommendation for Production:**
Consider implementing stricter RLS policies based on:
- User's `company_id`
- User's `role` (admin vs user)
- User's `is_active` status

---

## 📁 Exported Files

The database export script creates:

### 1. **Full SQL Dump**
`tender-management-full-export-{timestamp}.sql`
- Complete database schema
- All table data as INSERT statements
- Ready to import into new database

### 2. **JSON Exports (per table)**
- `tender_companies-{timestamp}.json`
- `tender_users-{timestamp}.json`
- `tender_tenders-{timestamp}.json`
- `tender_tender_history-{timestamp}.json`

### 3. **Export Report**
`export-report-{timestamp}.txt`
- Summary of exported data
- Row counts per table
- File list with descriptions

---

## 🚀 Using the Export Script

### Run Export
```bash
npm run export-db
```

### What it does:
1. Connects to Supabase
2. Fetches all data from all tables
3. Generates SQL INSERT statements
4. Exports data to JSON files
5. Creates a summary report
6. Saves everything to `database-exports/` folder

### Use Cases:
- **Backup**: Regular database backups
- **Migration**: Move to different environment
- **Development**: Seed development database
- **Analysis**: Export data for analysis
- **Documentation**: Review current data state

---

## 🔄 Database Relationships

```
tender_companies (1)
    ↓
    ├── tender_users (Many)
    │       ↓
    │       ├── tender_tenders.assigned_to (Many)
    │       ├── tender_tenders.created_by (Many)
    │       └── tender_tender_history.changed_by (Many)
    └── tender_tenders (Many)
            ↓
            └── tender_tender_history (Many)
```

---

## 📊 Current Database State

**Company:**
- Ceorra Technologies

**Users:**
- 4 total (3 active, 1 inactive)
- 4 admins, 0 regular users
- 1 OAuth user (Google)
- 3 password-authenticated users

**Tenders:**
- 5 active tenders
- Various statuses and assignments

**History:**
- 21 change records
- Full audit trail of all tender modifications

---

## 🛠️ Maintenance Tasks

### Regular Backups
```bash
npm run export-db
```

### Clean Old History
```sql
-- Delete history older than 1 year
DELETE FROM tender_tender_history 
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Archive Inactive Users
```sql
-- Deactivate users who haven't logged in for 6 months
UPDATE tender_users 
SET is_active = false 
WHERE last_login < NOW() - INTERVAL '6 months';
```

### Monitor Database Size
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'tender_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📝 Notes

1. **OAuth Users:** Have empty `password_hash` - cannot use traditional login
2. **Cascade Deletes:** Deleting a company removes all associated users, tenders, and history
3. **Audit Trail:** All tender changes are automatically logged
4. **Timestamps:** All tables have automatic timestamp tracking
5. **Company Isolation:** Each company's data is separate (but not enforced by RLS yet)

---

## 🔗 Related Files

- **Schema:** `database-schema-clean.sql`
- **Export Script:** `export-database.js`
- **Auth Service:** `src/services/authService.ts`
- **Types:** `src/types/index.ts`

---

**Last Updated:** October 14, 2025  
**Database Version:** 1.0  
**Total Records:** 31 rows

