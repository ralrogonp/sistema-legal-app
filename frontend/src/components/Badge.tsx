import { CaseStatus, CaseType } from '../types'

interface BadgeProps {
  variant: CaseStatus | CaseType | 'active' | 'inactive'
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  const variants = {
    // Estados de casos
    ABIERTO: 'bg-blue-100 text-blue-800',
    EN_PROCESO: 'bg-yellow-100 text-yellow-800',
    CERRADO: 'bg-gray-100 text-gray-800',
    
    // Tipos de casos
    CONTABLE: 'bg-green-100 text-green-800',
    JURIDICO: 'bg-purple-100 text-purple-800',
    
    // Estados de usuario
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800'
  }

  const icons = {
    CONTABLE: '📊',
    JURIDICO: '⚖️',
    ABIERTO: '🔵',
    EN_PROCESO: '⏳',
    CERRADO: '✅'
  }

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {icons[variant as keyof typeof icons] && <span>{icons[variant as keyof typeof icons]}</span>}
      {children}
    </span>
  )
}
