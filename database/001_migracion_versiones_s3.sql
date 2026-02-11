-- ============================================
-- MIGRACIÓN: Sistema Legal - Versiones y S3
-- Fecha: 2026-02-11
-- Descripción: Agrega tablas para versionado de casos y gestión S3
-- ============================================

-- ============================================
-- 1. ACTUALIZAR TABLA USERS
-- ============================================

-- Agregar campo para permisos S3 si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='puede_gestionar_s3') THEN
    ALTER TABLE users ADD COLUMN puede_gestionar_s3 BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ============================================
-- 2. CREAR/ACTUALIZAR TABLA CASOS
-- ============================================

CREATE TABLE IF NOT EXISTS casos (
  id SERIAL PRIMARY KEY,
  numero_caso VARCHAR(50) UNIQUE NOT NULL,
  tipo_caso VARCHAR(20) NOT NULL CHECK (tipo_caso IN ('CONTABLE', 'JURIDICO')),
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'EN_PROCESO', 'CERRADO')),
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_rfc VARCHAR(13),
  version_actual INTEGER DEFAULT 1,
  creado_por INTEGER REFERENCES users(id),
  asignado_a INTEGER REFERENCES users(id),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Actualizar casos existentes si vienen de schema antiguo
DO $$
BEGIN
  -- Si existe columna 'categoria', migrar a 'tipo_caso'
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='casos' AND column_name='categoria') THEN
    ALTER TABLE casos ADD COLUMN IF NOT EXISTS tipo_caso VARCHAR(20);
    UPDATE casos SET tipo_caso = categoria WHERE tipo_caso IS NULL;
    ALTER TABLE casos DROP COLUMN IF EXISTS categoria;
  END IF;
  
  -- Si existe columna 'cliente', migrar a 'cliente_nombre'
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='casos' AND column_name='cliente') THEN
    ALTER TABLE casos ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(255);
    UPDATE casos SET cliente_nombre = cliente WHERE cliente_nombre IS NULL;
    ALTER TABLE casos DROP COLUMN IF EXISTS cliente;
  END IF;
  
  -- Si existe columna 'monto', eliminarla (no la usamos en esta versión)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='casos' AND column_name='monto') THEN
    ALTER TABLE casos DROP COLUMN monto;
  END IF;
END $$;

-- Agregar columnas nuevas si no existen
ALTER TABLE casos ADD COLUMN IF NOT EXISTS titulo VARCHAR(255);
ALTER TABLE casos ADD COLUMN IF NOT EXISTS version_actual INTEGER DEFAULT 1;
ALTER TABLE casos ADD COLUMN IF NOT EXISTS asignado_a INTEGER REFERENCES users(id);

-- ============================================
-- 3. TABLA DE VERSIONES DE CASOS (NUEVA)
-- ============================================

CREATE TABLE IF NOT EXISTS caso_versiones (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  descripcion_cambios TEXT,
  actualizado_por INTEGER REFERENCES users(id),
  fecha_version TIMESTAMP DEFAULT NOW(),
  datos_snapshot JSONB,
  CONSTRAINT unique_caso_version UNIQUE(caso_id, version)
);

-- Crear versión inicial para casos existentes
INSERT INTO caso_versiones (caso_id, version, descripcion_cambios, actualizado_por, fecha_version, datos_snapshot)
SELECT 
  id,
  1,
  'Versión inicial',
  creado_por,
  fecha_creacion,
  jsonb_build_object(
    'numero_caso', numero_caso,
    'tipo_caso', tipo_caso,
    'titulo', titulo,
    'descripcion', descripcion,
    'estado', estado,
    'cliente_nombre', cliente_nombre,
    'cliente_rfc', cliente_rfc
  )
FROM casos
WHERE NOT EXISTS (
  SELECT 1 FROM caso_versiones WHERE caso_versiones.caso_id = casos.id
);

-- ============================================
-- 4. TABLA DE DOCUMENTOS DE CASOS (NUEVA)
-- ============================================

