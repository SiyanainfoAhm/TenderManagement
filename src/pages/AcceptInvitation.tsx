import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/base/Button'
import { getFunctionName } from '@/config/database'

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    try {
      console.log('Loading invitation with token:', token)
      
      // Fetch invitation details
      const { data, error: fetchError } = await supabase
        .from('tender1_company_invitations')
        .select(`
          *,
          tender1_companies (
            company_name,
            company_email
          ),
          inviter:tender1_users!tender1_company_invitations_invited_by_fkey (
            full_name,
            email
          )
        `)
        .eq('invitation_token', token)
        .eq('accepted', false)
        .single()

      console.log('Invitation fetch result:', { data, fetchError })

      if (fetchError || !data) {
        console.error('Invitation not found or already accepted:', fetchError)
        setError('Invitation not found or already accepted')
        setLoading(false)
        return
      }

      // Check if invitation expired
      const expiresAt = new Date(data.expires_at)
      const now = new Date()
      console.log('Checking expiration:', { expiresAt, now, expired: expiresAt < now })
      
      if (expiresAt < now) {
        setError('This invitation has expired')
        setLoading(false)
        return
      }

      console.log('Invitation loaded successfully:', data)
      setInvitation(data)
      setLoading(false)

    } catch (err: any) {
      console.error('Failed to load invitation:', err)
      setError('Failed to load invitation')
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!invitation) return

    console.log('HandleAccept called:', { user: !!user, invitation })

    // If user is logged in, verify email match
    if (user) {
      console.log('User is logged in, checking email match:', { 
        userEmail: user.email, 
        invitationEmail: invitation.email 
      })
      
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        setError(`This invitation is for ${invitation.email}. You are logged in as ${user.email}. Please logout and login with the correct account.`)
        return
      }

      // User is logged in and email matches - accept immediately
      console.log('Email matches, processing acceptance immediately')
      await processAcceptance()
      return
    }

    // User is NOT logged in - create user account and add to company immediately
    console.log('User not logged in, creating account and adding to company immediately')
    setProcessing(true)
    setError('')

    try {
      // First, check if user already exists
      console.log('Checking if user already exists:', invitation.email)
      const { data: existingUser, error: userCheckError } = await supabase
        .from('tender1_users')
        .select('id, email')
        .eq('email', invitation.email)
        .single()

      if (userCheckError && userCheckError.code !== 'PGRST116') {
        console.error('Error checking for existing user:', userCheckError)
        throw new Error('Failed to check existing user')
      }

      let userId = null
      
      if (existingUser) {
        console.log('User already exists:', existingUser.id)
        userId = existingUser.id
      } else {
        // Create new user account
        console.log('Creating new user account for:', invitation.email)
        const { data: newUser, error: createUserError } = await supabase
          .from('tender1_users')
          .insert({
            email: invitation.email,
            full_name: invitation.email.split('@')[0], // Use email prefix as name
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createUserError) {
          console.error('Failed to create user:', createUserError)
          throw new Error(createUserError.message || 'Failed to create user account')
        }

        console.log('Successfully created user:', newUser.id)
        userId = newUser.id
      }

      // Add user to company immediately
      console.log('Adding user to company immediately:', { userId, companyId: invitation.company_id, role: invitation.role })
      const { error: addError } = await supabase.rpc(getFunctionName('add_user_to_company'), {
        p_user_id: userId,
        p_company_id: invitation.company_id,
        p_role: invitation.role,
        p_invited_by: invitation.invited_by
      })

      if (addError) {
        console.error('Failed to add user to company:', addError)
        throw new Error(addError.message || 'Failed to add user to company')
      }

      console.log('Successfully added user to company')

      // Mark invitation as accepted
      console.log('Marking invitation as accepted:', invitation.id)
      const { error: updateError } = await supabase
        .from('tender1_company_invitations')
        .update({
          accepted: true,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (updateError) {
        console.error('Failed to mark invitation as accepted:', updateError)
        throw new Error(updateError.message || 'Failed to mark invitation as accepted')
      }

      console.log('Successfully marked invitation as accepted')
      
      setSuccessMessage(`Invitation accepted! You have been added to ${invitation.tender1_companies?.company_name}. Please login to access your account.`)
      setSuccess(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate(`/login?redirect=/dashboard&email=${encodeURIComponent(invitation.email)}`)
      }, 2000)

    } catch (err: any) {
      console.error('Failed to process invitation:', err)
      setError('Failed to process invitation: ' + (err.message || 'Unknown error'))
      setProcessing(false)
    }
  }

  const processAcceptance = async () => {
    if (!invitation || !user) return

    console.log('Processing invitation acceptance for logged-in user:', { 
      userId: user.id, 
      companyId: invitation.company_id, 
      role: invitation.role,
      invitationId: invitation.id 
    })

    setProcessing(true)
    setError('')

    try {
      // Check if user is already in the company
      console.log('Checking if user is already in company...')
      const { data: existingRelation, error: checkError } = await supabase
        .from('tender1_user_companies')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('company_id', invitation.company_id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking user-company relationship:', checkError)
        throw new Error('Failed to check existing relationship')
      }

      if (existingRelation) {
        console.log('User is already in company with role:', existingRelation.role)
        setSuccessMessage(`You are already a member of ${invitation.tender1_companies?.company_name}!`)
        setSuccess(true)
        
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
        return
      }

      // Add user to company
      console.log('Adding user to company via RPC...')
      const { error: addError } = await supabase.rpc(getFunctionName('add_user_to_company'), {
        p_user_id: user.id,
        p_company_id: invitation.company_id,
        p_role: invitation.role,
        p_invited_by: invitation.invited_by
      })

      if (addError) {
        console.error('Failed to add user to company:', addError)
        throw new Error(addError.message || 'Failed to accept invitation')
      }

      console.log('Successfully added user to company')

      // Mark invitation as accepted (if not already marked)
      console.log('Checking if invitation needs to be marked as accepted:', invitation.id)
      const { error: updateError } = await supabase
        .from('tender1_company_invitations')
        .update({
          accepted: true,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)
        .eq('accepted', false) // Only update if not already accepted

      if (updateError) {
        console.error('Failed to mark invitation as accepted:', updateError)
        // Don't throw error here - invitation might already be accepted
        console.log('Invitation might already be marked as accepted, continuing...')
      } else {
        console.log('Successfully marked invitation as accepted')
      }
      
      setSuccessMessage(`Successfully accepted invitation! Welcome to ${invitation.tender1_companies?.company_name}!`)
      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/dashboard?from=invitation'
      }, 2000)

    } catch (err: any) {
      console.error('Failed to process invitation acceptance:', err)
      setError(err.message || 'Failed to accept invitation')
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!invitation) return

    console.log('HandleReject called:', { user: !!user, invitation })

    setProcessing(true)
    setError('')

    try {
      console.log('Deleting invitation from database:', invitation.id)
      
      // Delete the invitation (no login required)
      const { error: deleteError } = await supabase
        .from('tender1_company_invitations')
        .delete()
        .eq('id', invitation.id)

      if (deleteError) {
        console.error('Failed to delete invitation:', deleteError)
        throw new Error(deleteError.message || 'Failed to delete invitation')
      }

      console.log('Invitation deleted successfully')
      setSuccessMessage('Invitation rejected successfully.')
      setSuccess(true)
      
      // Redirect based on login status
      setTimeout(() => {
        if (user) {
          navigate('/dashboard?from=invitation')
        } else {
          navigate('/login')
        }
      }, 2000)

    } catch (err: any) {
      console.error('Failed to reject invitation:', err)
      setError('Failed to reject invitation')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <i className="ri-mail-line text-blue-600 text-3xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Invitation</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-red-600 text-3xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-check-line text-green-600 text-3xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600 mb-2">{successMessage}</p>
            <p className="text-sm text-gray-500">Redirecting{user ? ' to dashboard' : ' to login'}...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show invitation details whether logged in or not
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-building-line text-blue-600 text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You've Been Invited!</h2>
          <p className="text-gray-600">
            {invitation.inviter?.full_name || 'Someone'} has invited you to join their company
          </p>
        </div>

        {/* Invitation Details */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Company:</span>
              <span className="text-sm font-semibold text-gray-900">
                {invitation.tender1_companies?.company_name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Your Role:</span>
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {invitation.role}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Invited By:</span>
              <span className="text-sm font-semibold text-gray-900">
                {invitation.inviter?.full_name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">For Email:</span>
              <span className="text-sm font-semibold text-gray-900">
                {invitation.email}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Expires:</span>
              <span className="text-sm font-semibold text-gray-900">
                {new Date(invitation.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Not Logged In - Show Accept Info */}
        {!user && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 mb-2">
              <i className="ri-information-line mr-1"></i>
              <strong>Accept without login!</strong> Click "Accept Invitation" below.
            </p>
            <p className="text-sm text-green-700">
              You'll then be asked to login or create an account with <strong>{invitation.email}</strong>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleReject}
            disabled={processing}
          >
            <i className="ri-close-line mr-2"></i>
            Reject
          </Button>
          <Button 
            className="flex-1"
            onClick={handleAccept}
            loading={processing}
          >
            <i className="ri-check-line mr-2"></i>
            {user ? 'Accept & Join' : 'Accept Invitation'}
          </Button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 text-center mt-6">
          By accepting, you'll get access to {invitation.tender1_companies?.company_name} as {invitation.role}.
        </p>
      </div>
    </div>
  )
}

