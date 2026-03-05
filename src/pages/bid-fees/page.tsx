import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import Button from '@/components/base/Button'
import Input from '@/components/base/Input'
import Modal from '@/components/base/Modal'
import Badge from '@/components/base/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { bidFeeService } from '@/services/bidFeeService'
import { tenderService } from '@/services/tenderService'
import {
  BidFee,
  BidFeeAttachment,
  BidFeeFilters,
  BidFeeFormEntry,
  BidFeePaymentMode,
  BidFeeStatus,
  BidFeeType,
  TenderWithUser
} from '@/types'

const feeTypeOptions: Array<{ value: BidFeeType; label: string; color: 'blue' | 'orange' | 'purple' | 'green' | 'gray' }> = [
  { value: 'tender-fees', label: 'Tender Fees', color: 'blue' },
  { value: 'emd', label: 'EMD / Bid Security', color: 'orange' },
  { value: 'processing-fees', label: 'Processing Fees', color: 'purple' },
  { value: 'performance-guarantee', label: 'Performance Guarantee', color: 'green' },
  { value: 'other', label: 'Other', color: 'gray' }
]

const paymentModeOptions: BidFeePaymentMode[] = [
  'NEFT/RTGS',
  'Net-Banking/UPI',
  'DD / Banker\'s Cheque',
  'FDR',
  'Bank Guarantee / e-BG',
  'Cash',
  'Other'
]

const statusOptions: Array<{ value: BidFeeStatus; label: string; variant: 'gray' | 'blue' | 'green' | 'cyan' | 'orange' | 'red' }> = [
  { value: 'pending', label: 'Pending', variant: 'gray' },
  { value: 'submitted', label: 'Submitted', variant: 'blue' },
  { value: 'paid', label: 'Paid', variant: 'green' },
  { value: 'refunded', label: 'Refunded', variant: 'cyan' },
  { value: 'released', label: 'Released', variant: 'orange' },
  { value: 'expired', label: 'Expired', variant: 'red' }
]

interface DraftAttachment {
  id: string
  file: File
  name: string
  size: number
  type: string
  addedOn: string
}

interface FeeEntryDraft {
  amount: string
  refundable: boolean
  paymentMode: BidFeePaymentMode | ''
  status: BidFeeStatus
  dueDate: string
  notes: string
  utrNo: string
  bankName: string
  ifsc: string
  txnDate: string
  gatewayRef: string
  ddNo: string
  issuingBank: string
  payableAt: string
  issueDate: string
  expiryDate: string
  maturityDate: string
  bgNo: string
  bgAmount: string
  claimPeriod: string
  urnRef: string
  fdrNo: string
  bank: string
  lienMarked: boolean
  receiptNo: string
  attachments: DraftAttachment[]
}

type FeeEntryMap = Record<BidFeeType, FeeEntryDraft>
type SortKey = 'created_at' | 'tender_reference' | 'amount' | 'status' | 'due_date'

const createFeeEntryDraft = (): FeeEntryDraft => ({
  amount: '',
  refundable: true,
  paymentMode: '',
  status: 'pending',
  dueDate: '',
  notes: '',
  utrNo: '',
  bankName: '',
  ifsc: '',
  txnDate: '',
  gatewayRef: '',
  ddNo: '',
  issuingBank: '',
  payableAt: '',
  issueDate: '',
  expiryDate: '',
  maturityDate: '',
  bgNo: '',
  bgAmount: '',
  claimPeriod: '',
  urnRef: '',
  fdrNo: '',
  bank: '',
  lienMarked: false,
  receiptNo: '',
  attachments: []
})

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function getFileIcon(type: string) {
  if (type.includes('pdf')) return 'ri-file-pdf-line'
  if (type.includes('word') || type.includes('document')) return 'ri-file-word-line'
  if (type.includes('excel') || type.includes('spreadsheet')) return 'ri-file-excel-line'
  if (type.includes('image')) return 'ri-image-line'
  return 'ri-file-line'
}

function draftAttachmentFromFile(file: File): DraftAttachment {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    addedOn: new Date().toISOString().split('T')[0]
  }
}

function transformDraftToFormEntry(feeType: BidFeeType, draft: FeeEntryDraft): BidFeeFormEntry {
  return {
    fee_type: feeType,
    payment_mode: draft.paymentMode as BidFeePaymentMode,
    amount: draft.amount ? Number(draft.amount) : 0,
    refundable: draft.refundable,
    status: draft.status,
    due_date: draft.dueDate || null,
    notes: draft.notes || null,
    utr_no: draft.utrNo || null,
    bank_name: draft.bankName || null,
    ifsc: draft.ifsc || null,
    txn_date: draft.txnDate || null,
    gateway_ref: draft.gatewayRef || null,
    dd_no: draft.ddNo || null,
    payable_at: draft.payableAt || null,
    issue_date: draft.issueDate || null,
    expiry_date: draft.expiryDate || null,
    maturity_date: draft.maturityDate || null,
    issuing_bank: draft.issuingBank || null,
    bg_no: draft.bgNo || null,
    bg_amount: draft.bgAmount ? Number(draft.bgAmount) : null,
    claim_period: draft.claimPeriod || null,
    urn_ref: draft.urnRef || null,
    fdr_no: draft.fdrNo || null,
    bank: draft.bank || null,
    lien_marked: draft.lienMarked,
    receipt_no: draft.receiptNo || null,
    attachments: draft.attachments.map(attachment => attachment.file)
  }
}

function mapBidFeeToDraft(fee: BidFee): FeeEntryDraft {
  return {
    amount: fee.amount ? String(fee.amount) : '',
    refundable: fee.refundable,
    paymentMode: fee.payment_mode,
    status: fee.status,
    dueDate: fee.due_date || '',
    notes: fee.notes || '',
    utrNo: fee.utr_no || '',
    bankName: fee.bank_name || '',
    ifsc: fee.ifsc || '',
    txnDate: fee.txn_date || '',
    gatewayRef: fee.gateway_ref || '',
    ddNo: fee.dd_no || '',
    issuingBank: fee.issuing_bank || '',
    payableAt: fee.payable_at || '',
    issueDate: fee.issue_date || '',
    expiryDate: fee.expiry_date || '',
    maturityDate: fee.maturity_date || '',
    bgNo: fee.bg_no || '',
    bgAmount: fee.bg_amount !== null && fee.bg_amount !== undefined ? String(fee.bg_amount) : '',
    claimPeriod: fee.claim_period || '',
    urnRef: fee.urn_ref || '',
    fdrNo: fee.fdr_no || '',
    bank: fee.bank || '',
    lienMarked: Boolean(fee.lien_marked),
    receiptNo: fee.receipt_no || '',
    attachments: []
  }
}

