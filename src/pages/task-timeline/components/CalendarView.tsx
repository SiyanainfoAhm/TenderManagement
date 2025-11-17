import { useMemo, useState } from 'react'
import type { TimelineTender, TimelineUser } from '@/mocks/timeline'

interface CalendarViewProps {
  tenders: TimelineTender[]
  users: TimelineUser[]
  onTenderClick: (tender: TimelineTender) => void
}

const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getUserName(users: TimelineUser[], userId: string) {
  if (userId === 'unassigned') {
    return 'Unassigned'
  }
  return users.find(user => user.id === userId)?.name || 'Unknown'
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function CalendarView({ tenders, users, onTenderClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<'month' | 'year'>('month')

  const days = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const result: (Date | null)[] = []
    for (let i = 0; i < firstDay.getDay(); i += 1) {
      result.push(null)
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      result.push(new Date(year, month, day))
    }

    return result
  }, [currentDate])

  const tendersByDate = useMemo(() => {
    const map = new Map<string, TimelineTender[]>()

    tenders.forEach(tender => {
      // Filter: Only show tenders where Expected Start Date and Expected End Date fall within the current month view
      const start = new Date(tender.estimatedStartDate)
      const end = new Date(tender.estimatedEndDate)
      
      // Get current month boundaries
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)

      // Only include tender if its date range overlaps with the current month
      if (start <= monthEnd && end >= monthStart) {
        const pointer = new Date(start)
        while (pointer <= end) {
          const key = pointer.toDateString()
          if (!map.has(key)) {
            map.set(key, [])
          }
          map.get(key)!.push(tender)
          pointer.setDate(pointer.getDate() + 1)
        }
      }
    })

    return map
  }, [tenders, currentDate])

  const yearViewMonths = useMemo(() => {
    const months: Date[] = []
    const year = currentDate.getFullYear()
    for (let month = 0; month < 12; month += 1) {
      months.push(new Date(year, month, 1))
    }
    return months
  }, [currentDate])

  if (viewType === 'year') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <i className="ri-arrow-left-line text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentDate.getFullYear()}
            </h2>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <i className="ri-arrow-right-line text-gray-600" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setViewType('month')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Month View
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {yearViewMonths.map(monthDate => {
              const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
              const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)

              const monthTenderCount = tenders.filter(tender => {
                const start = new Date(tender.estimatedStartDate)
                // Count only if Expected Start Date falls within this month
                return start >= monthStart && start <= monthEnd
              }).length

              const intensity = Math.min(monthTenderCount / 5, 1)

              return (
                <button
                  key={monthDate.toISOString()}
                  type="button"
                  onClick={() => {
                    setCurrentDate(monthDate)
                    setViewType('month')
                  }}
                  className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow text-left"
                >
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    {monthDate.toLocaleDateString('en-US', { month: 'long' })}
                  </div>
                  <div
                    className="h-16 rounded-md flex items-center justify-center text-white font-medium"
                    style={{
                      backgroundColor: `rgba(37, 99, 235, ${0.2 + intensity * 0.6})`
                    }}
                  >
                    {monthTenderCount} {monthTenderCount === 1 ? 'Tender' : 'Tenders'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="ri-arrow-left-line text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {formatMonthLabel(currentDate)}
          </h2>
          <button
            type="button"
            onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="ri-arrow-right-line text-gray-600" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setViewType('year')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Year View
        </button>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDayLabels.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="h-24" />
            }

            const key = day.toDateString()
            const dayTenders = tendersByDate.get(key) || []
            const isToday = key === new Date().toDateString()

            return (
              <div
                key={key}
                className={`h-24 border border-gray-200 rounded-lg p-1 transition-colors ${
                  isToday ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {day.getDate()}
                </div>

                <div className="space-y-1">
                  {dayTenders.slice(0, 3).map(tender => (
                    <div key={`${key}-${tender.id}`} className="group relative">
                      <button
                        type="button"
                        onClick={() => onTenderClick(tender)}
                        className="h-4 w-full bg-blue-600 bg-opacity-60 hover:bg-opacity-80 rounded text-xs text-white px-1 transition-all flex items-center"
                        title={`${tender.tenderId} - ${tender.tenderName}`}
                      >
                        <span className="truncate text-[11px] leading-4">{tender.tenderId}</span>
                      </button>
                      <div className="absolute left-0 top-full mt-1 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none min-w-56">
                        <div className="font-medium">{tender.tenderId}</div>
                        <div className="text-gray-300 truncate">{tender.tenderName}</div>
                        <div className="text-gray-300">
                          Est. Start: {new Date(tender.estimatedStartDate).toLocaleDateString()}
                        </div>
                        <div className="text-gray-300">
                          Est. End: {new Date(tender.estimatedEndDate).toLocaleDateString()}
                        </div>
                        <div className="text-gray-300">Assigned To: {getUserName(users, tender.assignedTo)}</div>
                      </div>
                    </div>
                  ))}

                  {dayTenders.length > 3 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayTenders.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
