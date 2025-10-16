# 🔧 Fix Google OAuth Port Mismatch

## ⚠️ Issue

**Error:** redirect_uri_mismatch

**Reason:** Your app is on port 5178, but Google OAuth is configured for port 5173

**Current ports:**
- App running on: http://localhost:5178
- Google configured for: http://localhost:5173

---

## ✅ Solution: Update Google Cloud Console

### Step 1: Open Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Select project: **Tender-Management-App** (or your OAuth project)
3. Click **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID: **tenderweb**
5. Click the edit icon (pencil)

### Step 2: Add New Port to Authorized Origins

**Under "Authorized JavaScript origins", ADD:**
- `http://localhost:5178`
- `http://localhost:5177`
- `http://localhost:5176`
- `http://localhost:5175`

**Keep existing:**
- `http://localhost:5173`
- `https://newtenderapp.vercel.app`

### Step 3: Add New Port to Redirect URIs

**Under "Authorized redirect URIs", ADD:**
- `http://localhost:5178/auth/callback`
- `http://localhost:5177/auth/callback`
- `http://localhost:5176/auth/callback`
- `http://localhost:5175/auth/callback`

**Keep existing:**
- `http://localhost:5173/auth/callback`
- `https://newtenderapp.vercel.app/auth/callback`

### Step 4: Save

Click **Save** button

**Wait 1-2 minutes** for Google to propagate changes

---

## 🎯 Alternative: Force App to Use Port 5173

### Update vite.config.ts:

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,  // Force this port
    strictPort: true,  // Fail if port is in use
    host: '0.0.0.0',
  }
})
```

**Then:**
1. Stop other apps using port 5173
2. Restart your app
3. Will use port 5173 (matches Google OAuth)

---

## 💡 Recommendation

**Option 1 (Easier):** Add all ports to Google OAuth (flexible)

**Option 2 (Cleaner):** Force app to port 5173 (consistent)

---

## 🚀 Quick Fix

**For now:**
1. Add ports 5175-5178 to Google OAuth
2. Save
3. Wait 1 minute
4. Try Google login again
5. Should work! ✅

---

**Which solution do you prefer?** 

Or I can help you add the ports to Google Cloud Console! 🚀

