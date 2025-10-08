import { supabase } from '@/lib/supabase'
import { User, UserFormData } from '@/types'

export const userService = {
  // Get all users for a company
  async getCompanyUsers(companyId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('tender_users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to fetch users')

    return data || []
  },

  // Get single user by ID
  async getUserById(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from('tender_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw new Error(error.message || 'Failed to fetch user')

    return data
  },

  // Create new user
  async createUser(companyId: string, formData: UserFormData): Promise<string> {
    if (!formData.password) {
      throw new Error('Password is required')
    }

    const { data: userId, error } = await supabase.rpc('tender_create_user', {
      p_company_id: companyId,
      p_full_name: formData.full_name,
      p_email: formData.email,
      p_password: formData.password,
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

  // Update user (name and role only, not password)
  async updateUser(userId: string, formData: Partial<UserFormData>): Promise<User> {
    const updateData: any = {}
    
    if (formData.full_name) updateData.full_name = formData.full_name
    if (formData.role) updateData.role = formData.role

    const { data, error } = await supabase
      .from('tender_users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update user')

    return data
  },

  // Delete user (deactivate)
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('tender_users')
      .update({ is_active: false })
      .eq('id', userId)

    if (error) throw new Error(error.message || 'Failed to delete user')
  },

  // Activate user
  async activateUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('tender_users')
      .update({ is_active: true })
      .eq('id', userId)

    if (error) throw new Error(error.message || 'Failed to activate user')
  },

  // Change password
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const { error } = await supabase.rpc('tender_update_user_password', {
      p_user_id: userId,
      p_old_password: oldPassword,
      p_new_password: newPassword
    })

    if (error) throw new Error(error.message || 'Failed to change password')
  }
}

