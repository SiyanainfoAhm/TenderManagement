import { useAuth } from '@/contexts/AuthContext'

export default function TopBar() {
  const { user } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex-1">
        {/* Can be used for breadcrumbs or page title */}
      </div>

      <div className="flex items-center space-x-4">
        {/* Role Badge */}
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            user?.role === 'admin' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {user?.role === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>
      </div>
    </header>
  )
}

