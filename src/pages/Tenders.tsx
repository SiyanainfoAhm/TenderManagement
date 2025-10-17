import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { tenderService } from '@/services/tenderService'
import { userService } from '@/services/userService'
import { fileService } from '@/services/fileService'
import { TenderWithUser, TenderFormData, CompanyMember } from '@/types'
import MainLayout from '@/components/layout/MainLayout'
import Button from '@/components/base/Button'
import Input from '@/components/base/Input'
import Select from '@/components/base/Select'
import TextArea from '@/components/base/TextArea'
import BulletTextArea from '@/components/base/BulletTextArea'
import Modal from '@/components/base/Modal'
import Badge from '@/components/base/Badge'

export default function Tenders() {
  const { user, selectedCompany } = useAuth()
  const [tenders, setTenders] = useState<TenderWithUser[]>([])
  const [users, setUsers] = useState<CompanyMember[]>([])
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

  // Time filter states
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_week' | 'last_week' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Sorting states
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)

  // Attachment states
  const [attachments, setAttachments] = useState<File[]>([])
  const [existingAttachments, setExistingAttachments] = useState<any[]>([])
  const [dragActive, setDragActive] = useState(false)

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
    status: 'new',
    assigned_to: '',
    not_bidding_reason: ''
  })

  useEffect(() => {
    loadData()
  }, [user, selectedCompany])

  // Handle click outside and keyboard to close status dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingStatusId && !(event.target as Element).closest('select')) {
        setEditingStatusId(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && editingStatusId) {
        setEditingStatusId(null)
      }
    }

    if (editingStatusId) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editingStatusId])

  const loadData = async () => {
    if (!user || !selectedCompany) return

    try {
      setLoading(true)
      const [tendersData, usersData] = await Promise.all([
        tenderService.getTenders(selectedCompany.company_id),
        userService.getCompanyUsers(selectedCompany.company_id)
      ])
      console.log('Loaded users for company:', selectedCompany.company_name)
      console.log('Total users:', usersData.length)
      console.log('Active users:', usersData.filter(u => u.is_active).length)
      console.log('Users:', usersData)
      
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
      tender_type: '',
      location: '',
      last_date: '',
      msme_exempted: false,
      startup_exempted: false,
      emd_amount: '',
      tender_fees: '',
      tender_cost: '',
      tender_notes: '',
      pq_criteria: '',
      status: 'new',
      assigned_to: '',
      not_bidding_reason: ''
    })
    setAttachments([])
    setExistingAttachments([])
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

  const handleEdit = async (tender: TenderWithUser) => {
    setSelectedTender(tender)
    setFormData({
      tender247_id: tender.tender247_id || '',
      gem_eprocure_id: tender.gem_eprocure_id || '',
      portal_link: tender.portal_link || '',
      tender_name: tender.tender_name,
      source: tender.source || '',
      tender_type: tender.tender_type || '',
      location: tender.location || '',
      last_date: tender.last_date || '',
      msme_exempted: tender.msme_exempted,
      startup_exempted: tender.startup_exempted,
      emd_amount: tender.emd_amount.toString(),
      tender_fees: tender.tender_fees.toString(),
      tender_cost: tender.tender_cost.toString(),
      tender_notes: tender.tender_notes || '',
      pq_criteria: tender.pq_criteria || '',
      status: tender.status,
      assigned_to: tender.assigned_to || '',
      not_bidding_reason: tender.not_bidding_reason || ''
    })
    
    // Load existing attachments
    try {
      const existingFiles = await tenderService.getTenderAttachments(tender.id)
      setExistingAttachments(existingFiles)
    } catch (error) {
      console.error('Failed to load attachments:', error)
      setExistingAttachments([])
    }
    
    setAttachments([]) // Clear new attachments
    setError('')
    setIsEditModalOpen(true)
  }

  const handleDelete = (tender: TenderWithUser) => {
    setSelectedTender(tender)
    setIsDeleteModalOpen(true)
  }

  const handleStatusChange = async (tenderId: string, newStatus: string) => {
    try {
      setLoading(true)
      // Update the tender status
      const tender = tenders.find(t => t.id === tenderId)
      if (tender) {
        const updatedTenderData: TenderFormData = {
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
          status: newStatus,
          assigned_to: tender.assigned_to || '',
          not_bidding_reason: tender.not_bidding_reason || ''
        }
        await tenderService.updateTender(tenderId, updatedTenderData)
        await loadData()
        setEditingStatusId(null) // Hide dropdown after update
      }
    } catch (error: any) {
      console.error('Failed to update tender status:', error)
      setError(error.message || 'Failed to update tender status')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusClick = (tenderId: string) => {
    setEditingStatusId(tenderId)
  }

  // Attachment handling functions
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024 // 10MB
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-rar-compressed'
      ]
      
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      
      if (!validTypes.includes(file.type)) {
        alert(`File ${file.name} has an unsupported format.`)
        return false
      }
      
      return true
    })
    
    setAttachments(prev => [...prev, ...validFiles])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file: File | any) => {
    const fileType = file.type || file.file_type
    if (fileType.startsWith('image/')) return 'ri-image-line'
    if (fileType === 'application/pdf') return 'ri-file-pdf-line'
    if (fileType.includes('word')) return 'ri-file-word-line'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'ri-file-excel-line'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'ri-file-ppt-line'
    if (fileType.includes('zip') || fileType.includes('rar')) return 'ri-file-zip-line'
    return 'ri-file-line'
  }

  const handleDeleteExistingAttachment = async (attachmentId: string, filePath: string) => {
    try {
      // Delete from database
      await tenderService.deleteTenderAttachment(attachmentId)
      
      // Delete from storage
      await fileService.deleteFile(filePath)
      
      // Update local state
      setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId))
    } catch (error: any) {
      console.error('Failed to delete attachment:', error)
      setError(`Failed to delete attachment: ${error.message}`)
    }
  }

  const handleDownloadExistingAttachment = async (attachment: any) => {
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
      setError(`Failed to download attachment: ${error.message}`)
    }
  }


  const handleSubmitAdd = async () => {
    if (!user || !selectedCompany) return

    try {
      setSubmitting(true)
      setError('')
      
      // Create the tender first
      const newTender = await tenderService.createTender(selectedCompany.company_id, user.id, formData)
      
      // Upload attachments if any
      if (attachments.length > 0) {
        try {
          const uploadedFiles = await fileService.uploadFiles(attachments, newTender.id)
          
          // Save attachment records to database
          for (const file of uploadedFiles) {
            await tenderService.addTenderAttachment(newTender.id, {
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              file_path: file.id,
              file_url: file.url,
              uploaded_by: user.id
            })
          }
        } catch (uploadError: any) {
          console.error('Failed to upload attachments:', uploadError)
          setError(`Tender created but failed to upload attachments: ${uploadError.message}`)
          return
        }
      }
      
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
    if (!selectedTender || !user) return

    try {
      setSubmitting(true)
      setError('')
      
      // Update the tender
      await tenderService.updateTender(selectedTender.id, formData)
      
      // Upload new attachments if any
      if (attachments.length > 0) {
        try {
          const uploadedFiles = await fileService.uploadFiles(attachments, selectedTender.id)
          
          // Save attachment records to database
          for (const file of uploadedFiles) {
            await tenderService.addTenderAttachment(selectedTender.id, {
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              file_path: file.id,
              file_url: file.url,
              uploaded_by: user.id
            })
          }
        } catch (uploadError: any) {
          console.error('Failed to upload attachments:', uploadError)
          setError(`Tender updated but failed to upload new attachments: ${uploadError.message}`)
          return
        }
      }
      
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

  // Helper function to get date range based on time filter
  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (timeFilter) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) }
      
      case 'this_week':
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay()) // Sunday
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 7)
        return { start: startOfWeek, end: endOfWeek }
      
      case 'last_week':
        const lastWeekStart = new Date(today)
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7)
        const lastWeekEnd = new Date(lastWeekStart)
        lastWeekEnd.setDate(lastWeekStart.getDate() + 7)
        return { start: lastWeekStart, end: lastWeekEnd }
      
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate + 'T23:59:59')
          }
        }
        return null
      
      default:
        return null
    }
  }

  // Handle column sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Render sortable header
  const SortableHeader = ({ field, label }: { field: string; label: string }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <div className="flex flex-col ml-1">
          {sortField === field ? (
            // Active sort - show single arrow in blue
            sortDirection === 'asc' ? (
              <i className="ri-arrow-up-s-fill text-blue-600 text-sm -mb-1"></i>
            ) : (
              <i className="ri-arrow-down-s-fill text-blue-600 text-sm -mt-1"></i>
            )
          ) : (
            // Inactive - show both arrows in gray
            <>
              <i className="ri-arrow-up-s-line text-gray-400 text-xs -mb-2"></i>
              <i className="ri-arrow-down-s-line text-gray-400 text-xs"></i>
            </>
          )}
        </div>
      </div>
    </th>
  )

  // Filter and sort tenders
  const filteredTenders = useMemo(() => {
    // First, filter the tenders
    const filtered = tenders.filter(tender => {
      const matchesSearch = !filters.search || 
        tender.tender_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        tender.tender247_id?.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesStatus = !filters.status || tender.status === filters.status
      const matchesSource = !filters.source || tender.source === filters.source
      const matchesAssignedTo = !filters.assignedTo || tender.assigned_to === filters.assignedTo

      // Time filter based on last_date (tender deadline)
      let matchesTimeFilter = true
      if (timeFilter !== 'all') {
        const dateRange = getDateRange()
        if (dateRange && tender.last_date) {
          const tenderDate = new Date(tender.last_date)
          matchesTimeFilter = tenderDate >= dateRange.start && tenderDate <= dateRange.end
        } else if (timeFilter === 'custom') {
          matchesTimeFilter = false // No valid custom range selected
        }
      }

      return matchesSearch && matchesStatus && matchesSource && matchesAssignedTo && matchesTimeFilter
    })

    // Then, sort the filtered results
    return filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a]
      let bValue: any = b[sortField as keyof typeof b]

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = ''
      if (bValue === null || bValue === undefined) bValue = ''

      // Special handling for days_left (calculated field) - sort by last_date instead
      if (sortField === 'days_left') {
        // Use last_date for sorting since days_left is calculated from last_date
        aValue = a.last_date
        bValue = b.last_date
        
        // Handle null/undefined values for dates
        if (!aValue) return sortDirection === 'asc' ? 1 : -1
        if (!bValue) return sortDirection === 'asc' ? -1 : 1
        
        // Convert to dates for comparison
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      // Special handling for dates
      else if (sortField === 'last_date' || sortField === 'created_at') {
        if (!aValue) return sortDirection === 'asc' ? 1 : -1
        if (!bValue) return sortDirection === 'asc' ? -1 : 1
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      // Special handling for numbers
      else if (sortField === 'emd_amount' || sortField === 'tender_fees' || sortField === 'tender_cost') {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      }

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [tenders, filters, timeFilter, customStartDate, customEndDate, sortField, sortDirection])

  const totalPages = Math.ceil(filteredTenders.length / itemsPerPage)
  const currentTenders = filteredTenders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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

  const getDaysLeft = (lastDate: string | null) => {
    if (!lastDate) return { days: null, badge: <span className="text-sm text-gray-500">N/A</span> }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadline = new Date(lastDate)
    deadline.setHours(0, 0, 0, 0)
    
    const diffTime = deadline.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { 
        days: diffDays, 
        badge: <Badge variant="red">{diffDays} days</Badge> 
      }
    } else if (diffDays === 0) {
      return { 
        days: 0, 
        badge: <Badge variant="red">0 days</Badge> 
      }
    } else if (diffDays === 1) {
      return { 
        days: 1, 
        badge: <Badge variant="orange">1 day</Badge> 
      }
    } else if (diffDays <= 3) {
      return { 
        days: diffDays, 
        badge: <Badge variant="orange">{diffDays} days</Badge> 
      }
    } else {
      // 4+ days = Blue badge (including 8, 15, 30 days, etc.)
      return { 
        days: diffDays, 
        badge: <Badge variant="blue">{diffDays} days</Badge> 
      }
    }
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
    { value: 'new', label: 'New' },
    { value: 'under-study', label: 'Under Study' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'will-bid', label: 'Will Bid' },
    { value: 'pre-bid', label: 'Pre-Bid' },
    { value: 'wait-for-corrigendum', label: 'Wait for Corrigendum' },
    { value: 'not-bidding', label: 'Not Bidding' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in-preparation', label: 'In Preparation' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under-evaluation', label: 'Under Evaluation' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'not-qualified', label: 'Not Qualified' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' }
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
          label="Tender Source *"
          value={formData.source}
          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          options={[
            { value: '', label: 'Select source' },
            ...sourceOptions.filter(o => o.value !== '')
          ]}
          required
        />
        <Select
          label="Tender Type *"
          value={formData.tender_type}
          onChange={(e) => setFormData({ ...formData, tender_type: e.target.value })}
          options={[
            { value: '', label: 'Select tender type' },
            { value: 'l1-lowest-bidder', label: 'L1 (Lowest Bidder)' },
            { value: 'qcbs-qcbc', label: 'QCBS / QCBC (Quality & Cost Based)' },
            { value: 'not-disclosed', label: 'Not Disclosed' }
          ]}
          required
        />
      </div>

      <Input
        label="Location (City) *"
        value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        placeholder="Enter city"
        required
      />

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

      <BulletTextArea
        label="Tender Notes"
        value={formData.tender_notes || ''}
        onChange={(value) => setFormData({ ...formData, tender_notes: value })}
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
          onChange={(e) => {
            console.log('Assigned to changed:', e.target.value)
            setFormData({ ...formData, assigned_to: e.target.value })
          }}
          options={(() => {
            const userOptions = [
              { value: '', label: 'Select user' },
              ...users.filter(u => u.user_id).map(u => ({ 
                value: u.user_id, 
                label: `${u.full_name} (${u.role})` 
              }))
            ]
            console.log('Assigned To dropdown options:', userOptions)
            return userOptions
          })()}
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

      {/* PQ Criteria Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">PQ Criteria</h3>
        <BulletTextArea
          value={formData.pq_criteria || ''}
          onChange={(value) => setFormData({ ...formData, pq_criteria: value })}
          placeholder="Add PQ criteria... each line becomes a bullet."
          rows={4}
        />
      </div>

      {/* Attachments Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Attachments</h3>
        
        {/* File Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.rar"
          />
          
          <div className="space-y-4">
            <i className="ri-upload-cloud-2-line text-4xl text-gray-400"></i>
            <div>
              <p className="text-sm text-gray-600">
                Drag and drop files here, or <span className="text-blue-600 font-medium">browse</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports: PDF, DOC, XLS, PPT, Images, Archives (Max 10MB each)
              </p>
            </div>
          </div>
        </div>

        {/* Existing Attachments */}
        {existingAttachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">
              Existing Files ({existingAttachments.length})
            </h4>
            <div className="space-y-2">
              {existingAttachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <i className={`${getFileIcon(attachment)} text-lg text-blue-500`}></i>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDownloadExistingAttachment(attachment)}
                      className="text-blue-400 hover:text-blue-600"
                      title="Download"
                    >
                      <i className="ri-download-line text-lg"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteExistingAttachment(attachment.id, attachment.file_path)}
                      className="text-red-400 hover:text-red-600"
                      title="Delete"
                    >
                      <i className="ri-delete-bin-line text-lg"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Uploaded Files */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">
              New Files ({attachments.length})
            </h4>
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <i className={`${getFileIcon(file)} text-lg text-gray-500`}></i>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {new Date(file.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // Create download link
                        const url = URL.createObjectURL(file)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = file.name
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      title="Download"
                    >
                      <i className="ri-download-line text-lg"></i>
                    </button>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-400 hover:text-red-600"
                      title="Remove"
                    >
                      <i className="ri-delete-bin-line text-lg"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value as any)
                setCurrentPage(1)
              }}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'this_week', label: 'This Week' },
                { value: 'last_week', label: 'Last Week' },
                { value: 'custom', label: 'Custom Range' }
              ]}
            />
            <Select
              value={filters.assignedTo}
              onChange={(e) => {
                setFilters({ ...filters, assignedTo: e.target.value })
                setCurrentPage(1)
              }}
              options={[
                { value: '', label: 'All Users' },
                ...users.map(u => ({ value: u.user_id, label: `${u.full_name} (${u.role})` }))
              ]}
            />
          </div>

          {/* Custom Date Range Inputs */}
          {timeFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
              />
            </div>
          )}
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
                    <SortableHeader field="tender_name" label="Tender Name" />
                    <SortableHeader field="tender247_id" label="Tender247 ID" />
                    <SortableHeader field="source" label="Source" />
                    <SortableHeader field="location" label="Location" />
                    <SortableHeader field="last_date" label="Last Date" />
                    <SortableHeader field="days_left" label="Days Left" />
                    <SortableHeader field="emd_amount" label="EMD Amount" />
                    <SortableHeader field="status" label="Status" />
                    <SortableHeader field="assigned_to" label="Assigned To" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentTenders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
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
                        <td className="px-6 py-4">{getDaysLeft(tender.last_date || null).badge}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(tender.emd_amount)}</td>
                        <td className="px-6 py-4">
                          {editingStatusId === tender.id ? (
                            <select
                              value={tender.status}
                              onChange={(e) => handleStatusChange(tender.id, e.target.value)}
                              autoFocus
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="new">New</option>
                              <option value="under-study">Under Study</option>
                              <option value="on-hold">On Hold</option>
                              <option value="will-bid">Will Bid</option>
                              <option value="pre-bid">Pre-Bid</option>
                              <option value="wait-for-corrigendum">Wait for Corrigendum</option>
                              <option value="not-bidding">Not Bidding</option>
                              <option value="assigned">Assigned</option>
                              <option value="in-preparation">In Preparation</option>
                              <option value="submitted">Submitted</option>
                              <option value="under-evaluation">Under Evaluation</option>
                              <option value="qualified">Qualified</option>
                              <option value="not-qualified">Not Qualified</option>
                              <option value="won">Won</option>
                              <option value="lost">Lost</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => handleStatusClick(tender.id)}
                              className="hover:opacity-80 transition-opacity"
                            >
                              {getStatusBadge(tender.status)}
                            </button>
                          )}
                        </td>
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

