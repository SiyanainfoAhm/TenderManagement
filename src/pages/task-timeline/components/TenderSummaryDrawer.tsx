import type { TimelineTender, TimelineUser } from '@/mocks/timeline'

interface TenderSummaryDrawerProps {
  tender: TimelineTender | null
  users: TimelineUser[]
  isOpen: boolean
  onClose: () => void
  onOpenTenderDetails?: (tenderId: string) => void
}

function getUserName(users: TimelineUser[], userId: string) {
  if (userId === 'unassigned') {
    return 'Unassigned'
  }
  return users.find(user => user.id === userId)?.name || 'Unknown'
}

function formatFullDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function calculateDuration(tender: TimelineTender) {
  if (!tender.estimatedStartDate || !tender.estimatedEndDate) {
    return 'N/A'
  }

  const start = new Date(tender.estimatedStartDate)
  const end = new Date(tender.estimatedEndDate)
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  return diff === 1 ? '1 day' : `${diff} days`
}

export function TenderSummaryDrawer({ tender, users, isOpen, onClose, onOpenTenderDetails }: TenderSummaryDrawerProps) {
  if (!tender) {
    return null
  }

  // Map status to display name
  const getStatusDisplayName = (status: string): string => {
    const statusMap: Record<string, string> = {
      'new': 'New',
      'under-study': 'Under Study',
      'on-hold': 'On Hold',
      'will-bid': 'Will Bid',
      'pre-bid': 'Pre-Bid',
      'wait-for-corrigendum': 'Wait for Corrigendum',
      'not-bidding': 'Not Bidding',
      'assigned': 'Assigned',
      'in-preparation': 'In Preparation',
      'ready-to-submit': 'Ready to Submit',
      'submitted': 'Submitted',
      'under-evaluation': 'Under Evaluation',
      'qualified': 'Qualified',
      'not-qualified': 'Not Qualified',
      'won': 'Won',
      'lost': 'Lost'
    }
    return statusMap[status] || status
  }

  const statusStyles: Record<string, string> = {
    'new': 'bg-gray-100 text-gray-800',
    'under-study': 'bg-blue-100 text-blue-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
    'will-bid': 'bg-green-100 text-green-800',
    'pre-bid': 'bg-purple-100 text-purple-800',
    'wait-for-corrigendum': 'bg-orange-100 text-orange-800',
    'not-bidding': 'bg-red-100 text-red-800',
    'assigned': 'bg-indigo-100 text-indigo-800',
    'in-preparation': 'bg-cyan-100 text-cyan-800',
    'ready-to-submit': 'bg-yellow-100 text-yellow-800',
    'submitted': 'bg-blue-100 text-blue-800',
    'under-evaluation': 'bg-purple-100 text-purple-800',
    'qualified': 'bg-green-100 text-green-800',
    'not-qualified': 'bg-red-100 text-red-800',
    'won': 'bg-green-100 text-green-800',
    'lost': 'bg-red-100 text-red-800'
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-file-list-3-line text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tender Summary</h2>
              <p className="text-sm text-gray-500">Read-only view</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <i className="ri-close-line text-gray-600" />
          </button>
        </header>

        <div className="p-4 space-y-6 overflow-y-auto h-full pb-24">
          <section className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tender Name</label>
              <p className="text-gray-900 font-medium">{tender.tenderName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tender ID</label>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600 font-medium">{tender.tenderId}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(tender.tenderId)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <i className="ri-file-copy-line text-gray-400 text-sm" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GEM ID</label>
                <p className="text-gray-900">{tender.gemId}</p>
              </div>
            </div>
          </section>

          <section className="border-t border-gray-200 pt-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <i className="ri-calendar-schedule-line text-blue-600 mr-2" />
              Timeline Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Start Date</label>
                <div className="flex items-center space-x-2">
                  <i className="ri-calendar-line text-green-600" />
                  <p className="text-gray-900">{formatFullDate(tender.estimatedStartDate)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated End Date</label>
                <div className="flex items-center space-x-2">
                  <i className="ri-calendar-check-line text-red-600" />
                  <p className="text-gray-900">{formatFullDate(tender.estimatedEndDate)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <div className="flex items-center space-x-2">
                  <i className="ri-time-line text-blue-600" />
                  <p className="text-gray-900 font-medium">{calculateDuration(tender)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-gray-200 pt-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <i className="ri-user-line text-blue-600 mr-2" />
              Assignment Information
            </h3>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="ri-user-line text-blue-600 text-sm" />
              </div>
              <div>
                <p className="text-gray-900 font-medium">{getUserName(users, tender.assignedTo)}</p>
                <p className="text-sm text-gray-500">Project Manager</p>
              </div>
            </div>
          </section>

          <section className="border-t border-gray-200 pt-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <i className="ri-information-line text-blue-600 mr-2" />
              Status Information
            </h3>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                statusStyles[tender.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {getStatusDisplayName(tender.status)}
            </span>
          </section>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => {
              if (onOpenTenderDetails) {
                onOpenTenderDetails(tender.id)
              } else {
                window.location.href = `/tenders?view=${tender.id}`
              }
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <i className="ri-external-link-line mr-2" />
            Open Tender Details
          </button>
        </div>
      </aside>
    </>
  )
}
