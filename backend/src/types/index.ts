import { Request } from 'express';

// ==================== USERS ====================

export interface User {
  id: number;
  email: string;
  nombre_completo: string;
  password_hash?: string;
  role: UserRole;
  atlassian_id?: string;
  github_username?: string;
  activo: boolean;
  estado_registro: EstadoRegistro;
  email_verificado: boolean;
  invitation_sent: boolean;
  invitation_token?: string;
  fecha_creacion: Date;
  fecha_ultimo_acceso?: Date;
  puede_gestionar_s3?: boolean;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CONTABLE = 'CONTABLE',
  JURIDICO = 'JURIDICO'
}

export enum EstadoRegistro {
  PENDIENTE = 'PENDIENTE',
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO'
}

// ==================== CASOS ====================

export interface Case {
  id: number;
  numero_caso: string;
  tipo_caso: CaseType;
  titulo: string;
  descripcion: string;
  estado: CaseStatus;
  
  // Información del cliente
  cliente_nombre: string;
  cliente_rfc?: string;
  
  // Información legal
  rubro: string; // De quién es la demanda
  contra_quien: string; // Contra quién
  numero_expediente: string;
  juzgado_autoridad: string; // Laboral, Civil, Mercantil, etc.
  ubicacion_autoridad: string; // Dirección del juzgado
  
  // Ownership
  creado_por: number;
  supervisor_id: number; // El que creó el caso o admin asignado
  asignado_a?: number;
  
  // Versionado
  version_actual: number;
  
  // Fechas
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  
  // Estado
  activo: boolean;
}

export enum CaseType {
  CONTABLE = 'CONTABLE',
  JURIDICO = 'JURIDICO'
}

export enum CaseStatus {
  ABIERTO = 'ABIERTO',
  EN_PROCESO = 'EN_PROCESO',
  CERRADO = 'CERRADO'
}

// ==================== VERSIONES ====================

export interface CaseVersion {
  id: number;
  caso_id: number;
  version_numero: number;
  estado_anterior: CaseStatus;
  estado_nuevo: CaseStatus;
  cambios_realizados: string;
  comentarios?: string;
  tipo_actualizacion: TipoActualizacion;
  actualizado_por: number;
  fecha_actualizacion: Date;
  datos_snapshot?: any;
  notificacion_enviada: boolean;
}

export enum TipoActualizacion {
  VERSION = 'VERSION', // Actualización formal del supervisor o admin
  COMENTARIO = 'COMENTARIO' // Comentario de usuario de la misma categoría
}

// ==================== COMENTARIOS ====================

export interface CaseComment {
  id: number;
  caso_id: number;
  usuario_id: number;
  comentario: string;
  fecha_comentario: Date;
}

// ==================== DOCUMENTOS ====================

export interface Document {
  id: number;
  caso_id: number;
  nombre_archivo: string;
  tipo_documento: string;
  tamano: number;
  s_3_key: string;
  s_3_url: string;
  subido_por: number;
  fecha_subida: Date;
}

// ==================== NOTIFICACIONES ====================

export interface Notification {
  id: number;
  usuario_id: number;
  caso_id: number;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  email_enviado: boolean;
  fecha_creacion: Date;
}

export enum TipoNotificacion {
  CASO_CREADO = 'CASO_CREADO',
  NUEVA_VERSION = 'NUEVA_VERSION',
  NUEVO_COMENTARIO = 'NUEVO_COMENTARIO',
  CASO_ASIGNADO = 'CASO_ASIGNADO'
}

// ==================== S3 ====================

export interface S3Bucket {
  id: number;
  nombre: string;
  region: string;
  creado_por: number;
  fecha_creacion: Date;
  activo: boolean;
  descripcion?: string;
}

export interface S3Folder {
  id: number;
  nombre: string;
  ruta_completa: string;
  carpeta_padre_id?: number;
  creado_por: number;
  fecha_creacion: Date;
  descripcion?: string;
}

export interface S3File {
  id: number;
  carpeta_id?: number;
  bucket_id?: number;
  nombre_archivo: string;
  s3_key: string;
  s3_url: string;
  tipo_archivo: string;
  tamano_bytes: number;
  subido_por: number;
  fecha_subida: Date;
  metadata?: any;
}

// ==================== REQUEST TYPES ====================

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: UserRole;
  };
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== STATISTICS ====================

export interface CaseStats {
  total: number;
  abiertos: number;
  en_proceso: number;
  cerrados: number;
  contables: number;
  juridicos: number;
  mis_casos?: number; // Casos donde soy supervisor
}

// ==================== FILTERS ====================

export interface CaseFilters {
  tipo_caso?: CaseType;
  estado?: CaseStatus;
  cliente?: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
  supervisor_id?: number;
  activo?: boolean;
}

// ==================== JWT ====================

export interface JWTPayload {
  id: number;
  email: string;
  role: UserRole;
}

// ==================== FILE UPLOAD ====================

export interface FileUploadResult {
  key: string;
  url: string;
  bucket: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

// ==================== PERMISOS ====================

export interface CasePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAddVersion: boolean; // Solo supervisor o admin
  canAddComment: boolean; // Usuarios de la misma categoría
  canUploadDocuments: boolean;
  canDeleteDocuments: boolean;
  isSupervisor: boolean;
  isAdmin: boolean;
}
