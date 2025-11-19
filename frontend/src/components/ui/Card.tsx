import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  hover?: boolean
}

export default function Card({
  children,
  title,
  subtitle,
  padding = 'md',
  className = '',
  hover = false
}: CardProps) {
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }
  
  const hoverClass = hover ? 'hover:shadow-lg transition-shadow duration-200' : ''
  
  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${hoverClass} ${className}`}>
      {(title || subtitle) && (
        <div className={`border-b border-gray-200 ${padding === 'none' ? 'p-4' : paddingClasses[padding]}`}>
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
    </div>
  )
}
