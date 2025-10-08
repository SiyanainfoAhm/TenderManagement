import { supabase } from '@/lib/supabase'
import { DashboardStats } from '@/types'

export const dashboardService = {
  // Get dashboard statistics for a company
  async getCompanyStats(companyId: string): Promise<DashboardStats> {
    const { data, error } = await supabase.rpc('tender_get_company_stats', {
      p_company_id: companyId
    })

    if (error) throw new Error(error.message || 'Failed to fetch statistics')

    if (!data || data.length === 0) {
      return {
        total_tenders: 0,
        submitted_bids: 0,
        not_bidding: 0,
        active_users: 0,
        upcoming_deadlines: 0
      }
    }

    const stats = data[0]
    return {
      total_tenders: Number(stats.total_tenders) || 0,
      submitted_bids: Number(stats.submitted_bids) || 0,
      not_bidding: Number(stats.not_bidding) || 0,
      active_users: Number(stats.active_users) || 0,
      upcoming_deadlines: Number(stats.upcoming_deadlines) || 0
    }
  }
}

