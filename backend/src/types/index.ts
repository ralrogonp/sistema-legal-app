import { Request } from 'express';

// User types
export interface User {
  id: number;
  email: string;
  nombre_completo: string;
  password_hash?: string;
  role: UserRole;
  atlassian_id?: string;
  github_username?: string;
  activo: boolean;
  invitation_sent: boolean;
  invitation_token?: string;
  fecha_creacion: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CONTABLE = 'CONTABLE',
  JURIDICO = 'JURIDICO'
}

// Case types
export interface Case {
  id: number;
  numero_caso: string;
  categoria: CaseCategory;
  cliente: string;
  descripcion: string;
  estado: CaseStatus;
  monto: number;
  creado_por: number;
  fecha_creacion: Date;
  fecha_ultima_actualizacion: Date;
  version_actual: number;
}

export enum CaseCategory {
  CONTABLE = 'CONTABLE',
  JURIDICO = 'JURIDICO'
}

export enum CaseStatus {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADO = 'COMPLETADO',
  RECHAZADO = 'RECHAZADO'
}

// Document types
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

// Case Version types
export interface CaseVersion {
  id: number;
  caso_id: number;
  version_numero: number;
  estado_anterior: CaseStatus;
  estado_nuevo: CaseStatus;
  cambios_realizados: string;
  comentarios?: string;
  actualizado_por: number;
  fecha_actualizacion: Date;
}

// Request with user
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: UserRole;
  };
}

// API Response types
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

// Statistics types
export interface CaseStats {
  total: number;
  active: number;
  pending: number;
  completed: number;
  rejected: number;
  by_category: {
    CONTABLE: number;
    JURIDICO: number;
  };
}

// Filter types
export interface CaseFilters {
  categoria?: CaseCategory;
  estado?: CaseStatus;
  cliente?: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
  creado_por?: number;
}

// JWT Payload
export interface JWTPayload {
  id: number;
  email: string;
  role: UserRole;
}

// File upload
export interface FileUploadResult {
  key: string;
  url: string;
  bucket: string;
  filename: string;
  size: number;
  mimetype: string;
}
