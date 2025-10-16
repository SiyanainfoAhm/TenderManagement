import { supabase } from '@/lib/supabase'
import { User, UserFormData, CompanyMember } from '@/types'
import { getTableName, getFunctionName } from '@/config/database'

export const userService = {
  // Get all users for a company (via user_companies junction table)
  async getCompanyUsers(companyId: string): Promise<CompanyMember[]> {
    // First get the user IDs from the junction table
    const { data: userCompanies, error: ucError } = await supabase
      .from(getTableName('user_companies'))
      .select('user_id, role, is_active, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (ucError) throw new Error(ucError.message || 'Failed to fetch user companies')

    if (!userCompanies || userCompanies.length === 0) {
      return []
    }

    // Get user IDs
    const userIds = userCompanies.map(uc => uc.user_id)

    // Then get the user details
    const { data: users, error: usersError } = await supabase
      .from(getTableName('users'))
      .select('id, full_name, email, last_login')
      .in('id', userIds)

    if (usersError) throw new Error(usersError.message || 'Failed to fetch users')

    // Combine the data
    return userCompanies.map((uc: any) => {
      const user = users?.find((u: any) => u.id === uc.user_id)
      return {
        user_id: uc.user_id,
        full_name: user?.full_name || '',
        email: user?.email || '',
        role: uc.role,
        is_active: uc.is_active,
        last_login: user?.last_login,
        joined_at: uc.created_at
      }
    })
  },

  // Get single user by ID
  async getUserById(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from(getTableName('users'))
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw new Error(error.message || 'Failed to fetch user')

    // Get user's companies using the database function
    const { data: userCompanies, error: companiesError } = await supabase
      .rpc(getFunctionName('get_user_companies'), {
        p_user_id: userId
      })

    if (companiesError) throw new Error(companiesError.message || 'Failed to fetch user companies')

    // Transform companies data
    const companies = (userCompanies || []).map((c: any) => ({
      company_id: c.company_id,
      company_name: c.company_name,
      company_email: c.company_email,
      role: c.role,
      is_active: c.is_active,
      is_default: c.is_default
    }))

    return {
      ...data,
      companies: companies
    }
  },

  // Create new user and add to company
  async createUser(companyId: string, formData: UserFormData): Promise<string> {
    if (!formData.password) {
      throw new Error('Password is required')
    }

    const { data: userId, error } = await supabase.rpc(getFunctionName('create_user'), {
      p_full_name: formData.full_name,
      p_email: formData.email,
      p_password: formData.password,
      p_company_id: companyId,
      p_role: formData.role
    })

    if (error) {
      if (error.message.includes('duplicate key')) {
        throw new Error('Email already exists')
      }
      throw new Error(error.message || 'Failed to create user')
    }

    return userId
  },

  // Update user's role in a specific company
  async updateUserRole(userId: string, companyId: string, role: 'admin' | 'user' | 'viewer'): Promise<void> {
    const { error } = await supabase
      .from(getTableName('user_companies'))
      .update({ role })
      .eq('user_id', userId)
      .eq('company_id', companyId)

    if (error) throw new Error(error.message || 'Failed to update user role')
  },

  // Update user's basic info (name, etc.)
  async updateUser(userId: string, formData: Partial<UserFormData>): Promise<User> {
    const updateData: any = {}
    
    if (formData.full_name) updateData.full_name = formData.full_name

    const { data, error} = await supabase
      .from(getTableName('users'))
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update user')

    return data
  },

  // Remove user from company (deactivate their access)
  async removeUserFromCompany(userId: string, companyId: string): Promise<void> {
    const { error } = await supabase
      .from(getTableName('user_companies'))
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('company_id', companyId)

    if (error) throw new Error(error.message || 'Failed to remove user from company')
  },

  // Restore user access to company
  async restoreUserToCompany(userId: string, companyId: string): Promise<void> {
    const { error } = await supabase
      .from(getTableName('user_companies'))
      .update({ is_active: true })
      .eq('user_id', userId)
      .eq('company_id', companyId)

    if (error) throw new Error(error.message || 'Failed to restore user access')
  },

  // Completely remove user from company (delete relationship)
  async deleteUserFromCompany(userId: string, companyId: string): Promise<void> {
    const { error } = await supabase.rpc(getFunctionName('remove_user_from_company'), {
      p_user_id: userId,
      p_company_id: companyId
    })

    if (error) throw new Error(error.message || 'Failed to delete user from company')
  },

  // Add existing user to company
  async addUserToCompany(userId: string, companyId: string, role: 'admin' | 'user' | 'viewer', invitedBy: string): Promise<void> {
    const { error } = await supabase.rpc(getFunctionName('add_user_to_company'), {
      p_user_id: userId,
      p_company_id: companyId,
      p_role: role,
      p_invited_by: invitedBy
    })

    if (error) {
      if (error.message.includes('duplicate key')) {
        throw new Error('User already has access to this company')
      }
      throw new Error(error.message || 'Failed to add user to company')
    }
  },

  // Change password
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const { error } = await supabase.rpc(getFunctionName('update_user_password'), {
      p_user_id: userId,
      p_old_password: oldPassword,
      p_new_password: newPassword
    })

    if (error) throw new Error(error.message || 'Failed to change password')
  },

  // Legacy methods for backward compatibility (deprecated)
  async deleteUser(userId: string): Promise<void> {
    console.warn('deleteUser is deprecated. Use removeUserFromCompany instead.')
    const { error } = await supabase
      .from(getTableName('users'))
      .update({ is_active: false })
      .eq('id', userId)

    if (error) throw new Error(error.message || 'Failed to delete user')
  },

  async activateUser(userId: string): Promise<void> {
    console.warn('activateUser is deprecated. Use restoreUserToCompany instead.')
    const { error } = await supabase
      .from(getTableName('users'))
      .update({ is_active: true })
      .eq('id', userId)

    if (error) throw new Error(error.message || 'Failed to activate user')
  }
}
