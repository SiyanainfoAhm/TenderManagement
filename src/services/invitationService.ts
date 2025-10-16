import { supabase } from '@/lib/supabase'
import { getTableName } from '@/config/database'

export interface PendingInvitation {
  id: string
  company_id: string
  company_name: string
  role: string
  invited_by_name: string
  invitation_token: string
  expires_at: string
  created_at: string
}

export const invitationService = {
  // Get pending invitations for a user's email (case-insensitive)
  async getPendingInvitations(userEmail: string): Promise<PendingInvitation[]> {
    const { data, error } = await supabase
      .from(getTableName('company_invitations'))
      .select(`
        id,
        company_id,
        role,
        invitation_token,
        expires_at,
        created_at,
        tender1_companies (
          company_name
        ),
        inviter:tender1_users!tender1_company_invitations_invited_by_fkey (
          full_name
        )
      `)
      .ilike('email', userEmail) // Case-insensitive email match
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString()) // Not expired
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch pending invitations:', error)
      return []
    }

    return (data || []).map((inv: any) => ({
      id: inv.id,
      company_id: inv.company_id,
      company_name: inv.tender1_companies?.company_name || 'Unknown Company',
      role: inv.role,
      invited_by_name: inv.inviter?.full_name || 'Someone',
      invitation_token: inv.invitation_token,
      expires_at: inv.expires_at,
      created_at: inv.created_at
    }))
  },

  // Check if user has any pending invitations
  async hasPendingInvitations(userEmail: string): Promise<boolean> {
    const invitations = await this.getPendingInvitations(userEmail)
    return invitations.length > 0
  }
}

