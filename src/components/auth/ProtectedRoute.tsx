import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, selectedCompany, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line animate-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check role in selected company for multi-company support
  if (requireAdmin && selectedCompany?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <i className="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. Please contact your administrator.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Your role in {selectedCompany?.company_name || 'this company'}: <strong>{selectedCompany?.role || 'viewer'}</strong>
          </p>
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Go Back
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

