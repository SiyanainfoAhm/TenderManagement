import { supabase } from '@/lib/supabase'
import { getTableName } from '@/config/database'
import {
  BidFee,
  BidFeeAttachment,
  BidFeeFilters,
  BidFeeFormEntry,
  Tender
} from '@/types'

const BID_FEE_TABLE = getTableName('bid_fees')
const BID_FEE_ATTACHMENT_TABLE = getTableName('bid_fee_attachments')
const DEFAULT_PAGE_SIZE = 25
const BID_FEE_ATTACHMENT_BUCKET = 'bid-fee-attachments'

interface ListOptions {
  page?: number
  pageSize?: number
  sortBy?: keyof BidFee
  sortDirection?: 'asc' | 'desc'
}

interface CreateBidFeesParams {
  companyId: string
  tender: Pick<Tender, 'id' | 'tender_name' | 'tender247_id' | 'gem_eprocure_id'>
  entries: BidFeeFormEntry[]
  createdBy: string
}

interface UploadAttachmentContext {
  companyId: string
  bidFeeId: string
  uploadedBy: string
}

async function attachFiles(
  files: File[] | undefined,
  context: UploadAttachmentContext
): Promise<BidFeeAttachment[]> {
  if (!files || files.length === 0) {
    return []
  }

  const attachments: BidFeeAttachment[] = []

  for (const file of files) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${fileExt ? `.${fileExt}` : ''}`
    const storagePath = `${context.companyId}/${context.bidFeeId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(BID_FEE_ATTACHMENT_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(uploadError.message || 'Failed to upload attachment')
    }

    const { data: publicUrlData } = supabase.storage
      .from(BID_FEE_ATTACHMENT_BUCKET)
      .getPublicUrl(storagePath)

    const attachmentPayload = {
      bid_fee_id: context.bidFeeId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      file_path: storagePath,
      file_url: publicUrlData.publicUrl,
      uploaded_by: context.uploadedBy
    }

    const { data: attachmentRecord, error: attachmentError } = await supabase
      .from(BID_FEE_ATTACHMENT_TABLE)
      .insert(attachmentPayload)
      .select()
      .single()

    if (attachmentError) {
      throw new Error(attachmentError.message || 'Failed to save attachment metadata')
    }

    attachments.push(attachmentRecord as BidFeeAttachment)
  }

  return attachments
}

async function hydrateAttachments(bidFees: BidFee[]): Promise<BidFee[]> {
  if (!bidFees.length) {
    return []
  }

  const ids = bidFees.map(fee => fee.id)

  const { data: attachmentRows, error: attachmentsError } = await supabase
    .from(BID_FEE_ATTACHMENT_TABLE)
    .select('*')
    .in('bid_fee_id', ids)
    .order('created_at', { ascending: false })

  if (attachmentsError) {
    throw new Error(attachmentsError.message || 'Failed to fetch bid fee attachments')
  }

  const grouped = new Map<string, BidFeeAttachment[]>()
  attachmentRows?.forEach(row => {
    const list = grouped.get(row.bid_fee_id) || []
    list.push(row as BidFeeAttachment)
    grouped.set(row.bid_fee_id, list)
  })

  return bidFees.map(fee => ({
    ...fee,
    attachments: grouped.get(fee.id) || []
  }))
}

function applyFilters(query: any, filters?: BidFeeFilters) {
  if (!filters) {
    return query
  }

  if (filters.fee_types && filters.fee_types.length > 0) {
    query = query.in('fee_type', filters.fee_types)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.payment_mode) {
    query = query.eq('payment_mode', filters.payment_mode)
  }

  if (filters.tender_id) {
    query = query.eq('tender_id', filters.tender_id)
  }

  if (filters.start_date) {
    query = query.gte('created_at', `${filters.start_date}T00:00:00.000Z`)
  }

  if (filters.end_date) {
    query = query.lte('created_at', `${filters.end_date}T23:59:59.999Z`)
  }

  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.trim()
    query = query.or(
      `tender_reference.ilike.%${searchTerm}%,tender_name_snapshot.ilike.%${searchTerm}%`
    )
  }

  return query
}

