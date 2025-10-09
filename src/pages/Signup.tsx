import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/base/Button'
import Input from '@/components/base/Input'

export default function Signup() {
  const { signup, loginWithGoogle } = useAuth()
  const [formData, setFormData] = useState({
    company_name: '',
    company_email: '',
    full_name: '',
    email: '',
    password: '',
    confirm_password: ''
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setErrors({})

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Sync company info with user info
      const signupData = {
        ...formData,
        company_name: formData.full_name,
        company_email: formData.email,
        company_phone: undefined
      }
      await signup(signupData)
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      await loginWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Google signup failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <i className="ri-file-list-3-line text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
            <p className="text-gray-600 mt-2">Start managing your tenders efficiently</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <i className="ri-error-warning-line text-red-600 text-xl mr-2 flex-shrink-0 mt-0.5"></i>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Input
                label="Full Name *"
                type="text"
                placeholder="John Doe"
                icon="ri-user-line"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />

              <Input
                label="Email Address *"
                type="email"
                placeholder="admin@company.com"
                icon="ri-mail-line"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Password *"
                  type="password"
                  placeholder="Minimum 6 characters"
                  icon="ri-lock-line"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  error={errors.password}
                  required
                />

                <Input
                  label="Confirm Password *"
                  type="password"
                  placeholder="Re-enter password"
                  icon="ri-lock-line"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  error={errors.confirm_password}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={loading}
              size="lg"
            >
              Create Account
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

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
            loading={googleLoading}
            disabled={googleLoading || loading}
            size="lg"
          >
            <i className="ri-google-fill text-lg mr-2"></i>
            Sign up with Google
          </Button>

          {/* Login Link */}
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

