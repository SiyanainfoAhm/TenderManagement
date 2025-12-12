import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import * as XLSX from 'xlsx'

export default function Tenders() {
  const { user, selectedCompany } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
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
  const [isExcelUploadModalOpen, setIsExcelUploadModalOpen] = useState(false)
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false)
  const [selectedTender, setSelectedTender] = useState<TenderWithUser | null>(null)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ tenderId: string; newStatus: string; reason: string } | null>(null)
  
  // Excel upload states
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelDragActive, setExcelDragActive] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: [] as string[] })

  // Filter states (pending - not yet applied)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source: '',
    assignedTo: '',
    city: '',
    msmeExempted: false,
    startupExempted: false
  })

  // Applied filters (used for API calls)
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: '',
    source: '',
    assignedTo: '',
    city: '',
    msmeExempted: false,
    startupExempted: false
  })

  // Time filter states (pending)
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_week' | 'last_week' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Applied time filter states
  const [appliedTimeFilter, setAppliedTimeFilter] = useState<'all' | 'today' | 'this_week' | 'last_week' | 'custom'>('all')
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState('')
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState('')

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

  // Pending tender ID to auto-open via query param
  const [pendingViewId, setPendingViewId] = useState<string | null>(null)
  const [viewAttachments, setViewAttachments] = useState<any[]>([])
  const [viewAttachmentsLoading, setViewAttachmentsLoading] = useState(false)
  const [viewAttachmentsError, setViewAttachmentsError] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState<TenderFormData>({
    tender247_id: '',
    gem_eprocure_id: '',
    portal_link: '',
    tender_name: '',
    source: '',
    tender_type: '',
    location: '',
    last_date: '',
    expected_start_date: '',
    expected_end_date: '',
    expected_days: '',
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
    // Check for status filter in URL params first
    const params = new URLSearchParams(location.search)
    const statusParam = params.get('status')
    
    if (statusParam) {
      // Set the status filter and apply it
      setFilters(prev => ({ ...prev, status: statusParam }))
      setAppliedFilters(prev => ({ ...prev, status: statusParam }))
      // Apply the filter immediately
      const filterParams: any = { status: statusParam }
      loadData(filterParams)
    } else {
      // No status filter - load all data
      loadData()
    }
  }, [user, selectedCompany, location.search])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const viewId = params.get('view')

    if (viewId && viewId !== pendingViewId) {
      setPendingViewId(viewId)
    } else if (!viewId && pendingViewId) {
      setPendingViewId(null)
    }
  }, [location.search, pendingViewId])

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

  const loadData = async (filterParamsOverride?: any) => {
    if (!user || !selectedCompany) return

    try {
      setLoading(true)
      
      // Prepare filter parameters dynamically - only include filters that have values
      let filterParams: any = undefined
      
      // If filterParamsOverride is provided, use it directly (for immediate filter application)
      // Otherwise, use appliedFilters state (for useEffect-triggered loads)
      if (filterParamsOverride !== undefined) {
        filterParams = filterParamsOverride
      } else {
        // Check if any filters are applied
        // By default, all filters are empty/false/'all', so hasFilters will be false
        // This means filterParams remains undefined and getTenders() is called (fetches ALL data)
        const hasFilters = appliedFilters.search?.trim() || 
                          appliedFilters.status?.trim() || 
                          appliedFilters.source?.trim() || 
                          appliedFilters.assignedTo?.trim() || 
                          appliedFilters.city?.trim() || 
                          appliedFilters.msmeExempted || 
                          appliedFilters.startupExempted ||
                          (appliedTimeFilter && appliedTimeFilter !== 'all')
        
        // Only build filterParams if there are actual filters to apply
        // If no filters, filterParams stays undefined and all data is fetched
        if (hasFilters) {
          filterParams = {}
          
          if (appliedFilters.search && appliedFilters.search.trim() !== '') {
            filterParams.search = appliedFilters.search.trim()
          }
          if (appliedFilters.status && appliedFilters.status.trim() !== '') {
            filterParams.status = appliedFilters.status
          }
          if (appliedFilters.source && appliedFilters.source.trim() !== '') {
            filterParams.source = appliedFilters.source
          }
          if (appliedFilters.assignedTo && appliedFilters.assignedTo.trim() !== '') {
            filterParams.assignedTo = appliedFilters.assignedTo
          }
          if (appliedFilters.city && appliedFilters.city.trim() !== '') {
            filterParams.city = appliedFilters.city
          }
          if (appliedFilters.msmeExempted === true) {
            filterParams.msmeExempted = true
          }
          if (appliedFilters.startupExempted === true) {
            filterParams.startupExempted = true
          }
          
          if (appliedTimeFilter && appliedTimeFilter !== 'all') {
            filterParams.timeFilter = appliedTimeFilter
            if (appliedTimeFilter === 'custom') {
              if (appliedCustomStartDate && appliedCustomStartDate.trim() !== '') {
                filterParams.customStartDate = appliedCustomStartDate
              }
              if (appliedCustomEndDate && appliedCustomEndDate.trim() !== '') {
                filterParams.customEndDate = appliedCustomEndDate
              }
            }
          }
        }
      }

      console.log('loadData called - filterParams:', filterParams)

      const [tendersData, usersData] = await Promise.all([
        filterParams && Object.keys(filterParams).length > 0
          ? tenderService.getTendersWithFilters(selectedCompany.company_id, filterParams)
          : tenderService.getTenders(selectedCompany.company_id),
        userService.getCompanyUsers(selectedCompany.company_id)
      ])
      
      console.log('Loaded tenders:', tendersData.length)
      console.log('Tenders count from API (should match Dashboard):', tendersData.length)
      
      // If status filter is applied, log the count for that status
      if (filterParams?.status) {
        const statusCount = tendersData.filter(t => t.status === filterParams.status).length
        console.log(`Tenders with status "${filterParams.status}": ${statusCount} (should match Dashboard count)`)
      }
      
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
      expected_start_date: '',
      expected_end_date: '',
      expected_days: '',
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
    setViewAttachments([])
    setViewAttachmentsError(null)
    setViewAttachmentsLoading(true)

    tenderService
      .getTenderAttachments(tender.id)
      .then((attachments) => {
        setViewAttachments(attachments)
      })
      .catch((error: any) => {
        console.error('Failed to load attachments for view:', error)
        setViewAttachmentsError('Unable to load attachments for this tender.')
      })
      .finally(() => {
        setViewAttachmentsLoading(false)
      })
  }

  useEffect(() => {
    if (!pendingViewId || tenders.length === 0) return

    const tenderToView = tenders.find((t) => t.id === pendingViewId)
    if (!tenderToView) return

    handleView(tenderToView)
    setPendingViewId(null)

    const params = new URLSearchParams(location.search)
    params.delete('view')
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }, [pendingViewId, tenders, navigate, location])

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
      expected_start_date: tender.expected_start_date || '',
      expected_end_date: tender.expected_end_date || '',
      expected_days: tender.expected_days !== null && tender.expected_days !== undefined ? tender.expected_days.toString() : '',
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
    // Check if status requires a reason
    if (newStatus === 'not-bidding' || newStatus === 'not-qualified') {
      const tender = tenders.find(t => t.id === tenderId)
      setPendingStatusChange({ tenderId, newStatus, reason: tender?.not_bidding_reason || '' })
      setIsReasonModalOpen(true)
      setEditingStatusId(null) // Hide dropdown
      return
    }

    // For other statuses, update directly
    await updateTenderStatus(tenderId, newStatus, '')
  }

  const updateTenderStatus = async (tenderId: string, newStatus: string, reason: string) => {
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
          not_bidding_reason: reason
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

  const handleReasonSubmit = async () => {
    if (!pendingStatusChange) return
    
    if (!pendingStatusChange.reason.trim()) {
      setError('Reason is required for this status')
      return
    }

    await updateTenderStatus(pendingStatusChange.tenderId, pendingStatusChange.newStatus, pendingStatusChange.reason)
    setIsReasonModalOpen(false)
    setPendingStatusChange(null)
    setError('')
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
      const validMimeTypes = [
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
        'application/x-zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed'
      ]
      const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar']
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
      const fileType = file.type.toLowerCase()

      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }

      const isMimeValid = fileType ? validMimeTypes.includes(fileType) : false
      const isExtensionAllowed = allowedExtensions.includes(fileExtension)

      if (!isMimeValid && !isExtensionAllowed) {
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
      
      // Validate reason for statuses that require it
      if ((formData.status === 'not-bidding' || formData.status === 'not-qualified') && !formData.not_bidding_reason?.trim()) {
        setError(`Reason is required for status "${formData.status === 'not-bidding' ? 'Not Bidding' : 'Not Qualified'}"`)
        setSubmitting(false)
        return
      }
      
      // Check for duplicate IDs
      const duplicateCheck = await tenderService.checkDuplicateIds(
        selectedCompany.company_id,
        formData.tender247_id,
        formData.gem_eprocure_id
      )
      
      if (duplicateCheck.isDuplicate) {
        setError(duplicateCheck.message)
        setSubmitting(false)
        return
      }
      
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
    if (!selectedTender || !user || !selectedCompany) return

    try {
      setSubmitting(true)
      setError('')
      
      // Validate reason for statuses that require it
      if ((formData.status === 'not-bidding' || formData.status === 'not-qualified') && !formData.not_bidding_reason?.trim()) {
        setError(`Reason is required for status "${formData.status === 'not-bidding' ? 'Not Bidding' : 'Not Qualified'}"`)
        setSubmitting(false)
        return
      }
      
      // Check for duplicate IDs (excluding current tender)
      const duplicateCheck = await tenderService.checkDuplicateIds(
        selectedCompany.company_id,
        formData.tender247_id,
        formData.gem_eprocure_id,
        selectedTender.id
      )
      
      if (duplicateCheck.isDuplicate) {
        setError(duplicateCheck.message)
        setSubmitting(false)
        return
      }
      
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

  // Download sample Excel template
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Tender247 ID': 'T247/2024/001',
        'GEM/Eprocure ID': 'GEM/2024/B/4567890',
        'Tender Name': 'Sample Tender Name',
        'Portal Link': 'https://example.com/tender/1',
        'Source': 'tender247',
        'Tender Type': 'Construction',
        'Last Date': '2024-12-31',
        'Location': 'Mumbai',
        'Expected Start Date': '2024-01-01',
        'Expected End Date': '2024-06-30',
        'Expected Days': '180',
        'MSME Exempted': 'Yes',
        'Startup Exempted': 'No',
        'Tender Cost': '5000000',
        'Tender Fees': '10000',
        'EMD Amount': '50000',
        'Status': 'new',
        'Assigned To': '',
        'Tender Notes': 'Sample notes',
        'PQ Criteria': 'Sample PQ criteria'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(sampleData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tenders')
    XLSX.writeFile(wb, 'tender-import-template.xlsx')
  }

  // Handle Excel file selection
  const handleExcelFileSelect = (file: File) => {
    const validExtensions = ['xlsx', 'xls']
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    
    if (!validExtensions.includes(fileExtension)) {
      setError('Please upload a valid Excel file (.xlsx or .xls)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setExcelFile(file)
    setError('')
  }

  // Handle Excel drag and drop
  const handleExcelDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setExcelDragActive(true)
    } else if (e.type === 'dragleave') {
      setExcelDragActive(false)
    }
  }

  const handleExcelDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExcelDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleExcelFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleExcelFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleExcelFileSelect(e.target.files[0])
    }
  }

  // Parse Excel and import tenders
  const handleImportExcel = async () => {
    if (!excelFile || !user || !selectedCompany) return

    try {
      setImporting(true)
      setError('')
      setImportProgress({ current: 0, total: 0, errors: [] })

      // Read Excel file
      const arrayBuffer = await excelFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      if (data.length < 2) {
        setError('Excel file must contain at least a header row and one data row')
        setImporting(false)
        return
      }

      // Get header row
      const headers = data[0].map((h: any) => String(h || '').trim().toLowerCase())
      
      // Map headers to form fields
      const headerMap: { [key: string]: string } = {
        'tender247 id': 'tender247_id',
        'gem/eprocure id': 'gem_eprocure_id',
        'portal link': 'portal_link',
        'tender name': 'tender_name',
        'source': 'source',
        'tender type': 'tender_type',
        'location': 'location',
        'last date': 'last_date',
        'expected start date': 'expected_start_date',
        'expected end date': 'expected_end_date',
        'expected days': 'expected_days',
        'msme exempted': 'msme_exempted',
        'startup exempted': 'startup_exempted',
        'emd amount': 'emd_amount',
        'tender fees': 'tender_fees',
        'tender cost': 'tender_cost',
        'status': 'status',
        'assigned to': 'assigned_to',
        'tender notes': 'tender_notes',
        'pq criteria': 'pq_criteria'
      }

      // Validate required headers
      const requiredHeaders = ['tender name']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      if (missingHeaders.length > 0) {
        setError(`Missing required columns: ${missingHeaders.join(', ')}`)
        setImporting(false)
        return
      }

      // Process data rows
      const errors: string[] = []
      const tendersToImport: TenderFormData[] = []
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i]
        if (!row || row.every((cell: any) => !cell)) continue // Skip empty rows

        try {
          const tenderData: any = {
            tender_name: '',
            msme_exempted: false,
            startup_exempted: false,
            emd_amount: '0',
            tender_fees: '0',
            tender_cost: '0',
            status: 'new',
            assigned_to: '',
            tender247_id: '',
            gem_eprocure_id: '',
            portal_link: '',
            source: '',
            tender_type: '',
            location: '',
            last_date: '',
            expected_start_date: '',
            expected_end_date: '',
            expected_days: '',
            tender_notes: '',
            pq_criteria: ''
          }

          // Map row data to tender fields with length limits
          // Database column limits:
          // tender_name: VARCHAR(500), tender247_id: VARCHAR(100), gem_eprocure_id: VARCHAR(100)
          // location: VARCHAR(255), source: VARCHAR(100), portal_link: TEXT (unlimited but reasonable)
          // tender_notes: TEXT, pq_criteria: TEXT
          headers.forEach((header, index) => {
            const fieldName = headerMap[header]
            if (fieldName && row[index] !== undefined && row[index] !== null) {
              let value = String(row[index]).trim()
              
              if (fieldName === 'msme_exempted' || fieldName === 'startup_exempted') {
                tenderData[fieldName] = ['yes', 'y', 'true', '1'].includes(value.toLowerCase())
              } else if (fieldName === 'assigned_to') {
                // Try to find user by email or name
                const user = users.find(u => 
                  u.email?.toLowerCase() === value.toLowerCase() ||
                  u.full_name?.toLowerCase() === value.toLowerCase()
                )
                tenderData[fieldName] = user?.user_id || ''
              } else {
                // Apply length limits based on database column constraints
                // Truncate text if it exceeds the limit
                switch (fieldName) {
                  case 'tender_name':
                    // VARCHAR(500) - limit 500 characters
                    if (value.length > 500) {
                      value = value.substring(0, 500)
                      console.warn(`Row ${i + 1}: Tender Name truncated from ${String(row[index]).length} to 500 characters`)
                    }
                    break
                  case 'tender247_id':
                    // VARCHAR(100) - limit 100 characters
                    if (value.length > 100) {
                      value = value.substring(0, 100)
                      console.warn(`Row ${i + 1}: Tender247 ID truncated from ${String(row[index]).length} to 100 characters`)
                    }
                    break
                  case 'gem_eprocure_id':
                    // VARCHAR(100) - limit 100 characters
                    if (value.length > 100) {
                      value = value.substring(0, 100)
                      console.warn(`Row ${i + 1}: GEM/Eprocure ID truncated from ${String(row[index]).length} to 100 characters`)
                    }
                    break
                  case 'location':
                    // VARCHAR(255) - limit 255 characters
                    if (value.length > 255) {
                      value = value.substring(0, 255)
                      console.warn(`Row ${i + 1}: Location truncated from ${String(row[index]).length} to 255 characters`)
                    }
                    break
                  case 'source':
                    // VARCHAR(100) - limit 100 characters
                    if (value.length > 100) {
                      value = value.substring(0, 100)
                      console.warn(`Row ${i + 1}: Source truncated from ${String(row[index]).length} to 100 characters`)
                    }
                    break
                  case 'tender_type':
                    // Assuming VARCHAR(100) - limit 100 characters (if exists in DB)
                    if (value.length > 100) {
                      value = value.substring(0, 100)
                      console.warn(`Row ${i + 1}: Tender Type truncated from ${String(row[index]).length} to 100 characters`)
                    }
                    break
                  case 'portal_link':
                    // TEXT - no strict limit, but limit to 2000 characters for practical purposes
                    if (value.length > 2000) {
                      value = value.substring(0, 2000)
                      console.warn(`Row ${i + 1}: Portal Link truncated from ${String(row[index]).length} to 2000 characters`)
                    }
                    break
                  case 'tender_notes':
                    // TEXT - no strict limit, but limit to 10000 characters for practical purposes
                    if (value.length > 10000) {
                      value = value.substring(0, 10000)
                      console.warn(`Row ${i + 1}: Tender Notes truncated from ${String(row[index]).length} to 10000 characters`)
                    }
                    break
                  case 'pq_criteria':
                    // TEXT - no strict limit, but limit to 10000 characters for practical purposes
                    if (value.length > 10000) {
                      value = value.substring(0, 10000)
                      console.warn(`Row ${i + 1}: PQ Criteria truncated from ${String(row[index]).length} to 10000 characters`)
                    }
                    break
                  // Other fields don't have strict limits or are handled separately
                }
                tenderData[fieldName] = value
              }
            }
          })

          // Validate required fields
          if (!tenderData.tender_name) {
            errors.push(`Row ${i + 1}: Tender Name is required`)
            continue
          }

          tendersToImport.push(tenderData as TenderFormData)
        } catch (rowError: any) {
          errors.push(`Row ${i + 1}: ${rowError.message || 'Invalid data'}`)
        }
      }

      if (tendersToImport.length === 0) {
        setError('No valid tenders found in the Excel file')
        setImporting(false)
        return
      }

      // Import tenders
      setImportProgress({ current: 0, total: tendersToImport.length, errors: [] })
      const importErrors: string[] = []

      for (let i = 0; i < tendersToImport.length; i++) {
        try {
          setImportProgress({ current: i + 1, total: tendersToImport.length, errors: importErrors })
          
          // Check for duplicate IDs
          const duplicateCheck = await tenderService.checkDuplicateIds(
            selectedCompany.company_id,
            tendersToImport[i].tender247_id,
            tendersToImport[i].gem_eprocure_id
          )

          if (duplicateCheck.isDuplicate) {
            importErrors.push(`Row ${i + 2}: ${duplicateCheck.message}`)
            continue
          }

          // Create tender
          await tenderService.createTender(
            selectedCompany.company_id,
            user.id,
            tendersToImport[i]
          )
        } catch (importError: any) {
          importErrors.push(`Row ${i + 2}: ${importError.message || 'Failed to import'}`)
        }
      }

      // Show results
      const successCount = tendersToImport.length - importErrors.length
      const allErrors = [...errors, ...importErrors]

      if (allErrors.length > 0) {
        setError(`Imported ${successCount} of ${tendersToImport.length} tenders. Errors: ${allErrors.join('; ')}`)
      } else {
        setError('')
      }

      if (successCount > 0) {
        await loadData()
        setIsExcelUploadModalOpen(false)
        setExcelFile(null)
        setImportProgress({ current: 0, total: 0, errors: [] })
      }
    } catch (error: any) {
      setError(error.message || 'Failed to import Excel file')
    } finally {
      setImporting(false)
    }
  }

  const handleOpenExcelUpload = () => {
    setIsExcelUploadModalOpen(true)
    setExcelFile(null)
    setError('')
    setImportProgress({ current: 0, total: 0, errors: [] })
  }

  const handleCloseExcelUpload = () => {
    setIsExcelUploadModalOpen(false)
    setExcelFile(null)
    setError('')
    setImportProgress({ current: 0, total: 0, errors: [] })
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

  // IMPORTANT: All filtering is done on the database side via API
  // This memo ONLY handles client-side sorting for fast UI response
  // NO client-side filtering happens here - all filters (search, status, source, 
  // assignedTo, city, MSME/Startup exemptions, and date filters) are applied in the database
  // IMPORTANT: The 'tenders' array contains EXACTLY what the API returns - no filtering, only sorting
  const filteredTenders = useMemo(() => {
    // All filtering is done on the database side via API
    // Only sorting is done client-side for fast response
    // The 'tenders' array already contains only the filtered results from the API
    // NO .filter() calls - we use the tenders array directly from API
    return [...tenders].sort((a, b) => {
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
  }, [tenders, sortField, sortDirection])

  // Use tenders.length for pagination to match API result count exactly
  // filteredTenders is only for sorting, but count comes from API (tenders array)
  const totalPages = Math.ceil(tenders.length / itemsPerPage)
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
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleString()
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

  // Get unique cities from tenders
  const cityOptions = useMemo(() => {
    const cities = new Set<string>()
    tenders.forEach(tender => {
      if (tender.location) {
        cities.add(tender.location)
      }
    })
    return [
      { value: '', label: 'All Cities' },
      ...Array.from(cities).sort().map(city => ({ value: city, label: city }))
    ]
  }, [tenders])

  const handleApplyFilters = () => {
    // Prepare filter parameters from current pending filters
    const filterParams: any = {}
    
    if (filters.search && filters.search.trim() !== '') {
      filterParams.search = filters.search.trim()
    }
    if (filters.status && filters.status.trim() !== '') {
      filterParams.status = filters.status
    }
    if (filters.source && filters.source.trim() !== '') {
      filterParams.source = filters.source
    }
    if (filters.assignedTo && filters.assignedTo.trim() !== '') {
      filterParams.assignedTo = filters.assignedTo
    }
    if (filters.city && filters.city.trim() !== '') {
      filterParams.city = filters.city
    }
    if (filters.msmeExempted === true) {
      filterParams.msmeExempted = true
    }
    if (filters.startupExempted === true) {
      filterParams.startupExempted = true
    }
    
    if (timeFilter && timeFilter !== 'all') {
      filterParams.timeFilter = timeFilter
      if (timeFilter === 'custom') {
        if (customStartDate && customStartDate.trim() !== '') {
          filterParams.customStartDate = customStartDate
        }
        if (customEndDate && customEndDate.trim() !== '') {
          filterParams.customEndDate = customEndDate
        }
      }
    }
    
    // Apply pending filters to applied filters state (for future useEffect-triggered loads)
    setAppliedFilters({
      search: filters.search,
      status: filters.status,
      source: filters.source,
      assignedTo: filters.assignedTo,
      city: filters.city,
      msmeExempted: filters.msmeExempted,
      startupExempted: filters.startupExempted
    })
    setAppliedTimeFilter(timeFilter)
    setAppliedCustomStartDate(customStartDate)
    setAppliedCustomEndDate(customEndDate)
    setCurrentPage(1)
    
    // Reload data with filters immediately (pass filterParams directly to avoid state timing issues)
    loadData(Object.keys(filterParams).length > 0 ? filterParams : undefined)
  }

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      source: '',
      assignedTo: '',
      city: '',
      msmeExempted: false,
      startupExempted: false
    })
    setTimeFilter('all')
    setCustomStartDate('')
    setCustomEndDate('')
    // Clear applied filters
    setAppliedFilters({
      search: '',
      status: '',
      source: '',
      assignedTo: '',
      city: '',
      msmeExempted: false,
      startupExempted: false
    })
    setAppliedTimeFilter('all')
    setAppliedCustomStartDate('')
    setAppliedCustomEndDate('')
    setCurrentPage(1)
    loadData(undefined) // Load all data without filters
  }

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
    { value: 'ready-to-submit', label: 'Ready to Submit' },
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Expected Start Date"
          type="date"
          value={formData.expected_start_date}
          onChange={(e) => setFormData({ ...formData, expected_start_date: e.target.value })}
        />
        <Input
          label="Expected End Date"
          type="date"
          value={formData.expected_end_date}
          onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
          min={formData.expected_start_date || undefined}
        />
        <Input
          label="Expected Days"
          type="number"
          value={formData.expected_days}
          onChange={(e) => setFormData({ ...formData, expected_days: e.target.value })}
          placeholder="0"
          min={0}
        />
      </div>

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

      {(formData.status === 'not-bidding' || formData.status === 'not-qualified') && (
        <TextArea
          label={formData.status === 'not-bidding' ? 'Not Bidding Reason *' : 'Not Qualified Reason *'}
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
          <div className="flex gap-3">
            <Button 
              onClick={handleOpenExcelUpload}
              className="!bg-green-600 hover:!bg-green-700 !text-white focus:!ring-green-500"
            >
              <i className="ri-upload-cloud-line mr-2"></i>
              Upload Excel
            </Button>
            <Button onClick={handleAdd}>
              <i className="ri-add-line mr-2"></i>
              Add Tender
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              placeholder="Search by Tender247 ID, Name & GEM/Eprocure ID"
              icon="ri-search-line"
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyFilters()
                }
              }}
            />
            <Select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value })
              }}
              options={statusOptions}
            />
            <Select
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value as any)
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
              }}
              options={[
                { value: '', label: 'All Assigned' },
                ...users.map(u => ({ value: u.user_id, label: `${u.full_name} (${u.role})` }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              placeholder="Search by City"
              icon="ri-map-pin-line"
              value={filters.city}
              onChange={(e) => {
                setFilters({ ...filters, city: e.target.value })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyFilters()
                }
              }}
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.msmeExempted}
                  onChange={(e) => {
                    setFilters({ ...filters, msmeExempted: e.target.checked })
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">MSME Exemption</span>
              </label>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.startupExempted}
                  onChange={(e) => {
                    setFilters({ ...filters, startupExempted: e.target.checked })
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Startup Exemption</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleApplyFilters}
                className="flex-1"
              >
                <i className="ri-filter-line mr-2"></i>
                Apply Filter
              </Button>
              <Button
                onClick={handleClearFilters}
                variant="outline"
                className="flex-1"
              >
                <i className="ri-filter-off-line mr-2"></i>
                Clear Filter
              </Button>
            </div>
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
                    <SortableHeader field="tender_type" label="Tender Type" />
                    <SortableHeader field="location" label="Location" />
                    <SortableHeader field="last_date" label="Last Date" />
                    <SortableHeader field="days_left" label="Days Left" />
                    <SortableHeader field="tender_fees" label="Tender Fees" />
                    <SortableHeader field="emd_amount" label="EMD" />
                    <SortableHeader field="tender_cost" label="Tender Est. Cost" />
                    <SortableHeader field="status" label="Status" />
                    <SortableHeader field="assigned_to" label="Assigned To" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentTenders.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center">
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
                        <td className="px-6 py-4 text-sm text-gray-600">{tender.tender_type || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{tender.location || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{tender.last_date || 'N/A'}</td>
                        <td className="px-6 py-4">{getDaysLeft(tender.last_date || null).badge}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(tender.tender_fees)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(tender.emd_amount)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(tender.tender_cost)}</td>
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
                              <option value="ready-to-submit">Ready to Submit</option>
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
            {/* Count uses tenders.length (direct from API) to match Dashboard count exactly */}
            {tenders.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, tenders.length)} of {tenders.length} tenders
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
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false)
            setSelectedTender(null)
            setViewAttachments([])
            setViewAttachmentsError(null)
          }}
          title="Tender Details"
          size="lg"
        >
          {selectedTender && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender Name</label>
                  <p className="text-base text-gray-900 mt-1 font-semibold">{selectedTender.tender_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedTender.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender247 ID</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.tender247_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">GEM/Eprocure ID</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.gem_eprocure_id || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Source</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.source || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tender Type</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.tender_type || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Portal Link</label>
                  {selectedTender.portal_link ? (
                    <a
                      href={selectedTender.portal_link}
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
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.last_date || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Assigned To</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.assigned_user_name || 'Unassigned'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Expected Start Date</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.expected_start_date || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Expected End Date</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.expected_end_date || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Expected Days</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.expected_days !== null && selectedTender.expected_days !== undefined ? selectedTender.expected_days : 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Created By</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.created_user_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created At</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedTender.created_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Updated At</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedTender.updated_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">MSME Exempted</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.msme_exempted ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Startup Exempted</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTender.startup_exempted ? 'Yes' : 'No'}</p>
                </div>
                {selectedTender.not_bidding_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Not Bidding Reason</label>
                    <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{selectedTender.not_bidding_reason}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {selectedTender.pq_criteria && (
                <div>
                  <label className="text-sm font-medium text-gray-700">PQ Criteria</label>
                  <ul className="list-disc list-inside text-sm text-gray-900 mt-1 space-y-1">
                    {selectedTender.pq_criteria
                      .split('\n')
                      .map((item, index) => item.trim())
                      .filter(Boolean)
                      .map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                  </ul>
                </div>
              )}

              {selectedTender.tender_notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{selectedTender.tender_notes}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">Attachments</label>
                <div className="mt-2 space-y-2">
                  {viewAttachmentsLoading && (
                    <div className="flex items-center text-sm text-gray-500">
                      <i className="ri-loader-4-line animate-spin text-lg text-blue-500 mr-2"></i>
                      Loading attachments...
                    </div>
                  )}

                  {viewAttachmentsError && (
                    <p className="text-sm text-red-600">{viewAttachmentsError}</p>
                  )}

                  {!viewAttachmentsLoading && !viewAttachmentsError && viewAttachments.length === 0 && (
                    <p className="text-sm text-gray-500">No attachments uploaded.</p>
                  )}

                  {viewAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center space-x-3">
                        <i className={`${getFileIcon(attachment)} text-lg text-blue-500`}></i>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.file_size)} • {formatDateTime(attachment.created_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadExistingAttachment(attachment)}
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

        {/* Reason Modal for Status Change */}
        <Modal 
          isOpen={isReasonModalOpen} 
          onClose={() => {
            setIsReasonModalOpen(false)
            setPendingStatusChange(null)
            setError('')
          }} 
          title={pendingStatusChange?.newStatus === 'not-bidding' ? 'Not Bidding Reason' : 'Not Qualified Reason'} 
          size="md"
        >
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <i className="ri-error-warning-line text-red-600 text-xl mr-2 flex-shrink-0"></i>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <TextArea
              label={`${pendingStatusChange?.newStatus === 'not-bidding' ? 'Not Bidding' : 'Not Qualified'} Reason *`}
              value={pendingStatusChange?.reason || ''}
              onChange={(e) => {
                if (pendingStatusChange) {
                  setPendingStatusChange({ ...pendingStatusChange, reason: e.target.value })
                }
              }}
              placeholder="Please provide reason..."
              rows={4}
              required
            />
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsReasonModalOpen(false)
                  setPendingStatusChange(null)
                  setError('')
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleReasonSubmit}
                loading={loading}
                disabled={!pendingStatusChange?.reason?.trim()}
              >
                Update Status
              </Button>
            </div>
          </div>
        </Modal>

        {/* Excel Upload Modal */}
        <Modal isOpen={isExcelUploadModalOpen} onClose={handleCloseExcelUpload} title="Upload Excel File" size="md">
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <i className="ri-error-warning-line text-red-600 text-xl mr-2 flex-shrink-0"></i>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600 mb-4">
                Upload an Excel file with tender data. Download the sample template to see the required format.
              </p>
              <Button variant="outline" onClick={downloadSampleTemplate} className="w-full">
                <i className="ri-download-line mr-2"></i>
                Download Sample Template
              </Button>
            </div>

            <div
              onDragEnter={handleExcelDrag}
              onDragOver={handleExcelDrag}
              onDragLeave={handleExcelDrag}
              onDrop={handleExcelDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                excelDragActive
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
            >
              {excelFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <i className="ri-file-excel-line text-6xl text-green-600"></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{excelFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(excelFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setExcelFile(null)}
                    className="mt-2"
                  >
                    <i className="ri-close-line mr-2"></i>
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <i className="ri-file-excel-line text-6xl text-green-600"></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Drop Excel file here or{' '}
                      <label className="text-blue-600 cursor-pointer hover:text-blue-700">
                        browse to upload
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleExcelFileInput}
                          className="hidden"
                        />
                      </label>
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">Supports .xlsx, .xls files only</p>
                </div>
              )}
            </div>

            {importing && importProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Importing tenders...</span>
                  <span className="text-gray-900 font-medium">
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={handleCloseExcelUpload} disabled={importing}>
                Cancel
              </Button>
              <Button
                onClick={handleImportExcel}
                loading={importing}
                disabled={!excelFile || importing}
                className="!bg-green-600 hover:!bg-green-700 !text-white focus:!ring-green-500"
              >
                <i className="ri-upload-cloud-line mr-2"></i>
                Upload Excel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  )
}

