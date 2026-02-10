export enum UserRole {
  ADMIN = 'ADMIN',
  CONTABLE = 'CONTABLE',
  JURIDICO = 'JURIDICO'
}

export enum CaseStatus {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADO = 'COMPLETADO',
  RECHAZADO = 'RECHAZADO'
}

export interface User {
  id: number
  email: string
  nombre_completo: string
  role: UserRole
  activo: boolean
}

export interface Case {
  id: number
  numero_caso: string
  categoria: string
  cliente: string
  descripcion: string
  estado: CaseStatus
  monto: number
  fecha_creacion: string
  creado_por_nombre?: string
}

export interface CaseStats {
  total: number
  pendientes: number
  en_proceso: number
  completados: number
  rechazados: number
}
