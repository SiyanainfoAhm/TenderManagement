import { useMemo, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import Button from '@/components/base/Button'
import Input from '@/components/base/Input'
import { CalendarView } from './components/CalendarView'
import { GanttView } from './components/GanttView'
import { TenderSummaryDrawer } from './components/TenderSummaryDrawer'
import { timelineTenders, timelineUsers, type TimelineTender } from '@/mocks/timeline'

const defaultDateRange = () => {
  const today = new Date()
  return {
    start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
    end: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  }
}

export default function TaskTimelinePage() {
  const [currentView, setCurrentView] = useState<'calendar' | 'gantt'>('calendar')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState(defaultDateRange)
  const [selectedTender, setSelectedTender] = useState<TimelineTender | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const filteredTenders = useMemo(() => {
    return timelineTenders.filter(tender => {
      const matchesUser = selectedUsers.length === 0 || selectedUsers.includes(tender.assignedTo)
      const matchesSearch =
        searchTerm.trim() === '' ||
        tender.tenderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.tenderId.toLowerCase().includes(searchTerm.toLowerCase())

      const startBoundary = new Date(dateRange.start)
      const endBoundary = new Date(dateRange.end)
      const tenderStart = new Date(tender.estimatedStartDate)
      const tenderEnd = new Date(tender.estimatedEndDate)

      const matchesDate = tenderStart <= endBoundary && tenderEnd >= startBoundary

      return matchesUser && matchesSearch && matchesDate
    })
  }, [selectedUsers, searchTerm, dateRange])

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = []

    selectedUsers.forEach(userId => {
      const userName = timelineUsers.find(user => user.id === userId)?.name || userId
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
        onRemove: () => setDateRange(defaultRange)
      })
    }

    return chips
  }, [selectedUsers, searchTerm, dateRange])

  const handleTenderClick = (tender: TimelineTender) => {
    setSelectedTender(tender)
    setIsDrawerOpen(true)
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
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
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
              </div>
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
                value={dateRange.start}
                onChange={event => setDateRange(prev => ({ ...prev, start: event.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={event => setDateRange(prev => ({ ...prev, end: event.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                  setDateRange(defaultDateRange())
                }}
              >
                Clear All
              </Button>
            </div>
          )}
        </section>

        <div className="flex-1 overflow-hidden p-4">
          {currentView === 'calendar' ? (
            <CalendarView tenders={filteredTenders} users={timelineUsers} onTenderClick={handleTenderClick} />
          ) : (
            <GanttView tenders={filteredTenders} users={timelineUsers} onTenderClick={handleTenderClick} />
          )}
        </div>
      </div>

      <TenderSummaryDrawer
        tender={selectedTender}
        users={timelineUsers}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </MainLayout>
  )
}
