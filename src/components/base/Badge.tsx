import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'gray' | 'blue' | 'orange' | 'red' | 'purple' | 'green' | 'yellow'
  size?: 'sm' | 'md'
}

export default function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  const variants = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-500 text-white',
    orange: 'bg-orange-500 text-white',
    red: 'bg-red-500 text-white',
    purple: 'bg-purple-500 text-white',
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-500 text-white'
  }
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  }
  
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}

