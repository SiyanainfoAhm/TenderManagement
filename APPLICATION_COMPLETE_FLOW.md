# 🚀 Tender Management Application - Complete Flow

## 📋 Overview

This is a **Multi-Company Tender Management System** with:
- ✅ **Google OAuth Authentication**
- ✅ **Multi-Company Access** (Users can belong to multiple companies)
- ✅ **Role-Based Access Control** (Admin, User, Viewer)
- ✅ **Email Invitation System**
- ✅ **Company Management**
- ✅ **Tender Management**
- ✅ **User Management**

---

## 🏗️ Architecture

### **Frontend:**
- **React + TypeScript + Vite**
- **Tailwind CSS** for styling
- **React Router DOM** for routing
- **Context API** for state management

### **Backend:**
- **Supabase** (PostgreSQL database + Auth + API)
- **Multi-Company Database Schema** with junction tables
- **Row Level Security (RLS)** for data isolation
- **Database Functions** for complex operations

### **Email System:**
- **Gmail SMTP** for sending emails
- **Local Email Server** for development
- **Vercel API Routes** for production

---

## 🔐 Authentication Flow

### **1. Traditional Login/Signup**

```
User enters email/password
        ↓
AuthService.login() / AuthService.signup()
        ↓
Database authentication via tender1_authenticate_user()
        ↓
Returns user with companies array
        ↓
AuthContext sets user state
        ↓
Navigate to Dashboard
```

### **2. Google OAuth Login**

```
User clicks "Sign in with Google"
        ↓
Redirect to Google OAuth
        ↓
Google redirects to /auth/callback
        ↓
AuthCallback handles OAuth response
        ↓
AuthService.handleOAuthCallback()
        ↓
Check if user exists:
  ├─ If exists → Login with companies
  └─ If not exists → Check for invitations
      ├─ If invited → Add to invited company
      └─ If not invited → Create new company
        ↓
Navigate to Dashboard
```

---

## 🏢 Multi-Company Architecture

### **Database Structure:**
```
tender1_users (User table)
    ↓ (many-to-many)
tender1_user_companies (Junction table)
    ↓ (many-to-many)  
tender1_companies (Company table)
```

### **User Data Structure:**
```typescript
{
  id: "user-uuid",
  email: "user@example.com",
  companies: [
    {
      company_id: "company-1-uuid",
      company_name: "Company 1",
      role: "admin",
      is_active: true,
      is_default: true
    },
    {
      company_id: "company-2-uuid", 
      company_name: "Company 2",
      role: "user",
      is_active: true,
      is_default: false
    }
  ],
  selectedCompany: { /* Current active company */ }
}
```

---

## 📧 Invitation System Flow

### **1. Admin Invites User**

```
Admin goes to Users page
        ↓
Clicks "Invite User"
        ↓
Enters email and role
        ↓
InviteUserModal checks:
  ├─ If user exists → Send invitation to existing user
  └─ If user doesn't exist → Create user + Send invitation
        ↓
Creates invitation record in tender1_company_invitations
        ↓
Sends email via EmailService
        ↓
Email contains invitation link
```

### **2. User Receives Invitation**

#### **Option A: Click Email Link**
```
User clicks invitation link
        ↓
Opens /invitations/{token}
        ↓
AcceptInvitation page shows details
        ↓
User can:
  ├─ Accept without login → Stores in sessionStorage
  └─ Login to Accept → Redirects to login
        ↓
After login → Processes invitation
        ↓
Adds user to company with correct role
```

#### **Option B: Login Directly**
```
User logs in normally
        ↓
Dashboard checks for pending invitations
        ↓
Shows PendingInvitationsModal
        ↓
User clicks "View" on invitation
        ↓
Goes to AcceptInvitation page
        ↓
Accepts invitation
        ↓
Gets access to company
```

---

## 🎯 User Roles & Permissions

### **Admin Role:**
- ✅ **Full Access** to company data
- ✅ **Invite Users** to company
- ✅ **Manage Users** (activate/deactivate)
- ✅ **Create/Edit/Delete** tenders
- ✅ **View All** company statistics

