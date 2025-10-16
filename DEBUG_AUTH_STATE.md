# 🔍 Debug Auth State - Check What's Wrong

## 🧪 Quick Debug Steps

### Step 1: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Type this and press Enter:

```javascript
// Check user data
console.log('User:', JSON.parse(localStorage.getItem('tender_user')))
console.log('Selected Company:', JSON.parse(localStorage.getItem('tender_selected_company')))
```

**Expected Output:**
```javascript
User: {
  id: "...",
  full_name: "Demo User",
  email: "demo@example.com",
  companies: [
    {
      company_id: "...",
      company_name: "Demo Company",
      role: "admin",     // <-- Should be "admin"
      is_default: true
    }
  ],
  selectedCompany: {
    company_id: "...",
    company_name: "Demo Company",
    role: "admin"       // <-- Should be "admin"
  }
}
```

---

### Step 2: Check if Role is Missing

If you see `role: undefined` or `role: null`, that's the problem!

**Fix:** Re-login to refresh user data
1. Logout
2. Clear localStorage: `localStorage.clear()`
3. Login again with `demo@example.com` / `demo123`

---

### Step 3: Check Database Directly

**Run this in Supabase SQL Editor:**

```sql
-- Check if demo user has admin role
SELECT 
  u.full_name,
  u.email,
  uc.role,
  uc.is_default,
  c.company_name
FROM tender1_users u
JOIN tender1_user_companies uc ON u.id = uc.user_id
JOIN tender1_companies c ON uc.company_id = c.id
WHERE u.email = 'demo@example.com';
```

**Expected:**
- role: **admin**
- is_default: **true**
- company_name: **Demo Company**

---

## 🔧 Common Issues & Fixes

### Issue 1: `selectedCompany` is null
**Cause:** Login function didn't set selectedCompany properly  
**Fix:**
```javascript
// In browser console:
localStorage.clear()
// Then login again
```

### Issue 2: `role` is undefined
**Cause:** Old user data in localStorage  
**Fix:**
```javascript
// In browser console:
localStorage.removeItem('tender_user')
localStorage.removeItem('tender_selected_company')
// Then login again
```

### Issue 3: Still shows "Access Denied"
**Cause:** ProtectedRoute not updated or page not refreshed  
**Fix:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear cache
3. Try again

---

## 🚀 Quick Fix Script

**Run this in browser console (F12):**

```javascript
// Clear all auth data
localStorage.clear()
sessionStorage.clear()

// Reload page
window.location.href = '/login'
```

Then login again with: `demo@example.com` / `demo123`

---

## ✅ Verification Checklist

After login, check:
- [ ] `selectedCompany` exists in localStorage
- [ ] `selectedCompany.role` = "admin"
- [ ] Users menu item visible in sidebar
- [ ] Can navigate to Users page without "Access Denied"
- [ ] Can see "Add User" button

---

## 📊 What Should Be in localStorage

```javascript
{
  "tender_user": {
    "id": "uuid-here",
    "full_name": "Demo User",
    "email": "demo@example.com",
    "companies": [
      {
        "company_id": "uuid-here",
        "company_name": "Demo Company",
        "role": "admin",          // ← MUST be "admin"
        "is_active": true,
        "is_default": true
      }
    ],
    "selectedCompany": {
      "company_id": "uuid-here",
      "company_name": "Demo Company",
      "role": "admin"             // ← MUST be "admin"
    }
  },
  "tender_selected_company": {
    "company_id": "uuid-here",
    "company_name": "Demo Company",
    "role": "admin"               // ← MUST be "admin"
  }
}
```

---

## 🎯 Most Likely Issue

The user data in localStorage is from the OLD login (before fixes).

**Solution:**
1. **Clear localStorage**
2. **Login again** (this will fetch fresh data from `tender1_authenticate_user`)
3. **Check role is "admin"**
4. **Users page should work**

---

**Try this now:**
1. Open browser console (F12)
2. Type: `localStorage.clear()`
3. Press Enter
4. Reload page
5. Login again with `demo@example.com` / `demo123`
6. Try accessing Users page

**This should fix the Access Denied error!** 🎉

