import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'gray' | 'blue' | 'orange' | 'red' | 'purple' | 'green' | 'yellow'
  size?: 'sm' | 'md'
}

export default function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  const variants = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800'
  }
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  }
  
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}

