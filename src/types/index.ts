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

// User Types
export interface User {
  id: string
  company_id: string
  full_name: string
  email: string
  role: 'admin' | 'user'
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

// Extended user with company info
export interface UserWithCompany extends User {
  company_name: string
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
  location?: string
  last_date?: string
  msme_exempted: boolean
  startup_exempted: boolean
  emd_amount: number
  tender_fees: number
  tender_cost: number
  tender_notes?: string
  status: 'study' | 'pre-bid' | 'corrigendum' | 'not-bidding' | 'assigned' | 'submitted'
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
  location?: string
  last_date?: string
  msme_exempted: boolean
  startup_exempted: boolean
  emd_amount: string
  tender_fees: string
  tender_cost: string
  tender_notes?: string
  status: string
  assigned_to?: string
  not_bidding_reason?: string
}

export interface UserFormData {
  full_name: string
  email: string
  password?: string
  role: 'admin' | 'user'
}

// Auth Context Type
export interface AuthContextType {
  user: UserWithCompany | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupFormData) => Promise<void>
  logout: () => void
}

