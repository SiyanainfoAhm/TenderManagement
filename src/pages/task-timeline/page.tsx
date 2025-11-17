import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import Button from '@/components/base/Button'
import Input from '@/components/base/Input'
import Modal from '@/components/base/Modal'
import Badge from '@/components/base/Badge'
import { CalendarView } from './components/CalendarView'
import { GanttView } from './components/GanttView'
import { type TimelineTender, type TimelineUser } from '@/mocks/timeline'
import { useAuth } from '@/contexts/AuthContext'
import { tenderService } from '@/services/tenderService'
import { userService } from '@/services/userService'
import { TenderWithUser, CompanyMember } from '@/types'

const defaultDateRange = () => {
  const today = new Date()
  return {
    start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
    end: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  }
}

// Calculate tender dates - REQUIRED: Only use expected_start_date and expected_end_date (no fallbacks)
function calculateTenderDates(tender: TenderWithUser): { startDate: string | null; endDate: string | null } {
  // Only use expected_start_date and expected_end_date - both are REQUIRED
  const startDate = tender.expected_start_date || null
  const endDate = tender.expected_end_date || null

  return { startDate, endDate }
}

// Transform tender to timeline format
function transformTenderToTimeline(tender: TenderWithUser, users: CompanyMember[]): TimelineTender | null {
  const { startDate, endDate } = calculateTenderDates(tender)

  // REQUIRED: Only include tenders with both expected_start_date and expected_end_date
  // Exclude tenders without both dates (no fallbacks allowed)
  if (!startDate || !endDate) {
    return null
  }

  const tenderId = tender.tender247_id || tender.gem_eprocure_id || 'N/A'
  const gemId = tender.gem_eprocure_id || tender.tender247_id || 'N/A'
  const assignedTo = tender.assigned_to || 'unassigned'

  return {
    id: tender.id,
    tenderId,
    tenderName: tender.tender_name,
    gemId,
    estimatedStartDate: startDate,
    estimatedEndDate: endDate,
    assignedTo,
    status: tender.status
  }
}

// Transform company member to timeline user
function transformUserToTimeline(user: CompanyMember): TimelineUser {
  return {
    id: user.user_id,
    name: user.full_name,
    email: user.email,
    role: user.role || 'User',
    department: '',
    phone: '',
    status: user.is_active ? 'Active' : 'Inactive'
  }
}

