# Tender Management System - Setup Guide

Complete setup guide for the Tender Management System with Supabase backend.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier works)
- Basic knowledge of React and PostgreSQL

## Step 1: Install Dependencies

```bash
cd newtenderapp
npm install
```

## Step 2: Setup Supabase Project

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Enter project details:
   - **Name**: Tender Management
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your location
4. Wait for project to be provisioned (~2 minutes)

### 2.2 Get API Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2.3 Configure Environment Variables
1. In the `newtenderapp` folder, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...
   ```

## Step 3: Setup Database

### 3.1 Run Database Schema
1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Click "New Query"
4. Copy the entire contents of `database-schema.sql`
5. Paste into the SQL Editor
6. Click "Run" or press `Ctrl/Cmd + Enter`
7. Wait for execution to complete (should show "Success. No rows returned")

### 3.2 Verify Database Setup
1. Go to **Database** → **Tables**
2. You should see these tables:
   - `tender_companies`
   - `tender_users`
   - `tender_tenders`
   - `tender_tender_history`

### 3.3 Verify Sample Data
1. In SQL Editor, run:
   ```sql
   SELECT * FROM tender_companies;
   SELECT * FROM tender_users;
   ```
2. You should see:
   - 1 company: "Demo Company"
   - 2 users: admin and user accounts

## Step 4: Start Development Server

```bash
npm run dev
```

The application should open at `http://localhost:3001`

## Step 5: Login

Use the demo credentials:

**Admin Account:**
- Email: `admin@democompany.com`
- Password: `admin123`

**User Account:**
- Email: `user@democompany.com`
- Password: `user123`

## Step 6: Create Your Company

Instead of using demo accounts, you can create your own company:

1. Click "Create one now" on login page
2. Fill in company information:
   - Company Name
   - Company Email
   - Company Phone (optional)
3. Fill in admin user information:
   - Full Name
   - Email Address
   - Password (minimum 6 characters)
4. Click "Create Account"
5. You'll be logged in automatically as the company admin

## Features Available

### For Admin Users
- ✅ View dashboard with statistics
- ✅ Create, edit, delete tenders
- ✅ View all tenders in the company
- ✅ Assign tenders to users
- ✅ Manage users (add, edit, delete)
- ✅ Change user roles

### For Regular Users
- ✅ View dashboard with statistics
- ✅ View all tenders in the company
- ✅ Create, edit tenders
- ✅ Cannot access user management

## Database Schema Overview

### Tables

1. **tender_companies**
   - Stores company/organization information
   - Each company is isolated (multi-tenancy)

2. **tender_users**
   - User accounts with authentication
   - Linked to a company
   - Roles: 'admin' or 'user'
   - Passwords are hashed using bcrypt

3. **tender_tenders**
   - Tender records
   - Linked to company and users
   - Full tender lifecycle tracking

4. **tender_tender_history**
   - Audit trail for tender changes
   - Automatic logging via triggers

### Functions

1. **tender_hash_password(password)** - Hashes passwords
2. **tender_verify_password(password, hash)** - Verifies passwords
3. **tender_authenticate_user(email, password)** - User login
4. **tender_create_user(...)** - Creates new user
5. **tender_update_user_password(...)** - Changes password
6. **tender_get_company_stats(company_id)** - Dashboard statistics

### Security Features

- ✅ Row Level Security (RLS) enabled
- ✅ Password hashing with bcrypt
- ✅ Company data isolation
- ✅ Audit logging
- ✅ Foreign key constraints
- ✅ Input validation

## Troubleshooting

### Issue: "Failed to fetch"
**Solution:** Check if Supabase URL and API key are correct in `.env` file

### Issue: "Invalid credentials" on login
**Solution:** 
- Ensure database schema was executed successfully
- Try the demo credentials
- Check if user exists in `tender_users` table

### Issue: Database errors when creating user
**Solution:**
- Verify all required functions exist (check SQL editor)
- Ensure pgcrypto extension is enabled
- Check Supabase logs in Dashboard

### Issue: "Cannot read properties of null"
**Solution:**
- Clear browser localStorage
- Logout and login again
- Check browser console for detailed errors

## Production Deployment

### 1. Build the Application
```bash
npm run build
```

### 2. Preview Production Build
```bash
npm run preview
```

### 3. Deploy to Hosting Platform

**Recommended platforms:**
- Vercel (recommended)
- Netlify
- Render
- AWS Amplify

**Environment Variables:**
Make sure to set these in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 4. Update Supabase Settings

1. Go to **Authentication** → **URL Configuration**
2. Add your production URL to **Site URL**
3. Add redirect URLs if needed

## Customization

### Change Company to Organization
If you prefer "Organization" terminology, update:
1. Database table names (optional)
2. UI labels in components
3. Type definitions in `src/types/index.ts`

### Add More Fields to Tenders
1. Update `tender_tenders` table schema
2. Add fields to `TenderFormData` type
3. Update tender service functions
4. Add form fields in Tenders page

### Implement Email Notifications
1. Enable Supabase Auth emails
2. Create email templates
3. Add triggers for notifications
4. Use Supabase Edge Functions

## Support

For issues or questions:
1. Check database logs in Supabase Dashboard
2. Check browser console for errors
3. Review application error messages
4. Verify all environment variables are set

## Next Steps

- [ ] Configure custom email templates
- [ ] Add file upload for tender documents
- [ ] Implement advanced reporting
- [ ] Add export functionality (Excel/PDF)
- [ ] Set up automated backups
- [ ] Configure production RLS policies
- [ ] Add user activity logs
- [ ] Implement password reset flow

## License

MIT License - Feel free to use in your projects

