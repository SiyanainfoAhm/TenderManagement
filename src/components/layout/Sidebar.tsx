import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedCompany, logout } = useAuth()

  const menuItems = [
    { 
      path: '/dashboard', 
      icon: 'ri-dashboard-line', 
      label: 'Dashboard', 
      roles: ['admin', 'user', 'viewer'] 
    },
    { 
      path: '/tenders', 
      icon: 'ri-file-list-3-line', 
      label: 'Tenders', 
      roles: ['admin', 'user'] 
    },
    { 
      path: '/users', 
      icon: 'ri-team-line', 
      label: 'Users', 
      roles: ['admin'] 
    },
  ]

  // Filter menu items based on user's role in the selected company
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(selectedCompany?.role || 'viewer')
  )

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo & Company */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-3">
            <i className="ri-file-list-3-line text-white text-xl"></i>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Tender Manager</h1>
          </div>
        </div>
        {selectedCompany && (
          <div className="text-sm text-gray-600 truncate" title={selectedCompany.company_name}>
            <i className="ri-building-line mr-1"></i>
            {selectedCompany.company_name}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <i className={`${item.icon} text-lg mr-3`}></i>
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <i className="ri-logout-circle-line text-lg mr-3"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

