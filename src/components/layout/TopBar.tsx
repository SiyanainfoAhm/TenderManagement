import { useAuth } from '@/contexts/AuthContext'
import CompanySwitcher from './CompanySwitcher'

export default function TopBar() {
  const { user, selectedCompany } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex-1">
        {/* Can be used for breadcrumbs or page title */}
      </div>

      <div className="flex items-center space-x-4">
        {/* Company Switcher */}
        <CompanySwitcher />
        
        {/* User Info - Show user name and email */}
        {user && (
          <div className="flex items-center space-x-3">
            {/* User Avatar */}
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            
            {/* User Details */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

