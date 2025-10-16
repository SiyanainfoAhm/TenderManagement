import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function CompanySwitcher() {
  const { user, selectedCompany, switchCompany } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitchCompany = async (companyId: string) => {
    try {
      await switchCompany(companyId)
      setIsOpen(false)
      // Reload the page to refresh all data for new company
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch company:', error)
    }
  }

  if (!user || !user.companies || user.companies.length === 0) {
    return null
  }

  // If user has only one company, show it without dropdown
  if (user.companies.length === 1) {
    const company = user.companies[0]
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <i className="ri-building-line text-white"></i>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{company.company_name}</p>
          <p className="text-xs text-gray-500 capitalize">{company.role}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Company Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors w-full md:w-auto"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <i className="ri-building-line text-white"></i>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {selectedCompany?.company_name || 'Select Company'}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {selectedCompany?.role || 'No role'}
          </p>
        </div>
        <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line text-gray-400 flex-shrink-0`}></i>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full md:w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase">Switch Company</p>
          </div>
          
          <div className="py-1">
            {user.companies.map((company) => {
              const isSelected = selectedCompany?.company_id === company.company_id
              const isDefault = company.is_default
              
              return (
                <button
                  key={company.company_id}
                  onClick={() => handleSwitchCompany(company.company_id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  disabled={isSelected}
                >
                  {/* Company Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    <i className={`ri-building-line text-lg ${
                      isSelected ? 'text-white' : 'text-gray-600'
                    }`}></i>
                  </div>

                  {/* Company Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {company.company_name}
                      </p>
                      {isDefault && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500 capitalize">{company.role}</p>
                      {company.is_active && (
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      )}
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <i className="ri-check-line text-blue-600 text-lg flex-shrink-0"></i>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-200 mt-1">
            <p className="text-xs text-gray-500">
              {user.companies.length} {user.companies.length === 1 ? 'company' : 'companies'} available
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

