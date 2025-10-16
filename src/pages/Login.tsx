import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/base/Button'
import Input from '@/components/base/Input'

export default function Login() {
  const { login, loginWithGoogle, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectPath = searchParams.get('redirect')
  const emailParam = searchParams.get('email')
  // Default to Google-only mode (can be overridden with ?google_only=false)
  const googleOnly = searchParams.get('google_only') !== 'false'
  
  const [formData, setFormData] = useState({
    email: emailParam || '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageLoaded, setPageLoaded] = useState(false)

  // Mark page as loaded after component mounts
  useEffect(() => {
    // Wait for page to be fully loaded and rendered
    const timer = setTimeout(() => {
      setPageLoaded(true)
      console.log('Login page fully loaded')
    }, 100) // Small delay to ensure DOM is ready

    return () => clearTimeout(timer)
  }, [])

  // Redirect if user is already logged in (only after page is loaded)
  useEffect(() => {
    if (user && pageLoaded) {
      console.log('User session found after page load, redirecting...')
      
      // Check if pending invitation was processed
      const wasPendingInvitation = redirectPath?.includes('invitations') && !sessionStorage.getItem('pending_invitation')
      
      if (wasPendingInvitation) {
        // Invitation was processed, go to dashboard
        console.log('Redirecting to dashboard (invitation processed)')
        navigate('/dashboard', { replace: true })
      } else if (redirectPath) {
        // Normal redirect
        console.log('Redirecting to:', redirectPath)
        navigate(redirectPath, { replace: true })
      } else {
        // No redirect path, go to dashboard
        console.log('Redirecting to dashboard')
        navigate('/dashboard', { replace: true })
      }
    }
  }, [user, pageLoaded, redirectPath, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(formData.email, formData.password)
      // Navigation will happen in useEffect after user state updates
      if (!redirectPath) {
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      await loginWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Google login failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <i className="ri-file-list-3-line text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-600 mt-2">
              {redirectPath ? 'Login to continue' : 'Sign in to your account'}
            </p>
          </div>

          {/* Redirect Info */}
          {redirectPath && redirectPath.includes('invitations') && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 mb-2">
                <i className="ri-mail-check-line mr-1"></i>
                <strong>Invitation Accepted!</strong>
              </p>
              <p className="text-sm text-green-700">
                Login with <strong>{emailParam}</strong> to join the company
              </p>
              <p className="text-xs text-green-600 mt-2">
                Don't have an account? <Link to={`/signup?email=${encodeURIComponent(emailParam || '')}`} className="underline font-medium">Create one here</Link>
              </p>
            </div>
          )}
          
          {redirectPath && !redirectPath.includes('invitations') && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <i className="ri-information-line mr-1"></i>
                You'll be redirected back after login
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <i className="ri-error-warning-line text-red-600 text-xl mr-2 flex-shrink-0 mt-0.5"></i>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Login Form - Hidden when google_only=true */}
          {!googleOnly && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@company.com"
                  icon="ri-mail-line"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  icon="ri-lock-line"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />

                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={loading}
                >
                  Sign In
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
            </>
          )}

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            loading={googleLoading}
            disabled={googleLoading || loading}
          >
            <i className="ri-google-fill text-lg mr-2"></i>
            Sign in with Google
          </Button>

          {/* Signup Link - Hidden when google_only=true */}
          {!googleOnly && (
            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                  Create one now
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

