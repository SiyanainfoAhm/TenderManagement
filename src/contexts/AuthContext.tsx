import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { UserWithCompany, SignupFormData, AuthContextType } from '@/types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('tender_user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          // Verify session is still valid
          const verifiedUser = await authService.verifySession(userData.id)
          if (verifiedUser) {
            setUser(verifiedUser)
          } else {
            localStorage.removeItem('tender_user')
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('tender_user')
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
      navigate('/dashboard')
    } catch (error: any) {
      throw new Error(error.message || 'Login failed')
    }
  }

  const signup = async (data: SignupFormData) => {
    try {
      const userData = await authService.signup(data)
      setUser(userData)
      localStorage.setItem('tender_user', JSON.stringify(userData))
      navigate('/dashboard')
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed')
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('tender_user')
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
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

