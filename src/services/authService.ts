import { supabase } from '@/lib/supabase'
import { SignupFormData, UserWithCompany } from '@/types'

export const authService = {
  // Authenticate user
  async login(email: string, password: string): Promise<UserWithCompany> {
    const { data, error } = await supabase.rpc('tender_authenticate_user', {
      user_email: email,
      user_password: password
    })

    if (error) throw new Error(error.message || 'Login failed')
    if (!data || data.length === 0) throw new Error('Invalid credentials')

    const userData = data[0]
    return {
      id: userData.user_id,
      company_id: userData.company_id,
      company_name: userData.company_name,
      full_name: userData.full_name,
      email: userData.email,
      role: userData.role,
      is_active: userData.is_active,
      created_at: '',
      updated_at: ''
    }
  },

  // Register new company and user
  async signup(formData: SignupFormData): Promise<UserWithCompany> {
    // First, create the company
    const { data: companyData, error: companyError } = await supabase
      .from('tender_companies')
      .insert({
        company_name: formData.company_name,
        company_email: formData.company_email,
        company_phone: formData.company_phone || null
      })
      .select()
      .single()

    if (companyError) {
      if (companyError.code === '23505') {
        throw new Error('Company email already exists')
      }
      throw new Error(companyError.message || 'Failed to create company')
    }

    // Then create the user (first user is always admin)
    const { data: userId, error: userError } = await supabase.rpc('tender_create_user', {
      p_company_id: companyData.id,
      p_full_name: formData.full_name,
      p_email: formData.email,
      p_password: formData.password,
      p_role: 'admin' // First user is always admin
    })

    if (userError) {
      // Rollback: delete the company
      await supabase.from('tender_companies').delete().eq('id', companyData.id)
      
      if (userError.message.includes('duplicate key')) {
        throw new Error('Email already exists')
      }
      throw new Error(userError.message || 'Failed to create user')
    }

    // Return user data
    return {
      id: userId,
      company_id: companyData.id,
      company_name: companyData.company_name,
      full_name: formData.full_name,
      email: formData.email,
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },

  // Verify session (check if stored user is still valid)
  async verifySession(userId: string): Promise<UserWithCompany | null> {
    const { data, error } = await supabase
      .from('tender_users')
      .select(`
        *,
        tender_companies (
          company_name
        )
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    return {
      ...data,
      company_name: data.tender_companies?.company_name || ''
    } as any
  }
}

