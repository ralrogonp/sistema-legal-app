export enum UserRole {
  ADMIN = 'ADMIN',
  CONTABLE = 'CONTABLE',
  JURIDICO = 'JURIDICO'
}

export enum CaseStatus {
  ABIERTO = 'ABIERTO',
  EN_PROCESO = 'EN_PROCESO',
  CERRADO = 'CERRADO'
}

export enum CaseType {
  CONTABLE = 'CONTABLE',
  JURIDICO = 'JURIDICO'
}

export interface User {
  id: number
  email: string
  nombre_completo: string
  role: UserRole
  activo: boolean
  puede_gestionar_s3?: boolean
  fecha_creacion: string
}

export interface Case {
  id: number
  numero_caso: string
  tipo_caso: CaseType
  titulo: string
  descripcion: string
  estado: CaseStatus
  cliente_nombre: string
  cliente_rfc?: string
  version_actual: number
  creado_por: number
  creado_por_nombre?: string
  asignado_a?: number
  asignado_a_nombre?: string
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface CaseVersion {
  id: number
  caso_id: number
  version: number
  descripcion_cambios: string
  actualizado_por: number
  actualizado_por_nombre?: string
  fecha_version: string
  datos_snapshot: any
}

export interface CaseDocument {
  id: number
  caso_id: number
  version_id?: number
  version_numero?: number
  nombre_archivo: string
  s3_key: string
  s3_url: string
  tipo_archivo: string
  tamano_bytes: number
  subido_por: number
  subido_por_nombre?: string
  fecha_subida: string
  notas?: string
}

export interface S3Folder {
  id: number
  nombre: string
  ruta_completa: string
  carpeta_padre_id?: number
  creado_por: number
  creado_por_nombre?: string
  fecha_creacion: string
  descripcion?: string
  archivos_count?: number
  subcarpetas_count?: number
}

export interface S3File {
  id: number
  carpeta_id?: number
  nombre_archivo: string
  s3_key: string
  s3_url: string
  tipo_archivo: string
  tamano_bytes: number
  subido_por: number
  subido_por_nombre?: string
  fecha_subida: string
  metadata?: any
}

export interface CaseStats {
  total: number
  abiertos: number
  en_proceso: number
  cerrados: number
  contables: number
  juridicos: number
}

export interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}
