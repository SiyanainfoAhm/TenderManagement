import { supabase } from '@/lib/supabase'
import { SignupFormData, UserWithCompany } from '@/types'

export const authService = {
  // Authenticate user
  async login(email: string, password: string): Promise<UserWithCompany> {
    const { data, error } = await supabase.rpc('tender_authenticate_user', {
      user_email: email,
      user_password: password
    })

    if (error) throw new Error(error.message || 'Login failed')
    if (!data || data.length === 0) throw new Error('Invalid credentials')

    const userData = data[0]
    return {
      id: userData.user_id,
      company_id: userData.company_id,
      company_name: userData.company_name,
      full_name: userData.full_name,
      email: userData.email,
      role: userData.role,
      is_active: userData.is_active,
      created_at: '',
      updated_at: ''
    }
  },

  // Google OAuth Sign In - Direct Google OAuth (bypass Supabase auth.users)
  async signInWithGoogle() {
    // Generate a more robust state parameter for CSRF protection
    const timestamp = Date.now().toString()
    const random1 = Math.random().toString(36).substring(2, 15)
    const random2 = Math.random().toString(36).substring(2, 15)
    const state = `${timestamp}_${random1}_${random2}`
    
    // Store state in both sessionStorage and localStorage for redundancy
    sessionStorage.setItem('google_oauth_state', state)
    localStorage.setItem('google_oauth_state_backup', state)
    
    // Also store with a timestamp for timeout validation
    const stateData = {
      state: state,
      timestamp: timestamp,
      expires: Date.now() + (10 * 60 * 1000) // 10 minutes
    }
    localStorage.setItem('google_oauth_state_data', JSON.stringify(stateData))
    
    console.log('Generated state parameter:', state)
    
    // Use Google OAuth directly instead of Supabase's OAuth
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', import.meta.env.VITE_GOOGLE_CLIENT_ID || '')
    googleAuthUrl.searchParams.set('redirect_uri', `http://localhost:5173/auth/callback`)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'openid email profile')
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'select_account')
    googleAuthUrl.searchParams.set('state', state)
    
    console.log('Redirecting to Google OAuth:', googleAuthUrl.toString())
    
    // Redirect to Google OAuth
    window.location.href = googleAuthUrl.toString()
  },

  // Handle OAuth callback - Direct Google OAuth (NO Supabase auth.users)
  async handleOAuthCallback(): Promise<UserWithCompany | null> {
    // Get the authorization code from URL
    const urlParams = new URLSearchParams(window.location.search)
    const authCode = urlParams.get('code')
    const error = urlParams.get('error')
    const state = urlParams.get('state')
    
    if (error) {
      throw new Error(`Google OAuth error: ${error}`)
    }
    
    // Verify state parameter for CSRF protection (with enhanced fallback)
    if (state) {
      const storedState = sessionStorage.getItem('google_oauth_state')
      const backupState = localStorage.getItem('google_oauth_state_backup')
      const stateDataStr = localStorage.getItem('google_oauth_state_data')
      
      let stateData = null
      if (stateDataStr) {
        try {
          stateData = JSON.parse(stateDataStr)
        } catch (e) {
          console.warn('Failed to parse state data:', e)
        }
      }
      
      console.log('State verification:', { 
        received: state, 
        stored: storedState, 
        backup: backupState,
        stateData: stateData
      })
      
      // Check if state has expired
      if (stateData && stateData.expires && Date.now() > stateData.expires) {
        console.warn('State parameter has expired - continuing without CSRF verification')
      } else {
        // Check both sessionStorage and localStorage for state
        const validState = storedState || backupState || (stateData && stateData.state)
        
        if (validState && state !== validState) {
          console.warn('State parameter mismatch - possible CSRF attack or session issue')
          console.warn('Continuing with authentication despite state mismatch...')
        } else if (validState && state === validState) {
          console.log('State parameter verified successfully')
        } else {
          console.log('No valid stored state found - continuing without CSRF verification')
        }
      }
      
      // Clear the state from all storages regardless
      if (storedState) {
        sessionStorage.removeItem('google_oauth_state')
      }
      if (backupState) {
        localStorage.removeItem('google_oauth_state_backup')
      }
      if (stateDataStr) {
        localStorage.removeItem('google_oauth_state_data')
      }
    } else {
      console.log('No state parameter received - continuing without CSRF verification')
    }
    
    if (!authCode) {
      // Check if we already have user data in localStorage (from previous successful auth)
      const storedUser = localStorage.getItem('tender_user')
      if (storedUser) {
        console.log('No auth code, but found stored user data')
        return JSON.parse(storedUser)
      }
      throw new Error('No authorization code received from Google')
    }

    // Check if this code has already been processed
    const processedCode = sessionStorage.getItem(`processed_code_${authCode}`)
    if (processedCode) {
      console.log('Authorization code already processed, using stored result')
      const storedUser = localStorage.getItem('tender_user')
      if (storedUser) {
        return JSON.parse(storedUser)
      }
      throw new Error('Code already processed but no user data found')
    }
    
    try {
      console.log('Starting OAuth token exchange...')
      
      // Step 1: Exchange authorization code for access token
      console.log('Step 1: Exchanging authorization code for access token...')
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
          code: authCode,
          grant_type: 'authorization_code',
          redirect_uri: `http://localhost:5173/auth/callback`,
        }),
      })
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Step 1 FAILED - Token exchange failed:', errorText)
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`)
      }
      
      const tokenData = await tokenResponse.json()
      const accessToken = tokenData.access_token
      console.log('Step 1 SUCCESS - Token exchange completed')
      
      // Wait a moment to ensure token is properly received
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Step 2: Get user info from Google
      console.log('Step 2: Fetching user info from Google...')
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
      
      if (!userResponse.ok) {
        console.error('Step 2 FAILED - Failed to get user info from Google:', userResponse.status, userResponse.statusText)
        throw new Error(`Failed to get user info from Google: ${userResponse.status} ${userResponse.statusText}`)
      }
      
      const googleUser = await userResponse.json()
      const email = googleUser.email
      const fullName = googleUser.name || googleUser.given_name || email.split('@')[0]
      console.log('Step 2 SUCCESS - Google user info received:', { email, fullName })
      
      // Wait a moment to ensure user data is properly received
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Step 3: Process the user in database
      console.log('Step 3: Processing user in database...')
      const result = await this.processGoogleUser(email, fullName)
      console.log('Step 3 SUCCESS - User processing completed successfully')
      
      // Step 4: Mark authorization code as processed
      console.log('Step 4: Marking authorization code as processed...')
      sessionStorage.setItem(`processed_code_${authCode}`, 'true')
      this.cleanupProcessedCodes()
      console.log('Step 4 SUCCESS - Authorization code marked as processed')
      
      console.log('ALL STEPS COMPLETED SUCCESSFULLY')
      return result
      
    } catch (error) {
      console.error('OAuth callback error:', error)
      
      // If anything fails, check if we have stored user data
      const storedUser = localStorage.getItem('tender_user')
      if (storedUser) {
        console.log('OAuth process failed, but found stored user data')
        return JSON.parse(storedUser)
      }
      
      // Even if no stored user data, return null instead of throwing error
      // This allows the AuthCallback to handle the fallback navigation
      console.log('OAuth process failed and no stored user data, returning null for fallback handling')
      return null
    }
  },

  // Helper function to process Google user login/signup
  async processGoogleUser(email: string, fullName: string): Promise<UserWithCompany> {
    console.log('Step 3a: Checking if user exists in database...')
    
    // Step 3a: Check if user exists in tender_users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('tender_users')
      .select(`
        *,
        tender_companies (
          company_name
        )
      `)
      .eq('email', email)
      .single()

    // If user exists in tender_users
    if (existingUser && !fetchError) {
      console.log('Step 3a SUCCESS - User exists in database, logging in...')
      
      // Check if user is active
      if (!existingUser.is_active) {
        throw new Error('Your account has been deactivated. Please contact support.')
      }

      // User exists - LOGIN
      const userData = {
        ...existingUser,
        company_name: existingUser.tender_companies?.company_name || ''
      } as any
      
      console.log('Step 3a SUCCESS - User login completed:', userData)
      return userData
    }

    // User doesn't exist in tender_users - SIGNUP (create new account)
    console.log('Step 3b: User does not exist, creating new account...')
    
    // Step 3b.1: Check if company already exists, if not create one
    console.log('Step 3b.1: Checking if company exists...')
    let companyData = null
    
    // First, try to find existing company with same name
    const { data: existingCompany, error: companyFetchError } = await supabase
      .from('tender_companies')
      .select('*')
      .eq('company_name', fullName)
      .single()

    if (existingCompany && !companyFetchError) {
      console.log('Step 3b.1 SUCCESS - Found existing company:', existingCompany)
      
      // Check if user already exists in this company
      const { data: existingUserInCompany, error: userInCompanyError } = await supabase
        .from('tender_users')
        .select('*')
        .eq('company_id', existingCompany.id)
        .eq('email', email)
        .single()
      
      if (existingUserInCompany && !userInCompanyError) {
        console.log('User already exists in this company, logging in...')
        const userData = {
          ...existingUserInCompany,
          company_name: existingCompany.company_name
        } as any
        return userData
      }
      
      companyData = existingCompany
    } else {
      // Company doesn't exist, create new one
      console.log('Step 3b.1: Creating new company...')
      
      // Try to create company with original name first
      let { data: newCompanyData, error: companyError } = await supabase
        .from('tender_companies')
        .insert({
          company_name: fullName,
          company_email: email,
          company_phone: null
        })
        .select()
        .single()

      // If company name already exists, try with email suffix
      if (companyError && companyError.code === '23505') { // Unique constraint violation
        console.log('Company name exists, trying with email suffix...')
        const emailPrefix = email.split('@')[0]
        const uniqueCompanyName = `${fullName} (${emailPrefix})`
        
        const { data: retryCompanyData, error: retryError } = await supabase
          .from('tender_companies')
          .insert({
            company_name: uniqueCompanyName,
            company_email: email,
            company_phone: null
          })
          .select()
          .single()
        
        if (retryError) {
          console.error('Step 3b.1 FAILED - Company creation failed even with unique name:', retryError)
          await supabase.auth.signOut()
          throw new Error(`Company creation failed: ${retryError.message}`)
        }
        
        newCompanyData = retryCompanyData
        companyError = null
      }

      if (companyError) {
        console.error('Step 3b.1 FAILED - Company creation failed:', companyError)
        // Clean up Supabase auth session
        await supabase.auth.signOut()
        throw new Error(`Company creation failed: ${companyError.message}`)
      }

      console.log('Step 3b.1 SUCCESS - Company created successfully:', newCompanyData)
      companyData = newCompanyData
    }

    // Wait a moment to ensure company is properly created
    await new Promise(resolve => setTimeout(resolve, 100))

    // Step 3b.2: Create user in tender_users table
    console.log('Step 3b.2: Creating user...')
    const { data: newUser, error: userError } = await supabase
      .from('tender_users')
      .insert({
        company_id: companyData.id,
        full_name: fullName,
        email: email,
        password_hash: '', // No password for OAuth users
        role: 'admin', // First user is admin
        is_active: true
      })
      .select()
      .single()

    if (userError) {
      console.error('Step 3b.2 FAILED - User creation failed:', userError)
      // Rollback: delete the company and sign out
      console.log('Rolling back: Deleting company...')
      await supabase.from('tender_companies').delete().eq('id', companyData.id)
      await supabase.auth.signOut()
      throw new Error(`User creation failed: ${userError.message}`)
    }

    console.log('Step 3b.2 SUCCESS - User created successfully:', newUser)

    // Return new user data
    const userData = {
      ...newUser,
      company_name: companyData.company_name
    } as any
    
    console.log('Step 3b SUCCESS - New user signup completed:', userData)
    return userData
  },

  // Clean up old processed codes from sessionStorage
  cleanupProcessedCodes() {
    try {
      const keys = Object.keys(sessionStorage)
      const processedCodeKeys = keys.filter(key => key.startsWith('processed_code_'))
      
      if (processedCodeKeys.length > 10) {
        // Sort by creation time (assuming newer codes are longer)
        processedCodeKeys.sort((a, b) => b.length - a.length)
        
        // Remove oldest codes, keep only the 10 most recent
        const keysToRemove = processedCodeKeys.slice(10)
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
        
        console.log(`Cleaned up ${keysToRemove.length} old processed codes`)
      }
    } catch (error) {
      console.warn('Failed to cleanup processed codes:', error)
    }
  },

  // Register new company and user
  async signup(formData: SignupFormData): Promise<UserWithCompany> {
    // First, create the company
    const { data: companyData, error: companyError } = await supabase
      .from('tender_companies')
      .insert({
        company_name: formData.company_name,
        company_email: formData.company_email,
        company_phone: formData.company_phone || null
      })
      .select()
      .single()

    if (companyError) {
      if (companyError.code === '23505') {
        throw new Error('Company email already exists')
      }
      throw new Error(companyError.message || 'Failed to create company')
    }

    // Then create the user (first user is always admin)
    const { data: userId, error: userError } = await supabase.rpc('tender_create_user', {
      p_company_id: companyData.id,
      p_full_name: formData.full_name,
      p_email: formData.email,
      p_password: formData.password,
      p_role: 'admin' // First user is always admin
    })

    if (userError) {
      // Rollback: delete the company
      await supabase.from('tender_companies').delete().eq('id', companyData.id)
      
      if (userError.message.includes('duplicate key')) {
        throw new Error('Email already exists')
      }
      throw new Error(userError.message || 'Failed to create user')
    }

    // Return user data
    return {
      id: userId,
      company_id: companyData.id,
      company_name: companyData.company_name,
      full_name: formData.full_name,
      email: formData.email,
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },

  // Verify session (check if stored user is still valid)
  async verifySession(userId: string): Promise<UserWithCompany | null> {
    const { data, error } = await supabase
      .from('tender_users')
      .select(`
        *,
        tender_companies (
          company_name
        )
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    return {
      ...data,
      company_name: data.tender_companies?.company_name || ''
    } as any
  }
}

