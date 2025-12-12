import { supabase } from '@/lib/supabase'
import { DashboardStats } from '@/types'
import { getFunctionName, getTableName } from '@/config/database'

export const dashboardService = {
  // Get dashboard statistics for a company (supports optional date range)
  // If no date range is provided, fetches ALL data (no date filtering)
  async getCompanyStats(companyId: string, startDate?: string, endDate?: string): Promise<DashboardStats> {
    // If no date range passed, fetch ALL data (no date filtering)
    if (!startDate || !endDate) {
      // Total tenders (all time)
      const totalQuery = supabase
        .from(getTableName('tenders'))
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)

      // Submitted (all time)
      const submittedQuery = supabase
        .from(getTableName('tenders'))
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'submitted')

      // Not-bidding (all time)
      const notBiddingQuery = supabase
        .from(getTableName('tenders'))
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'not-bidding')

      // Active users (not date-bound)
      const activeUsersQuery = supabase
        .from(getTableName('user_companies'))
        .select('user_id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true)

      // Upcoming deadlines (next 7 days, not date-bound for filtering)
      const activeStatuses = ['assigned', 'under-study', 'on-hold', 'will-bid', 'pre-bid', 'wait-for-corrigendum', 'in-preparation', 'ready-to-submit']
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const next7Days = new Date()
      next7Days.setDate(today.getDate() + 7)
      next7Days.setHours(23, 59, 59, 999)
      
      const upcomingQuery = supabase
        .from(getTableName('tenders'))
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', activeStatuses)
        .gte('last_date', today.toISOString())
        .lte('last_date', next7Days.toISOString())

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

