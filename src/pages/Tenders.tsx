import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { tenderService } from '@/services/tenderService'
import { userService } from '@/services/userService'
import { TenderWithUser, TenderFormData, User } from '@/types'
import MainLayout from '@/components/layout/MainLayout'
import Button from '@/components/base/Button'
import Input from '@/components/base/Input'
import Select from '@/components/base/Select'
import TextArea from '@/components/base/TextArea'
import Modal from '@/components/base/Modal'
import Badge from '@/components/base/Badge'

export default function Tenders() {
  const { user } = useAuth()
  const [tenders, setTenders] = useState<TenderWithUser[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedTender, setSelectedTender] = useState<TenderWithUser | null>(null)

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source: '',
    assignedTo: ''
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Form data
  const [formData, setFormData] = useState<TenderFormData>({
    tender247_id: '',
    gem_eprocure_id: '',
    portal_link: '',
    tender_name: '',
    source: '',
    location: '',
    last_date: '',
    msme_exempted: false,
    startup_exempted: false,
    emd_amount: '',
    tender_fees: '',
    tender_cost: '',
    tender_notes: '',
    status: 'study',
    assigned_to: '',
    not_bidding_reason: ''
  })

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [tendersData, usersData] = await Promise.all([
        tenderService.getTenders(user.company_id),
        userService.getCompanyUsers(user.company_id)
      ])
      setTenders(tendersData)
      setUsers(usersData.filter(u => u.is_active))
    } catch (error: any) {
      console.error('Failed to load data:', error)
      setError('Failed to load tenders')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      tender247_id: '',
      gem_eprocure_id: '',
      portal_link: '',
      tender_name: '',
      source: '',
      location: '',
      last_date: '',
      msme_exempted: false,
      startup_exempted: false,
      emd_amount: '',
      tender_fees: '',
      tender_cost: '',
      tender_notes: '',
      status: 'study',
      assigned_to: '',
      not_bidding_reason: ''
    })
  }

  const handleAdd = () => {
    resetForm()
    setError('')
    setIsAddModalOpen(true)
  }

  const handleView = (tender: TenderWithUser) => {
    setSelectedTender(tender)
    setIsViewModalOpen(true)
  }

  const handleEdit = (tender: TenderWithUser) => {
    setSelectedTender(tender)
    setFormData({
      tender247_id: tender.tender247_id || '',
      gem_eprocure_id: tender.gem_eprocure_id || '',
      portal_link: tender.portal_link || '',
      tender_name: tender.tender_name,
      source: tender.source || '',
      location: tender.location || '',
      last_date: tender.last_date || '',
      msme_exempted: tender.msme_exempted,
      startup_exempted: tender.startup_exempted,
      emd_amount: tender.emd_amount.toString(),
      tender_fees: tender.tender_fees.toString(),
      tender_cost: tender.tender_cost.toString(),
      tender_notes: tender.tender_notes || '',
      status: tender.status,
      assigned_to: tender.assigned_to || '',
      not_bidding_reason: tender.not_bidding_reason || ''
    })
    setError('')
    setIsEditModalOpen(true)
  }

  const handleDelete = (tender: TenderWithUser) => {
    setSelectedTender(tender)
    setIsDeleteModalOpen(true)
  }

  const handleSubmitAdd = async () => {
    if (!user) return

    try {
      setSubmitting(true)
      setError('')
      await tenderService.createTender(user.company_id, user.id, formData)
      await loadData()
      setIsAddModalOpen(false)
      resetForm()
    } catch (error: any) {
      setError(error.message || 'Failed to create tender')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!selectedTender) return

    try {
      setSubmitting(true)
      setError('')
      await tenderService.updateTender(selectedTender.id, formData)
      await loadData()
      setIsEditModalOpen(false)
      setSelectedTender(null)
      resetForm()
    } catch (error: any) {
      setError(error.message || 'Failed to update tender')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedTender) return

    try {
      setSubmitting(true)
      await tenderService.deleteTender(selectedTender.id)
      await loadData()
      setIsDeleteModalOpen(false)
      setSelectedTender(null)
    } catch (error: any) {
      setError(error.message || 'Failed to delete tender')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter and paginate tenders
  const filteredTenders = useMemo(() => {
    return tenders.filter(tender => {
      const matchesSearch = !filters.search || 
        tender.tender_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        tender.tender247_id?.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesStatus = !filters.status || tender.status === filters.status
      const matchesSource = !filters.source || tender.source === filters.source
      const matchesAssignedTo = !filters.assignedTo || tender.assigned_to === filters.assignedTo

      return matchesSearch && matchesStatus && matchesSource && matchesAssignedTo
    })
  }, [tenders, filters])

  const totalPages = Math.ceil(filteredTenders.length / itemsPerPage)
  const currentTenders = filteredTenders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'study': { variant: 'gray' as const, label: 'Study' },
      'pre-bid': { variant: 'blue' as const, label: 'Pre-Bid' },
      'corrigendum': { variant: 'orange' as const, label: 'Corrigendum' },
      'not-bidding': { variant: 'red' as const, label: 'Not Bidding' },
      'assigned': { variant: 'purple' as const, label: 'Assigned' },
      'submitted': { variant: 'green' as const, label: 'Submitted' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'gray' as const, label: status }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : 'N/A'
  }

  const sourceOptions = [
    { value: '', label: 'All Sources' },
    { value: 'tender247', label: 'Tender247' },
    { value: 'gem', label: 'GEM' },
    { value: 'nprocure', label: 'Nprocure' },
    { value: 'eprocure', label: 'Eprocure' },
    { value: 'other', label: 'Other' }
  ]

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'study', label: 'Study' },
    { value: 'pre-bid', label: 'Pre-Bid' },
    { value: 'corrigendum', label: 'Corrigendum' },
    { value: 'not-bidding', label: 'Not Bidding' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'submitted', label: 'Submitted' }
  ]

  const renderFormFields = () => (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <i className="ri-error-warning-line text-red-600 text-xl mr-2 flex-shrink-0"></i>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Input
        label="Tender247 ID"
        value={formData.tender247_id}
        onChange={(e) => setFormData({ ...formData, tender247_id: e.target.value })}
        placeholder="T247/2024/001"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="GEM/Eprocure ID"
          value={formData.gem_eprocure_id}
          onChange={(e) => setFormData({ ...formData, gem_eprocure_id: e.target.value })}
          placeholder="GEM/2024/B/4567890"
        />
        <Input
          label="Portal Link"
          type="url"
          value={formData.portal_link}
          onChange={(e) => setFormData({ ...formData, portal_link: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <Input
        label="Tender Name *"
        value={formData.tender_name}
        onChange={(e) => setFormData({ ...formData, tender_name: e.target.value })}
        placeholder="Enter tender name"
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Source"
          value={formData.source}
          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          options={sourceOptions.filter(o => o.value !== '')}
        />
        <Input
          label="Location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="City"
        />
      </div>

      <Input
        label="Last Date"
        type="date"
        value={formData.last_date}
        onChange={(e) => setFormData({ ...formData, last_date: e.target.value })}
      />

      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.msme_exempted}
            onChange={(e) => setFormData({ ...formData, msme_exempted: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">MSME Exempted</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.startup_exempted}
            onChange={(e) => setFormData({ ...formData, startup_exempted: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Startup Exempted</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="EMD Amount (₹)"
          type="number"
          value={formData.emd_amount}
          onChange={(e) => setFormData({ ...formData, emd_amount: e.target.value })}
          placeholder="0"
        />
        <Input
          label="Tender Fees (₹)"
          type="number"
          value={formData.tender_fees}
          onChange={(e) => setFormData({ ...formData, tender_fees: e.target.value })}
          placeholder="0"
        />
        <Input
          label="Tender Cost (₹)"
          type="number"
          value={formData.tender_cost}
          onChange={(e) => setFormData({ ...formData, tender_cost: e.target.value })}
          placeholder="0"
        />
      </div>

      <TextArea
        label="Tender Notes"
        value={formData.tender_notes}
        onChange={(e) => setFormData({ ...formData, tender_notes: e.target.value })}
        placeholder="Additional notes..."
        rows={3}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Status *"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          options={statusOptions.filter(o => o.value !== '')}
          required
        />
        <Select
          label="Assigned To"
          value={formData.assigned_to}
          onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
          options={[
            { value: '', label: 'Select user' },
            ...users.map(u => ({ value: u.id, label: u.full_name }))
          ]}
        />
      </div>

      {formData.status === 'not-bidding' && (
        <TextArea
          label="Not Bidding Reason *"
          value={formData.not_bidding_reason}
          onChange={(e) => setFormData({ ...formData, not_bidding_reason: e.target.value })}
          placeholder="Please provide reason..."
          rows={3}
          required
        />
      )}
    </div>
  )

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tenders</h1>
            <p className="text-gray-600 mt-1">Manage and track all tender opportunities</p>
          </div>
          <Button onClick={handleAdd}>
            <i className="ri-add-line mr-2"></i>
            Add Tender
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by name or ID"
              icon="ri-search-line"
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value })
                setCurrentPage(1)
              }}
            />
            <Select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value })
                setCurrentPage(1)
              }}
              options={statusOptions}
            />
            <Select
              value={filters.source}
              onChange={(e) => {
                setFilters({ ...filters, source: e.target.value })
                setCurrentPage(1)
              }}
              options={sourceOptions}
            />
            <Select
              value={filters.assignedTo}
              onChange={(e) => {
                setFilters({ ...filters, assignedTo: e.target.value })
                setCurrentPage(1)
              }}
              options={[
                { value: '', label: 'All Users' },
                ...users.map(u => ({ value: u.id, label: u.full_name }))
              ]}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-4xl text-blue-600"></i>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tender Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">EMD Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentTenders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <i className="ri-inbox-line text-4xl text-gray-400 mb-2"></i>
                        <p className="text-gray-500">No tenders found</p>
                      </td>
                    </tr>
                  ) : (
                    currentTenders.map((tender) => (
                      <tr key={tender.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleView(tender)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 text-left"
                          >
                            {tender.tender_name.length > 50 
                              ? tender.tender_name.substring(0, 50) + '...' 
                              : tender.tender_name}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{tender.tender247_id || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{tender.source || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{tender.location || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{tender.last_date || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(tender.emd_amount)}</td>
                        <td className="px-6 py-4">{getStatusBadge(tender.status)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{tender.assigned_user_name || 'Unassigned'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(tender)}
                              className="text-blue-600 hover:text-blue-700"
                              title="View"
                            >
                              <i className="ri-eye-line text-lg"></i>
                            </button>
                            <button
                              onClick={() => handleEdit(tender)}
                              className="text-gray-600 hover:text-gray-700"
                              title="Edit"
                            >
                              <i className="ri-edit-line text-lg"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(tender)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line text-lg"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredTenders.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTenders.length)} of {filteredTenders.length} tenders
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="ri-arrow-left-line mr-1"></i>
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {(() => {
                      const maxVisiblePages = 3
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                      
                      // Adjust if we're near the end
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1)
                      }
                      
                      const pages = []
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(i)
                      }
                      
                      return pages.map(page => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px]"
                        >
                          {page}
                        </Button>
                      ))
                    })()}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <i className="ri-arrow-right-line ml-1"></i>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Modal */}
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Tender" size="lg">
          {renderFormFields()}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAdd} loading={submitting}>Save Tender</Button>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Tender" size="lg">
          {renderFormFields()}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitEdit} loading={submitting}>Update Tender</Button>
          </div>
        </Modal>

        {/* View Modal */}
        <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Tender Details" size="lg">
          {selectedTender && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender247 ID</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.tender247_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">GEM/Eprocure ID</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.gem_eprocure_id || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tender Name</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTender.tender_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Source</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.source || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.location || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Date</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.last_date || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedTender.status)}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">EMD Amount</label>
                  <p className="text-sm text-gray-900 mt-1">{formatCurrency(selectedTender.emd_amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender Fees</label>
                  <p className="text-sm text-gray-900 mt-1">{formatCurrency(selectedTender.tender_fees)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender Cost</label>
                  <p className="text-sm text-gray-900 mt-1">{formatCurrency(selectedTender.tender_cost)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned To</label>
                <p className="text-sm text-gray-900 mt-1">{selectedTender.assigned_user_name || 'Unassigned'}</p>
              </div>
              {selectedTender.tender_notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.tender_notes}</p>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Delete" size="sm">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-delete-bin-line text-red-600 text-xl"></i>
            </div>
            <p className="text-gray-900 mb-2">Are you sure you want to delete this tender?</p>
            <p className="text-sm text-gray-600 mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleConfirmDelete} loading={submitting}>Delete</Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  )
}

