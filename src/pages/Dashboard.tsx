import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { dashboardService } from '@/services/dashboardService'
import { tenderService } from '@/services/tenderService'
import { invitationService, PendingInvitation } from '@/services/invitationService'
import { DashboardStats, TenderWithUser } from '@/types'
import MainLayout from '@/components/layout/MainLayout'
import Badge from '@/components/base/Badge'
import PendingInvitationsModal from '@/components/invitations/PendingInvitationsModal'

export default function Dashboard() {
  const { user, selectedCompany } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    total_tenders: 0,
    submitted_bids: 0,
    not_bidding: 0,
    active_users: 0,
    upcoming_deadlines: 0
  })
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<TenderWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [showInvitationsModal, setShowInvitationsModal] = useState(false)

  // Date range filter (default last 30 days)
  const today = new Date()
  const defaultEnd = today.toISOString().split('T')[0]
  const d30 = new Date()
  d30.setDate(today.getDate() - 30)
  const defaultStart = d30.toISOString().split('T')[0]
  const [startDate, setStartDate] = useState<string>(defaultStart)
  const [endDate, setEndDate] = useState<string>(defaultEnd)
  const [showDateFilter, setShowDateFilter] = useState(false)


  useEffect(() => {
    loadDashboardData()
    checkPendingInvitations()
  }, [user, selectedCompany, startDate, endDate])

  // Also check for pending invitations when selectedCompany changes
  useEffect(() => {
    if (user) {
      console.log('Selected company changed, checking pending invitations...')
      checkPendingInvitations()
    }
  }, [selectedCompany, user])

  // Also check for pending invitations when component mounts/focuses
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        console.log('Window focused, checking pending invitations...')
        checkPendingInvitations()
      }
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (user && event.persisted) {
        console.log('Page restored from cache, checking pending invitations...')
        checkPendingInvitations()
      }
    }

    // Check when window gains focus (user returns from another tab/page)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)
    
    // Check immediately when component mounts
    if (user) {
      checkPendingInvitations()
    }

    // Also check if we came from an invitation page (check URL parameters)
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('from') === 'invitation') {
      console.log('Returned from invitation page, checking pending invitations...')
      setTimeout(() => checkPendingInvitations(), 500) // Small delay to ensure database is updated
    }

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user || !selectedCompany) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [statsData, deadlinesData, statusCountsData] = await Promise.all([
        dashboardService.getCompanyStats(selectedCompany.company_id, startDate, endDate),
        // Upcoming deadlines should always show next 7 days (not filtered by date range)
        tenderService.getUpcomingDeadlines(selectedCompany.company_id, 7),
        tenderService.getStatusCounts(selectedCompany.company_id, startDate, endDate)
      ])

      setStats(statsData)
      setUpcomingDeadlines(deadlinesData)
      setStatusCounts(statusCountsData)
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkPendingInvitations = async () => {
    if (!user) return

    try {
      console.log('Checking pending invitations for:', user.email)
      const invitations = await invitationService.getPendingInvitations(user.email)
      console.log('Found invitations:', invitations)
      
      if (invitations && invitations.length > 0) {
        setPendingInvitations(invitations)
        setShowInvitationsModal(true)
        console.log('Showing invitations modal with', invitations.length, 'invitations')
      } else {
        // Ensure modal is hidden if no invitations
        setPendingInvitations([])
        setShowInvitationsModal(false)
        console.log('No pending invitations found, hiding modal')
      }
    } catch (error: any) {
      console.error('Failed to check pending invitations:', error)
      setPendingInvitations([])
      setShowInvitationsModal(false)
    }
  }

  // Status counts for the new dashboard
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [showAllStatuses, setShowAllStatuses] = useState(false)

  const mainStatCards = [
    { 
      label: 'Total Tenders', 
      value: stats.total_tenders, 
      icon: 'ri-file-list-3-line', 
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    { 
      label: 'Assigned', 
      value: statusCounts.assigned || 0, 
      icon: 'ri-user-line', 
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    { 
      label: 'Submitted', 
      value: statusCounts.submitted || 0, 
      icon: 'ri-send-plane-line', 
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    { 
      label: 'Won', 
      value: statusCounts.won || 0, 
      icon: 'ri-trophy-line', 
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600'
    },
    { 
      label: 'Not Bidding', 
      value: statusCounts['not-bidding'] || 0, 
      icon: 'ri-close-circle-line', 
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    }
  ]

  const statusCards = [
    { 
      label: 'Under Study', 
      value: statusCounts['under-study'] || 0, 
      icon: 'ri-book-open-line', 
      color: 'gray',
      bgColor: 'bg-gray-50',
      iconColor: 'text-gray-600'
    },
    { 
      label: 'On Hold', 
      value: statusCounts['on-hold'] || 0, 
      icon: 'ri-pause-circle-line', 
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    },
    { 
      label: 'Will Bid', 
      value: statusCounts['will-bid'] || 0, 
      icon: 'ri-heart-line', 
      color: 'teal',
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-600'
    },
    { 
      label: 'Pre-Bid', 
      value: statusCounts['pre-bid'] || 0, 
      icon: 'ri-time-line', 
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    { 
      label: 'Wait for Corrigendum', 
      value: statusCounts['wait-for-corrigendum'] || 0, 
      icon: 'ri-file-check-line', 
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    },
    { 
      label: 'In Preparation', 
      value: statusCounts['in-preparation'] || 0, 
      icon: 'ri-edit-line', 
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    { 
      label: 'Under Evaluation', 
      value: statusCounts['under-evaluation'] || 0, 
      icon: 'ri-search-line', 
      color: 'teal',
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-600'
    },
    { 
      label: 'Qualified', 
      value: statusCounts.qualified || 0, 
      icon: 'ri-checkbox-circle-line', 
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    { 
      label: 'Not Qualified', 
      value: statusCounts['not-qualified'] || 0, 
      icon: 'ri-close-circle-line', 
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    },
    { 
      label: 'Lost', 
      value: statusCounts.lost || 0, 
      icon: 'ri-emotion-sad-line', 
      color: 'gray',
      bgColor: 'bg-gray-50',
      iconColor: 'text-gray-600'
    }
  ]

  // First 5 main status cards (shown by default)
  const defaultStatusCards = mainStatCards
  // All additional status cards (shown when expanded)
  const additionalStatusCards = statusCards

  const getDaysLeft = (lastDate: string) => {
    const today = new Date()
    const deadline = new Date(lastDate)
    const diffTime = deadline.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDaysLeftBadge = (days: number) => {
    if (days < 0) return <Badge variant="gray">Expired</Badge>
    if (days === 0) return <Badge variant="red">Today</Badge>
    if (days === 1) return <Badge variant="red">1 day</Badge>
    if (days <= 3) return <Badge variant="orange">{days} days</Badge>
    return <Badge variant="blue">{days} days</Badge>
  }

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header with Filter Icon */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.full_name}! Here's what's happening with your tenders.
              </p>
            </div>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              <i className="ri-filter-line mr-2 text-base"></i>
              Filter
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        {showDateFilter && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full md:w-60 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full md:w-60 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="pt-6">
                <button
                  onClick={loadDashboardData}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  <i className="ri-refresh-line mr-2"></i>
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-4xl text-blue-600"></i>
          </div>
        ) : (
          <>
            {/* Default Status Cards (First 5) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {defaultStatusCards.map((stat, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-center">
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <i className={`${stat.icon} ${stat.iconColor} text-xl`}></i>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Show All Status / Show Less Button */}
            <div className="flex justify-center mb-8">
              <button
                onClick={() => setShowAllStatuses(!showAllStatuses)}
                className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
              >
                {showAllStatuses ? (
                  <>
                    <i className="ri-arrow-up-s-line mr-2 text-base"></i>
                    Show Less
                  </>
                ) : (
                  <>
                    <i className="ri-arrow-down-s-line mr-2 text-base"></i>
                    Show All Status
                  </>
                )}
              </button>
            </div>

            {/* Additional Status Cards (shown when expanded) */}
            {showAllStatuses && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                {additionalStatusCards.map((status, index) => (
                  <div 
                    key={index} 
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-105"
                  >
                    <div className="flex items-center">
                      <div className={`w-12 h-12 ${status.bgColor} rounded-lg flex items-center justify-center`}>
                        <i className={`${status.icon} ${status.iconColor} text-xl`}></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">{status.label}</p>
                        <p className="text-2xl font-bold text-gray-900">{status.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Upcoming Deadlines (Next 7 Days)
                  </h2>
                  {upcomingDeadlines.length > 0 && (
                    <Badge variant="blue">{upcomingDeadlines.length} tenders</Badge>
                  )}
                </div>
              </div>

              <div className="p-6">
                {upcomingDeadlines.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="ri-calendar-line text-4xl text-gray-400 mb-4"></i>
                    <p className="text-gray-500">No upcoming deadlines in the next 7 days</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingDeadlines.map((tender) => {
                      const daysLeft = getDaysLeft(tender.last_date || '')
                      return (
                        <div 
                          key={tender.id} 
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">{tender.tender_name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>
                                <i className="ri-calendar-line mr-1"></i>
                                {tender.last_date}
                              </span>
                              {tender.assigned_user_name && (
                                <span>
                                  <i className="ri-user-line mr-1"></i>
                                  {tender.assigned_user_name}
                                </span>
                              )}
                              {tender.location && (
                                <span>
                                  <i className="ri-map-pin-line mr-1"></i>
                                  {tender.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            {getDaysLeftBadge(daysLeft)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Pending Invitations Modal - Only show if there are actual invitations */}
        {pendingInvitations.length > 0 && (
          <PendingInvitationsModal
            isOpen={showInvitationsModal}
            invitations={pendingInvitations}
            onClose={() => setShowInvitationsModal(false)}
          />
        )}
      </div>
    </MainLayout>
  )
}

