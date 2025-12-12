import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { dashboardService } from '@/services/dashboardService'
import { tenderService } from '@/services/tenderService'
import { fileService } from '@/services/fileService'
import { invitationService, PendingInvitation } from '@/services/invitationService'
import { DashboardStats, TenderWithUser } from '@/types'
import MainLayout from '@/components/layout/MainLayout'
import Badge from '@/components/base/Badge'
import Modal from '@/components/base/Modal'
import PendingInvitationsModal from '@/components/invitations/PendingInvitationsModal'

export default function Dashboard() {
  const { user, selectedCompany } = useAuth()
  const navigate = useNavigate()
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
  const [selectedTenderDetail, setSelectedTenderDetail] = useState<TenderWithUser | null>(null)
  const [isTenderModalOpen, setIsTenderModalOpen] = useState(false)
  const [tenderModalLoading, setTenderModalLoading] = useState(false)
  const [tenderModalAttachments, setTenderModalAttachments] = useState<any[]>([])
  const [tenderModalError, setTenderModalError] = useState<string | null>(null)
  const [tenderModalAttachmentsLoading, setTenderModalAttachmentsLoading] = useState(false)
  const [tenderModalAttachmentsError, setTenderModalAttachmentsError] = useState<string | null>(null)

  // Date range filter (default: no filter - fetch all data)
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')
  const [appliedStartDate, setAppliedStartDate] = useState<string>('')
  const [appliedEndDate, setAppliedEndDate] = useState<string>('')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)


  useEffect(() => {
    loadDashboardData(appliedStartDate, appliedEndDate)
    checkPendingInvitations()
  }, [user, selectedCompany, appliedStartDate, appliedEndDate])

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

  const loadDashboardData = async (
    rangeStart?: string,
    rangeEnd?: string
  ) => {
    if (!user || !selectedCompany) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Use provided dates, or fall back to applied dates, or undefined if empty (no filter)
      const effectiveStart = rangeStart ?? (appliedStartDate || undefined)
      const effectiveEnd = rangeEnd ?? (appliedEndDate || undefined)
      
      // Only pass dates if both are provided and not empty
      const startDate = effectiveStart && effectiveStart.trim() !== '' ? effectiveStart : undefined
      const endDate = effectiveEnd && effectiveEnd.trim() !== '' ? effectiveEnd : undefined
      
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

  const handleApplyDateFilter = () => {
    if (!filterStartDate || !filterEndDate) {
      setDateError('Please select both start and end dates.')
      return
    }

    if (filterStartDate > filterEndDate) {
      setDateError('Start date cannot be after end date.')
      return
    }

    setDateError(null)
    setAppliedStartDate(filterStartDate)
    setAppliedEndDate(filterEndDate)
    loadDashboardData(filterStartDate, filterEndDate)
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
      label: 'Ready to Submit', 
      value: statusCounts['ready-to-submit'] || 0, 
      icon: 'ri-upload-cloud-line', 
      color: 'indigo', 
      bgColor: 'bg-indigo-50', 
      iconColor: 'text-indigo-600' 
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

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'new': { variant: 'blue' as const, label: 'New' },
      'under-study': { variant: 'gray' as const, label: 'Under Study' },
      'on-hold': { variant: 'yellow' as const, label: 'On Hold' },
      'will-bid': { variant: 'blue' as const, label: 'Will Bid' },
      'pre-bid': { variant: 'blue' as const, label: 'Pre-Bid' },
      'wait-for-corrigendum': { variant: 'orange' as const, label: 'Wait for Corrigendum' },
      'not-bidding': { variant: 'red' as const, label: 'Not Bidding' },
      'assigned': { variant: 'purple' as const, label: 'Assigned' },
      'in-preparation': { variant: 'blue' as const, label: 'In Preparation' },
      'ready-to-submit': { variant: 'blue' as const, label: 'Ready to Submit' },
      'submitted': { variant: 'green' as const, label: 'Submitted' },
      'under-evaluation': { variant: 'orange' as const, label: 'Under Evaluation' },
      'qualified': { variant: 'green' as const, label: 'Qualified' },
      'not-qualified': { variant: 'red' as const, label: 'Not Qualified' },
      'won': { variant: 'green' as const, label: 'Won' },
      'lost': { variant: 'red' as const, label: 'Lost' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'gray' as const, label: status }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const formatCurrencyDetail = (amount?: number | null) => {
    if (!amount || Number.isNaN(amount) || amount <= 0) return 'N/A'
    return `₹${amount.toLocaleString('en-IN')}`
  }

  const formatDateTimeValue = (value?: string | null) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleString()
  }

  const formatFileSizeValue = (bytes?: number | null) => {
    if (!bytes) return '0 Bytes'
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const getFileIconClass = (file: File | any) => {
    const fileType = (file.type || file.file_type || '').toLowerCase()
    const fileName = (file.name || file.file_name || '').toLowerCase()
    const extension = fileName.split('.').pop() || ''

    if (fileType.startsWith('image/')) return 'ri-image-line'
    if (fileType === 'application/pdf') return 'ri-file-pdf-line'
    if (fileType.includes('word')) return 'ri-file-word-line'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'ri-file-excel-line'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'ri-file-ppt-line'
    if (fileType.includes('zip') || fileType.includes('rar') || extension === 'zip' || extension === 'rar') return 'ri-file-zip-line'
    return 'ri-file-line'
  }

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const blob = await fileService.downloadFile(attachment.file_path)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Failed to download attachment:', error)
      setTenderModalAttachmentsError(error.message || 'Failed to download attachment.')
    }
  }

  const handleUpcomingTenderClick = async (tenderId: string) => {
    if (!tenderId || !selectedCompany) return

    setIsTenderModalOpen(true)
    setTenderModalLoading(true)
    setTenderModalError(null)
    setSelectedTenderDetail(null)
    setTenderModalAttachments([])
    setTenderModalAttachmentsError(null)
    setTenderModalAttachmentsLoading(true)

    try {
      const detail = await tenderService.getTenderById(tenderId)
      setSelectedTenderDetail(detail)
      setTenderModalLoading(false)
    } catch (error: any) {
      console.error('Failed to load tender detail from dashboard:', error)
      setTenderModalError(error.message || 'Failed to load tender details.')
      setTenderModalLoading(false)
      setTenderModalAttachmentsLoading(false)
      return
    }

    try {
      const attachments = await tenderService.getTenderAttachments(tenderId)
      setTenderModalAttachments(attachments)
    } catch (error: any) {
      console.error('Failed to load tender attachments from dashboard:', error)
      setTenderModalAttachmentsError(error.message || 'Failed to load attachments.')
    } finally {
      setTenderModalAttachmentsLoading(false)
    }
  }

  const handleCloseTenderModal = () => {
    setIsTenderModalOpen(false)
    setSelectedTenderDetail(null)
    setTenderModalAttachments([])
    setTenderModalError(null)
    setTenderModalAttachmentsError(null)
    setTenderModalAttachmentsLoading(false)
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
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full md:w-60 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full md:w-60 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="pt-6">
                <button
                  onClick={handleApplyDateFilter}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  <i className="ri-refresh-line mr-2"></i>
                  Apply
                </button>
              </div>
            </div>
            {dateError && (
              <p className="text-sm text-red-600 mt-2">{dateError}</p>
            )}
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
                            <button
                              type="button"
                              onClick={() => handleUpcomingTenderClick(tender.id)}
                              className="font-medium text-blue-600 hover:underline mb-1 text-left"
                            >
                              {tender.tender_name}
                            </button>
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

        <Modal
          isOpen={isTenderModalOpen}
          onClose={handleCloseTenderModal}
          title="Tender Details"
          size="lg"
        >
          {tenderModalLoading ? (
            <div className="flex items-center justify-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-blue-600" />
            </div>
          ) : tenderModalError ? (
            <p className="text-sm text-red-600">{tenderModalError}</p>
          ) : selectedTenderDetail ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender Name</label>
                  <p className="text-base text-gray-900 mt-1 font-semibold">{selectedTenderDetail.tender_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedTenderDetail.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender247 ID</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.tender247_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">GEM/Eprocure ID</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.gem_eprocure_id || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Source</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.source || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender Type</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.tender_type || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Portal Link</label>
                  {selectedTenderDetail.portal_link ? (
                    <a
                      href={selectedTenderDetail.portal_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 mt-1 inline-flex items-center gap-1"
                    >
                      Visit Portal
                      <i className="ri-external-link-line text-xs"></i>
                    </a>
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">N/A</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Date</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.last_date || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Assigned To</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.assigned_user_name || 'Unassigned'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Expected Start Date</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.expected_start_date || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Expected End Date</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.expected_end_date || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Expected Days</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedTenderDetail.expected_days !== null && selectedTenderDetail.expected_days !== undefined
                      ? selectedTenderDetail.expected_days
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Created By</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.created_user_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created At</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDateTimeValue(selectedTenderDetail.created_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Updated At</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDateTimeValue(selectedTenderDetail.updated_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">MSME Exempted</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.msme_exempted ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Startup Exempted</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTenderDetail.startup_exempted ? 'Yes' : 'No'}</p>
                </div>
                {selectedTenderDetail.not_bidding_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Not Bidding Reason</label>
                    <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                      {selectedTenderDetail.not_bidding_reason}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">EMD Amount</label>
                  <p className="text-sm text-gray-900 mt-1">{formatCurrencyDetail(selectedTenderDetail.emd_amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender Fees</label>
                  <p className="text-sm text-gray-900 mt-1">{formatCurrencyDetail(selectedTenderDetail.tender_fees)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender Cost</label>
                  <p className="text-sm text-gray-900 mt-1">{formatCurrencyDetail(selectedTenderDetail.tender_cost)}</p>
                </div>
              </div>

              {selectedTenderDetail.pq_criteria && (
                <div>
                  <label className="text-sm font-medium text-gray-700">PQ Criteria</label>
                  <ul className="list-disc list-inside text-sm text-gray-900 mt-1 space-y-1">
                    {selectedTenderDetail.pq_criteria
                      .split('\n')
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                  </ul>
                </div>
              )}

              {selectedTenderDetail.tender_notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                    {selectedTenderDetail.tender_notes}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">Attachments</label>
                <div className="mt-2 space-y-2">
                  {tenderModalAttachmentsLoading && (
                    <div className="flex items-center text-sm text-gray-500">
                      <i className="ri-loader-4-line animate-spin text-lg text-blue-500 mr-2"></i>
                      Loading attachments...
                    </div>
                  )}

                  {tenderModalAttachmentsError && (
                    <p className="text-sm text-red-600">{tenderModalAttachmentsError}</p>
                  )}

                  {!tenderModalAttachmentsLoading &&
                    !tenderModalAttachmentsError &&
                    tenderModalAttachments.length === 0 && (
                      <p className="text-sm text-gray-500">No attachments uploaded.</p>
                    )}

                  {tenderModalAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center space-x-3">
                        <i className={`${getFileIconClass(attachment)} text-lg text-blue-500`}></i>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSizeValue(attachment.file_size)} • {formatDateTimeValue(attachment.created_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(attachment)}
                        className="text-blue-500 hover:text-blue-600"
                        title="Download"
                      >
                        <i className="ri-download-line text-lg"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Tender details not available.</p>
          )}
        </Modal>
      </div>
    </MainLayout>
  )
}

