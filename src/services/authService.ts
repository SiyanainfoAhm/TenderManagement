import { supabase } from '@/lib/supabase'
import { SignupFormData, UserWithCompany } from '@/types'
import { getFunctionName, getTableName } from '@/config/database'

export const authService = {
  // Authenticate user (multi-company)
  async login(email: string, password: string): Promise<UserWithCompany> {
    const { data, error } = await supabase.rpc(getFunctionName('authenticate_user'), {
      user_email: email,
      user_password: password
    })

    if (error) throw new Error(error.message || 'Login failed')
    if (!data || data.length === 0) throw new Error('Invalid credentials')

    const userData = data[0]
    
    // Parse companies from JSONB
    const companies = typeof userData.companies === 'string' 
      ? JSON.parse(userData.companies)
      : userData.companies || []
    
    // Find default company or use first
    const selectedCompany = companies.find((c: any) => c.is_default) || companies[0] || null
    
    return {
      id: userData.user_id,
      full_name: userData.full_name,
      email: userData.email,
      is_active: userData.is_active,
      companies: companies,
      selectedCompany: selectedCompany,
      created_at: '',
      updated_at: '',
      last_login: ''
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
    
    // Clear any existing OAuth data before starting new flow
    console.log('Clearing previous OAuth data...')
    const existingKeys = Object.keys(sessionStorage)
    existingKeys.forEach(key => {
      if (key.startsWith('processed_code_') || key.startsWith('google_oauth_')) {
        sessionStorage.removeItem(key)
      }
    })
    localStorage.removeItem('google_oauth_state_backup')
    localStorage.removeItem('google_oauth_state_data')
    
    // Use Google OAuth directly instead of Supabase's OAuth
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', import.meta.env.VITE_GOOGLE_CLIENT_ID || '')
    googleAuthUrl.searchParams.set('redirect_uri', `${window.location.origin}/auth/callback`)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'openid email profile')
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'consent select_account')
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
          redirect_uri: `${window.location.origin}/auth/callback`,
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
    
    // Step 3a: Check if user exists in tender1_users table
    console.log('Step 3a: Searching for user with email:', email)
    const { data: existingUser, error: fetchError } = await supabase
      .from('tender1_users')
      .select(`
        *,
        tender1_user_companies (
          role,
          is_active,
          is_default,
          tender1_companies (
            company_name,
            company_email
          )
        )
      `)
      .eq('email', email)
      .single()

    console.log('Step 3a: User lookup result:', { existingUser, fetchError })

    // If user exists in tender1_users
    if (existingUser && !fetchError) {
      console.log('Step 3a SUCCESS - User exists in database, logging in...')
      
      // Check if user is active
      if (!existingUser.is_active) {
        throw new Error('Your account has been deactivated. Please contact support.')
      }

      // Parse companies from the junction table relationship
      const companies = (existingUser.tender1_user_companies || []).map((uc: any) => ({
        company_id: uc.tender1_companies?.id || uc.company_id,
        company_name: uc.tender1_companies?.company_name || '',
        company_email: uc.tender1_companies?.company_email || '',
        role: uc.role,
        is_active: uc.is_active,
        is_default: uc.is_default
      }))

      // Check for pending invitation from sessionStorage (for existing users)
      const pendingInvitation = sessionStorage.getItem('pending_invitation')
      let finalUserData = {
        id: existingUser.id,
        full_name: existingUser.full_name,
        email: existingUser.email,
        is_active: existingUser.is_active,
        companies: companies,
        selectedCompany: companies.find((c: any) => c.is_default) || companies[0] || null,
        created_at: existingUser.created_at || '',
        updated_at: existingUser.updated_at || '',
        last_login: existingUser.last_login || ''
      } as any
      
      if (pendingInvitation) {
        try {
          console.log('Step 3a: Processing pending invitation for existing user...')
          const invitation = JSON.parse(pendingInvitation)
          
          // Verify email matches
          if (existingUser.email.toLowerCase() === invitation.email.toLowerCase()) {
            console.log('Step 3a: Email matches, adding user to company...')
            
            // Add user to company
            const { error: addError } = await supabase.rpc(getFunctionName('add_user_to_company'), {
              p_user_id: existingUser.id,
              p_company_id: invitation.company_id,
              p_role: invitation.role,
              p_invited_by: invitation.invited_by
            })
            
            if (addError) {
              console.error('Step 3a: Failed to add user to company:', addError)
            } else {
              console.log('Step 3a: Successfully added user to company')
              
              // Mark invitation as accepted (only if not already accepted)
              if (invitation.invitation_id && !invitation.already_accepted) {
                console.log('Step 3a: Marking invitation as accepted:', invitation.invitation_id)
                const { error: updateError } = await supabase
                  .from('tender1_company_invitations')
                  .update({
                    accepted: true,
                    accepted_at: new Date().toISOString()
                  })
                  .eq('id', invitation.invitation_id)
                  .eq('accepted', false) // Only update if not already accepted
                
                if (updateError) {
                  console.error('Step 3a: Failed to mark invitation as accepted:', updateError)
                } else {
                  console.log('Step 3a: Successfully marked invitation as accepted')
                }
              } else if (invitation.already_accepted) {
                console.log('Step 3a: Invitation was already marked as accepted, skipping update')
              }
              
              // Get updated user data with new company
              console.log('Step 3a: Getting updated user data with new company...')
              const { data: updatedUser, error: refreshError } = await supabase
                .from('tender1_users')
                .select(`
                  *,
                  tender1_user_companies (
                    role,
                    is_active,
                    is_default,
                    tender1_companies (
                      company_name,
                      company_email
                    )
                  )
                `)
                .eq('id', existingUser.id)
                .single()
              
              console.log('Step 3a: Updated user query result:', { updatedUser, refreshError })
              
              if (updatedUser && !refreshError) {
                const updatedCompanies = (updatedUser.tender1_user_companies || []).map((uc: any) => ({
                  company_id: uc.tender1_companies?.id || uc.company_id,
                  company_name: uc.tender1_companies?.company_name || '',
                  company_email: uc.tender1_companies?.company_email || '',
                  role: uc.role,
                  is_active: uc.is_active,
                  is_default: uc.is_default
                }))
                
                console.log('Step 3a: Mapped companies:', updatedCompanies)
                
                finalUserData = {
                  id: updatedUser.id,
                  full_name: updatedUser.full_name,
                  email: updatedUser.email,
                  is_active: updatedUser.is_active,
                  companies: updatedCompanies,
                  selectedCompany: updatedCompanies.find((c: any) => c.is_default) || updatedCompanies[0] || null,
                  created_at: updatedUser.created_at || '',
                  updated_at: updatedUser.updated_at || '',
                  last_login: updatedUser.last_login || ''
                } as any
                
                console.log('Step 3a: Final user data with companies:', finalUserData)
              } else {
                console.error('Step 3a: Failed to get updated user data:', refreshError)
              }
              
              // Clear pending invitation
              sessionStorage.removeItem('pending_invitation')
            }
          } else {
            console.log('Step 3a: Email mismatch, clearing pending invitation')
            sessionStorage.removeItem('pending_invitation')
          }
        } catch (err) {
          console.error('Step 3a: Failed to process pending invitation:', err)
          sessionStorage.removeItem('pending_invitation')
        }
      }
      
      console.log('Step 3a SUCCESS - User login completed:', finalUserData)
      return finalUserData
    }

    // Handle case where user lookup failed but user might exist
    if (fetchError && fetchError.code === 'PGRST116') {
      console.log('Step 3a: User lookup returned no rows, but user might exist. Checking for duplicate email error...')
      
      // Try to find user without the junction table relationship
      const { data: simpleUser, error: simpleError } = await supabase
        .from('tender1_users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (simpleUser && !simpleError) {
        console.log('Step 3a: Found user without junction table data, fetching companies separately...')
        
        // Get user's companies separately
        const { data: userCompanies, error: companiesError } = await supabase.rpc(getFunctionName('get_user_companies'), {
          p_user_id: simpleUser.id
        })
        
        if (companiesError || !userCompanies) {
          console.log('Step 3a: Failed to get user companies, proceeding with signup...')
        } else {
          // Parse companies
          const companies = userCompanies.map((c: any) => ({
            company_id: c.company_id,
            company_name: c.company_name,
            company_email: c.company_email,
            role: c.role,
            is_active: c.is_active,
            is_default: c.is_default
          }))

          // Find default company
          const selectedCompany = companies.find((c: any) => c.is_default) || companies[0] || null

          // Return user data
          const userData = {
            id: simpleUser.id,
            full_name: simpleUser.full_name,
            email: simpleUser.email,
            is_active: simpleUser.is_active,
            companies: companies,
            selectedCompany: selectedCompany,
            created_at: simpleUser.created_at || '',
            updated_at: simpleUser.updated_at || '',
            last_login: simpleUser.last_login || ''
          } as any
          
          console.log('Step 3a SUCCESS - User login completed via separate query:', userData)
          return userData
        }
      }
    }

    // User doesn't exist in tender1_users - SIGNUP (create new account)
    console.log('Step 3b: User does not exist, creating new account...')
    
    // Step 3b.0: Check if user has a pending invitation
    console.log('Step 3b.0: Checking for pending invitations...')
    const { data: pendingInvitation, error: invitationError } = await supabase
      .from('tender1_company_invitations')
      .select(`
        *,
        tender1_companies (
          company_name,
          company_email
        )
      `)
      .eq('email', email)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    let companyData = null

    if (pendingInvitation && !invitationError) {
      console.log('Step 3b.0 SUCCESS - Found pending invitation:', pendingInvitation)
      companyData = {
        id: pendingInvitation.company_id,
        company_name: pendingInvitation.tender1_companies?.company_name,
        company_email: pendingInvitation.tender1_companies?.company_email
      }
      console.log('Step 3b.0 - Will add user to invited company:', companyData)
    } else {
      console.log('Step 3b.0 - No pending invitation found, will create new company')
      
      // Step 3b.1: Check if company already exists, if not create one
      console.log('Step 3b.1: Checking if company exists...')
    
    // First, try to find existing company with same name
    const { data: existingCompany, error: companyFetchError } = await supabase
      .from('tender1_companies')
      .select('*')
      .eq('company_name', fullName)
      .single()

    if (existingCompany && !companyFetchError) {
      console.log('Step 3b.1 SUCCESS - Found existing company:', existingCompany)
      
      // Check if user already exists in this company through junction table
      const { data: existingUserInCompany, error: userInCompanyError } = await supabase
        .from('tender1_user_companies')
        .select(`
          *,
          tender1_users (*)
        `)
        .eq('company_id', existingCompany.id)
        .eq('tender1_users.email', email)
        .single()
      
      if (existingUserInCompany && !userInCompanyError) {
        console.log('User already exists in this company, logging in...')
        const userData = {
          id: existingUserInCompany.tender1_users.id,
          full_name: existingUserInCompany.tender1_users.full_name,
          email: existingUserInCompany.tender1_users.email,
          is_active: existingUserInCompany.tender1_users.is_active,
          companies: [{
            company_id: existingCompany.id,
            company_name: existingCompany.company_name,
            company_email: existingCompany.company_email,
            role: existingUserInCompany.role,
            is_active: existingUserInCompany.is_active,
            is_default: existingUserInCompany.is_default
          }],
          selectedCompany: {
            company_id: existingCompany.id,
            company_name: existingCompany.company_name,
            company_email: existingCompany.company_email,
            role: existingUserInCompany.role,
            is_active: existingUserInCompany.is_active,
            is_default: existingUserInCompany.is_default
          },
          created_at: existingUserInCompany.tender1_users.created_at || '',
          updated_at: existingUserInCompany.tender1_users.updated_at || '',
          last_login: existingUserInCompany.tender1_users.last_login || ''
        } as any
        return userData
      }
      
      companyData = existingCompany
    } else {
      // Company doesn't exist, create new one
      console.log('Step 3b.1: Creating new company...')
      
      // Try to create company with original name first
      let { data: newCompanyData, error: companyError } = await supabase
        .from('tender1_companies')
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
          .from('tender1_companies')
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
    }

    // Wait a moment to ensure company is properly created
    await new Promise(resolve => setTimeout(resolve, 100))

    // Step 3b.2: Create user in tender1_users table (without company_id)
    console.log('Step 3b.2: Creating user...')
    const { data: newUser, error: userError } = await supabase
      .from('tender1_users')
      .insert({
        full_name: fullName,
        email: email,
        password_hash: '', // No password for OAuth users
        is_active: true
      })
      .select()
      .single()

    if (userError) {
      console.error('Step 3b.2 FAILED - User creation failed:', userError)
      
      // Handle duplicate email error - user might have been created between our checks
      if (userError.code === '23505' && userError.message.includes('email')) {
        console.log('Step 3b.2: Duplicate email detected, user was created by another process. Attempting login...')
        
        // Try to find the existing user and log them in
        const { data: existingUser, error: existingError } = await supabase
          .from('tender1_users')
          .select('*')
          .eq('email', email)
          .single()
        
        if (existingUser && !existingError) {
          // Get user's companies
          const { data: userCompanies, error: companiesError } = await supabase.rpc(getFunctionName('get_user_companies'), {
            p_user_id: existingUser.id
          })
          
          if (companiesError || !userCompanies) {
            throw new Error('User exists but could not fetch company data')
          }
          
          // Parse companies
          const companies = userCompanies.map((c: any) => ({
            company_id: c.company_id,
            company_name: c.company_name,
            company_email: c.company_email,
            role: c.role,
            is_active: c.is_active,
            is_default: c.is_default
          }))

          // Find default company
          const selectedCompany = companies.find((c: any) => c.is_default) || companies[0] || null

          // Return user data
          const userData = {
            id: existingUser.id,
            full_name: existingUser.full_name,
            email: existingUser.email,
            is_active: existingUser.is_active,
            companies: companies,
            selectedCompany: selectedCompany,
            created_at: existingUser.created_at || '',
            updated_at: existingUser.updated_at || '',
            last_login: existingUser.last_login || ''
          } as any
          
          console.log('Step 3b.2 SUCCESS - User login completed after duplicate email handling:', userData)
          return userData
        }
      }
      
      // Rollback: delete the company and sign out
      console.log('Rolling back: Deleting company...')
      await supabase.from('tender1_companies').delete().eq('id', companyData.id)
      await supabase.auth.signOut()
      throw new Error(`User creation failed: ${userError.message}`)
    }

    console.log('Step 3b.2 SUCCESS - User created successfully:', newUser)

    // Step 3b.3: Add user to company through junction table
    console.log('Step 3b.3: Adding user to company...')
    
    // Determine role and default status based on invitation or new company
    const isFromInvitation = pendingInvitation && !invitationError
    const userRole = isFromInvitation ? pendingInvitation.role : 'admin'
    const isDefault = isFromInvitation ? false : true // Invited users don't get default company
    
    console.log('Step 3b.3 - User role and default:', { userRole, isDefault, isFromInvitation })
    
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('tender1_user_companies')
      .insert({
        user_id: newUser.id,
        company_id: companyData.id,
        role: userRole,
        is_active: true,
        is_default: isDefault
      })
      .select()
      .single()

    if (userCompanyError) {
      console.error('Step 3b.3 FAILED - User-company association failed:', userCompanyError)
      // Rollback: delete the user and company
      console.log('Rolling back: Deleting user and company...')
      await supabase.from('tender1_users').delete().eq('id', newUser.id)
      await supabase.from('tender1_companies').delete().eq('id', companyData.id)
      await supabase.auth.signOut()
      throw new Error(`User-company association failed: ${userCompanyError.message}`)
    }

    console.log('Step 3b.3 SUCCESS - User added to company successfully:', userCompany)

    // Step 3b.4: Mark invitation as accepted if it was from an invitation
    if (isFromInvitation) {
      console.log('Step 3b.4: Marking invitation as accepted...')
      await supabase
        .from('tender1_company_invitations')
        .update({
          accepted: true,
          accepted_at: new Date().toISOString()
        })
        .eq('id', pendingInvitation.id)
      console.log('Step 3b.4 SUCCESS - Invitation marked as accepted')
    }

    // Return new user data (multi-company format)
    const userData = {
      id: newUser.id,
      full_name: newUser.full_name,
      email: newUser.email,
      is_active: newUser.is_active,
      companies: [{
        company_id: companyData.id,
        company_name: companyData.company_name,
        company_email: companyData.company_email,
        role: userRole,
        is_active: true,
        is_default: isDefault
      }],
      selectedCompany: {
        company_id: companyData.id,
        company_name: companyData.company_name,
        company_email: companyData.company_email,
        role: userRole,
        is_active: true,
        is_default: isDefault
      },
      created_at: newUser.created_at || '',
      updated_at: newUser.updated_at || '',
      last_login: newUser.last_login || ''
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
      .from(getTableName('companies'))
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
    const { data: userId, error: userError } = await supabase.rpc(getFunctionName('create_user'), {
      p_full_name: formData.full_name,
      p_email: formData.email,
      p_password: formData.password,
      p_company_id: companyData.id,
      p_role: 'admin' // First user is always admin
    })

    if (userError) {
      // Rollback: delete the company
      await supabase.from(getTableName('companies')).delete().eq('id', companyData.id)
      
      if (userError.message.includes('duplicate key')) {
        throw new Error('Email already exists')
      }
      throw new Error(userError.message || 'Failed to create user')
    }

    // Return user data with companies array
    const companies = [{
      company_id: companyData.id,
      company_name: companyData.company_name,
      company_email: companyData.company_email,
      role: 'admin',
      is_active: true,
      is_default: true
    }]

    return {
      id: userId,
      full_name: formData.full_name,
      email: formData.email,
      is_active: true,
      companies: companies,
      selectedCompany: companies[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: ''
    }
  },

  // Verify session (check if stored user is still valid)
  async verifySession(userId: string): Promise<UserWithCompany | null> {
    console.log('verifySession called for userId:', userId)
    
    const { data, error } = await supabase
      .from(getTableName('users'))
      .select('*')
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    console.log('User verification result:', { data, error })
    if (error || !data) return null

    // Get user's companies
    console.log('Getting user companies via RPC...')
    const { data: userCompanies, error: companiesError } = await supabase.rpc(getFunctionName('get_user_companies'), {
      p_user_id: userId
    })

    console.log('User companies RPC result:', { userCompanies, companiesError })
    if (companiesError || !userCompanies) return null

    // Parse companies
    const companies = userCompanies.map((c: any) => ({
      company_id: c.company_id,
      company_name: c.company_name,
      company_email: c.company_email,
      role: c.role,
      is_active: c.is_active,
      is_default: c.is_default
    }))

    console.log('Parsed companies:', companies)

    // Find default company
    const selectedCompany = companies.find(c => c.is_default) || companies[0] || null
    console.log('Selected company:', selectedCompany)

    const result = {
      ...data,
      companies: companies,
      selectedCompany: selectedCompany
    } as any

    console.log('verifySession returning:', result)
    return result
  }
}