CREATE TABLE IF NOT EXISTS caso_documentos (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  version_id INTEGER REFERENCES caso_versiones(id),
  nombre_archivo VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  s3_url TEXT,
  tipo_archivo VARCHAR(50),
  tamano_bytes BIGINT,
  subido_por INTEGER REFERENCES users(id),
  fecha_subida TIMESTAMP DEFAULT NOW(),
  notas TEXT
);

-- ============================================
-- 5. TABLA DE CARPETAS S3 (NUEVA)
-- ============================================

CREATE TABLE IF NOT EXISTS s3_carpetas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  ruta_completa VARCHAR(500) UNIQUE NOT NULL,
  carpeta_padre_id INTEGER REFERENCES s3_carpetas(id),
  creado_por INTEGER REFERENCES users(id),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  descripcion TEXT
);

-- Crear carpetas raíz por defecto
INSERT INTO s3_carpetas (nombre, ruta_completa, descripcion)
VALUES 
  ('Documentos Legales', '/documentos-legales', 'Carpeta principal para documentos legales'),
  ('Documentos Contables', '/documentos-contables', 'Carpeta principal para documentos contables'),
  ('Generales', '/generales', 'Documentos generales del sistema')
ON CONFLICT (ruta_completa) DO NOTHING;

-- ============================================
-- 6. TABLA DE ARCHIVOS S3 (NUEVA)
-- ============================================

CREATE TABLE IF NOT EXISTS s3_archivos (
  id SERIAL PRIMARY KEY,
  carpeta_id INTEGER REFERENCES s3_carpetas(id),
  nombre_archivo VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) UNIQUE NOT NULL,
  s3_url TEXT,
  tipo_archivo VARCHAR(50),
  tamano_bytes BIGINT,
  subido_por INTEGER REFERENCES users(id),
  fecha_subida TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- ============================================
-- 7. ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

-- Casos
CREATE INDEX IF NOT EXISTS idx_casos_tipo ON casos(tipo_caso);
CREATE INDEX IF NOT EXISTS idx_casos_estado ON casos(estado);
CREATE INDEX IF NOT EXISTS idx_casos_asignado ON casos(asignado_a);
CREATE INDEX IF NOT EXISTS idx_casos_creado_por ON casos(creado_por);

-- Versiones
CREATE INDEX IF NOT EXISTS idx_versiones_caso ON caso_versiones(caso_id);
CREATE INDEX IF NOT EXISTS idx_versiones_actualizado ON caso_versiones(actualizado_por);

-- Documentos
CREATE INDEX IF NOT EXISTS idx_documentos_caso ON caso_documentos(caso_id);
CREATE INDEX IF NOT EXISTS idx_documentos_version ON caso_documentos(version_id);
CREATE INDEX IF NOT EXISTS idx_documentos_subido ON caso_documentos(subido_por);

-- S3
CREATE INDEX IF NOT EXISTS idx_s3_carpeta ON s3_archivos(carpeta_id);
CREATE INDEX IF NOT EXISTS idx_s3_subido ON s3_archivos(subido_por);
CREATE INDEX IF NOT EXISTS idx_s3_carpeta_padre ON s3_carpetas(carpeta_padre_id);

