import { supabase } from '@/lib/supabase'
import { DashboardStats } from '@/types'
import { getFunctionName, getTableName } from '@/config/database'

export const dashboardService = {
  // Get dashboard statistics for a company (supports optional date range)
  async getCompanyStats(companyId: string, startDate?: string, endDate?: string): Promise<DashboardStats> {
    // If no date range passed, use RPC (which defaults to last 30 days per DB function)
    if (!startDate || !endDate) {
      const { data, error } = await supabase.rpc(getFunctionName('get_company_stats'), {
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

    // With date range: compute stats via direct queries
    const startISO = new Date(startDate + 'T00:00:00.000Z').toISOString()
    const endISO = new Date(endDate + 'T23:59:59.999Z').toISOString()

    // Total tenders in range
    const totalQuery = supabase
      .from(getTableName('tenders'))
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    // Submitted in range
    const submittedQuery = supabase
      .from(getTableName('tenders'))
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'submitted')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    // Not-bidding in range
    const notBiddingQuery = supabase
      .from(getTableName('tenders'))
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'not-bidding')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    // Active users (not date-bound)
    const activeUsersQuery = supabase
      .from(getTableName('user_companies'))
      .select('user_id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true)

    // Upcoming deadlines within selected date range (last_date between range and active statuses)
    const activeStatuses = ['assigned', 'under-study', 'on-hold', 'will-bid', 'pre-bid', 'wait-for-corrigendum', 'in-preparation', 'ready-to-submit']
    const upcomingQuery = supabase
      .from(getTableName('tenders'))
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', activeStatuses)
      .gte('last_date', startISO)
      .lte('last_date', endISO)

    const [totalRes, submittedRes, notBidRes, activeUsersRes, upcomingRes] = await Promise.all([
      totalQuery,
      submittedQuery,
      notBiddingQuery,
      activeUsersQuery,
      upcomingQuery
    ])

    const error = totalRes.error || submittedRes.error || notBidRes.error || activeUsersRes.error || upcomingRes.error
    if (error) throw new Error(error.message || 'Failed to fetch statistics')

    return {
      total_tenders: totalRes.count || 0,
      submitted_bids: submittedRes.count || 0,
      not_bidding: notBidRes.count || 0,
      active_users: activeUsersRes.count || 0,
      upcoming_deadlines: upcomingRes.count || 0
    }
  }
}

