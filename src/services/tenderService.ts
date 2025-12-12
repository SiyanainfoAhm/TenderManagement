import { supabase } from '@/lib/supabase'
import { Tender, TenderWithUser, TenderFormData } from '@/types'
import { getTableName } from '@/config/database'

// Helper function to update ONLY existing bid fees (do not create new ones)
async function updateExistingBidFees(
  tenderId: string,
  companyId: string,
  tenderFees: number,
  emdAmount: number,
  tender: Pick<Tender, 'tender_name' | 'tender247_id' | 'gem_eprocure_id'>
): Promise<void> {
  const BID_FEE_TABLE = getTableName('bid_fees')
  const tenderReference = tender.tender247_id || tender.gem_eprocure_id || tender.tender_name

  // Check and update Tender Fees (only if exists)
  const { data: existingTenderFees, error: fetchTenderFeesError } = await supabase
    .from(BID_FEE_TABLE)
    .select('id')
    .eq('tender_id', tenderId)
    .eq('fee_type', 'tender-fees')
    .limit(1)
    .maybeSingle()

  if (!fetchTenderFeesError && existingTenderFees) {
    const { error: updateTenderFeesError } = await supabase
      .from(BID_FEE_TABLE)
      .update({
        amount: tenderFees,
        tender_reference: tenderReference,
        tender_name_snapshot: tender.tender_name
      })
      .eq('id', existingTenderFees.id)

    if (updateTenderFeesError) {
      console.error('Failed to update existing tender fees:', updateTenderFeesError)
    }
  }

  // Check and update EMD (only if exists)
  const { data: existingEmd, error: fetchEmdError } = await supabase
    .from(BID_FEE_TABLE)
    .select('id')
    .eq('tender_id', tenderId)
    .eq('fee_type', 'emd')
    .limit(1)
    .maybeSingle()

  if (!fetchEmdError && existingEmd) {
    const { error: updateEmdError } = await supabase
      .from(BID_FEE_TABLE)
      .update({
        amount: emdAmount,
        tender_reference: tenderReference,
        tender_name_snapshot: tender.tender_name
      })
      .eq('id', existingEmd.id)

    if (updateEmdError) {
      console.error('Failed to update existing EMD:', updateEmdError)
    }
  }
}