export default function BidFeesPage() {
  const { selectedCompany, user } = useAuth()
  const companyId = selectedCompany?.company_id

  const [allBidFees, setAllBidFees] = useState<BidFee[]>([])
  const [tenders, setTenders] = useState<TenderWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [tendersLoading, setTendersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tenderError, setTenderError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [selectedFee, setSelectedFee] = useState<BidFee | null>(null)
  const [editDraft, setEditDraft] = useState<FeeEntryDraft | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  })
  const [filters, setFilters] = useState({
    search: '',
    feeTypes: [] as BidFeeType[],
    status: '' as BidFeeStatus | '',
    paymentMode: '' as BidFeePaymentMode | '',
    startDate: '',
    endDate: ''
  })
  const [debouncedFilters, setDebouncedFilters] = useState(filters)

  const [addFeeStep, setAddFeeStep] = useState(1)
  const [selectedTender, setSelectedTender] = useState<TenderWithUser | null>(null)
  const [selectedFeeTypes, setSelectedFeeTypes] = useState<BidFeeType[]>([])
  const [feeEntries, setFeeEntries] = useState<FeeEntryMap>({} as FeeEntryMap)
  const [dragOver, setDragOver] = useState(false)
  const [tenderSearchBy, setTenderSearchBy] = useState<'id' | 'name'>('id')
  const [tenderSearchInput, setTenderSearchInput] = useState('')
  const [showTenderDropdown, setShowTenderDropdown] = useState(false)
  const [filteredTenders, setFilteredTenders] = useState<TenderWithUser[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  type SummaryFilterType = 'none' | 'remaining' | 'refundable' | 'refunded' | 'nonRefundable' | 'all'
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilterType>('none')
  const listSectionRef = useRef<HTMLElement | null>(null)

  const handleSummaryFilterClick = (filter: SummaryFilterType) => {
    setSummaryFilter(prev => (prev === filter ? 'none' : filter))
    setCurrentPage(1)
    setTimeout(() => {
      listSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const debouncedFilterReference = useMemo(() => filters, [filters])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(debouncedFilterReference)
    }, 400)

    return () => {
      clearTimeout(handler)
    }
  }, [debouncedFilterReference])

  const loadTenders = useCallback(async () => {
    if (!companyId) return
    setTendersLoading(true)
    setTenderError(null)
    try {
      const data = await tenderService.getTenders(companyId)
      // Filter to show only tenders with statuses that should allow adding fees
      // Statuses: submitted, ready-to-submit, under-evaluation, qualified, won
      const allowedStatuses = ['submitted', 'ready-to-submit', 'under-evaluation', 'qualified', 'won']
      const filteredData = data.filter(tender => allowedStatuses.includes(tender.status))
      setTenders(filteredData)
    } catch (loadError: any) {
      setTenderError(loadError.message || 'Failed to load tenders')
    } finally {
      setTendersLoading(false)
    }
  }, [companyId])

  const loadBidFees = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const payloadFilters: BidFeeFilters = {}
      if (debouncedFilters.search) payloadFilters.search = debouncedFilters.search
      if (debouncedFilters.feeTypes.length > 0) payloadFilters.fee_types = debouncedFilters.feeTypes
      if (debouncedFilters.status) payloadFilters.status = debouncedFilters.status
      if (debouncedFilters.paymentMode) payloadFilters.payment_mode = debouncedFilters.paymentMode
      if (debouncedFilters.startDate) payloadFilters.start_date = debouncedFilters.startDate
      if (debouncedFilters.endDate) payloadFilters.end_date = debouncedFilters.endDate

      const { data } = await bidFeeService.listBidFees(companyId, payloadFilters, {
        page: 1,
        pageSize: 500,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction
      })

      setAllBidFees(data)
      setCurrentPage(1)
    } catch (loadError: any) {
      setError(loadError.message || 'Failed to load bid fees')
      setAllBidFees([])
    } finally {
      setLoading(false)
    }
  }, [companyId, debouncedFilters, sortConfig])

  useEffect(() => {
    loadBidFees()
  }, [loadBidFees])

  useEffect(() => {
    loadTenders()
  }, [loadTenders])

  const summaryStats = useMemo(() => {
    const stats: Record<BidFeeType, { count: number; amount: number }> = {
      'tender-fees': { count: 0, amount: 0 },
      emd: { count: 0, amount: 0 },
      'processing-fees': { count: 0, amount: 0 },
      'performance-guarantee': { count: 0, amount: 0 },
      other: { count: 0, amount: 0 }
    }

    allBidFees.forEach(fee => {
      if (stats[fee.fee_type]) {
        stats[fee.fee_type].count += 1
        stats[fee.fee_type].amount += fee.amount
      }
    })

    return stats
  }, [allBidFees])

  // Calculate financial summary totals
  const financialSummary = useMemo(() => {
    let totalRefundable = 0
    let totalRefunded = 0
    let totalNonRefundable = 0
    let totalAmount = 0

    allBidFees.forEach(fee => {
      totalAmount += fee.amount
      
      if (fee.status === 'refunded') {
        totalRefunded += fee.amount
      }
      
      if (fee.refundable) {
        totalRefundable += fee.amount
      } else {
        totalNonRefundable += fee.amount
      }
    })

    return {
      totalRefundable,
      totalRefunded,
      remainingAmount: totalRefundable - totalRefunded,
      totalNonRefundable,
      totalAmount
    }
  }, [allBidFees])

  const feesForSummaryFilter = useMemo(() => {
    if (summaryFilter === 'none' || summaryFilter === 'all') return allBidFees
    if (summaryFilter === 'refundable') return allBidFees.filter(f => f.refundable)
    if (summaryFilter === 'refunded') return allBidFees.filter(f => f.status === 'refunded')
    if (summaryFilter === 'remaining') return allBidFees.filter(f => f.refundable && f.status !== 'refunded')
    if (summaryFilter === 'nonRefundable') return allBidFees.filter(f => !f.refundable)
    return allBidFees
  }, [allBidFees, summaryFilter])

  const sortedFees = useMemo(() => {
    const data = [...feesForSummaryFilter]
    data.sort((a, b) => {
      const directionFactor = sortConfig.direction === 'asc' ? 1 : -1
      let aValue: number | string | null = null
      let bValue: number | string | null = null

      switch (sortConfig.key) {
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'tender_reference':
          aValue = a.tender_reference || ''
          bValue = b.tender_reference || ''
          break
        case 'due_date':
          aValue = a.due_date || ''
          bValue = b.due_date || ''
          break
        case 'created_at':
        default:
          aValue = a.created_at
          bValue = b.created_at
          break
      }

      if (!aValue && !bValue) return 0
      if (!aValue) return 1 * directionFactor
      if (!bValue) return -1 * directionFactor

      if (sortConfig.key === 'amount') {
        return (Number(aValue) - Number(bValue)) * directionFactor
      }

      return String(aValue).localeCompare(String(bValue)) * directionFactor
    })

    return data
  }, [feesForSummaryFilter, sortConfig])

  const totalPages = Math.max(1, Math.ceil(sortedFees.length / itemsPerPage))
  const currentFees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedFees.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedFees, currentPage, itemsPerPage])

  const activeFilters = useMemo(() => {
    const chips: { type: string; label: string; value?: string }[] = []

    if (summaryFilter !== 'none') {
      const labels: Record<SummaryFilterType, string> = {
        none: '',
        all: 'Total Amount',
        remaining: 'Remaining Amount',
        refundable: 'Refundable',
        refunded: 'Refunded',
        nonRefundable: 'Non-Refundable'
      }
      chips.push({ type: 'summaryFilter', label: labels[summaryFilter], value: summaryFilter })
    }

    if (filters.search) {
      chips.push({ type: 'search', label: `Search: ${filters.search}`, value: filters.search })
    }

    filters.feeTypes.forEach(type => {
      const typeInfo = feeTypeOptions.find(option => option.value === type)
      chips.push({ type: 'feeType', label: `Fee Type: ${typeInfo?.label || type}`, value: type })
    })

    if (filters.status) {
      const statusInfo = statusOptions.find(option => option.value === filters.status)
      chips.push({ type: 'status', label: `Status: ${statusInfo?.label || filters.status}`, value: filters.status })
    }

    if (filters.paymentMode) {
      chips.push({ type: 'paymentMode', label: `Payment: ${filters.paymentMode}`, value: filters.paymentMode })
    }

    if (filters.startDate || filters.endDate) {
      const label = filters.startDate && filters.endDate
        ? `${filters.startDate} to ${filters.endDate}`
        : filters.startDate
        ? `From ${filters.startDate}`
        : `Until ${filters.endDate}`
      chips.push({ type: 'dateRange', label: `Date: ${label}` })
    }

    return chips
  }, [filters])

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }

      return {
        key,
        direction: key === 'created_at' ? 'desc' : 'asc'
      }
    })
  }

  const getSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) {
      return <i className="ri-expand-up-down-line text-gray-400 ml-1" />
    }

    return sortConfig.direction === 'asc' ? (
      <i className="ri-arrow-up-line text-blue-600 ml-1" />
    ) : (
      <i className="ri-arrow-down-line text-blue-600 ml-1" />
    )
  }

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case 'summaryFilter':
        setSummaryFilter('none')
        setCurrentPage(1)
        break
      case 'search':
        setFilters(prev => ({ ...prev, search: '' }))
        break
      case 'feeType':
        setFilters(prev => ({ ...prev, feeTypes: prev.feeTypes.filter(item => item !== value) }))
        break
      case 'status':
        setFilters(prev => ({ ...prev, status: '' }))
        break
      case 'paymentMode':
        setFilters(prev => ({ ...prev, paymentMode: '' }))
        break
      case 'dateRange':
        setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))
        break
      default:
        break
    }
  }

  const handleTenderSearchChange = (value: string) => {
    setTenderSearchInput(value)
    if (!value.trim()) {
      setFilteredTenders([])
      setShowTenderDropdown(false)
      return
    }

    // Statuses that should be visible in Add Fees section
    const allowedStatuses = ['submitted', 'ready-to-submit', 'under-evaluation', 'qualified', 'won']

    const lowerValue = value.toLowerCase()
    const filtered = tenders.filter(tender => {
      // Only show tenders with these allowed statuses
      if (!allowedStatuses.includes(tender.status)) {
        return false
      }

      if (tenderSearchBy === 'id') {
        return (
          tender.tender247_id?.toLowerCase().includes(lowerValue) ||
          tender.gem_eprocure_id?.toLowerCase().includes(lowerValue)
        )
      }

      return tender.tender_name?.toLowerCase().includes(lowerValue)
    })

    setFilteredTenders(filtered)
    setShowTenderDropdown(true)
  }

  const handleTenderSelect = async (tender: TenderWithUser) => {
    setSelectedTender(tender)
    setTenderSearchInput(tenderSearchBy === 'id' ? (tender.tender247_id || tender.gem_eprocure_id || '') : tender.tender_name)
    setShowTenderDropdown(false)

    // Check for existing bid fees for this tender
    if (companyId) {
      try {
        const existingFees = await bidFeeService.listBidFees(
          companyId,
          { tender_id: tender.id },
          { page: 1, pageSize: 100 }
        )

        const updatedEntries: FeeEntryMap = { ...feeEntries }
        const updatedFeeTypes: BidFeeType[] = [...selectedFeeTypes]

        // Check for existing tender-fees bid fee
        const existingTenderFees = existingFees.data.find(fee => fee.fee_type === 'tender-fees' && fee.amount > 0)
        if (existingTenderFees) {
          if (!updatedFeeTypes.includes('tender-fees')) {
            updatedFeeTypes.push('tender-fees')
          }
          updatedEntries['tender-fees'] = mapBidFeeToDraft(existingTenderFees)
        } else if (tender.tender_fees && tender.tender_fees > 0) {
          // Use tender amount if no existing bid fee
          if (!updatedFeeTypes.includes('tender-fees')) {
            updatedFeeTypes.push('tender-fees')
          }
          updatedEntries['tender-fees'] = {
            ...(updatedEntries['tender-fees'] || createFeeEntryDraft()),
            amount: tender.tender_fees.toString()
          }
        }

        // Check for existing emd bid fee
        const existingEmd = existingFees.data.find(fee => fee.fee_type === 'emd' && fee.amount > 0)
        if (existingEmd) {
          if (!updatedFeeTypes.includes('emd')) {
            updatedFeeTypes.push('emd')
          }
          updatedEntries['emd'] = mapBidFeeToDraft(existingEmd)
        } else if (tender.emd_amount && tender.emd_amount > 0) {
          // Use tender amount if no existing bid fee
          if (!updatedFeeTypes.includes('emd')) {
            updatedFeeTypes.push('emd')
          }
          updatedEntries['emd'] = {
            ...(updatedEntries['emd'] || createFeeEntryDraft()),
            amount: tender.emd_amount.toString()
          }
        }

        setSelectedFeeTypes(updatedFeeTypes)
        setFeeEntries(updatedEntries)
      } catch (error: any) {
        console.error('Failed to load existing bid fees:', error)
        // Fallback to tender amounts if loading fails
        const updatedEntries: FeeEntryMap = { ...feeEntries }

        if (tender.tender_fees && tender.tender_fees > 0) {
          if (!selectedFeeTypes.includes('tender-fees')) {
            setSelectedFeeTypes(prev => [...prev, 'tender-fees'])
          }
          updatedEntries['tender-fees'] = {
            ...(updatedEntries['tender-fees'] || createFeeEntryDraft()),
            amount: tender.tender_fees.toString()
          }
        }

        if (tender.emd_amount && tender.emd_amount > 0) {
          if (!selectedFeeTypes.includes('emd')) {
            setSelectedFeeTypes(prev => [...prev, 'emd'])
          }
          updatedEntries['emd'] = {
            ...(updatedEntries['emd'] || createFeeEntryDraft()),
            amount: tender.emd_amount.toString()
          }
        }

        setFeeEntries(updatedEntries)
      }
    }
  }

  const handleFeeTypeToggle = (feeType: BidFeeType) => {
    setSelectedFeeTypes(prev => {
      if (prev.includes(feeType)) {
        const [, ...rest] = prev.filter(type => type !== feeType)
        setFeeEntries(entries => {
          const updatedEntries = { ...entries }
          delete updatedEntries[feeType]
          return updatedEntries
        })
        return prev.filter(type => type !== feeType)
      }

      setFeeEntries(entries => ({
        ...entries,
        [feeType]: entries[feeType] || createFeeEntryDraft()
      }))

      return [...prev, feeType]
    })
  }

  const handleFeeEntryChange = <K extends keyof FeeEntryDraft>(feeType: BidFeeType, field: K, value: FeeEntryDraft[K]) => {
    setFeeEntries(prev => ({
      ...prev,
      [feeType]: {
        ...(prev[feeType] || createFeeEntryDraft()),
        [field]: value
      }
    }))
  }

  const handleFileUpload = (files: FileList | null, feeType: BidFeeType) => {
    if (!files) return
    const newAttachments = Array.from(files).map(draftAttachmentFromFile)
    setFeeEntries(prev => ({
      ...prev,
      [feeType]: {
        ...(prev[feeType] || createFeeEntryDraft()),
        attachments: [
          ...((prev[feeType]?.attachments as DraftAttachment[]) || []),
          ...newAttachments
        ]
      }
    }))
  }

  const handleDeleteAttachment = (feeType: BidFeeType, attachmentId: string) => {
    setFeeEntries(prev => ({
      ...prev,
      [feeType]: {
        ...(prev[feeType] || createFeeEntryDraft()),
        attachments: ((prev[feeType]?.attachments as DraftAttachment[]) || []).filter(
          attachment => attachment.id !== attachmentId
        )
      }
    }))
  }

  const handleAddFeeModalOpen = () => {
    setAddFeeStep(1)
    setSelectedTender(null)
    setSelectedFeeTypes([])
    setFeeEntries({} as FeeEntryMap)
    setTenderSearchInput('')
    setTenderSearchBy('id')
    setShowTenderDropdown(false)
    setFilteredTenders([])
    setFormError(null)
    setIsAddModalOpen(true)
  }

  const validateDrafts = () => {
    if (!selectedTender) {
      setFormError('Select a tender before proceeding.')
      return false
    }

    if (selectedFeeTypes.length === 0) {
      setFormError('Select at least one fee type.')
      return false
    }

    for (const feeType of selectedFeeTypes) {
      const entry = feeEntries[feeType]
      if (!entry) {
        setFormError('Fill in details for all selected fee types.')
        return false
      }

      if (!entry.amount || Number(entry.amount) <= 0) {
        setFormError('Enter a valid amount for each fee type.')
        return false
      }

      if (!entry.paymentMode) {
        setFormError('Select payment mode for each fee type.')
        return false
      }
    }

    setFormError(null)
    return true
  }

  const handleSaveFees = async () => {
    if (!companyId || !user || !selectedTender) {
      setFormError('Missing required information to save fees.')
      return
    }

    if (!validateDrafts()) {
      return
    }

    const entries: BidFeeFormEntry[] = selectedFeeTypes.map(feeType =>
      transformDraftToFormEntry(feeType, feeEntries[feeType])
    )

    setIsSaving(true)
    try {
      await bidFeeService.createBidFees({
        companyId,
        tender: {
          id: selectedTender.id,
          tender_name: selectedTender.tender_name,
          tender247_id: selectedTender.tender247_id,
          gem_eprocure_id: selectedTender.gem_eprocure_id
        },
        entries,
        createdBy: user.id
      })

      setIsAddModalOpen(false)
      setAddFeeStep(1)
      setSelectedTender(null)
      setSelectedFeeTypes([])
      setFeeEntries({} as FeeEntryMap)
      await loadBidFees()
    } catch (saveError: any) {
      setFormError(saveError.message || 'Failed to save bid fees')
    } finally {
      setIsSaving(false)
    }
  }

  const renderPaymentModeFields = (feeType: BidFeeType, entry: FeeEntryDraft) => {
    switch (entry.paymentMode) {
      case 'NEFT/RTGS':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="UTR No."
              value={entry.utrNo}
              onChange={event => handleFeeEntryChange(feeType, 'utrNo', event.target.value)}
              placeholder="Enter UTR number"
            />
            <Input
              label="Bank Name"
              value={entry.bankName}
              onChange={event => handleFeeEntryChange(feeType, 'bankName', event.target.value)}
              placeholder="Enter bank name"
            />
            <Input
              label="IFSC Code"
              value={entry.ifsc}
              onChange={event => handleFeeEntryChange(feeType, 'ifsc', event.target.value)}
              placeholder="Enter IFSC code"
            />
            <Input
              label="Transaction Date"
              type="date"
              value={entry.txnDate}
              onChange={event => handleFeeEntryChange(feeType, 'txnDate', event.target.value)}
            />
          </div>
        )
      case 'Net-Banking/UPI':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Gateway/Ref ID"
              value={entry.gatewayRef}
              onChange={event => handleFeeEntryChange(feeType, 'gatewayRef', event.target.value)}
              placeholder="Enter gateway/reference ID"
            />
            <Input
              label="Transaction Date"
              type="date"
              value={entry.txnDate}
              onChange={event => handleFeeEntryChange(feeType, 'txnDate', event.target.value)}
            />
          </div>
        )
      case 'DD / Banker\'s Cheque':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="DD No."
              value={entry.ddNo}
              onChange={event => handleFeeEntryChange(feeType, 'ddNo', event.target.value)}
              placeholder="Enter DD number"
            />
            <Input
              label="Issuing Bank"
              value={entry.issuingBank}
              onChange={event => handleFeeEntryChange(feeType, 'issuingBank', event.target.value)}
              placeholder="Enter issuing bank"
            />
            <Input
              label="Payable At"
              value={entry.payableAt}
              onChange={event => handleFeeEntryChange(feeType, 'payableAt', event.target.value)}
              placeholder="Enter payable location"
            />
            <Input
              label="Issue Date"
              type="date"
              value={entry.issueDate}
              onChange={event => handleFeeEntryChange(feeType, 'issueDate', event.target.value)}
            />
            <Input
              label="Expiry Date"
              type="date"
              value={entry.expiryDate}
              onChange={event => handleFeeEntryChange(feeType, 'expiryDate', event.target.value)}
            />
          </div>
        )
      case 'FDR':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="FDR No."
              value={entry.fdrNo}
              onChange={event => handleFeeEntryChange(feeType, 'fdrNo', event.target.value)}
              placeholder="Enter FDR number"
            />
            <Input
              label="Bank"
              value={entry.bank}
              onChange={event => handleFeeEntryChange(feeType, 'bank', event.target.value)}
              placeholder="Enter bank name"
            />
            <Input
              label="Issue Date"
              type="date"
              value={entry.issueDate}
              onChange={event => handleFeeEntryChange(feeType, 'issueDate', event.target.value)}
            />
            <Input
              label="Maturity Date"
              type="date"
              value={entry.maturityDate}
              onChange={event => handleFeeEntryChange(feeType, 'maturityDate', event.target.value)}
            />
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={entry.lienMarked}
                onChange={event => handleFeeEntryChange(feeType, 'lienMarked', event.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              Lien Marked
            </label>
          </div>
        )
      case 'Bank Guarantee / e-BG':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="BG No."
              value={entry.bgNo}
              onChange={event => handleFeeEntryChange(feeType, 'bgNo', event.target.value)}
              placeholder="Enter BG number"
            />
            <Input
              label="Issuing Bank"
              value={entry.issuingBank}
              onChange={event => handleFeeEntryChange(feeType, 'issuingBank', event.target.value)}
              placeholder="Enter issuing bank"
            />
            <Input
              label="BG Amount"
              type="number"
              value={entry.bgAmount}
              onChange={event => handleFeeEntryChange(feeType, 'bgAmount', event.target.value)}
              placeholder="Enter BG amount"
            />
            <Input
              label="Issue Date"
              type="date"
              value={entry.issueDate}
              onChange={event => handleFeeEntryChange(feeType, 'issueDate', event.target.value)}
            />
            <Input
              label="Expiry Date"
              type="date"
              value={entry.expiryDate}
              onChange={event => handleFeeEntryChange(feeType, 'expiryDate', event.target.value)}
            />
            <Input
              label="Claim Period"
              value={entry.claimPeriod}
              onChange={event => handleFeeEntryChange(feeType, 'claimPeriod', event.target.value)}
              placeholder="e.g., 30 days"
            />
            <Input
              label="URN/Ref No."
              value={entry.urnRef}
              onChange={event => handleFeeEntryChange(feeType, 'urnRef', event.target.value)}
              placeholder="Enter URN/Reference number"
            />
          </div>
        )
      case 'Cash':
      case 'Other':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Receipt No."
              value={entry.receiptNo}
              onChange={event => handleFeeEntryChange(feeType, 'receiptNo', event.target.value)}
              placeholder="Enter receipt number"
            />
          </div>
        )
      default:
        return null
    }
  }

  // Render payment mode fields for Edit modal (same structure as Add Fee)
  const renderPaymentModeFieldsForEdit = (entry: FeeEntryDraft) => {
    switch (entry.paymentMode) {
      case 'NEFT/RTGS':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="UTR No."
              value={entry.utrNo}
              onChange={event => handleEditChange('utrNo', event.target.value)}
              placeholder="Enter UTR number"
            />
            <Input
              label="Bank Name"
              value={entry.bankName}
              onChange={event => handleEditChange('bankName', event.target.value)}
              placeholder="Enter bank name"
            />
            <Input
              label="IFSC Code"
              value={entry.ifsc}
              onChange={event => handleEditChange('ifsc', event.target.value)}
              placeholder="Enter IFSC code"
            />
            <Input
              label="Transaction Date"
              type="date"
              value={entry.txnDate}
              onChange={event => handleEditChange('txnDate', event.target.value)}
            />
          </div>
        )
      case 'Net-Banking/UPI':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Gateway/Ref ID"
              value={entry.gatewayRef}
              onChange={event => handleEditChange('gatewayRef', event.target.value)}
              placeholder="Enter gateway/reference ID"
            />
            <Input
              label="Transaction Date"
              type="date"
              value={entry.txnDate}
              onChange={event => handleEditChange('txnDate', event.target.value)}
            />
          </div>
        )
      case 'DD / Banker\'s Cheque':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="DD No."
              value={entry.ddNo}
              onChange={event => handleEditChange('ddNo', event.target.value)}
              placeholder="Enter DD number"
            />
            <Input
              label="Issuing Bank"
              value={entry.issuingBank}
              onChange={event => handleEditChange('issuingBank', event.target.value)}
              placeholder="Enter issuing bank"
            />
            <Input
              label="Payable At"
              value={entry.payableAt}
              onChange={event => handleEditChange('payableAt', event.target.value)}
              placeholder="Enter payable location"
            />
            <Input
              label="Issue Date"
              type="date"
              value={entry.issueDate}
              onChange={event => handleEditChange('issueDate', event.target.value)}
            />
            <Input
              label="Expiry Date"
              type="date"
              value={entry.expiryDate}
              onChange={event => handleEditChange('expiryDate', event.target.value)}
            />
          </div>
        )
      case 'FDR':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="FDR No."
              value={entry.fdrNo}
              onChange={event => handleEditChange('fdrNo', event.target.value)}
              placeholder="Enter FDR number"
            />
            <Input
              label="Bank"
              value={entry.bank}
              onChange={event => handleEditChange('bank', event.target.value)}
              placeholder="Enter bank name"
            />
            <Input
              label="Issue Date"
              type="date"
              value={entry.issueDate}
              onChange={event => handleEditChange('issueDate', event.target.value)}
            />
            <Input
              label="Maturity Date"
              type="date"
              value={entry.maturityDate}
              onChange={event => handleEditChange('maturityDate', event.target.value)}
            />
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={entry.lienMarked}
                onChange={event => handleEditChange('lienMarked', event.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              Lien Marked
            </label>
          </div>
        )
      case 'Bank Guarantee / e-BG':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="BG No."
              value={entry.bgNo}
              onChange={event => handleEditChange('bgNo', event.target.value)}
              placeholder="Enter BG number"
            />
            <Input
              label="Issuing Bank"
              value={entry.issuingBank}
              onChange={event => handleEditChange('issuingBank', event.target.value)}
              placeholder="Enter issuing bank"
            />
            <Input
              label="BG Amount"
              type="number"
              value={entry.bgAmount}
              onChange={event => handleEditChange('bgAmount', event.target.value)}
              placeholder="Enter BG amount"
            />
            <Input
              label="Issue Date"
              type="date"
              value={entry.issueDate}
              onChange={event => handleEditChange('issueDate', event.target.value)}
            />
            <Input
              label="Expiry Date"
              type="date"
              value={entry.expiryDate}
              onChange={event => handleEditChange('expiryDate', event.target.value)}
            />
            <Input
              label="Claim Period"
              value={entry.claimPeriod}
              onChange={event => handleEditChange('claimPeriod', event.target.value)}
              placeholder="e.g., 30 days"
            />
            <Input
              label="URN/Ref No."
              value={entry.urnRef}
              onChange={event => handleEditChange('urnRef', event.target.value)}
              placeholder="Enter URN/Reference number"
            />
          </div>
        )
      case 'Cash':
      case 'Other':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Receipt No."
              value={entry.receiptNo}
              onChange={event => handleEditChange('receiptNo', event.target.value)}
              placeholder="Enter receipt number"
            />
          </div>
        )
      default:
        return null
    }
  }

  const renderAttachmentSection = (feeType: BidFeeType, entry: FeeEntryDraft) => (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Attachments</label>
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={event => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={event => {
          event.preventDefault()
          setDragOver(false)
        }}
        onDrop={event => {
          event.preventDefault()
          setDragOver(false)
          handleFileUpload(event.dataTransfer.files, feeType)
        }}
      >
        <div className="space-y-2">
          <i className="ri-upload-cloud-2-line text-2xl text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">
              Drag and drop files here, or{' '}
              <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                browse
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={event => handleFileUpload(event.target.files, feeType)}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </label>
            </p>
            <p className="text-xs text-gray-500">Supports: PDF, DOC, Images (Max 10MB each)</p>
          </div>
        </div>
      </div>

      {entry.attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Selected Files ({entry.attachments.length})</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {entry.attachments.map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <i className={`${getFileIcon(attachment.type)} text-lg text-gray-500`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)} • {attachment.addedOn}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(feeType, attachment.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <i className="ri-delete-bin-line text-sm" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderAddFeeStepContent = () => {
    if (addFeeStep === 1) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Select Tender</h3>
          {tenderError && <p className="text-sm text-red-600">{tenderError}</p>}
          <div className="flex space-x-4">
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="radio"
                name="tenderSearchBy"
                value="id"
                checked={tenderSearchBy === 'id'}
                onChange={() => setTenderSearchBy('id')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-2"
              />
              Search by Tender ID
            </label>
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="radio"
                name="tenderSearchBy"
                value="name"
                checked={tenderSearchBy === 'name'}
                onChange={() => setTenderSearchBy('name')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-2"
              />
              Search by Tender Name
            </label>
          </div>
          <div className="relative">
            <Input
              label={tenderSearchBy === 'id' ? 'Tender ID' : 'Tender Name'}
              value={tenderSearchInput}
              onChange={event => handleTenderSearchChange(event.target.value)}
              placeholder={tenderSearchBy === 'id' ? 'Enter or search tender ID' : 'Enter or search tender name'}
              icon="ri-search-line"
            />
            {showTenderDropdown && filteredTenders.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredTenders.map(tender => (
                  <button
                    type="button"
                    key={tender.id}
                    onClick={() => handleTenderSelect(tender)}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {tender.tender247_id || tender.gem_eprocure_id || 'No ID'} - {tender.tender_name}
                    </div>
                    <div className="text-xs text-gray-500">Status: {tender.status}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {tendersLoading && <p className="text-sm text-gray-500">Loading tenders...</p>}
          {selectedTender && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
              <h4 className="font-medium text-blue-900">Selected Tender</h4>
              <p className="text-sm text-blue-800"><strong>ID:</strong> {selectedTender.tender247_id || selectedTender.gem_eprocure_id || 'N/A'}</p>
              <p className="text-sm text-blue-800"><strong>Name:</strong> {selectedTender.tender_name}</p>
              <p className="text-sm text-blue-800"><strong>Status:</strong> {selectedTender.status}</p>
            </div>
          )}
          <p className="text-sm text-gray-500">
            Only tenders with active statuses are available for fee tracking.
          </p>
        </div>
      )
    }

    if (addFeeStep === 2) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Select Fee Types</h3>
          <div className="space-y-3">
            {feeTypeOptions.map(option => (
              <label key={option.value} className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                  checked={selectedFeeTypes.includes(option.value)}
                  onChange={() => handleFeeTypeToggle(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          <p className="text-sm text-gray-500">Select one or more fee types to track for this tender.</p>
        </div>
      )
    }

    if (addFeeStep === 3) {
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Fee Details</h3>
          {selectedFeeTypes.map(feeType => {
            const entry = feeEntries[feeType] || createFeeEntryDraft()
            const typeInfo = feeTypeOptions.find(option => option.value === feeType)
            return (
              <div key={feeType} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={typeInfo?.color as any || 'gray'}>{typeInfo?.label || feeType}</Badge>
                  <h4 className="text-md font-medium text-gray-900">{typeInfo?.label}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Amount (₹) *"
                    type="number"
                    value={entry.amount}
                    onChange={event => handleFeeEntryChange(feeType, 'amount', event.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
                    <div className="relative">
                      <select
                        value={entry.paymentMode}
                        onChange={event => handleFeeEntryChange(feeType, 'paymentMode', event.target.value as BidFeePaymentMode)}
                        className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select payment mode</option>
                        {paymentModeOptions.map(mode => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                      checked={entry.refundable}
                      onChange={event => handleFeeEntryChange(feeType, 'refundable', event.target.checked)}
                    />
                    Refundable
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                    <div className="relative">
                      <select
                        value={entry.status}
                        onChange={event => handleFeeEntryChange(feeType, 'status', event.target.value as BidFeeStatus)}
                        className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Due / Expiry Date"
                    type="date"
                    value={entry.dueDate}
                    onChange={event => handleFeeEntryChange(feeType, 'dueDate', event.target.value)}
                  />
                  <Input
                    label="Notes"
                    value={entry.notes}
                    onChange={event => handleFeeEntryChange(feeType, 'notes', event.target.value)}
                    placeholder="Additional notes"
                  />
                </div>
                {entry.paymentMode && renderPaymentModeFields(feeType, entry)}
                {renderAttachmentSection(feeType, entry)}
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Review &amp; Save</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Selected Tender:</h4>
          <p className="text-sm text-gray-700">{selectedTender?.tender_name} ({selectedTender?.tender247_id || selectedTender?.gem_eprocure_id || 'N/A'})</p>
        </div>
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Fee Summary:</h4>
          {selectedFeeTypes.map(feeType => {
            const entry = feeEntries[feeType]
            const typeInfo = feeTypeOptions.find(option => option.value === feeType)
            const amount = entry?.amount ? Number(entry.amount) : 0
            return (
              <div key={feeType} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant={typeInfo?.color as any || 'gray'}>{typeInfo?.label || feeType}</Badge>
                  <span className="text-sm text-gray-700">({entry?.paymentMode || 'Payment mode not set'})</span>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(amount)}</span>
              </div>
            )
          })}
        </div>
        <div className="border-t pt-3 flex justify-between items-center">
          <span className="font-medium text-gray-900">Total Amount:</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatCurrency(
              selectedFeeTypes.reduce((total, feeType) => {
                const entry = feeEntries[feeType]
                return total + (entry?.amount ? Number(entry.amount) : 0)
              }, 0)
            )}
          </span>
        </div>
      </div>
    )
  }

  const handleEditOpen = (fee: BidFee) => {
    setSelectedFee(fee)
    setEditDraft(mapBidFeeToDraft(fee))
    setIsEditModalOpen(true)
  }

  const handleEditChange = <K extends keyof FeeEntryDraft>(field: K, value: FeeEntryDraft[K]) => {
    setEditDraft(prev => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleUpdateFee = async () => {
    if (!selectedFee || !editDraft) return

    if (!editDraft.amount || Number(editDraft.amount) <= 0) {
      setFormError('Enter a valid amount.')
      return
    }

    setIsUpdating(true)
    try {
      const payload: Partial<BidFee> = {
        amount: Number(editDraft.amount),
        status: editDraft.status,
        refundable: editDraft.refundable,
        payment_mode: editDraft.paymentMode as BidFeePaymentMode,
        due_date: editDraft.dueDate || null,
        notes: editDraft.notes || null,
        utr_no: editDraft.utrNo || null,
        bank_name: editDraft.bankName || null,
        ifsc: editDraft.ifsc || null,
        txn_date: editDraft.txnDate || null,
        gateway_ref: editDraft.gatewayRef || null,
        dd_no: editDraft.ddNo || null,
        payable_at: editDraft.payableAt || null,
        issue_date: editDraft.issueDate || null,
        expiry_date: editDraft.expiryDate || null,
        maturity_date: editDraft.maturityDate || null,
        issuing_bank: editDraft.issuingBank || null,
        bg_no: editDraft.bgNo || null,
        bg_amount: editDraft.bgAmount ? Number(editDraft.bgAmount) : null,
        claim_period: editDraft.claimPeriod || null,
        urn_ref: editDraft.urnRef || null,
        fdr_no: editDraft.fdrNo || null,
        bank: editDraft.bank || null,
        lien_marked: editDraft.lienMarked,
        receipt_no: editDraft.receiptNo || null
      }

      const updatedFee = await bidFeeService.updateBidFee(selectedFee.id, payload)
      setAllBidFees(prev => prev.map(fee => (fee.id === updatedFee.id ? updatedFee : fee)))
      setSelectedFee(updatedFee)
      setIsEditModalOpen(false)
    } catch (updateError: any) {
      setFormError(updateError.message || 'Failed to update bid fee')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAttachmentUploadForFee = async (files: FileList | null) => {
    if (!files || !selectedFee || !selectedCompany || !user) return

    setIsUploadingAttachment(true)
    try {
      const attachments = await bidFeeService.addAttachments(
        {
          companyId: selectedCompany.company_id,
          bidFeeId: selectedFee.id,
          uploadedBy: user.id
        },
        Array.from(files)
      )

      const updatedFee: BidFee = {
        ...selectedFee,
        attachments: [...(selectedFee.attachments || []), ...attachments]
      }

      setSelectedFee(updatedFee)
      setAllBidFees(prev => prev.map(fee => (fee.id === updatedFee.id ? updatedFee : fee)))
    } catch (uploadError: any) {
      setFormError(uploadError.message || 'Failed to upload attachment')
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  const handleAttachmentDelete = async (attachment: BidFeeAttachment) => {
    if (!selectedFee) return

    setIsDeletingAttachment(true)
    try {
      await bidFeeService.deleteAttachment(attachment.id, attachment.file_path)

      const updatedAttachments = (selectedFee.attachments || []).filter(item => item.id !== attachment.id)
      const updatedFee: BidFee = { ...selectedFee, attachments: updatedAttachments }
      setSelectedFee(updatedFee)
      setAllBidFees(prev => prev.map(fee => (fee.id === updatedFee.id ? updatedFee : fee)))
    } catch (deleteError: any) {
      setFormError(deleteError.message || 'Failed to delete attachment')
    } finally {
      setIsDeletingAttachment(false)
    }
  }

  const handleFeeDelete = async (feeId: string) => {
    setIsDeletingAttachment(true)
    try {
      await bidFeeService.deleteBidFee(feeId)
      setAllBidFees(prev => prev.filter(fee => fee.id !== feeId))
      if (selectedFee?.id === feeId) {
        setSelectedFee(null)
      }
    } catch (deleteError: any) {
      setFormError(deleteError.message || 'Failed to delete bid fee')
    } finally {
      setIsDeletingAttachment(false)
    }
  }

  const renderPagination = () => {
    if (sortedFees.length === 0) {
      return null
    }

    if (totalPages <= 1) {
      return (
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
          <span className="text-sm text-gray-700">
            Showing 1–{sortedFees.length} of {sortedFees.length}
          </span>
        </div>
      )
    }

    const pages: number[] = []
    const maxVisiblePages = 3
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let page = startPage; page <= endPage; page += 1) {
      pages.push(page)
    }

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, sortedFees.length)

    return (
      <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
        <span className="text-sm text-gray-700">
          Showing {startIndex + 1}–{endIndex} of {sortedFees.length}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            <i className="ri-arrow-left-line mr-1" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {pages.map(page => (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="min-w-[40px]"
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <i className="ri-arrow-right-line ml-1" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Bid Fees</h1>
            <p className="text-gray-600 mt-1">Track and manage all tender-related fees and payments</p>
          </div>
          <Button onClick={handleAddFeeModalOpen} className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
            <i className="ri-add-line mr-2" />
            Add Fee
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{error}</div>}

          <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {feeTypeOptions.map(feeType => {
              const stats = summaryStats[feeType.value]
              return (
                <button
                  key={feeType.value}
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, feeTypes: [feeType.value] }))}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{feeType.label}</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.count}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(stats.amount)}</p>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        feeType.color === 'blue'
                          ? 'bg-blue-100 text-blue-600'
                          : feeType.color === 'orange'
                          ? 'bg-orange-100 text-orange-600'
                          : feeType.color === 'purple'
                          ? 'bg-purple-100 text-purple-600'
                          : feeType.color === 'green'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <i className="ri-money-dollar-circle-line text-xl" />
                    </div>
                  </div>
                </button>
              )
            })}
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                type="text"
                placeholder="Search by Tender Name or ID"
                value={filters.search}
                onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
                icon="ri-search-line"
              />
              <div className="relative">
                <select
                  value=""
                  onChange={event => {
                    const value = event.target.value as BidFeeType | ''
                    if (value) {
                      setFilters(prev => ({
                        ...prev,
                        feeTypes: [...prev.feeTypes, value].filter((item, index, arr) => arr.indexOf(item) === index)
                      }))
                    }
                  }}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Add Fee Type Filter</option>
                  {feeTypeOptions
                    .filter(option => !filters.feeTypes.includes(option.value))
                    .map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={event => setFilters(prev => ({ ...prev, status: event.target.value as BidFeeStatus | '' }))}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="relative">
                <select
                  value={filters.paymentMode}
                  onChange={event => setFilters(prev => ({ ...prev, paymentMode: event.target.value as BidFeePaymentMode | '' }))}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Payment Modes</option>
                  {paymentModeOptions.map(mode => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={event => setFilters(prev => ({ ...prev, startDate: event.target.value }))}
                />
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={event => setFilters(prev => ({ ...prev, endDate: event.target.value }))}
                />
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter, index) => (
                  <span key={`${filter.label}-${index}`} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {filter.label}
                    <button
                      type="button"
                      onClick={() => removeFilter(filter.type, filter.value)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <i className="ri-close-line text-sm" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section ref={listSectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Created On
                        {getSortIcon('created_at')}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('tender_reference')}
                    >
                      <div className="flex items-center">
                        Tender Reference
                        {getSortIcon('tender_reference')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tender Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center">
                        Amount (₹)
                        {getSortIcon('amount')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refundable</th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('due_date')}
                    >
                      <div className="flex items-center">
                        Due / Expiry
                        {getSortIcon('due_date')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                        Loading bid fees...
                      </td>
                    </tr>
                  ) : currentFees.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <i className="ri-money-dollar-circle-line text-4xl mb-4" />
                          <p className="text-lg font-medium">No bid fees found</p>
                          <p className="text-sm">Try adjusting your filters or add a new fee</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentFees.map(fee => (
                      <tr key={fee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {fee.created_at?.split('T')[0] || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {fee.tender_reference || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <span title={fee.tender_name_snapshot || fee.tender_reference || ''}>
                              {fee.tender_name_snapshot && fee.tender_name_snapshot.length > 30
                                ? `${fee.tender_name_snapshot.substring(0, 30)}...`
                                : fee.tender_name_snapshot || '—'}
                            </span>
                            {fee.attachments && fee.attachments.length > 0 && (
                              <div className="flex items-center">
                                <i className="ri-attachment-line text-gray-400 text-xs" />
                                <span className="text-xs text-gray-500 ml-1">{fee.attachments.length}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={feeTypeOptions.find(option => option.value === fee.fee_type)?.color as any || 'gray'}>
                            {feeTypeOptions.find(option => option.value === fee.fee_type)?.label || fee.fee_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fee.payment_mode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(fee.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={fee.refundable ? 'green' : 'gray'}>{fee.refundable ? 'Yes' : 'No'}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusOptions.find(option => option.value === fee.status)?.variant || 'gray'}>
                            {statusOptions.find(option => option.value === fee.status)?.label || fee.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fee.due_date || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFee(fee)
                                setIsViewModalOpen(true)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Fee"
                            >
                              <i className="ri-eye-line" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditOpen(fee)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Edit Fee"
                            >
                              <i className="ri-edit-line" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </section>

          {/* Financial Summary Section */}
          {allBidFees.length > 0 && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-center gap-6 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => handleSummaryFilterClick('refundable')}
                  className={`text-center min-w-[180px] rounded-lg p-3 transition-all hover:bg-gray-50 cursor-pointer ${
                    summaryFilter === 'refundable' ? 'ring-2 ring-green-500 bg-green-50' : ''
                  }`}
                  title="Click to filter fees by refundable amount"
                >
                  <p className="text-xs text-gray-500 mb-1">TOTAL REFUNDABLE</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {formatCurrency(financialSummary.totalRefundable)}
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleSummaryFilterClick('refunded')}
                  className={`text-center min-w-[180px] rounded-lg p-3 transition-all hover:bg-gray-50 cursor-pointer ${
                    summaryFilter === 'refunded' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  title="Click to filter fees by refunded amount"
                >
                  <p className="text-xs text-gray-500 mb-1">TOTAL REFUNDED</p>
                  <p className="text-2xl font-semibold text-blue-600">
                    {formatCurrency(financialSummary.totalRefunded)}
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleSummaryFilterClick('remaining')}
                  className={`text-center min-w-[180px] rounded-lg p-3 transition-all hover:bg-gray-50 cursor-pointer border-l border-gray-200 pl-6 ${
                    summaryFilter === 'remaining' ? 'ring-2 ring-amber-500 bg-amber-50' : ''
                  }`}
                  title="Click to filter fees by remaining amount (refundable not yet refunded)"
                >
                  <p className="text-xs text-gray-500 mb-1">REMAINING AMOUNT</p>
                  <p className="text-2xl font-semibold text-amber-600">
                    {formatCurrency(financialSummary.remainingAmount)}
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleSummaryFilterClick('nonRefundable')}
                  className={`text-center min-w-[180px] rounded-lg p-3 transition-all hover:bg-gray-50 cursor-pointer border-l border-gray-200 pl-6 ${
                    summaryFilter === 'nonRefundable' ? 'ring-2 ring-red-500 bg-red-50' : ''
                  }`}
                  title="Click to filter fees by non-refundable amount"
                >
                  <p className="text-xs text-gray-500 mb-1">TOTAL NON-REFUNDABLE</p>
                  <p className="text-2xl font-semibold text-red-600">
                    {formatCurrency(financialSummary.totalNonRefundable)}
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleSummaryFilterClick('all')}
                  className={`text-center min-w-[180px] rounded-lg p-3 transition-all hover:bg-gray-50 cursor-pointer border-l border-gray-200 pl-6 ${
                    summaryFilter === 'all' ? 'ring-2 ring-gray-700 bg-gray-50' : ''
                  }`}
                  title="Click to show all fees"
                >
                  <p className="text-xs text-gray-500 mb-1">TOTAL AMOUNT</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(financialSummary.totalAmount)}
                  </p>
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`Add Fee - Step ${addFeeStep} of 4`} size="lg">
        <div className="space-y-6">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {renderAddFeeStepContent()}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <div>
              {addFeeStep > 1 && (
                <Button variant="outline" onClick={() => setAddFeeStep(step => Math.max(1, step - 1))}>
                  <i className="ri-arrow-left-line mr-2" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              {addFeeStep < 4 ? (
                <Button
                  onClick={() => {
                    if (addFeeStep === 1 && !selectedTender) {
                      setFormError('Select a tender before continuing.')
                      return
                    }
                    if (addFeeStep === 2 && selectedFeeTypes.length === 0) {
                      setFormError('Choose at least one fee type.')
                      return
                    }
                    setFormError(null)
                    setAddFeeStep(step => Math.min(4, step + 1))
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Next
                  <i className="ri-arrow-right-line ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSaveFees}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <i className="ri-loader-4-line mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line mr-2" />
                      Save Fees
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Fee Details" size="lg">
        {selectedFee && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tender</label>
              <p className="text-sm text-gray-900">{selectedFee.tender_name_snapshot || '—'}</p>
              <p className="text-xs text-gray-500">{selectedFee.tender_reference || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                <Badge variant={feeTypeOptions.find(option => option.value === selectedFee.fee_type)?.color as any || 'gray'}>
                  {feeTypeOptions.find(option => option.value === selectedFee.fee_type)?.label || selectedFee.fee_type}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <p className="text-sm text-gray-900">{selectedFee.payment_mode}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(selectedFee.amount)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Badge variant={statusOptions.find(option => option.value === selectedFee.status)?.variant || 'gray'}>
                  {statusOptions.find(option => option.value === selectedFee.status)?.label || selectedFee.status}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created On</label>
                <p className="text-sm text-gray-900">{selectedFee.created_at?.split('T')[0]}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <p className="text-sm text-gray-900">{selectedFee.due_date || '—'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refundable</label>
              <Badge variant={selectedFee.refundable ? 'green' : 'gray'}>{selectedFee.refundable ? 'Yes' : 'No'}</Badge>
            </div>
            {selectedFee.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <p className="text-sm text-gray-900">{selectedFee.notes}</p>
              </div>
            )}
            {/* Payment Mode Specific Fields */}
            {selectedFee.payment_mode && (() => {
              switch (selectedFee.payment_mode) {
                case 'NEFT/RTGS':
                  return (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Payment Details (NEFT/RTGS)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedFee.utr_no && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">UTR No.</label>
                            <p className="text-sm text-gray-900">{selectedFee.utr_no}</p>
                          </div>
                        )}
                        {selectedFee.bank_name && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                            <p className="text-sm text-gray-900">{selectedFee.bank_name}</p>
                          </div>
                        )}
                        {selectedFee.ifsc && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                            <p className="text-sm text-gray-900">{selectedFee.ifsc}</p>
                          </div>
                        )}
                        {selectedFee.txn_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
                            <p className="text-sm text-gray-900">{selectedFee.txn_date}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                case 'Net-Banking/UPI':
                  return (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Payment Details (Net-Banking/UPI)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedFee.gateway_ref && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gateway/Ref ID</label>
                            <p className="text-sm text-gray-900">{selectedFee.gateway_ref}</p>
                          </div>
                        )}
                        {selectedFee.txn_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
                            <p className="text-sm text-gray-900">{selectedFee.txn_date}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                case 'DD / Banker\'s Cheque':
                  return (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Payment Details (DD / Banker's Cheque)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedFee.dd_no && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">DD No.</label>
                            <p className="text-sm text-gray-900">{selectedFee.dd_no}</p>
                          </div>
                        )}
                        {selectedFee.issuing_bank && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Bank</label>
                            <p className="text-sm text-gray-900">{selectedFee.issuing_bank}</p>
                          </div>
                        )}
                        {selectedFee.payable_at && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payable At</label>
                            <p className="text-sm text-gray-900">{selectedFee.payable_at}</p>
                          </div>
                        )}
                        {selectedFee.issue_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                            <p className="text-sm text-gray-900">{selectedFee.issue_date}</p>
                          </div>
                        )}
                        {selectedFee.expiry_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                            <p className="text-sm text-gray-900">{selectedFee.expiry_date}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                case 'FDR':
                  return (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Payment Details (FDR)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedFee.fdr_no && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">FDR No.</label>
                            <p className="text-sm text-gray-900">{selectedFee.fdr_no}</p>
                          </div>
                        )}
                        {selectedFee.bank && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                            <p className="text-sm text-gray-900">{selectedFee.bank}</p>
                          </div>
                        )}
                        {selectedFee.issue_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                            <p className="text-sm text-gray-900">{selectedFee.issue_date}</p>
                          </div>
                        )}
                        {selectedFee.maturity_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Maturity Date</label>
                            <p className="text-sm text-gray-900">{selectedFee.maturity_date}</p>
                          </div>
                        )}
                        {selectedFee.lien_marked !== null && selectedFee.lien_marked !== undefined && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lien Marked</label>
                            <Badge variant={selectedFee.lien_marked ? 'green' : 'gray'}>
                              {selectedFee.lien_marked ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                case 'Bank Guarantee / e-BG':
                  return (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Payment Details (Bank Guarantee / e-BG)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedFee.bg_no && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">BG No.</label>
                            <p className="text-sm text-gray-900">{selectedFee.bg_no}</p>
                          </div>
                        )}
                        {selectedFee.issuing_bank && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Bank</label>
                            <p className="text-sm text-gray-900">{selectedFee.issuing_bank}</p>
                          </div>
                        )}
                        {selectedFee.bg_amount !== null && selectedFee.bg_amount !== undefined && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">BG Amount</label>
                            <p className="text-sm text-gray-900">{formatCurrency(selectedFee.bg_amount)}</p>
                          </div>
                        )}
                        {selectedFee.issue_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                            <p className="text-sm text-gray-900">{selectedFee.issue_date}</p>
                          </div>
                        )}
                        {selectedFee.expiry_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                            <p className="text-sm text-gray-900">{selectedFee.expiry_date}</p>
                          </div>
                        )}
                        {selectedFee.claim_period && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Claim Period</label>
                            <p className="text-sm text-gray-900">{selectedFee.claim_period}</p>
                          </div>
                        )}
                        {selectedFee.urn_ref && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URN/Ref No.</label>
                            <p className="text-sm text-gray-900">{selectedFee.urn_ref}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                case 'Cash':
                case 'Other':
                  return (
                    selectedFee.receipt_no && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Payment Details ({selectedFee.payment_mode})</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt No.</label>
                            <p className="text-sm text-gray-900">{selectedFee.receipt_no}</p>
                          </div>
                        </div>
                      </div>
                    )
                  )
                default:
                  return null
              }
            })()}
            {selectedFee.attachments && selectedFee.attachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments ({selectedFee.attachments.length})
                </label>
                <div className="space-y-2">
                  {selectedFee.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <i className={`${getFileIcon(attachment.file_type)} text-lg text-gray-500`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(attachment.file_size)}</p>
                        </div>
                      </div>
                      <a href={attachment.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800" title="Download">
                        <i className="ri-download-line text-sm" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Fee" size="lg">
        {selectedFee && editDraft && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tender</label>
              <p className="text-sm text-gray-900">{selectedFee.tender_name_snapshot || '—'}</p>
              <p className="text-xs text-gray-500">{selectedFee.tender_reference || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount (₹)"
                type="number"
                value={editDraft.amount}
                onChange={event => handleEditChange('amount', event.target.value)}
                placeholder="Enter amount"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="relative">
                  <select
                    value={editDraft.status}
                    onChange={event => handleEditChange('status', event.target.value as BidFeeStatus)}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Due / Expiry Date"
                type="date"
                value={editDraft.dueDate}
                onChange={event => handleEditChange('dueDate', event.target.value)}
              />
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                  checked={editDraft.refundable}
                  onChange={event => handleEditChange('refundable', event.target.checked)}
                />
                Refundable
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
                <div className="relative">
                  <select
                    value={editDraft.paymentMode}
                    onChange={event => handleEditChange('paymentMode', event.target.value as BidFeePaymentMode)}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select payment mode</option>
                    {paymentModeOptions.map(mode => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <Input
                label="Notes"
                value={editDraft.notes}
                onChange={event => handleEditChange('notes', event.target.value)}
                placeholder="Additional notes..."
              />
            </div>
            {/* Payment Mode Specific Fields */}
            {editDraft.paymentMode && renderPaymentModeFieldsForEdit(editDraft)}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Attachments</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-md cursor-pointer hover:bg-blue-100 text-sm font-medium">
                  <i className="ri-upload-cloud-2-line mr-2" />
                  Upload
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={event => handleAttachmentUploadForFee(event.target.files)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
                {isUploadingAttachment && <span className="text-sm text-gray-500">Uploading...</span>}
              </div>
              {selectedFee.attachments && selectedFee.attachments.length > 0 ? (
                <div className="space-y-2">
                  {selectedFee.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <i className={`${getFileIcon(attachment.file_type)} text-lg text-gray-500`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(attachment.file_size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <a href={attachment.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                          <i className="ri-download-line" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleAttachmentDelete(attachment)}
                          className="text-red-600 hover:text-red-800"
                          disabled={isDeletingAttachment}
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No attachments added yet.</p>
              )}
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateFee}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <i className="ri-loader-4-line mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line mr-2" />
                    Update Fee
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  )
}



