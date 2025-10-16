import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { UserWithCompany, SignupFormData, AuthContextType, UserCompanyAccess } from '@/types'
import { supabase } from '@/lib/supabase'
import { getFunctionName } from '@/config/database'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithCompany | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<UserCompanyAccess | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('tender_user')
        const storedCompany = localStorage.getItem('tender_selected_company')
        
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          // Verify session is still valid
          const verifiedUser = await authService.verifySession(userData.id)
          if (verifiedUser) {
            setUser(verifiedUser)
            
            // Restore selected company or use default
            if (storedCompany) {
              const companyData = JSON.parse(storedCompany)
              // Verify user still has access to this company
              const hasAccess = verifiedUser.companies?.some(c => c.company_id === companyData.company_id)
              if (hasAccess) {
                setSelectedCompany(companyData)
              } else {
                // Company no longer accessible, use default
                const defaultCompany = verifiedUser.companies?.find(c => c.is_default) || verifiedUser.companies?.[0] || null
                setSelectedCompany(defaultCompany)
                if (defaultCompany) {
                  localStorage.setItem('tender_selected_company', JSON.stringify(defaultCompany))
                }
              }
            } else {
              // No stored company, use default
              const defaultCompany = verifiedUser.companies?.find(c => c.is_default) || verifiedUser.companies?.[0] || null
              setSelectedCompany(defaultCompany)
              if (defaultCompany) {
                localStorage.setItem('tender_selected_company', JSON.stringify(defaultCompany))
              }
            }
          } else {
            localStorage.removeItem('tender_user')
            localStorage.removeItem('tender_selected_company')
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('tender_user')
        localStorage.removeItem('tender_selected_company')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const userData = await authService.login(email, password)
      setUser(userData)
      localStorage.setItem('tender_user', JSON.stringify(userData))
      
      // Check for pending invitation (legacy support)
      // Note: With the new flow, user-company relationship is created immediately when accepting invitation
      // This section now only handles legacy pending invitations or cases where the immediate creation failed
      const pendingInvitation = sessionStorage.getItem('pending_invitation')
      let finalUserData = userData
      
      if (pendingInvitation) {
        try {
          const invitation = JSON.parse(pendingInvitation)
          console.log('Found legacy pending invitation (should have been processed already):', invitation)
          
          // Verify email matches
          if (userData.email.toLowerCase() === invitation.email.toLowerCase()) {
            console.log('Email matches, checking if user is already in company...')
            
            // Check if user is already in the company
            const { data: existingRelation } = await supabase
              .from('tender1_user_companies')
              .select('id')
              .eq('user_id', userData.id)
              .eq('company_id', invitation.company_id)
              .single()
            
            if (existingRelation) {
              console.log('User is already in company, clearing pending invitation')
              sessionStorage.removeItem('pending_invitation')
              
              // Refresh user data to get updated company list
              const updatedUserData = await authService.verifySession()
              if (updatedUserData) {
                finalUserData = updatedUserData
                setUser(updatedUserData)
                localStorage.setItem('tender_user', JSON.stringify(updatedUserData))
                
                // Set the company as selected if not already selected
                const newCompany = updatedUserData.companies?.find(c => c.company_id === invitation.company_id)
                if (newCompany && !selectedCompany) {
                  setSelectedCompany(newCompany)
                  localStorage.setItem('tender_selected_company', JSON.stringify(newCompany))
                }
                return
              }
            } else {
              console.log('User not in company, attempting to add (fallback)...')
              // Fallback: try to add user to company (this shouldn't happen with new flow)
              const { error: addError } = await supabase.rpc(getFunctionName('add_user_to_company'), {
                p_user_id: userData.id,
                p_company_id: invitation.company_id,
                p_role: invitation.role,
                p_invited_by: invitation.invited_by
              })
              
              if (addError) {
                console.error('Failed to add user to company:', addError)
              } else {
                console.log('Successfully added user to company (fallback)')
                
                // Refresh user data
                const updatedUserData = await authService.verifySession()
                if (updatedUserData) {
                  finalUserData = updatedUserData
                  setUser(updatedUserData)
                  localStorage.setItem('tender_user', JSON.stringify(updatedUserData))
                }
              }
            }
          }
          
          // Clear pending invitation
          sessionStorage.removeItem('pending_invitation')
        } catch (err) {
          console.error('Failed to process legacy pending invitation:', err)
          sessionStorage.removeItem('pending_invitation')
        }
      }
      
      // Set default or first company as selected (only if not set by invitation)
      const defaultCompany = finalUserData.companies?.find(c => c.is_default) || finalUserData.companies?.[0] || null
      setSelectedCompany(defaultCompany)
      if (defaultCompany) {
        localStorage.setItem('tender_selected_company', JSON.stringify(defaultCompany))
      }
      
      // Don't navigate here - let the calling component handle navigation
      // This allows for redirect handling in Login page
    } catch (error: any) {
      throw new Error(error.message || 'Login failed')
    }
  }

  const signup = async (data: SignupFormData) => {
    try {
      const userData = await authService.signup(data)
      setUser(userData)
      localStorage.setItem('tender_user', JSON.stringify(userData))
      
      // Set default or first company as selected
      const defaultCompany = userData.companies?.find(c => c.is_default) || userData.companies?.[0] || null
      setSelectedCompany(defaultCompany)
      if (defaultCompany) {
        localStorage.setItem('tender_selected_company', JSON.stringify(defaultCompany))
      }
      
      navigate('/dashboard')
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed')
    }
  }

  const loginWithGoogle = async () => {
    try {
      await authService.signInWithGoogle()
    } catch (error: any) {
      throw new Error(error.message || 'Google login failed')
    }
  }

  const switchCompany = async (companyId: string) => {
    if (!user) return
    
    const company = user.companies?.find(c => c.company_id === companyId)
    if (!company) {
      throw new Error('Company not found or access denied')
    }
    
    setSelectedCompany(company)
    localStorage.setItem('tender_selected_company', JSON.stringify(company))
    
    // Optionally set as default company
    // await authService.setDefaultCompany(user.id, companyId)
  }

  const refreshUserCompanies = async () => {
    if (!user) return
    
    try {
      const updatedUser = await authService.verifySession(user.id)
      if (updatedUser) {
        setUser(updatedUser)
        localStorage.setItem('tender_user', JSON.stringify(updatedUser))
        
        // Update selected company if it still exists
        if (selectedCompany) {
          const company = updatedUser.companies?.find(c => c.company_id === selectedCompany.company_id)
          if (company) {
            setSelectedCompany(company)
            localStorage.setItem('tender_selected_company', JSON.stringify(company))
          } else {
            // Selected company no longer accessible, use default
            const defaultCompany = updatedUser.companies?.find(c => c.is_default) || updatedUser.companies?.[0] || null
            setSelectedCompany(defaultCompany)
            if (defaultCompany) {
              localStorage.setItem('tender_selected_company', JSON.stringify(defaultCompany))
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh user companies:', error)
    }
  }

  const logout = () => {
    console.log('Logout: Clearing all session and OAuth data...')
    
    setUser(null)
    setSelectedCompany(null)
    
    // Clear user session data
    localStorage.removeItem('tender_user')
    localStorage.removeItem('tender_selected_company')
    
    // Clear Google OAuth state
    sessionStorage.removeItem('google_oauth_state')
    localStorage.removeItem('google_oauth_state_backup')
    localStorage.removeItem('google_oauth_state_data')
    
    // Clear all processed OAuth codes from sessionStorage
    const keys = Object.keys(sessionStorage)
    keys.forEach(key => {
      if (key.startsWith('processed_code_') || key.startsWith('google_oauth_')) {
        console.log('Logout: Removing', key)
        sessionStorage.removeItem(key)
      }
    })
    
    // Clear any pending invitations
    sessionStorage.removeItem('pending_invitation')
    
    console.log('Logout: All session data cleared')
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      selectedCompany,
      login, 
      signup, 
      loginWithGoogle, 
      logout,
      switchCompany,
      refreshUserCompanies
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