### **User Role:**
- ✅ **Manage Tenders** (create/edit/delete)
- ✅ **View Company** statistics
- ❌ **Cannot invite** users
- ❌ **Cannot manage** users

### **Viewer Role:**
- ✅ **View Only** access
- ✅ **Read Tenders** and statistics
- ❌ **Cannot create/edit** anything
- ❌ **Cannot invite** users

---

## 📊 Dashboard Flow

```
User logs in
        ↓
Dashboard loads
        ↓
Check for pending invitations
  ├─ If found → Show modal
  └─ If none → Continue
        ↓
Load company statistics
        ↓
Load upcoming deadlines
        ↓
Display:
  ├─ Company switcher (if multiple companies)
  ├─ Statistics cards
  ├─ Upcoming deadlines
  └─ Quick actions
```

---

## 📝 Tender Management Flow

### **1. View Tenders**
```
User goes to Tenders page
        ↓
TenderService.getTenders(selectedCompany.company_id)
        ↓
Fetches tenders filtered by company
        ↓
Displays list with:
  ├─ Tender details
  ├─ Status badges
  ├─ Deadline indicators
  └─ Action buttons (edit/delete)
```

### **2. Create Tender**
```
User clicks "Add New Tender"
        ↓
Opens CreateTenderModal
        ↓
User fills form:
  ├─ Tender title
  ├─ Description
  ├─ Deadline
  ├─ Status
  └─ Assigned user
        ↓
TenderService.createTender()
        ↓
Creates tender with company_id
        ↓
Refreshes tender list
```

### **3. Edit/Delete Tender**
```
User clicks Edit/Delete
        ↓
Confirmation modal
        ↓
TenderService.updateTender() / deleteTender()
        ↓
Updates/deletes with company filtering
        ↓
Refreshes list
```

---

## 👥 User Management Flow

### **1. View Company Users**
```
Admin goes to Users page
        ↓
UserService.getCompanyUsers(selectedCompany.company_id)
        ↓
Fetches users from junction table
        ↓
Displays:
  ├─ User list with roles
  ├─ Active/Inactive status
  ├─ Last login info
  └─ Action buttons
```

### **2. Invite New User**
```
Admin clicks "Invite User"
        ↓
InviteUserModal opens
        ↓
Enters email and role
        ↓
System checks:
  ├─ If user exists → Send invitation
  └─ If new user → Create user + Send invitation
        ↓
Creates invitation record
        ↓
Sends email
        ↓
Shows success message
```

### **3. Manage Existing Users**
```
Admin selects user
        ↓
Can perform:
  ├─ Change role
  ├─ Activate/Deactivate
  ├─ Remove from company
  └─ View user details
        ↓
Updates junction table
        ↓
Refreshes user list
```

---

## 🔄 Company Switching Flow

```
User has access to multiple companies
        ↓
CompanySwitcher shows current company
        ↓
User clicks dropdown
        ↓
Shows list of accessible companies
        ↓
User selects different company
        ↓
AuthContext.switchCompany()
        ↓
Updates selectedCompany state
        ↓
Updates localStorage
        ↓
All data refreshes with new company filter
```

---

## 📱 Page Routing Flow

### **Public Routes:**
- `/login` - Login page
- `/signup` - Signup page
- `/invitations/:token` - Accept invitation (no login required)

### **Protected Routes:**
- `/dashboard` - Main dashboard
- `/tenders` - Tender management
- `/users` - User management (Admin only)
- `/pending-invitations` - Manage invitations (Admin only)

### **Route Protection:**
```
User accesses protected route
        ↓
ProtectedRoute checks authentication
        ↓
If not logged in → Redirect to login
        ↓
If logged in → Check role permissions
        ↓
If insufficient role → Show access denied
        ↓
If sufficient role → Render component
```

---

## 🎨 UI Components Flow

### **Layout Components:**
- `MainLayout` - Main app layout
- `Sidebar` - Navigation sidebar (filtered by role)
- `TopBar` - Top navigation with company switcher
- `CompanySwitcher` - Company selection dropdown

