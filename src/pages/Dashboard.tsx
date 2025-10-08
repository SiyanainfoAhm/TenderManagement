import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { dashboardService } from '@/services/dashboardService'
import { tenderService } from '@/services/tenderService'
import { DashboardStats, TenderWithUser } from '@/types'
import MainLayout from '@/components/layout/MainLayout'
import Badge from '@/components/base/Badge'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    total_tenders: 0,
    submitted_bids: 0,
    not_bidding: 0,
    active_users: 0,
    upcoming_deadlines: 0
  })
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<TenderWithUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [statsData, deadlinesData] = await Promise.all([
        dashboardService.getCompanyStats(user.company_id),
        tenderService.getUpcomingDeadlines(user.company_id, 7)
      ])

      setStats(statsData)
      setUpcomingDeadlines(deadlinesData)
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { 
      label: 'Total Tenders', 
      value: stats.total_tenders, 
      icon: 'ri-file-list-3-line', 
      color: 'blue' 
    },
    { 
      label: 'Submitted Bids', 
      value: stats.submitted_bids, 
      icon: 'ri-send-plane-line', 
      color: 'green' 
    },
    { 
      label: 'Not Bidding', 
      value: stats.not_bidding, 
      icon: 'ri-close-circle-line', 
      color: 'red' 
    },
    { 
      label: 'Active Users', 
      value: stats.active_users, 
      icon: 'ri-team-line', 
      color: 'purple' 
    }
  ]

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.full_name}! Here's what's happening with your tenders.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-4xl text-blue-600"></i>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center">
                    <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                      <i className={`${stat.icon} text-${stat.color}-600 text-xl`}></i>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
      </div>
    </MainLayout>
  )
}