export const tenderService = {
  // Get all tenders for a company (NO date filtering - shows ALL tenders)
  // IMPORTANT: Uses .eq('company_id', companyId) to filter by company
  async getTenders(companyId: string): Promise<TenderWithUser[]> {
    console.log(`getTenders called for company: ${companyId}`)
    
    const { data, error } = await supabase
      .from(getTableName('tenders'))
      .select(`
        *,
        assigned_user:tender1_users!tender1_tenders_assigned_to_fkey(full_name),
        created_user:tender1_users!tender1_tenders_created_by_fkey(full_name)
      `)
      .eq('company_id', companyId) // Company filter - ensures only this company's tenders
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to fetch tenders')

    console.log(`getTenders: Fetched ${data?.length || 0} tenders for company ${companyId} (with company filter applied)`)
    
    return (data || []).map(tender => ({
      ...tender,
      assigned_user_name: tender.assigned_user?.full_name,
      created_user_name: tender.created_user?.full_name
    }))
  },

  // Get tenders with dynamic filters (all filtering done on DB side)
  // IMPORTANT: Uses .eq('company_id', companyId) to filter by company - same as getTenders and getStatusCounts
  async getTendersWithFilters(
    companyId: string,
    filters?: {
      search?: string
      status?: string
      source?: string
      assignedTo?: string
      city?: string
      msmeExempted?: boolean
      startupExempted?: boolean
      timeFilter?: 'all' | 'today' | 'this_week' | 'last_week' | 'custom'
      customStartDate?: string
      customEndDate?: string
    }
  ): Promise<TenderWithUser[]> {
    console.log(`getTendersWithFilters called for company: ${companyId} with filters:`, filters)
    
    let query = supabase
      .from(getTableName('tenders'))
      .select(`
        *,
        assigned_user:tender1_users!tender1_tenders_assigned_to_fkey(full_name),
        created_user:tender1_users!tender1_tenders_created_by_fkey(full_name)
      `)
      .eq('company_id', companyId) // Company filter - ensures only this company's tenders (same as getTenders and getStatusCounts)

    // Search filter - search in tender_name, tender247_id, and gem_eprocure_id
    if (filters?.search && filters.search.trim() !== '') {
      const searchTerm = filters.search.trim()
      console.log('✓ Applying search filter:', searchTerm)
      query = query.or(`tender_name.ilike.%${searchTerm}%,tender247_id.ilike.%${searchTerm}%,gem_eprocure_id.ilike.%${searchTerm}%`)
    }

    if (filters?.status && filters.status.trim() !== '') {
      console.log(`✓ Applying status filter: "${filters.status}" for company ${companyId}`)
      query = query.eq('status', filters.status)
    }
    if (filters?.source && filters.source.trim() !== '') {
      console.log('✓ Applying source filter:', filters.source)
      query = query.eq('source', filters.source)
    }
    if (filters?.assignedTo && filters.assignedTo.trim() !== '') {
      console.log('✓ Applying assignedTo filter:', filters.assignedTo)
      query = query.eq('assigned_to', filters.assignedTo)
    }
    if (filters?.city && filters.city.trim() !== '') {
      console.log('✓ Applying city filter:', filters.city)
      query = query.ilike('location', `%${filters.city}%`)
    }
    if (filters?.msmeExempted === true) {
      console.log('✓ Applying MSME exempted filter: true')
      query = query.eq('msme_exempted', true)
    }
    if (filters?.startupExempted === true) {
      console.log('✓ Applying startup exempted filter: true')
      query = query.eq('startup_exempted', true)
    }

    // Time filter based on created_at
    if (filters?.timeFilter && filters.timeFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      let startDate: Date | undefined
      let endDate: Date | undefined

      switch (filters.timeFilter) {
        case 'today':
          startDate = today
          endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
          break
        case 'this_week':
          startDate = new Date(today)
          startDate.setDate(today.getDate() - today.getDay()) // Sunday
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 7)
          break
        case 'last_week':
          startDate = new Date(today)
          startDate.setDate(today.getDate() - today.getDay() - 7)
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 7)
          break
        case 'custom':
          if (filters.customStartDate && filters.customEndDate) {
            startDate = new Date(filters.customStartDate)
            startDate.setHours(0, 0, 0, 0) // Start of day
            endDate = new Date(filters.customEndDate)
            endDate.setHours(23, 59, 59, 999) // End of day
          } else if (filters.customStartDate) {
            // If only start date is provided, use it as both start and end
            startDate = new Date(filters.customStartDate)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(filters.customStartDate)
            endDate.setHours(23, 59, 59, 999)
          } else if (filters.customEndDate) {
            // If only end date is provided, use it as both start and end
            startDate = new Date(filters.customEndDate)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(filters.customEndDate)
            endDate.setHours(23, 59, 59, 999)
          }
          break
      }

      if (startDate && endDate) {
        const startISO = startDate.toISOString()
        const endISO = endDate.toISOString()
        console.log(`✓ Applying time filter on status_updated_date: ${filters.timeFilter} from ${startISO} to ${endISO}`)
        // Filter by status_updated_date (when status was last updated)
        // Records with null status_updated_date will be excluded (they haven't had status updated yet)
        query = query
          .gte('status_updated_date', startISO)
          .lte('status_updated_date', endISO)
      }
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tenders with filters:', error)
      throw new Error(error.message || 'Failed to fetch tenders with filters')
    }

    const resultCount = data?.length || 0
    
    // Debug: If status filter is applied, log the status values
    if (filters?.status) {
      const statusValues = data?.map((t: any) => t.status) || []
      console.log(`✅ getTendersWithFilters returned ${resultCount} tenders for company ${companyId} with status "${filters.status}"`)
      console.log(`   Status values found:`, statusValues)
      console.log(`   Count of tenders with exact status "${filters.status}":`, statusValues.filter((s: string) => s === filters.status).length)
    } else {
      console.log(`✅ getTendersWithFilters returned ${resultCount} tenders for company ${companyId} (with company filter applied)`)
    }
    
    return (data || []).map(tender => ({
      ...tender,
      assigned_user_name: tender.assigned_user?.full_name,
      created_user_name: tender.created_user?.full_name
    }))
  },

  // Get tenders for timeline (with date filtering - only tenders with expected_start_date and expected_end_date)
  async getTendersForTimeline(companyId: string, filters?: { startDate?: string; endDate?: string }): Promise<TenderWithUser[]> {
    let query = supabase
      .from(getTableName('tenders'))
      .select(`
        *,
        assigned_user:tender1_users!tender1_tenders_assigned_to_fkey(full_name),
        created_user:tender1_users!tender1_tenders_created_by_fkey(full_name)
      `)
      .eq('company_id', companyId)
      .not('expected_start_date', 'is', null)
      .not('expected_end_date', 'is', null)

    // Apply date range filter if provided
    if (filters?.startDate && filters?.endDate) {
      // Filter tenders where date range overlaps with the filter range
      // Tender matches if: tenderStart <= filterEnd AND tenderEnd >= filterStart
      query = query
        .lte('expected_start_date', filters.endDate)
        .gte('expected_end_date', filters.startDate)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw new Error(error.message || 'Failed to fetch tenders for timeline')

    return (data || []).map(tender => ({
      ...tender,
      assigned_user_name: tender.assigned_user?.full_name,
      created_user_name: tender.created_user?.full_name
    }))
  },

  // Get single tender by ID
  async getTenderById(tenderId: string): Promise<TenderWithUser> {
    const { data, error } = await supabase
      .from(getTableName('tenders'))
      .select(`
        *,
        assigned_user:tender1_users!tender1_tenders_assigned_to_fkey(full_name),
        created_user:tender1_users!tender1_tenders_created_by_fkey(full_name)
      `)
      .eq('id', tenderId)
      .single()

    if (error) throw new Error(error.message || 'Failed to fetch tender')

    return {
      ...data,
      assigned_user_name: data.assigned_user?.full_name,
      created_user_name: data.created_user?.full_name
    }
  },

  // Get all tender IDs for batch duplicate checking (optimized for Excel import)
  async getAllTenderIds(companyId: string): Promise<{
    tender247Ids: Map<string, string>, // Map<normalized_id, original_id>
    gemEprocureIds: Map<string, string> // Map<normalized_id, original_id>
  }> {
    const { data, error } = await supabase
      .from(getTableName('tenders'))
      .select('tender247_id, gem_eprocure_id')
      .eq('company_id', companyId)

    if (error) {
      throw new Error(error.message || 'Failed to fetch tender IDs')
    }

    const tender247Ids = new Map<string, string>()
    const gemEprocureIds = new Map<string, string>()

    if (data) {
      data.forEach((tender) => {
        if (tender.tender247_id) {
          const normalized = tender.tender247_id.trim().toLowerCase()
          if (normalized) {
            tender247Ids.set(normalized, tender.tender247_id)
          }
        }
        if (tender.gem_eprocure_id) {
          const normalized = tender.gem_eprocure_id.trim().toLowerCase()
          if (normalized) {
            gemEprocureIds.set(normalized, tender.gem_eprocure_id)
          }
        }
      })
    }

    return { tender247Ids, gemEprocureIds }
  },

  // Check if Tender247 ID or GEM/Eprocure ID already exists (case-insensitive)
  async checkDuplicateIds(
    companyId: string,
    tender247Id: string | undefined,
    gemEprocureId: string | undefined,
    excludeTenderId?: string
  ): Promise<{ isDuplicate: boolean; message: string }> {
    const messages: string[] = []

    // Fetch all tenders for the company to do case-insensitive comparison
    let query = supabase
      .from(getTableName('tenders'))
      .select('id, tender247_id, gem_eprocure_id')
      .eq('company_id', companyId)

    if (excludeTenderId) {
      query = query.neq('id', excludeTenderId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message || 'Failed to check for duplicate IDs')
    }

    if (!data || data.length === 0) {
      return { isDuplicate: false, message: '' }
    }

    // Normalize input IDs to lowercase for comparison
    const normalizedTender247Id = tender247Id?.trim().toLowerCase()
    const normalizedGemEprocureId = gemEprocureId?.trim().toLowerCase()

    // Check Tender247 ID (case-insensitive)
    if (normalizedTender247Id) {
      const duplicate = data.find(
        (tender) => tender.tender247_id && 
        tender.tender247_id.toLowerCase() === normalizedTender247Id
      )
      
      if (duplicate) {
        messages.push(`Tender247 ID "${tender247Id.trim()}" already exists`)
      }
    }

    // Check GEM/Eprocure ID (case-insensitive)
    if (normalizedGemEprocureId) {
      const duplicate = data.find(
        (tender) => tender.gem_eprocure_id && 
        tender.gem_eprocure_id.toLowerCase() === normalizedGemEprocureId
      )
      
      if (duplicate) {
        messages.push(`GEM/Eprocure ID "${gemEprocureId.trim()}" already exists`)
      }
    }

    if (messages.length > 0) {
      return {
        isDuplicate: true,
        message: messages.join(' and ')
      }
    }

    return { isDuplicate: false, message: '' }
  },

  // Check duplicates in memory (optimized for batch processing)
  checkDuplicatesInMemory(
    tender247Id: string | undefined,
    gemEprocureId: string | undefined,
    existingIds: { tender247Ids: Map<string, string>; gemEprocureIds: Map<string, string> }
  ): { isDuplicate: boolean; message: string } {
    const messages: string[] = []

    if (tender247Id) {
      const normalized = tender247Id.trim().toLowerCase()
      if (normalized && existingIds.tender247Ids.has(normalized)) {
        messages.push(`Tender247 ID "${tender247Id.trim()}" already exists`)
      }
    }

    if (gemEprocureId) {
      const normalized = gemEprocureId.trim().toLowerCase()
      if (normalized && existingIds.gemEprocureIds.has(normalized)) {
        messages.push(`GEM/Eprocure ID "${gemEprocureId.trim()}" already exists`)
      }
    }

    if (messages.length > 0) {
      return {
        isDuplicate: true,
        message: messages.join(' and ')
      }
    }

    return { isDuplicate: false, message: '' }
  },

  // Create new tender
  async createTender(companyId: string, userId: string, formData: TenderFormData): Promise<Tender> {
    // Validate assigned_to is a valid UUID or empty
    const assignedTo = formData.assigned_to && formData.assigned_to.trim() !== '' 
      ? formData.assigned_to 
      : null
    
    const tenderData = {
      company_id: companyId,
      tender247_id: formData.tender247_id || null,
      gem_eprocure_id: formData.gem_eprocure_id || null,
      portal_link: formData.portal_link || null,
      tender_name: formData.tender_name,
      source: formData.source || null,
      tender_type: formData.tender_type || null,
      location: formData.location || null,
      last_date: formData.last_date || null,
      expected_start_date: formData.expected_start_date || null,
      expected_end_date: formData.expected_end_date || null,
      expected_days: formData.expected_days !== undefined && formData.expected_days !== null && formData.expected_days !== ''
        ? (Number.isNaN(parseInt(formData.expected_days, 10)) ? null : parseInt(formData.expected_days, 10))
        : null,
      msme_exempted: formData.msme_exempted,
      startup_exempted: formData.startup_exempted,
      emd_amount: parseFloat(formData.emd_amount) || 0,
      tender_fees: parseFloat(formData.tender_fees) || 0,
      tender_cost: parseFloat(formData.tender_cost) || 0,
      tender_notes: formData.tender_notes || null,
      pq_criteria: formData.pq_criteria || null,
      status: formData.status,
      assigned_to: assignedTo,
      not_bidding_reason: formData.not_bidding_reason || null,
      created_by: userId,
      status_updated_date: new Date().toISOString() // Set initial status_updated_date when creating tender
    }

    const { data, error } = await supabase
      .from(getTableName('tenders'))
      .insert(tenderData)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to create tender')

    // Do NOT create bid fees when adding a new tender
    // Bid fees should only be created from the Bid Fees page

    return data
  },

  // Create multiple tenders in batch (optimized for Excel import)
  async createTendersBatch(
    companyId: string,
    userId: string,
    tenders: TenderFormData[]
  ): Promise<{ success: Tender[]; errors: Array<{ index: number; error: string }> }> {
    const success: Tender[] = []
    const errors: Array<{ index: number; error: string }> = []

    // Prepare all tender data
    const tenderDataArray = tenders.map((formData) => {
      const assignedTo = formData.assigned_to && formData.assigned_to.trim() !== '' 
        ? formData.assigned_to 
        : null
      
      return {
        company_id: companyId,
        tender247_id: formData.tender247_id || null,
        gem_eprocure_id: formData.gem_eprocure_id || null,
        portal_link: formData.portal_link || null,
        tender_name: formData.tender_name,
        source: formData.source || null,
        tender_type: formData.tender_type || null,
        location: formData.location || null,
        last_date: formData.last_date || null,
        expected_start_date: formData.expected_start_date || null,
        expected_end_date: formData.expected_end_date || null,
        expected_days: formData.expected_days !== undefined && formData.expected_days !== null && formData.expected_days !== ''
          ? (Number.isNaN(parseInt(formData.expected_days, 10)) ? null : parseInt(formData.expected_days, 10))
          : null,
        msme_exempted: formData.msme_exempted,
        startup_exempted: formData.startup_exempted,
        emd_amount: parseFloat(formData.emd_amount) || 0,
        tender_fees: parseFloat(formData.tender_fees) || 0,
        tender_cost: parseFloat(formData.tender_cost) || 0,
        tender_notes: formData.tender_notes || null,
        pq_criteria: formData.pq_criteria || null,
        status: formData.status,
        assigned_to: assignedTo,
        not_bidding_reason: formData.not_bidding_reason || null,
        created_by: userId,
        status_updated_date: new Date().toISOString()
      }
    })

    // Insert in batches (Supabase has limits, so we'll do 50 at a time)
    const BATCH_SIZE = 50
    for (let i = 0; i < tenderDataArray.length; i += BATCH_SIZE) {
      const batch = tenderDataArray.slice(i, i + BATCH_SIZE)
      const batchStartIndex = i

      try {
        const { data, error } = await supabase
          .from(getTableName('tenders'))
          .insert(batch)
          .select()

        if (error) {
          // If batch fails, try individual inserts to identify which ones failed
          for (let j = 0; j < batch.length; j++) {
            try {
              const { data: singleData, error: singleError } = await supabase
                .from(getTableName('tenders'))
                .insert(batch[j])
                .select()
                .single()

              if (singleError) {
                errors.push({
                  index: batchStartIndex + j,
                  error: singleError.message || 'Failed to create tender'
                })
              } else if (singleData) {
                success.push(singleData)
              }
            } catch (singleErr: any) {
              errors.push({
                index: batchStartIndex + j,
                error: singleErr.message || 'Failed to create tender'
              })
            }
          }
        } else if (data) {
          success.push(...data)
        }
      } catch (batchErr: any) {
        // If batch insert fails completely, mark all as errors
        for (let j = 0; j < batch.length; j++) {
          errors.push({
            index: batchStartIndex + j,
            error: batchErr.message || 'Failed to create tender in batch'
          })
        }
      }
    }

    return { success, errors }
  },

  // Update tender
  async updateTender(tenderId: string, formData: TenderFormData): Promise<Tender> {
    const tenderData = {
      tender247_id: formData.tender247_id || null,
      gem_eprocure_id: formData.gem_eprocure_id || null,
      portal_link: formData.portal_link || null,
      tender_name: formData.tender_name,
      source: formData.source || null,
      tender_type: formData.tender_type || null,
      location: formData.location || null,
      last_date: formData.last_date || null,
      expected_start_date: formData.expected_start_date || null,
      expected_end_date: formData.expected_end_date || null,
      expected_days: formData.expected_days !== undefined && formData.expected_days !== null && formData.expected_days !== ''
        ? (Number.isNaN(parseInt(formData.expected_days, 10)) ? null : parseInt(formData.expected_days, 10))
        : null,
      msme_exempted: formData.msme_exempted,
      startup_exempted: formData.startup_exempted,
      emd_amount: parseFloat(formData.emd_amount) || 0,
      tender_fees: parseFloat(formData.tender_fees) || 0,
      tender_cost: parseFloat(formData.tender_cost) || 0,
      tender_notes: formData.tender_notes || null,
      pq_criteria: formData.pq_criteria || null,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
      not_bidding_reason: formData.not_bidding_reason || null
    }

    // Get tender info for sync and check if status is changing
    const { data: existingTender, error: fetchError } = await supabase
      .from(getTableName('tenders'))
      .select('company_id, created_by, status')
      .eq('id', tenderId)
      .single()

    if (fetchError) throw new Error(fetchError.message || 'Failed to fetch tender for update')

    // If status is changing, update status_updated_date
    if (existingTender.status !== formData.status) {
      tenderData.status_updated_date = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from(getTableName('tenders'))
      .update(tenderData)
      .eq('id', tenderId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update tender')

    // Update ONLY existing bid fees (do not create new ones)
    try {
      await updateExistingBidFees(
        tenderId,
        existingTender.company_id,
        parseFloat(formData.tender_fees) || 0,
        parseFloat(formData.emd_amount) || 0,
        {
          tender_name: formData.tender_name,
          tender247_id: formData.tender247_id,
          gem_eprocure_id: formData.gem_eprocure_id
        }
      )
    } catch (syncError: any) {
      console.error('Failed to update existing bid fees:', syncError)
      // Don't throw - tender is updated, sync failure is logged
    }

    return data
  },

  // Delete tender
  async deleteTender(tenderId: string): Promise<void> {
    const { error } = await supabase
      .from(getTableName('tenders'))
      .delete()
      .eq('id', tenderId)

    if (error) throw new Error(error.message || 'Failed to delete tender')
  },

  // Get upcoming deadlines
  async getUpcomingDeadlines(
    companyId: string,
    daysOrStart?: number | string,
    endDateStr?: string
  ): Promise<TenderWithUser[]> {
    // Resolve date range
    let startDateStr: string
    let endDateResolvedStr: string

    if (typeof daysOrStart === 'number') {
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysOrStart)
      const futureDateStr = futureDate.toISOString().split('T')[0]
      startDateStr = today
      endDateResolvedStr = futureDateStr
    } else if (typeof daysOrStart === 'string' && typeof endDateStr === 'string') {
      startDateStr = daysOrStart
      endDateResolvedStr = endDateStr
    } else {
      // default: last 30 days from today inclusive
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 30)
      startDateStr = start.toISOString().split('T')[0]
      endDateResolvedStr = end.toISOString().split('T')[0]
    }


    // Only include active pipeline statuses in Upcoming Deadlines
    const activeStatuses = ['assigned', 'under-study', 'on-hold', 'will-bid', 'pre-bid', 'wait-for-corrigendum', 'in-preparation', 'ready-to-submit']

    const { data, error } = await supabase
      .from(getTableName('tenders'))
      .select(`
        *,
        assigned_user:tender1_users!tender1_tenders_assigned_to_fkey(full_name)
      `)
      .eq('company_id', companyId)
      .in('status', activeStatuses)
      .gte('last_date', startDateStr)
      .lte('last_date', endDateResolvedStr)
      .order('last_date', { ascending: true })

    if (error) {
      console.error('Upcoming deadlines error:', error)
      throw new Error(error.message || 'Failed to fetch deadlines')
    }

    console.log('Upcoming deadlines query result:', {
      companyId,
      startDateStr,
      endDateResolvedStr,
      activeStatuses,
      resultCount: data?.length || 0,
      data: data?.map(t => ({ id: t.id, name: t.tender_name, status: t.status, last_date: t.last_date }))
    })

    return (data || []).map(tender => ({
      ...tender,
      assigned_user_name: tender.assigned_user?.full_name
    }))
  },

  // Get status counts for dashboard - counts should match what Tenders page shows
  // IMPORTANT: This now uses the SAME query approach as getTendersWithFilters to ensure exact match
  // Instead of fetching all and counting, we query each status directly using count queries (more accurate)
  async getStatusCounts(companyId: string, startDate?: string, endDate?: string): Promise<Record<string, number>> {
    console.log(`getStatusCounts called for company: ${companyId}`)
    
    // First, get all unique statuses to know which ones to count
    let baseQuery = supabase
      .from(getTableName('tenders'))
      .select('status')
      .eq('company_id', companyId) // Company filter - same as getTenders and getTendersWithFilters

    // Only apply date filters if dates are provided
    // Filter by status_updated_date (when status was last updated)
    if (startDate && endDate) {
      const sinceISO = new Date(startDate + 'T00:00:00.000Z').toISOString()
      const untilISO = new Date(endDate + 'T23:59:59.999Z').toISOString()
      baseQuery = baseQuery
        .gte('status_updated_date', sinceISO)
        .lte('status_updated_date', untilISO)
    }

    // Get all statuses to find unique ones
    const { data: allTenders, error } = await baseQuery

    if (error) throw new Error(error.message || 'Failed to fetch status counts')

    console.log(`getStatusCounts: Fetched ${allTenders?.length || 0} tenders for company ${companyId} (with company filter applied)`)

    // Get unique statuses
    const uniqueStatuses = [...new Set(allTenders?.map((t: any) => t.status).filter(Boolean))] as string[]
    console.log('getStatusCounts - Unique statuses found:', uniqueStatuses)

    // Count each status by querying directly (same approach as getTendersWithFilters uses)
    // This ensures we use the exact same query logic and get accurate counts
    const counts: Record<string, number> = {}
    
    // Query each status directly to get accurate count (matches getTendersWithFilters logic exactly)
    // Date filter uses status_updated_date (when status was last updated)
    const countPromises = uniqueStatuses.map(async (status) => {
      let statusQuery = supabase
        .from(getTableName('tenders'))
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', status)

      if (startDate && endDate) {
        const sinceISO = new Date(startDate + 'T00:00:00.000Z').toISOString()
        const untilISO = new Date(endDate + 'T23:59:59.999Z').toISOString()
        statusQuery = statusQuery
          .gte('status_updated_date', sinceISO)
          .lte('status_updated_date', untilISO)
      }

      const { count, error: countError } = await statusQuery
      if (countError) {
        console.error(`Error counting status ${status}:`, countError)
        return { status, count: 0 }
      }
      return { status, count: count || 0 }
    })

    const countResults = await Promise.all(countPromises)
    countResults.forEach(({ status, count }) => {
      counts[status] = count
    })

    console.log('getStatusCounts result:', counts)
    console.log(`getStatusCounts - Count for "under-study": ${counts['under-study'] || 0}`)
    
    return counts
  },

  // Get tender attachments
  async getTenderAttachments(tenderId: string) {
    const { data, error } = await supabase
      .from(getTableName('tender_attachments'))
      .select('*')
      .eq('tender_id', tenderId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to fetch attachments')
    return data || []
  },

  // Add attachment to tender
  async addTenderAttachment(tenderId: string, attachmentData: {
    file_name: string
    file_size: number
    file_type: string
    file_path: string
    file_url: string
    uploaded_by: string
  }) {
    const { data, error } = await supabase
      .from(getTableName('tender_attachments'))
      .insert({
        tender_id: tenderId,
        ...attachmentData
      })
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to add attachment')
    return data
  },

  // Delete attachment
  async deleteTenderAttachment(attachmentId: string) {
    const { error } = await supabase
      .from(getTableName('tender_attachments'))
      .delete()
      .eq('id', attachmentId)

    if (error) throw new Error(error.message || 'Failed to delete attachment')
  }
}
