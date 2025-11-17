import { useMemo, useState } from 'react'
import type { TimelineTender, TimelineUser } from '@/mocks/timeline'

interface GanttViewProps {
  tenders: TimelineTender[]
  users: TimelineUser[]
  onTenderClick: (tender: TimelineTender) => void
}

function getUserName(users: TimelineUser[], userId: string) {
  if (userId === 'unassigned') {
    return 'Unassigned'
  }
  return users.find(user => user.id === userId)?.name || 'Unknown'
}

export function GanttView({ tenders, users, onTenderClick }: GanttViewProps) {
  const [zoomLevel, setZoomLevel] = useState<'week' | 'month'>('month')

  const timeline = useMemo(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 6, 0)

    const periods: { date: Date; label: string; isToday: boolean }[] = []
    const pointer = new Date(start)

    if (zoomLevel === 'month') {
      while (pointer <= end) {
        periods.push({
          date: new Date(pointer),
          label: pointer.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          isToday: pointer.getMonth() === today.getMonth() && pointer.getFullYear() === today.getFullYear()
        })
        pointer.setMonth(pointer.getMonth() + 1)
      }
    } else {
      const weekStart = new Date(start)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      pointer.setTime(weekStart.getTime())

      while (pointer <= end) {
        const weekEnd = new Date(pointer)
        weekEnd.setDate(weekEnd.getDate() + 6)

        periods.push({
          date: new Date(pointer),
          label: `${pointer.getDate()}/${pointer.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
          isToday: pointer <= today && today <= weekEnd
        })
        pointer.setDate(pointer.getDate() + 7)
      }
    }

    return periods
  }, [zoomLevel])

  const calculatePosition = (tender: TimelineTender) => {
    if (timeline.length === 0) {
      return { left: '0%', width: '100%' }
    }

    const timelineStart = timeline[0].date
    const timelineEnd = timeline[timeline.length - 1].date

    const totalDuration = timelineEnd.getTime() - timelineStart.getTime()
    const startOffset = new Date(tender.estimatedStartDate).getTime() - timelineStart.getTime()
    const duration = new Date(tender.estimatedEndDate).getTime() - new Date(tender.estimatedStartDate).getTime()

    const left = Math.max(0, (startOffset / totalDuration) * 100)
    const width = Math.min(100 - left, (duration / totalDuration) * 100)

    return {
      left: `${left}%`,
      width: `${Math.max(2, width)}%`
    }
  }

  const formatDuration = (tender: TimelineTender) => {
    const start = new Date(tender.estimatedStartDate)
    const end = new Date(tender.estimatedEndDate)
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return `${diffDays} days`
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Gantt Chart</h2>
          <span className="text-sm text-gray-500">{tenders.length} tender{tenders.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setZoomLevel('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              zoomLevel === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Week View
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              zoomLevel === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Month View
          </button>
        </div>
      </div>

      <div className="flex h-full">
        <div className="w-96 bg-white border-r border-gray-200 flex-shrink-0">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 uppercase tracking-wide">
              <div className="col-span-3">Tender ID</div>
              <div className="col-span-6">Tender Name</div>
              <div className="col-span-3">Assigned To</div>
            </div>
          </div>
          <div className="overflow-y-auto" style={{ height: 'calc(100vh - 200px)' }}>
            {tenders.map(tender => (
              <button
                type="button"
                key={tender.id}
                onClick={() => onTenderClick(tender)}
                className="w-full text-left border-b border-gray-100 px-4 py-4 hover:bg-gray-50"
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <div className="text-sm font-medium text-blue-600">{tender.tenderId}</div>
                    <div className="text-xs text-gray-500">{tender.gemId}</div>
                  </div>
                  <div className="col-span-6">
                    <div className="text-sm font-medium text-gray-900 truncate" title={tender.tenderName}>
                      {tender.tenderName}
                    </div>
                    <div className="text-xs text-gray-500">{formatDuration(tender)}</div>
                  </div>
                  <div className="col-span-3">
                    <div className="text-sm text-gray-700 truncate">{getUserName(users, tender.assignedTo)}</div>
                    <div
                      className={`text-xs px-2 py-1 rounded-full inline-block ${
                        tender.status === 'submitted' || tender.status === 'won' || tender.status === 'qualified'
                          ? 'bg-green-100 text-green-800'
                          : tender.status === 'ready-to-submit' || tender.status === 'in-preparation'
                          ? 'bg-yellow-100 text-yellow-800'
                          : tender.status === 'lost' || tender.status === 'not-qualified' || tender.status === 'not-bidding'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {tender.status === 'ready-to-submit' ? 'Ready to Submit' :
                       tender.status === 'under-study' ? 'Under Study' :
                       tender.status === 'wait-for-corrigendum' ? 'Wait for Corrigendum' :
                       tender.status === 'in-preparation' ? 'In Preparation' :
                       tender.status === 'under-evaluation' ? 'Under Evaluation' :
                       tender.status === 'not-qualified' ? 'Not Qualified' :
                       tender.status === 'not-bidding' ? 'Not Bidding' :
                       tender.status}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto bg-white">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
            <div className="flex" style={{ minWidth: '800px' }}>
              {timeline.map(period => (
                <div
                  key={period.date.toISOString()}
                  className={`flex-1 text-center text-xs font-medium py-2 border-r border-gray-200 ${
                    period.isToday ? 'bg-blue-100 text-blue-800' : 'text-gray-600'
                  }`}
                  style={{ minWidth: zoomLevel === 'week' ? '120px' : '100px' }}
                >
                  {period.label}
                  {period.isToday && <div className="text-xs text-blue-600 font-normal">Current</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="relative" style={{ height: 'calc(100vh - 200px)', minWidth: '800px' }}>
            {tenders.map((tender, index) => {
              const position = calculatePosition(tender)

              return (
                <div key={tender.id} className="relative border-b border-gray-100" style={{ height: '73px' }}>
                  <div className="absolute inset-0 flex">
                    {timeline.map(period => (
                      <div
                        key={period.date.toISOString()}
                        className="flex-1 border-r border-gray-100"
                        style={{ minWidth: zoomLevel === 'week' ? '120px' : '100px' }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onTenderClick(tender)}
                    className="absolute top-1/2 transform -translate-y-1/2 h-8 bg-blue-500 hover:bg-blue-600 rounded-md cursor-pointer transition-colors group"
                    style={{ left: position.left, width: position.width, minWidth: '60px' }}
                  >
                    <div className="px-3 py-1 text-white text-xs font-medium truncate h-full flex items-center">
                      {tender.tenderId}
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                      <div className="font-medium">{tender.tenderId}</div>
                      <div className="text-gray-300 truncate max-w-[220px]">{tender.tenderName}</div>
                      <div className="text-gray-300">
                        {new Date(tender.estimatedStartDate).toLocaleDateString()} - {new Date(tender.estimatedEndDate).toLocaleDateString()}
                      </div>
                      <div className="text-gray-300">Assigned: {getUserName(users, tender.assignedTo)}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  </button>

                  {index === 0 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: '25%' }}>
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