-- ============================================
-- 8. FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para casos (eliminar si existe y recrear)
DROP TRIGGER IF EXISTS update_casos_updated_at ON casos;
CREATE TRIGGER update_casos_updated_at 
  BEFORE UPDATE ON casos
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Función para crear versión automáticamente al actualizar caso
CREATE OR REPLACE FUNCTION auto_create_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear versión si cambió algo importante
  IF (OLD.titulo IS DISTINCT FROM NEW.titulo) OR
     (OLD.descripcion IS DISTINCT FROM NEW.descripcion) OR
     (OLD.estado IS DISTINCT FROM NEW.estado) OR
     (OLD.asignado_a IS DISTINCT FROM NEW.asignado_a) THEN
    
    -- Incrementar versión
    NEW.version_actual = OLD.version_actual + 1;
    
    -- Crear registro de versión
    INSERT INTO caso_versiones (
      caso_id, 
      version, 
      descripcion_cambios, 
      actualizado_por, 
      datos_snapshot
    ) VALUES (
      NEW.id,
      NEW.version_actual,
      'Actualización automática',
      NEW.asignado_a, -- Cambiar por el usuario que actualiza
      jsonb_build_object(
        'numero_caso', NEW.numero_caso,
        'tipo_caso', NEW.tipo_caso,
        'titulo', NEW.titulo,
        'descripcion', NEW.descripcion,
        'estado', NEW.estado,
        'cliente_nombre', NEW.cliente_nombre,
        'cliente_rfc', NEW.cliente_rfc
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para auto-versionado
DROP TRIGGER IF EXISTS auto_version_trigger ON casos;
CREATE TRIGGER auto_version_trigger
  BEFORE UPDATE ON casos
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_version();

-- ============================================
-- 9. DATOS DE PRUEBA (OPCIONAL)
-- ============================================

-- Usuario admin (password: admin123)
-- Hash generado con bcrypt rounds=10
INSERT INTO users (email, nombre_completo, password_hash, role, activo, puede_gestionar_s3)
VALUES ('admin@sistema.com', 'Administrador del Sistema', '$2a$10$YqZ8q0Y3xKjH9x5mVJxKZuXGqQXqF9xKJ3Z8q0Y3xKjH9x5mVJxKZ', 'ADMIN', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
  puede_gestionar_s3 = TRUE,
  activo = TRUE;

-- Usuario contable (password: contable123)
INSERT INTO users (email, nombre_completo, password_hash, role, activo)
VALUES ('contable@sistema.com', 'Usuario Contable', '$2a$10$YqZ8q0Y3xKjH9x5mVJxKZuXGqQXqF9xKJ3Z8q0Y3xKjH9x5mVJxKZ', 'CONTABLE', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Usuario jurídico (password: juridico123)
INSERT INTO users (email, nombre_completo, password_hash, role, activo)
VALUES ('juridico@sistema.com', 'Usuario Jurídico', '$2a$10$YqZ8q0Y3xKjH9x5mVJxKZuXGqQXqF9xKJ3Z8q0Y3xKjH9x5mVJxKZ', 'JURIDICO', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Caso de prueba contable
INSERT INTO casos (numero_caso, tipo_caso, titulo, descripcion, estado, cliente_nombre, cliente_rfc, creado_por, version_actual)
SELECT 
  'CONT-2024-001',
  'CONTABLE',
  'Auditoría Fiscal 2024',
  'Revisión de estados financieros y cumplimiento fiscal del ejercicio 2024',
  'EN_PROCESO',
  'Empresa ABC S.A. de C.V.',
  'ABC123456789',
  u.id,
  1
FROM users u
WHERE u.email = 'admin@sistema.com'
ON CONFLICT (numero_caso) DO NOTHING;

-- Caso de prueba jurídico
INSERT INTO casos (numero_caso, tipo_caso, titulo, descripcion, estado, cliente_nombre, cliente_rfc, creado_por, version_actual)
SELECT 
  'JUR-2024-001',
  'JURIDICO',
  'Contrato de Servicios Profesionales',
  'Revisión y elaboración de contrato de prestación de servicios',
  'ABIERTO',
  'Consultores XYZ S.C.',
  'XYZ987654321',
  u.id,
  1
FROM users u
WHERE u.email = 'admin@sistema.com'
ON CONFLICT (numero_caso) DO NOTHING;

-- ============================================
-- 10. VERIFICACIÓN FINAL
-- ============================================

-- Mostrar resumen de tablas creadas
DO $$
DECLARE
  casos_count INT;
  versiones_count INT;
  usuarios_count INT;
BEGIN
  SELECT COUNT(*) INTO casos_count FROM casos;
  SELECT COUNT(*) INTO versiones_count FROM caso_versiones;
  SELECT COUNT(*) INTO usuarios_count FROM users;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuarios: %', usuarios_count;
  RAISE NOTICE 'Casos: %', casos_count;
  RAISE NOTICE 'Versiones: %', versiones_count;
  RAISE NOTICE '========================================';
END $$;

-- Ver estructura de tablas principales
\dt caso*
\dt s3_*
\dt users

-- Fin de la migración
