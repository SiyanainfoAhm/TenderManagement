import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { userService } from '@/services/userService'
import { generateUUID } from '@/utils/uuid'
import Button from '@/components/base/Button'
import Input from '@/components/base/Input'
import Select from '@/components/base/Select'
import Modal from '@/components/base/Modal'

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
  const { user: currentUser, selectedCompany } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'user' | 'viewer'>('user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input')
  const [foundUser, setFoundUser] = useState<any>(null)
  const [isResend, setIsResend] = useState(false)

  const roleOptions = [
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' }
  ]

  const handleSearchUser = async () => {
    if (!email || !fullName || !selectedCompany || !currentUser) return

    setError('')
    
    // Validate full name
    if (fullName.trim().length < 2) {
      setError('Please enter a valid full name (at least 2 characters)')
      return
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Check if user exists in system (case-insensitive email)
      const { data, error: searchError } = await supabase
        .from('tender1_users')
        .select('id, full_name, email')
        .ilike('email', email)
        .maybeSingle()

      if (searchError) throw searchError

      if (!data) {
        // User doesn't exist - show confirmation to create new user
        setFoundUser({
          id: null,
          full_name: fullName.trim(), // Use the provided full name
          email: email,
          isNew: true
        })
        setStep('confirm')
        setLoading(false)
        return
      }

      // User exists - check if they already have access to this company
      const { data: existingAccess } = await supabase
        .from('tender1_user_companies')
        .select('role, is_active')
        .eq('user_id', data.id)
        .eq('company_id', selectedCompany.company_id)
        .maybeSingle()

      if (existingAccess) {
        if (existingAccess.is_active) {
          setError(`${data.full_name} (${email}) already has access to ${selectedCompany.company_name} as ${existingAccess.role}.`)
          setLoading(false)
          return
        } else {
          setError(`${data.full_name} (${email}) had access to ${selectedCompany.company_name} but was deactivated. Use the reactivate option instead.`)
          setLoading(false)
          return
        }
      }

      // User exists and doesn't have access yet - show confirmation
      setFoundUser({
        ...data,
        isNew: false
      })
      setStep('confirm')

    } catch (err: any) {
      setError(err.message || 'Failed to search for user')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmInvite = async () => {
    if (!foundUser || !currentUser || !selectedCompany) return

    setLoading(true)
    setError('')

    try {
      const { supabase } = await import('@/lib/supabase')
      const { emailService } = await import('@/services/emailService')
      const { getFunctionName } = await import('@/config/database')
      
      let userId = foundUser.id
      
      // If user doesn't exist, create them first
      if (foundUser.isNew) {
        // Generate a random temporary password (user will reset it)
        const tempPassword = generateUUID().substring(0, 12)
        
        const { data: newUserId, error: createError } = await supabase.rpc(getFunctionName('create_user'), {
          p_full_name: foundUser.full_name,
          p_email: foundUser.email,
          p_password: tempPassword,
          p_company_id: null, // Don't link to company yet (will be done via invitation)
          p_role: role
        })

        if (createError) {
          throw new Error(createError.message || 'Failed to create user')
        }

        userId = newUserId
      }
      
      // Check if there's already a pending invitation for this user and company
      console.log('Checking for existing invitation...')
      const { data: existingInvitations, error: checkError } = await supabase
        .from('tender1_company_invitations')
        .select('id, invitation_token, accepted, expires_at')
        .eq('company_id', selectedCompany.company_id)
        .eq('email', foundUser.email)
        .eq('accepted', false)
        .gte('expires_at', new Date().toISOString())

      if (checkError) {
        console.error('Error checking existing invitations:', checkError)
      }

      let invitationToken = ''
      let shouldResend = false

      if (existingInvitations && existingInvitations.length > 0) {
        // Invitation already exists - resend the email with existing token
        console.log('Existing invitation found, resending email...')
        invitationToken = existingInvitations[0].invitation_token
        shouldResend = true
        setIsResend(true)
        
        // Update the expires_at date to extend it by 7 more days
        const newExpiresAt = new Date()
        newExpiresAt.setDate(newExpiresAt.getDate() + 7)
        
        await supabase
          .from('tender1_company_invitations')
          .update({
            expires_at: newExpiresAt.toISOString(),
            invited_by: currentUser.id // Update who resent it
          })
          .eq('id', existingInvitations[0].id)
      } else {
        // Create new invitation
        console.log('Creating new invitation...')
        invitationToken = generateUUID()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

        // Create invitation record in database
        const { error: inviteError } = await supabase
          .from('tender1_company_invitations')
          .insert({
            company_id: selectedCompany.company_id,
            email: foundUser.email,
            role: role,
            invited_by: currentUser.id,
            invitation_token: invitationToken,
            expires_at: expiresAt.toISOString(),
            accepted: false
          })

        if (inviteError) {
          throw new Error(inviteError.message || 'Failed to create invitation')
        }
      }

      // Send (or resend) invitation email
      try {
        await emailService.sendInvitation({
          toEmail: foundUser.email,
          toName: foundUser.full_name,
          companyName: selectedCompany.company_name,
          inviterName: currentUser.full_name,
          role: role,
          invitationToken: invitationToken
        })
        
        console.log(shouldResend ? 'Invitation email resent successfully' : 'Invitation email sent successfully')
      } catch (emailError) {
        console.error('Email sending failed, but invitation created:', emailError)
        // Continue even if email fails - user can still accept via direct link
      }

      setStep('success')
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Failed to send invitation')
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFullName('')
    setEmail('')
    setRole('user')
    setError('')
    setStep('input')
    setFoundUser(null)
    setLoading(false)
    setIsResend(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New User" size="md">
      <div className="space-y-4">
        {/* Input Step */}
        {step === 'input' && (
          <>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <i className="ri-error-warning-line text-red-600 text-xl mr-2 flex-shrink-0"></i>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Input
              label="Full Name *"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
              icon="ri-user-line"
              required
            />

            <Input
              label="Gmail ID *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              icon="ri-mail-line"
              required
            />

            <Select
              label="Role *"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              options={roleOptions}
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-gray-200">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSearchUser} loading={loading} disabled={!email || !fullName}>
                Save
              </Button>
            </div>
          </>
        )}

        {/* Confirmation Step */}
        {step === 'confirm' && foundUser && (
          <>
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className={`${foundUser.isNew ? 'ri-user-add-line' : 'ri-mail-send-line'} text-blue-600 text-2xl`}></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {foundUser.isNew ? 'Create & Invite User' : 'User Found!'}
              </h3>
              <p className="text-gray-600 mb-4">
                {foundUser.isNew ? (
                  <>
                    Create account for <strong>{foundUser.email}</strong> and send invitation to join {selectedCompany?.company_name}?
                  </>
                ) : (
                  <>
                    Send invitation to <strong>{foundUser.full_name}</strong> ({foundUser.email}) to join {selectedCompany?.company_name}?
                  </>
                )}
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Email:</strong> {foundUser.email}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Role:</strong> {role.charAt(0).toUpperCase() + role.slice(1)}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Company:</strong> {selectedCompany?.company_name}
                </p>
                {foundUser.isNew && (
                  <p className="text-xs text-gray-500 mt-2">
                    <i className="ri-information-line mr-1"></i>
                    A temporary password will be generated. User can set their own password after accepting.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <i className="ri-error-warning-line text-red-600 text-xl mr-2 flex-shrink-0"></i>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setStep('input')}>Back</Button>
              <Button onClick={handleConfirmInvite} loading={loading}>
                Confirm & Add User
              </Button>
            </div>
          </>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-mail-send-line text-green-600 text-3xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isResend ? 'Invitation Resent!' : 'Invitation Sent!'}
            </h3>
            <p className="text-gray-600 mb-2">
              {isResend 
                ? `An invitation reminder has been sent to ${foundUser?.email}.`
                : `An invitation email has been sent to ${foundUser?.email}.`
              }
            </p>
            <p className="text-sm text-gray-500">
              {isResend 
                ? 'The previous invitation has been extended for 7 more days.'
                : `${foundUser?.full_name} can accept the invitation to join ${selectedCompany?.company_name}.`
              }
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

