import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { userService } from '@/services/userService'
import { CompanyMember, UserFormData } from '@/types'
import MainLayout from '@/components/layout/MainLayout'
import Button from '@/components/base/Button'
import Input from '@/components/base/Input'
import Select from '@/components/base/Select'
import Modal from '@/components/base/Modal'
import Badge from '@/components/base/Badge'
import InviteUserModal from '@/components/users/InviteUserModal'

export default function Users() {
  const { user: currentUser, selectedCompany } = useAuth()
  const [users, setUsers] = useState<CompanyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<CompanyMember | null>(null)

  // Form data
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    password: '',
    role: 'user'
  })

  useEffect(() => {
    loadUsers()
  }, [currentUser])

  const loadUsers = async () => {
    if (!currentUser || !selectedCompany) return

    try {
      setLoading(true)
      const usersData = await userService.getCompanyUsers(selectedCompany.company_id)
      setUsers(usersData)
    } catch (error: any) {
      console.error('Failed to load users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'user'
    })
  }

  const handleAdd = () => {
    resetForm()
    setError('')
    setIsAddModalOpen(true)
  }

  const handleEdit = (user: CompanyMember) => {
    setSelectedUser(user)
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '', // Don't populate password
      role: user.role
    })
    setError('')
    setIsEditModalOpen(true)
  }

  const handleDelete = (user: CompanyMember) => {
    setSelectedUser(user)
    setIsDeleteModalOpen(true)
  }

  const handleSubmitAdd = async () => {
    if (!currentUser || !selectedCompany) return

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      
      // Try to create new user first
      try {
        await userService.createUser(selectedCompany.company_id, formData)
        await loadUsers()
        setIsAddModalOpen(false)
        resetForm()
      } catch (createError: any) {
        // If email already exists, check if we should add them to this company
        if (createError.message.includes('Email already exists')) {
          // Show helpful message
          setError(`Email ${formData.email} already exists. This user is already registered in the system. If you want to add them to your company, please use the "Invite User" feature (coming soon) or ask them to login and you can assign them access.`)
        } else {
          throw createError
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!selectedUser || !selectedCompany) return

    try {
      setSubmitting(true)
      setError('')
      // Update user's basic info
      await userService.updateUser(selectedUser.user_id, {
        full_name: formData.full_name
      })
      // Update user's role in this company
      await userService.updateUserRole(selectedUser.user_id, selectedCompany.company_id, formData.role)
      await loadUsers()
      setIsEditModalOpen(false)
      setSelectedUser(null)
      resetForm()
    } catch (error: any) {
      setError(error.message || 'Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedUser || !selectedCompany) return

    // Prevent deleting yourself
    if (selectedUser.user_id === currentUser?.id) {
      setError('You cannot delete your own account')
      return
    }

    try {
      setSubmitting(true)
      await userService.deleteUserFromCompany(selectedUser.user_id, selectedCompany.company_id)
      await loadUsers()
      setIsDeleteModalOpen(false)
      setSelectedUser(null)
    } catch (error: any) {
      setError(error.message || 'Failed to delete user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (user: CompanyMember) => {
    if (!selectedCompany) return
    
    // Prevent deactivating yourself
    if (user.user_id === currentUser?.id) {
      setError('You cannot deactivate your own account')
      return
    }

    try {
      if (user.is_active) {
        await userService.removeUserFromCompany(user.user_id, selectedCompany.company_id)
      } else {
        await userService.restoreUserToCompany(user.user_id, selectedCompany.company_id)
      }
      await loadUsers()
    } catch (error: any) {
      setError(error.message || 'Failed to update user status')
    }
  }

  const getRoleBadge = (role: string) => {
    return role === 'admin' 
      ? <Badge variant="blue">Admin</Badge>
      : <Badge variant="gray">User</Badge>
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <Badge variant="green">Active</Badge>
      : <Badge variant="red">Inactive</Badge>
  }

  const roleOptions = [
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' }
  ]

  // Show all users (filter removed)
  const filteredUsers = users

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600 mt-1">Manage team members and their access</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setIsInviteModalOpen(true)}>
              <i className="ri-user-add-line mr-2"></i>
              Add User
            </Button>
          </div>
        </div>

        {/* Global Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <i className="ri-error-warning-line text-red-600 text-xl mr-2 flex-shrink-0"></i>
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-700">
              <i className="ri-close-line"></i>
            </button>
          </div>
        )}

        {/* Filter */}

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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <i className="ri-team-line text-4xl text-gray-400 mb-2"></i>
                        <p className="text-gray-500">No users found</p>
                      </td>
                    </tr>
                  ) : (
                    currentUsers.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-700 text-sm font-semibold">
                                {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                              {user.user_id === currentUser?.id && (
                                <span className="text-xs text-gray-500">(You)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                        <td className="px-6 py-4">{getStatusBadge(user.is_active)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-gray-600 hover:text-gray-700"
                              title="Edit"
                              disabled={user.user_id === currentUser?.id && user.role === 'admin' && users.filter(u => u.role === 'admin' && u.is_active).length === 1}
                            >
                              <i className="ri-edit-line text-lg"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                              disabled={user.user_id === currentUser?.id}
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
            {filteredUsers.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New User" size="md">
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <i className="ri-error-warning-line text-red-600 text-xl mr-2 flex-shrink-0"></i>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Input
              label="Full Name *"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Doe"
              icon="ri-user-line"
              required
            />

            <Input
              label="Email Address *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@company.com"
              icon="ri-mail-line"
              required
            />

            <Input
              label="Password *"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              icon="ri-lock-line"
              required
            />

            <Select
              label="Role *"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
              options={roleOptions}
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitAdd} loading={submitting}>Add User</Button>
            </div>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User" size="md">
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <i className="ri-error-warning-line text-red-600 text-xl mr-2 flex-shrink-0"></i>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Input
              label="Full Name *"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Doe"
              icon="ri-user-line"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  disabled
                  readOnly
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="ri-mail-line text-gray-400"></i>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <Select
              label="Role *"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
              options={roleOptions}
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitEdit} loading={submitting}>Update User</Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Delete" size="sm">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-delete-bin-line text-red-600 text-xl"></i>
            </div>
            <p className="text-gray-900 mb-2">Are you sure you want to delete this user?</p>
            <p className="text-sm text-gray-600 mb-2">{selectedUser?.full_name} will lose access immediately.</p>
            <p className="text-xs text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleConfirmDelete} loading={submitting}>Delete</Button>
            </div>
          </div>
        </Modal>

        {/* Invite Existing User Modal */}
        <InviteUserModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onSuccess={() => {
            loadUsers()
            setIsInviteModalOpen(false)
          }}
        />
      </div>
    </MainLayout>
  )
}

