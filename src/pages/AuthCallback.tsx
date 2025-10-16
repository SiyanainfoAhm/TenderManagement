import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string>('')
  const [currentStep, setCurrentStep] = useState<string>('Initializing...')
  const [countdown, setCountdown] = useState<number>(0)

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
          
          // Also store selected company if available
          if (userData.selectedCompany) {
            console.log('Step 3: Storing selected company:', userData.selectedCompany.company_name)
            localStorage.setItem('tender_selected_company', JSON.stringify(userData.selectedCompany))
          }
          
          // Wait a moment and verify the data was actually stored
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // Verify storage
          const verifyStored = localStorage.getItem('tender_user')
          if (!verifyStored) {
            console.error('Step 3 FAILED - User data not found in localStorage after storage!')
            throw new Error('Failed to store user data')
          }
          
          const verifyStoredCompany = localStorage.getItem('tender_selected_company')
          console.log('Step 3 SUCCESS - User data stored and verified:', userData)
          console.log('Step 3: User has', userData.companies?.length || 0, 'companies')
          console.log('Step 3: Selected company stored?', !!verifyStoredCompany)
          
          // Step 4: Clean up URL and session storage
          setCurrentStep('Step 4: Finalizing...')
          console.log('Step 4: Cleaning up URL and session storage...')
          window.history.replaceState({}, document.title, '/dashboard')
          
          // Clear any OAuth-related sessionStorage (but keep pending_invitation)
          const pendingInvitation = sessionStorage.getItem('pending_invitation')
          console.log('Step 4: Checking for pending invitation:', pendingInvitation ? 'Found' : 'None')
          
          const keys = Object.keys(sessionStorage)
          keys.forEach(key => {
            if ((key.startsWith('processed_code_') || key.startsWith('google_oauth_')) && key !== 'pending_invitation') {
              sessionStorage.removeItem(key)
            }
          })
          console.log('Step 4 SUCCESS - Cleanup completed, pending invitation preserved:', !!pendingInvitation)
          
          // Step 5: Navigate to dashboard with countdown
          setCurrentStep('Step 5: Redirecting to dashboard...')
          console.log('Step 5: Waiting 5 seconds before navigating to dashboard...')
          
          // Countdown from 5 to 0
          for (let i = 5; i > 0; i--) {
            setCountdown(i)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          setCountdown(0)
          
          // Step 6: Verify session before navigation
          setCurrentStep('Step 6: Verifying session...')
          console.log('Step 6: Countdown complete, verifying session...')
          
          // Give localStorage one more moment to ensure data is persisted
          await new Promise(resolve => setTimeout(resolve, 100))
          
          const storedUser = localStorage.getItem('tender_user')
          console.log('Step 6: Checking localStorage for session data...')
          console.log('Step 6: Session data exists?', !!storedUser)
          
          if (storedUser) {
            try {
              const userSession = JSON.parse(storedUser)
              
              // Validate session data structure
              if (!userSession.id || !userSession.email) {
                throw new Error('Invalid session data structure')
              }
              
              console.log('Step 6: Session verified for user:', userSession.email)
              console.log('Step 6: User ID:', userSession.id)
              console.log('Step 6: User has', userSession.companies?.length || 0, 'companies')
              console.log('Step 6: Selected company:', userSession.selectedCompany?.company_name || 'None')
              
              // Session found and valid, force page reload to refresh AuthContext
              console.log('Step 6: Session valid, reloading page to refresh AuthContext...')
              console.log('Step 6 SUCCESS - Initiating page reload')
              console.log('=== GOOGLE OAUTH CALLBACK PROCESS COMPLETED SUCCESSFULLY ===')
              
              // Use window.location.href instead of navigate to force a full page reload
              // This ensures AuthContext picks up the new session from localStorage
              window.location.href = '/dashboard'
            } catch (err) {
              console.error('Step 6 FAILED - Invalid session data:', err)
              console.error('Step 6: Stored user data:', storedUser)
              setError('Session verification failed. Please try logging in again.')
              setTimeout(() => navigate('/login', { replace: true }), 2000)
            }
          } else {
            console.error('Step 6 FAILED - No session found in localStorage')
            console.error('Step 6: All localStorage keys:', Object.keys(localStorage))
            setError('No active session found. Please login again.')
            setTimeout(() => navigate('/login', { replace: true }), 2000)
          }
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
          {countdown > 0 ? (
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-white">{countdown}</span>
              </div>
              <p className="text-sm text-gray-600">Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
