import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/components/layout/MainLayout'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/Button'

interface Invitation {
  id: string
  email: string
  role: string
  expires_at: string
  accepted: boolean
  created_at: string
  inviter: {
    full_name: string
  }
}

export default function PendingInvitations() {
  const { selectedCompany } = useAuth()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInvitations()
  }, [selectedCompany])

  const loadInvitations = async () => {
    if (!selectedCompany) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tender1_company_invitations')
        .select(`
          *,
          inviter:tender1_users!tender1_company_invitations_invited_by_fkey (
            full_name
          )
        `)
        .eq('company_id', selectedCompany.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setInvitations(data || [])
    } catch (error: any) {
      console.error('Failed to load invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await supabase
        .from('tender1_company_invitations')
        .delete()
        .eq('id', invitationId)

      loadInvitations()
    } catch (error: any) {
      console.error('Failed to cancel invitation:', error)
    }
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pending Invitations</h1>
          <p className="text-gray-600 mt-1">Manage pending user invitations</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-4xl text-blue-600"></i>
          </div>
        ) : invitations.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
            <i className="ri-mail-line text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-500">No pending invitations</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invitations.map((invite) => (
                    <tr key={invite.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{invite.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={invite.role === 'admin' ? 'blue' : 'gray'}>
                          {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{invite.inviter?.full_name}</td>
                      <td className="px-6 py-4">
                        {invite.accepted ? (
                          <Badge variant="green">Accepted</Badge>
                        ) : isExpired(invite.expires_at) ? (
                          <Badge variant="red">Expired</Badge>
                        ) : (
                          <Badge variant="yellow">Pending</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {!invite.accepted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelInvitation(invite.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