export default function TaskTimelinePage() {
  const { selectedCompany, user } = useAuth()
  const navigate = useNavigate()
  const companyId = selectedCompany?.company_id

  const [currentView, setCurrentView] = useState<'calendar' | 'gantt'>('calendar')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState(defaultDateRange)
  const [selectedTender, setSelectedTender] = useState<TimelineTender | null>(null)
  const [selectedTenderDetails, setSelectedTenderDetails] = useState<TenderWithUser | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [loadingTenderDetails, setLoadingTenderDetails] = useState(false)

  // Data states
  const [timelineTenders, setTimelineTenders] = useState<TimelineTender[]>([])
  const [timelineUsers, setTimelineUsers] = useState<TimelineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [dateRangeInput, setDateRangeInput] = useState(() => defaultDateRange())
  const [isDateInputFocused, setIsDateInputFocused] = useState(false)

  // Load users (only once)
  const loadUsers = useCallback(async () => {
    if (!companyId) return

    try {
      const usersData = await userService.getCompanyUsers(companyId)
      const transformedUsers = usersData
        .filter(u => u.is_active)
        .map(transformUserToTimeline)
      setTimelineUsers(transformedUsers)
    } catch (err: any) {
      console.error('Failed to load users:', err)
    }
  }, [companyId])

  // Load tenders with date range filter
  const loadTenders = useCallback(async (dateFilter?: { startDate: string; endDate: string }) => {
    if (!companyId || !user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Prepare date filter for API
      const apiDateFilter = dateFilter ? {
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate
      } : undefined

      // Always fetch users for transformation (they might not be loaded yet)
      const [tendersData, usersData] = await Promise.all([
        tenderService.getTendersForTimeline(companyId, apiDateFilter),
        userService.getCompanyUsers(companyId)
      ])

      // Update users if not already set
      if (timelineUsers.length === 0) {
        const transformedUsers = usersData
          .filter(u => u.is_active)
          .map(transformUserToTimeline)
        setTimelineUsers(transformedUsers)
      }

      // Transform tenders (only those with valid dates - API already filters by expected_start_date/expected_end_date)
      const transformedTenders = tendersData
        .map(tender => transformTenderToTimeline(tender, usersData))
        .filter((tender): tender is TimelineTender => tender !== null)
      setTimelineTenders(transformedTenders)
    } catch (err: any) {
      console.error('Failed to load timeline data:', err)
      setError('Failed to load timeline data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [companyId, user, timelineUsers.length])

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Load initial tenders with default date range
  useEffect(() => {
    if (companyId && user) {
      loadTenders({
        startDate: dateRange.start,
        endDate: dateRange.end
      })
    }
  }, [companyId, user])

  // Track previous date range to avoid unnecessary API calls
  const prevDateRangeRef = useRef<string>('')

  // Load tenders when date range changes (only when not focused on date input and date actually changed)
  useEffect(() => {
    const currentDateRange = `${dateRange.start}-${dateRange.end}`
    
    if (
      companyId && 
      user && 
      dateRange.start && 
      dateRange.end && 
      !isDateInputFocused &&
      prevDateRangeRef.current !== currentDateRange
    ) {
      prevDateRangeRef.current = currentDateRange
      loadTenders({
        startDate: dateRange.start,
        endDate: dateRange.end
      })
    }
  }, [dateRange.start, dateRange.end, companyId, user, loadTenders, isDateInputFocused])

  const filteredTenders = useMemo(() => {
    // Date range filtering is now done at API level
    // Only apply user and search filters on client side
    return timelineTenders.filter(tender => {
      // User filter
      const matchesUser = selectedUsers.length === 0 || selectedUsers.includes(tender.assignedTo)
      
      // Search filter
      const matchesSearch =
        searchTerm.trim() === '' ||
        tender.tenderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.tenderId.toLowerCase().includes(searchTerm.toLowerCase())

      // Date range is already filtered by API, so no need to filter again here
      return matchesUser && matchesSearch
    })
  }, [timelineTenders, selectedUsers, searchTerm])

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = []

    selectedUsers.forEach(userId => {
      const userName = timelineUsers.find(user => user.id === userId)?.name || (userId === 'unassigned' ? 'Unassigned' : userId)
      chips.push({
        label: `Assigned: ${userName}`,
        onRemove: () => setSelectedUsers(prev => prev.filter(id => id !== userId))
      })
    })

    if (searchTerm.trim()) {
      chips.push({
        label: `Search: ${searchTerm}`,
        onRemove: () => setSearchTerm('')
      })
    }

    const defaultRange = defaultDateRange()
    if (dateRange.start !== defaultRange.start || dateRange.end !== defaultRange.end) {
      chips.push({
        label: `Date: ${dateRange.start} to ${dateRange.end}`,
        onRemove: () => {
          const defaultRange = defaultDateRange()
          setDateRangeInput(defaultRange)
          setDateRange(defaultRange)
        }
      })
    }

    return chips
  }, [selectedUsers, searchTerm, dateRange, timelineUsers])

  const handleTenderClick = async (tender: TimelineTender) => {
    setSelectedTender(tender)
    setLoadingTenderDetails(true)
    setIsViewModalOpen(true)
    
    try {
      const tenderDetails = await tenderService.getTenderById(tender.id)
      setSelectedTenderDetails(tenderDetails)
    } catch (err: any) {
      console.error('Failed to load tender details:', err)
      setSelectedTenderDetails(null)
    } finally {
      setLoadingTenderDetails(false)
    }
  }

  const handleCloseModal = () => {
    setIsViewModalOpen(false)
    setSelectedTender(null)
    setSelectedTenderDetails(null)
  }

  const handleOpenTenderDetails = (tenderId: string) => {
    navigate(`/tenders?view=${tenderId}`)
    handleCloseModal()
  }

  // Helper functions for formatting
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

  const formatCurrency = (amount: number) => {
    return amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : 'N/A'
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading timeline data...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <i className="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Timeline</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadData}>Try Again</Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Task Timeline</h1>
              <p className="text-gray-600">
                Visual timeline of all tender projects and their schedules
              </p>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
              <button
                type="button"
                onClick={() => setCurrentView('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  currentView === 'calendar'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="ri-calendar-line" />
                Calendar
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('gantt')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  currentView === 'gantt'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="ri-bar-chart-horizontal-line" />
                Gantt
              </button>
            </div>
          </div>
        </header>

        <section className="bg-white border-b border-gray-200 px-6 py-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <i className="ri-user-line mr-2" />
                Assigned To
                {selectedUsers.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                    {selectedUsers.length}
                  </span>
                )}
                <i className="ri-arrow-down-s-line ml-2" />
              </button>
              {showUserDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                    {timelineUsers.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">No users found</div>
                    ) : (
                      <>
                        {timelineUsers.map(user => (
                          <label
                            key={user.id}
                            className="flex items-center p-2 hover:bg-gray-50 cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              className="mr-3 text-blue-600 focus:ring-blue-500 rounded"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() =>
                                setSelectedUsers(prev =>
                                  prev.includes(user.id)
                                    ? prev.filter(id => id !== user.id)
                                    : [...prev, user.id]
                                )
                              }
                            />
                            <div>
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.role}</div>
                            </div>
                          </label>
                        ))}
                        <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer text-sm border-t border-gray-200">
                          <input
                            type="checkbox"
                            className="mr-3 text-blue-600 focus:ring-blue-500 rounded"
                            checked={selectedUsers.includes('unassigned')}
                            onChange={() =>
                              setSelectedUsers(prev =>
                                prev.includes('unassigned')
                                  ? prev.filter(id => id !== 'unassigned')
                                  : [...prev, 'unassigned']
                              )
                            }
                          />
                          <div>
                            <div className="font-medium text-gray-900">Unassigned</div>
                            <div className="text-xs text-gray-500">Tenders without assignment</div>
                          </div>
                        </label>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 max-w-xl">
              <Input
                type="text"
                placeholder="Search by Tender ID or Name..."
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                icon="ri-search-line"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRangeInput.start}
                onChange={event => setDateRangeInput(prev => ({ ...prev, start: event.target.value }))}
                onFocus={() => setIsDateInputFocused(true)}
                onBlur={() => {
                  setIsDateInputFocused(false)
                  // Only update dateRange (which triggers API) when both dates are valid
                  if (dateRangeInput.start && dateRangeInput.end) {
                    setDateRange(dateRangeInput)
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRangeInput.end}
                onChange={event => setDateRangeInput(prev => ({ ...prev, end: event.target.value }))}
                onFocus={() => setIsDateInputFocused(true)}
                onBlur={() => {
                  setIsDateInputFocused(false)
                  // Only update dateRange (which triggers API) when both dates are valid
                  if (dateRangeInput.start && dateRangeInput.end) {
                    setDateRange(dateRangeInput)
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                variant="primary"
                onClick={() => {
                  if (dateRangeInput.start && dateRangeInput.end) {
                    // Reset the ref to ensure useEffect triggers even if dates are the same
                    prevDateRangeRef.current = ''
                    // Set focus to false so useEffect will trigger
                    setIsDateInputFocused(false)
                    // Update the actual dateRange which triggers the API call via useEffect
                    setDateRange({
                      start: dateRangeInput.start,
                      end: dateRangeInput.end
                    })
                  }
                }}
                className="px-4 py-2 text-sm"
                disabled={!dateRangeInput.start || !dateRangeInput.end}
              >
                Apply
              </Button>
            </div>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilterChips.map((chip, index) => (
                <span
                  key={`${chip.label}-${index}`}
                  className="inline-flex items-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="ml-2 hover:text-blue-900"
                  >
                    <i className="ri-close-line" />
                  </button>
                </span>
              ))}
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => {
                  setSelectedUsers([])
                  setSearchTerm('')
                  const defaultRange = defaultDateRange()
                  setDateRangeInput(defaultRange)
                  setDateRange(defaultRange)
                }}
              >
                Clear All
              </Button>
            </div>
          )}
        </section>

        <div className="flex-1 overflow-hidden p-4">
          {filteredTenders.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <i className="ri-calendar-line text-6xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tenders Found</h3>
                <p className="text-gray-600 mb-4">
                  {timelineTenders.length === 0
                    ? 'No tenders with valid dates found. Add tenders with expected start/end dates to see them on the timeline.'
                    : 'No tenders match the current filters. Try adjusting your search or filter criteria.'}
                </p>
                {activeFilterChips.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedUsers([])
                      setSearchTerm('')
                      const defaultRange = defaultDateRange()
                      setDateRangeInput(defaultRange)
                      setDateRange(defaultRange)
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {currentView === 'calendar' ? (
                <CalendarView tenders={filteredTenders} users={timelineUsers} onTenderClick={handleTenderClick} />
              ) : (
                <GanttView tenders={filteredTenders} users={timelineUsers} onTenderClick={handleTenderClick} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Tender Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={handleCloseModal}
        title="Tender Details"
        size="lg"
      >
        {loadingTenderDetails ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading tender details...</p>
            </div>
          </div>
        ) : selectedTenderDetails ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Tender Name</label>
                <p className="text-base text-gray-900 mt-1 font-semibold">{selectedTenderDetails.tender_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedTenderDetails.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Tender247 ID</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.tender247_id || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">GEM/Eprocure ID</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.gem_eprocure_id || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Source</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.source || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tender Type</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.tender_type || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Location</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.location || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Portal Link</label>
                {selectedTenderDetails.portal_link ? (
                  <a
                    href={selectedTenderDetails.portal_link}
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
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.last_date || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned To</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.assigned_user_name || 'Unassigned'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Expected Start Date</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.expected_start_date || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expected End Date</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.expected_end_date || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expected Days</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.expected_days !== null && selectedTenderDetails.expected_days !== undefined ? selectedTenderDetails.expected_days : 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Created By</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.created_user_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Created At</label>
                <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedTenderDetails.created_at)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Updated At</label>
                <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedTenderDetails.updated_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">MSME Exempted</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.msme_exempted ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Startup Exempted</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTenderDetails.startup_exempted ? 'Yes' : 'No'}</p>
              </div>
              {selectedTenderDetails.not_bidding_reason && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Not Bidding Reason</label>
                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{selectedTenderDetails.not_bidding_reason}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">EMD Amount</label>
                <p className="text-sm text-gray-900 mt-1">{formatCurrency(selectedTenderDetails.emd_amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tender Fees</label>
                <p className="text-sm text-gray-900 mt-1">{formatCurrency(selectedTenderDetails.tender_fees)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tender Cost</label>
                <p className="text-sm text-gray-900 mt-1">{formatCurrency(selectedTenderDetails.tender_cost)}</p>
              </div>
            </div>

            {selectedTenderDetails.pq_criteria && (
              <div>
                <label className="text-sm font-medium text-gray-700">PQ Criteria</label>
                <ul className="list-disc list-inside text-sm text-gray-900 mt-1 space-y-1">
                  {selectedTenderDetails.pq_criteria
                    .split('\n')
                    .map((item, index) => item.trim())
                    .filter(Boolean)
                    .map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                </ul>
              </div>
            )}

            {selectedTenderDetails.tender_notes && (
              <div>
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{selectedTenderDetails.tender_notes}</p>
              </div>
            )}

            
          </div>
        ) : (
          <div className="text-center py-12">
            <i className="ri-error-warning-line text-4xl text-red-500 mb-4"></i>
            <p className="text-gray-600">Failed to load tender details. Please try again.</p>
            <Button variant="outline" onClick={handleCloseModal} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </Modal>
    </MainLayout>
  )
}