export const bidFeeService = {
  async listBidFees(
    companyId: string,
    filters?: BidFeeFilters,
    options?: ListOptions
  ): Promise<{ data: BidFee[]; total: number }> {
    const page = options?.page && options.page > 0 ? options.page : 1
    const pageSize = options?.pageSize && options.pageSize > 0 ? options.pageSize : DEFAULT_PAGE_SIZE
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const sortBy = options?.sortBy || 'created_at'
    const sortDirection = options?.sortDirection || 'desc'

    let query = supabase
      .from(BID_FEE_TABLE)
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order(sortBy as string, { ascending: sortDirection === 'asc' })
      .range(from, to)

    query = applyFilters(query, filters)

    const { data, error, count } = await query

    if (error) {
      throw new Error(error.message || 'Failed to fetch bid fees')
    }

    const hydrated = await hydrateAttachments((data || []) as BidFee[])

    return {
      data: hydrated,
      total: count || hydrated.length
    }
  },

  async createBidFees(params: CreateBidFeesParams): Promise<BidFee[]> {
    if (!params.entries.length) {
      throw new Error('No bid fee entries provided')
    }

    const tenderReference = params.tender.tender247_id || params.tender.gem_eprocure_id || params.tender.tender_name
    const createdFees: BidFee[] = []

    // Process each entry - ensure only one bid fee per type per tender
    for (const entry of params.entries) {
      // Get or create bid fee for this type
      const bidFeeId = await this.getOrCreateBidFee(
        params.tender.id,
        entry.fee_type,
        params.companyId,
        params.tender,
        params.createdBy
      )

      // Update the existing bid fee with new data
      const updatePayload: any = {
        tender_reference: tenderReference,
        tender_name_snapshot: params.tender.tender_name,
        payment_mode: entry.payment_mode,
        amount: entry.amount,
        refundable: entry.refundable,
        status: entry.status,
        due_date: entry.due_date || null,
        notes: entry.notes || null,
        utr_no: entry.utr_no || null,
        bank_name: entry.bank_name || null,
        ifsc: entry.ifsc || null,
        txn_date: entry.txn_date || null,
        gateway_ref: entry.gateway_ref || null,
        dd_no: entry.dd_no || null,
        payable_at: entry.payable_at || null,
        issue_date: entry.issue_date || null,
        expiry_date: entry.expiry_date || null,
        maturity_date: entry.maturity_date || null,
        issuing_bank: entry.issuing_bank || null,
        bg_no: entry.bg_no || null,
        bg_amount: entry.bg_amount || null,
        claim_period: entry.claim_period || null,
        urn_ref: entry.urn_ref || null,
        fdr_no: entry.fdr_no || null,
        bank: entry.bank || null,
        lien_marked: entry.lien_marked ?? null,
        receipt_no: entry.receipt_no || null
      }

      const { data: updatedFee, error: updateError } = await supabase
        .from(BID_FEE_TABLE)
        .update(updatePayload)
        .eq('id', bidFeeId)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message || `Failed to update bid fee for ${entry.fee_type}`)
      }

      const bidFee = updatedFee as BidFee

      // Handle attachments
      if (entry.attachments && entry.attachments.length > 0) {
        const attachments = await attachFiles(entry.attachments, {
          companyId: params.companyId,
          bidFeeId: bidFee.id,
          uploadedBy: params.createdBy
        })

        bidFee.attachments = attachments
      }

      createdFees.push(bidFee)

      // Sync bid fee to tender amount
      try {
        await this.syncBidFeeToTender(bidFee.id)
      } catch (syncError: any) {
        console.error('Failed to sync bid fee to tender:', syncError)
        // Don't throw - bid fee is created, sync failure is logged
      }
    }

    return createdFees
  },

  async updateBidFee(bidFeeId: string, payload: Partial<BidFee>): Promise<BidFee> {
    const { data, error } = await supabase
      .from(BID_FEE_TABLE)
      .update(payload)
      .eq('id', bidFeeId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to update bid fee')
    }

    // Sync bid fee to tender amount
    try {
      await this.syncBidFeeToTender(bidFeeId)
    } catch (syncError: any) {
      console.error('Failed to sync bid fee to tender:', syncError)
      // Don't throw - bid fee is updated, sync failure is logged
    }

    const [hydrated] = await hydrateAttachments([data as BidFee])

    return hydrated
  },

  async addAttachments(
    context: UploadAttachmentContext,
    files: File[]
  ): Promise<BidFeeAttachment[]> {
    return attachFiles(files, context)
  },

  async deleteAttachment(attachmentId: string, filePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from(BID_FEE_ATTACHMENT_BUCKET)
      .remove([filePath])

    if (storageError) {
      throw new Error(storageError.message || 'Failed to delete attachment file')
    }

    const { error: deleteError } = await supabase
      .from(BID_FEE_ATTACHMENT_TABLE)
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      throw new Error(deleteError.message || 'Failed to delete attachment metadata')
    }
  },

  async deleteBidFee(bidFeeId: string): Promise<void> {
    // Get bid fee details before deletion to sync with tender
    const { data: bidFee, error: fetchError } = await supabase
      .from(BID_FEE_TABLE)
      .select('tender_id, fee_type')
      .eq('id', bidFeeId)
      .single()

    if (fetchError) {
      throw new Error(fetchError.message || 'Failed to fetch bid fee for deletion')
    }

    const { data: attachments, error: attachmentsError } = await supabase
      .from(BID_FEE_ATTACHMENT_TABLE)
      .select('id, file_path')
      .eq('bid_fee_id', bidFeeId)

    if (attachmentsError) {
      throw new Error(attachmentsError.message || 'Failed to find attachments for deletion')
    }

    if (attachments && attachments.length > 0) {
      const filePaths = attachments.map(item => item.file_path)
      const { error: storageError } = await supabase.storage
        .from(BID_FEE_ATTACHMENT_BUCKET)
        .remove(filePaths)

      if (storageError) {
        throw new Error(storageError.message || 'Failed to delete attachment files')
      }

      const { error: deleteAttachmentsError } = await supabase
        .from(BID_FEE_ATTACHMENT_TABLE)
        .delete()
        .eq('bid_fee_id', bidFeeId)

      if (deleteAttachmentsError) {
        throw new Error(deleteAttachmentsError.message || 'Failed to delete attachments meta')
      }
    }

    // Update bid fee amount to 0 instead of deleting
    const { error: updateError } = await supabase
      .from(BID_FEE_TABLE)
      .update({ amount: 0 })
      .eq('id', bidFeeId)

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update bid fee')
    }

    // Sync to tender - set corresponding amount to 0
    if (bidFee) {
      const updateField = bidFee.fee_type === 'tender-fees' ? 'tender_fees' : 'emd_amount'
      const { error: tenderUpdateError } = await supabase
        .from(getTableName('tenders'))
        .update({ [updateField]: 0 })
        .eq('id', bidFee.tender_id)

      if (tenderUpdateError) {
        console.error('Failed to sync bid fee deletion to tender:', tenderUpdateError)
        // Don't throw - bid fee is already updated, tender sync failure is logged
      }
    }
  },

  // Sync bid fee changes to tender
  async syncBidFeeToTender(bidFeeId: string): Promise<void> {
    const { data: bidFee, error } = await supabase
      .from(BID_FEE_TABLE)
      .select('tender_id, fee_type, amount')
      .eq('id', bidFeeId)
      .single()

    if (error || !bidFee) {
      throw new Error(error?.message || 'Failed to fetch bid fee for sync')
    }

    const updateField = bidFee.fee_type === 'tender-fees' ? 'tender_fees' : 'emd_amount'
    const { error: updateError } = await supabase
      .from(getTableName('tenders'))
      .update({ [updateField]: bidFee.amount || 0 })
      .eq('id', bidFee.tender_id)

    if (updateError) {
      throw new Error(updateError.message || 'Failed to sync bid fee to tender')
    }
  },

  // Get or create single bid fee for a tender and fee type
  async getOrCreateBidFee(
    tenderId: string,
    feeType: 'tender-fees' | 'emd',
    companyId: string,
    tender: Pick<Tender, 'tender_name' | 'tender247_id' | 'gem_eprocure_id'>,
    userId: string
  ): Promise<string> {
    // Check if bid fee already exists
    const { data: existing, error: fetchError } = await supabase
      .from(BID_FEE_TABLE)
      .select('id')
      .eq('tender_id', tenderId)
      .eq('fee_type', feeType)
      .limit(1)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - that's fine, we'll create one
      throw new Error(fetchError.message || 'Failed to check existing bid fee')
    }

    if (existing) {
      return existing.id
    }

    // Create new bid fee record
    const tenderReference = tender.tender247_id || tender.gem_eprocure_id || tender.tender_name
    const { data: newBidFee, error: createError } = await supabase
      .from(BID_FEE_TABLE)
      .insert({
        company_id: companyId,
        tender_id: tenderId,
        tender_reference: tenderReference,
        tender_name_snapshot: tender.tender_name,
        fee_type: feeType,
        payment_mode: 'online',
        amount: 0,
        refundable: false,
        status: 'pending',
        created_by: userId
      })
      .select('id')
      .single()

    if (createError) {
      throw new Error(createError.message || 'Failed to create bid fee')
    }

    return newBidFee.id
  }
}



