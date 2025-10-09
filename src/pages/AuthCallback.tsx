import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string>('')
  const [currentStep, setCurrentStep] = useState<string>('Initializing...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('=== STARTING GOOGLE OAUTH CALLBACK PROCESS ===')
        console.log('Callback URL:', window.location.href)

        // Step 1: Wait for page to fully load
        setCurrentStep('Step 1: Loading page...')
        console.log('Step 1: Waiting for page to fully load...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('Step 1 SUCCESS - Page loaded')

        // Step 2: Handle the OAuth callback (now uses direct Google OAuth)
        setCurrentStep('Step 2: Processing Google authentication...')
        console.log('Step 2: Starting OAuth callback processing...')
        const userData = await authService.handleOAuthCallback()
        console.log('Step 2 SUCCESS - OAuth callback processing completed')

        if (userData) {
          // Step 3: Store user data
          setCurrentStep('Step 3: Storing user data...')
          console.log('Step 3: Storing user data...')
          localStorage.setItem('tender_user', JSON.stringify(userData))
          console.log('Step 3 SUCCESS - User data stored:', userData)
          
          // Step 4: Clean up URL and session storage
          setCurrentStep('Step 4: Finalizing...')
          console.log('Step 4: Cleaning up URL and session storage...')
          window.history.replaceState({}, document.title, '/dashboard')
          
          // Clear any OAuth-related sessionStorage
          const keys = Object.keys(sessionStorage)
          keys.forEach(key => {
            if (key.startsWith('processed_code_') || key.startsWith('google_oauth_')) {
              sessionStorage.removeItem(key)
            }
          })
          console.log('Step 4 SUCCESS - Cleanup completed')
          
          // Step 5: Navigate to dashboard
          setCurrentStep('Step 5: Redirecting to dashboard...')
          console.log('Step 5: Navigating to dashboard...')
          await new Promise(resolve => setTimeout(resolve, 200)) // Small delay before navigation
          navigate('/dashboard', { replace: true })
          console.log('Step 5 SUCCESS - Navigation initiated')
          console.log('=== GOOGLE OAUTH CALLBACK PROCESS COMPLETED SUCCESSFULLY ===')
        } else {
          console.error('Step 2 FAILED - No user data returned from OAuth callback')
          console.log('FALLBACK: Navigating to dashboard despite authentication failure')
          navigate('/dashboard', { replace: true })
        }
      } catch (err: any) {
        console.error('=== GOOGLE OAUTH CALLBACK PROCESS FAILED ===')
        console.error('Error details:', err)

        // Check if we have stored user data as fallback
        const storedUser = localStorage.getItem('tender_user')
        if (storedUser) {
          console.log('FALLBACK: Using stored user data')
          navigate('/dashboard', { replace: true })
          return
        }

        // Even if no stored user data, navigate to dashboard as fallback
        console.log('FALLBACK: No stored user data, but navigating to dashboard anyway')
        setError('Authentication failed, but redirecting to dashboard...')
        setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
      }
    }

    // Start the callback process
    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-red-600 text-3xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Issue</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <i className="ri-google-fill text-blue-600 text-3xl"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Completing Sign In</h2>
          <p className="text-gray-600 mb-4">Please wait while we set up your account...</p>
          <div className="bg-gray-100 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-700 font-medium">{currentStep}</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