### **Base Components:**
- `Button` - Styled buttons
- `Input` - Form inputs
- `Modal` - Modal dialogs
- `Badge` - Status badges
- `Select` - Dropdown selects

### **Feature Components:**
- `InviteUserModal` - User invitation
- `PendingInvitationsModal` - Show pending invitations
- `AcceptInvitation` - Invitation acceptance page

---

## 📊 Data Flow

### **State Management:**
```
AuthContext (Global)
├─ user: UserWithCompany
├─ selectedCompany: UserCompanyAccess
├─ login() / signup() / logout()
├─ switchCompany()
└─ refreshUserCompanies()

Component State (Local)
├─ loading states
├─ form data
├─ error messages
└─ UI state
```

### **API Calls:**
```
Frontend Component
        ↓
Service Layer (authService, tenderService, userService)
        ↓
Supabase Client
        ↓
Database Functions / Tables
        ↓
Returns data with company filtering
        ↓
Updates component state
```

---

## 🔒 Security Flow

### **Row Level Security (RLS):**
```
Database query executed
        ↓
RLS policy checks user context
        ↓
Filters data by company access
        ↓
Returns only accessible data
        ↓
Prevents cross-company data access
```

### **Authentication Security:**
```
User login
        ↓
JWT token generated
        ↓
Token stored in localStorage
        ↓
All API calls include token
        ↓
Supabase validates token
        ↓
Grants access to user's data only
```

---

## 🚀 Deployment Flow

### **Local Development:**
```
npm run dev
        ↓
Vite dev server starts (port 5173)
        ↓
npm run dev:email
        ↓
Local email server starts (port 3001)
        ↓
Both servers run concurrently
```

### **Production Deployment:**
```
Code pushed to GitHub
        ↓
Vercel detects changes
        ↓
Builds React app
        ↓
Deploys to Vercel
        ↓
Environment variables configured
        ↓
App accessible via Vercel URL
```

---

## 🧪 Testing Flow

### **Manual Testing Scenarios:**

1. **New User Signup:**
   - Create account → Gets own company as admin

2. **Invited User:**
   - Receive invitation → Accept → Gets access to invited company

3. **Multi-Company User:**
   - Invited to multiple companies → Can switch between them

4. **Role Testing:**
   - Admin: Can invite users, manage everything
   - User: Can manage tenders, view stats
   - Viewer: Read-only access

5. **Company Isolation:**
   - Users only see their company's data
   - No cross-company access

---

## 📈 Key Features Summary

### **Authentication:**
- ✅ Traditional login/signup
- ✅ Google OAuth
- ✅ Multi-company user support
- ✅ Session management

### **Invitations:**
- ✅ Email invitations
- ✅ Accept/reject without login
- ✅ Auto-detection on login
- ✅ Role-based invitations

### **Multi-Company:**
- ✅ Users in multiple companies
- ✅ Company switching
- ✅ Data isolation
- ✅ Role per company

### **Tender Management:**
- ✅ Create/edit/delete tenders
- ✅ Company-filtered views
- ✅ Status tracking
- ✅ Deadline management

### **User Management:**
- ✅ Invite users
- ✅ Role management
- ✅ User activation/deactivation
- ✅ Company membership

---

## 🎯 Complete User Journey Examples

### **Journey 1: New Company Owner**
```
1. Signup with email/password
2. Gets own company as admin
3. Invites team members
4. Creates tenders
5. Manages users and data
```

### **Journey 2: Invited Team Member**
```
1. Receives invitation email
2. Accepts invitation (with or without login)
3. Gets access to company
4. Can manage tenders based on role
5. Can be invited to other companies
```

### **Journey 3: Multi-Company User**
```
1. Member of Company A (admin)
2. Invited to Company B (user)
3. Invited to Company C (viewer)
4. Can switch between companies
5. Different permissions per company
```

---

**This is the complete flow of the Tender Management Application!** 🎉

The system handles authentication, multi-company access, invitations, tender management, and user management in a secure, scalable way.

