import { useNavigate } from 'react-router-dom'
import Modal from '@/components/base/Modal'
import Button from '@/components/base/Button'
import { PendingInvitation } from '@/services/invitationService'

interface PendingInvitationsModalProps {
  isOpen: boolean
  invitations: PendingInvitation[]
  onClose: () => void
}

export default function PendingInvitationsModal({ 
  isOpen, 
  invitations, 
  onClose 
}: PendingInvitationsModalProps) {
  const navigate = useNavigate()

  const handleViewInvitation = (token: string) => {
    navigate(`/invitations/${token}`)
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="You Have Pending Invitations!" 
      size="lg"
    >
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <p className="text-sm text-blue-800">
            <i className="ri-information-line mr-1"></i>
            You have {invitations.length} pending {invitations.length === 1 ? 'invitation' : 'invitations'} to join {invitations.length === 1 ? 'a company' : 'companies'}. Review and accept or reject them below.
          </p>
        </div>

        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div 
              key={invitation.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="ri-building-line text-blue-600"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{invitation.company_name}</h3>
                      <p className="text-xs text-gray-500">
                        Invited by {invitation.invited_by_name}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <div>
                      <span className="text-gray-600">Role:</span>
                      <span className="ml-2 font-medium text-gray-900 capitalize">
                        {invitation.role}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Expires:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleViewInvitation(invitation.invitation_token)}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Review Later
          </Button>
        </div>
      </div>
    </Modal>
  )
}

