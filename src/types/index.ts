// Company Types
export interface Company {
  id: string
  company_name: string
  company_email: string
  company_phone?: string
  company_address?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// User Company Access (Junction Table)
export interface UserCompanyAccess {
  company_id: string
  company_name: string
  company_email: string
  role: 'admin' | 'user' | 'viewer'
  is_active: boolean
  is_default: boolean
}

// User Types (Multi-Company)
export interface User {
  id: string
  full_name: string
  email: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
  companies: UserCompanyAccess[] // Array of companies user has access to
}

// Extended user with selected company info
export interface UserWithCompany extends User {
  selectedCompany: UserCompanyAccess | null
}

// Legacy User Type (for backwards compatibility during migration)
export interface LegacyUser {
  id: string
  company_id: string
  full_name: string
  email: string
  role: 'admin' | 'user'
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
  company_name?: string
}

// Tender Types
export interface Tender {
  id: string
  company_id: string
  tender247_id?: string
  gem_eprocure_id?: string
  portal_link?: string
  tender_name: string
  source?: 'tender247' | 'gem' | 'nprocure' | 'eprocure' | 'other'
  tender_type?: string
  location?: string
  last_date?: string
  expected_start_date?: string | null
  expected_end_date?: string | null
  expected_days?: number | null
  msme_exempted: boolean
  startup_exempted: boolean
  emd_amount: number
  tender_fees: number
  tender_cost: number
  tender_notes?: string
  pq_criteria?: string
  status:
    | 'new'
    | 'under-study'
    | 'on-hold'
    | 'will-bid'
    | 'pre-bid'
    | 'wait-for-corrigendum'
    | 'not-bidding'
    | 'assigned'
    | 'in-preparation'
    | 'ready-to-submit'
    | 'submitted'
    | 'under-evaluation'
    | 'qualified'
    | 'not-qualified'
    | 'won'
    | 'lost'
  assigned_to?: string
  not_bidding_reason?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// Tender with user details
export interface TenderWithUser extends Tender {
  assigned_user_name?: string
  created_user_name?: string
}

// Bid Fee Types
export type BidFeeType =
  | 'tender-fees'
  | 'emd'
  | 'processing-fees'
  | 'performance-guarantee'
  | 'other'

export type BidFeePaymentMode =
  | 'NEFT/RTGS'
  | 'Net-Banking/UPI'
  | 'DD / Banker\'s Cheque'
  | 'FDR'
  | 'Bank Guarantee / e-BG'
  | 'Cash'
  | 'Other'

export type BidFeeStatus =
  | 'pending'
  | 'submitted'
  | 'paid'
  | 'refunded'
  | 'released'
  | 'expired'

export interface BidFeeAttachment {
  id: string
  bid_fee_id: string
  file_name: string
  file_size: number
  file_type: string
  file_path: string
  file_url: string
  uploaded_by: string
  created_at: string
}

export interface BidFee {
  id: string
  company_id: string
  tender_id: string
  tender_reference?: string | null
  tender_name_snapshot?: string | null
  fee_type: BidFeeType
  payment_mode: BidFeePaymentMode
  amount: number
  refundable: boolean
  status: BidFeeStatus
  due_date?: string | null
  notes?: string | null
  utr_no?: string | null
  bank_name?: string | null
  ifsc?: string | null
  txn_date?: string | null
  gateway_ref?: string | null
  dd_no?: string | null
  payable_at?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  maturity_date?: string | null
  issuing_bank?: string | null
  bg_no?: string | null
  bg_amount?: number | null
  claim_period?: string | null
  urn_ref?: string | null
  fdr_no?: string | null
  bank?: string | null
  lien_marked?: boolean | null
  receipt_no?: string | null
  created_by: string
  created_at: string
  updated_at: string
  tender?: Pick<Tender, 'tender_name' | 'tender247_id' | 'gem_eprocure_id'>
  attachments?: BidFeeAttachment[]
}

export interface BidFeeFormEntry {
  fee_type: BidFeeType
  payment_mode: BidFeePaymentMode
  amount: number
  refundable: boolean
  status: BidFeeStatus
  due_date?: string | null
  notes?: string | null
  utr_no?: string | null
  bank_name?: string | null
  ifsc?: string | null
  txn_date?: string | null
  gateway_ref?: string | null
  dd_no?: string | null
  payable_at?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  maturity_date?: string | null
  issuing_bank?: string | null
  bg_no?: string | null
  bg_amount?: number | null
  claim_period?: string | null
  urn_ref?: string | null
  fdr_no?: string | null
  bank?: string | null
  lien_marked?: boolean | null
  receipt_no?: string | null
  attachments?: File[]
}

export interface BidFeeFilters {
  search?: string
  fee_types?: BidFeeType[]
  status?: BidFeeStatus
  payment_mode?: BidFeePaymentMode
  start_date?: string
  end_date?: string
  tender_id?: string
}

// Tender History Types
export interface TenderHistory {
  id: string
  tender_id: string
  changed_by?: string
  action: 'created' | 'updated' | 'deleted' | 'status_changed'
  old_values?: any
  new_values?: any
  change_description?: string
  created_at: string
}

// Dashboard Stats
export interface DashboardStats {
  total_tenders: number
  submitted_bids: number
  not_bidding: number
  active_users: number
  upcoming_deadlines: number
}

// Company Invitation
export interface CompanyInvitation {
  id: string
  company_id: string
  email: string
  role: 'admin' | 'user' | 'viewer'
  invited_by: string
  invitation_token: string
  expires_at: string
  accepted: boolean
  accepted_at?: string
  created_at: string
}

// Form Types
export interface LoginFormData {
  email: string
  password: string
}

export interface SignupFormData {
  company_name: string
  company_email: string
  company_phone?: string
  full_name: string
  email: string
  password: string
  confirm_password: string
}

export interface TenderFormData {
  tender247_id?: string
  gem_eprocure_id?: string
  portal_link?: string
  tender_name: string
  source?: string
  tender_type?: string
  location?: string
  last_date?: string
  expected_start_date?: string
  expected_end_date?: string
  expected_days?: string
  msme_exempted: boolean
  startup_exempted: boolean
  emd_amount: string
  tender_fees: string
  tender_cost: string
  tender_notes?: string
  pq_criteria?: string
  status: string
  assigned_to?: string
  not_bidding_reason?: string
}

export interface UserFormData {
  full_name: string
  email: string
  password?: string
  role: 'admin' | 'user' | 'viewer'
}

export interface InviteUserFormData {
  email: string
  role: 'admin' | 'user' | 'viewer'
}

// Auth Context Type (Multi-Company)
export interface AuthContextType {
  user: UserWithCompany | null
  loading: boolean
  selectedCompany: UserCompanyAccess | null
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupFormData) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => void
  switchCompany: (companyId: string) => Promise<void>
  refreshUserCompanies: () => Promise<void>
}

// Company Management Types
export interface CompanyMember {
  user_id: string
  full_name: string
  email: string
  role: 'admin' | 'user' | 'viewer'
  is_active: boolean
  last_login?: string
  joined_at: string
}

export interface CompanyAccessRequest {
  user_id: string
  company_id: string
  role: 'admin' | 'user' | 'viewer'
}
