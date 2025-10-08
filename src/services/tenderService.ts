import { supabase } from '@/lib/supabase'
import { Tender, TenderWithUser, TenderFormData } from '@/types'

export const tenderService = {
  // Get all tenders for a company
  async getTenders(companyId: string): Promise<TenderWithUser[]> {
    const { data, error } = await supabase
      .from('tender_tenders')
      .select(`
        *,
        assigned_user:tender_users!tender_tenders_assigned_to_fkey(full_name),
        created_user:tender_users!tender_tenders_created_by_fkey(full_name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to fetch tenders')

    return (data || []).map(tender => ({
      ...tender,
      assigned_user_name: tender.assigned_user?.full_name,
      created_user_name: tender.created_user?.full_name
    }))
  },

  // Get single tender by ID
  async getTenderById(tenderId: string): Promise<TenderWithUser> {
    const { data, error } = await supabase
      .from('tender_tenders')
      .select(`
        *,
        assigned_user:tender_users!tender_tenders_assigned_to_fkey(full_name),
        created_user:tender_users!tender_tenders_created_by_fkey(full_name)
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

  // Create new tender
  async createTender(companyId: string, userId: string, formData: TenderFormData): Promise<Tender> {
    const tenderData = {
      company_id: companyId,
      tender247_id: formData.tender247_id || null,
      gem_eprocure_id: formData.gem_eprocure_id || null,
      portal_link: formData.portal_link || null,
      tender_name: formData.tender_name,
      source: formData.source || null,
      location: formData.location || null,
      last_date: formData.last_date || null,
      msme_exempted: formData.msme_exempted,
      startup_exempted: formData.startup_exempted,
      emd_amount: parseFloat(formData.emd_amount) || 0,
      tender_fees: parseFloat(formData.tender_fees) || 0,
      tender_cost: parseFloat(formData.tender_cost) || 0,
      tender_notes: formData.tender_notes || null,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
      not_bidding_reason: formData.not_bidding_reason || null,
      created_by: userId
    }

    const { data, error } = await supabase
      .from('tender_tenders')
      .insert(tenderData)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to create tender')

    return data
  },

  // Update tender
  async updateTender(tenderId: string, formData: TenderFormData): Promise<Tender> {
    const tenderData = {
      tender247_id: formData.tender247_id || null,
      gem_eprocure_id: formData.gem_eprocure_id || null,
      portal_link: formData.portal_link || null,
      tender_name: formData.tender_name,
      source: formData.source || null,
      location: formData.location || null,
      last_date: formData.last_date || null,
      msme_exempted: formData.msme_exempted,
      startup_exempted: formData.startup_exempted,
      emd_amount: parseFloat(formData.emd_amount) || 0,
      tender_fees: parseFloat(formData.tender_fees) || 0,
      tender_cost: parseFloat(formData.tender_cost) || 0,
      tender_notes: formData.tender_notes || null,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
      not_bidding_reason: formData.not_bidding_reason || null
    }

    const { data, error } = await supabase
      .from('tender_tenders')
      .update(tenderData)
      .eq('id', tenderId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update tender')

    return data
  },

  // Delete tender
  async deleteTender(tenderId: string): Promise<void> {
    const { error } = await supabase
      .from('tender_tenders')
      .delete()
      .eq('id', tenderId)

    if (error) throw new Error(error.message || 'Failed to delete tender')
  },

  // Get upcoming deadlines
  async getUpcomingDeadlines(companyId: string, days: number = 7): Promise<TenderWithUser[]> {
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('tender_tenders')
      .select(`
        *,
        assigned_user:tender_users!tender_tenders_assigned_to_fkey(full_name)
      `)
      .eq('company_id', companyId)
      .gte('last_date', today)
      .lte('last_date', futureDateStr)
      .order('last_date', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to fetch deadlines')

    return (data || []).map(tender => ({
      ...tender,
      assigned_user_name: tender.assigned_user?.full_name
    }))
  }
}

