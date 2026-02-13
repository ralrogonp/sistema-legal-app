-- ================================================
-- MIGRACIÓN: Sistema Legal Completo
-- ================================================

BEGIN;

-- ====================
-- 1. MODIFICAR TABLA CASOS - Nuevos Campos
-- ====================

ALTER TABLE casos 
ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rubro VARCHAR(100), -- "De quién es la demanda"
ADD COLUMN IF NOT EXISTS contra_quien VARCHAR(255), -- "Contra quién"
ADD COLUMN IF NOT EXISTS numero_expediente VARCHAR(100),
ADD COLUMN IF NOT EXISTS juzgado_autoridad VARCHAR(255), -- "Laboral, Civil, Mercantil, etc."
ADD COLUMN IF NOT EXISTS ubicacion_autoridad TEXT, -- Dirección del juzgado
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Índices para nuevos campos
CREATE INDEX IF NOT EXISTS idx_casos_supervisor ON casos(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_casos_activo ON casos(activo);

-- ====================
-- 2. TABLA DE COMENTARIOS
-- ====================

CREATE TABLE IF NOT EXISTS caso_comentarios (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES users(id),
  comentario TEXT NOT NULL,
  fecha_comentario TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comentarios_caso ON caso_comentarios(caso_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_fecha ON caso_comentarios(fecha_comentario DESC);

-- ====================
-- 3. MODIFICAR TABLA VERSIONES_CASO
-- ====================

ALTER TABLE versiones_caso
ADD COLUMN IF NOT EXISTS tipo_actualizacion VARCHAR(50) DEFAULT 'VERSION', -- 'VERSION' o 'COMENTARIO'
ADD COLUMN IF NOT EXISTS notificacion_enviada BOOLEAN DEFAULT false;

-- ====================
-- 4. TABLA DE NOTIFICACIONES
-- ====================

CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'CASO_CREADO', 'NUEVA_VERSION', 'NUEVO_COMENTARIO'
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT false,
  email_enviado BOOLEAN DEFAULT false,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);

-- ====================
-- 5. TABLA DE BUCKETS S3
-- ====================

CREATE TABLE IF NOT EXISTS s3_buckets (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  region VARCHAR(50) DEFAULT 'us-east-1',
  creado_por INTEGER REFERENCES users(id),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT true,
  descripcion TEXT
);

CREATE INDEX IF NOT EXISTS idx_buckets_activo ON s3_buckets(activo);

-- Modificar tabla s3_archivos para incluir bucket_id
ALTER TABLE s3_archivos
ADD COLUMN IF NOT EXISTS bucket_id INTEGER REFERENCES s3_buckets(id);

-- ====================
-- 6. MODIFICAR TABLA USERS
-- ====================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS estado_registro VARCHAR(50) DEFAULT 'ACTIVO', -- 'PENDIENTE', 'ACTIVO', 'INACTIVO'
ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_ultimo_acceso TIMESTAMP;

-- ====================
-- 7. FUNCIÓN: Crear Notificación Automática
-- ====================

CREATE OR REPLACE FUNCTION crear_notificacion_caso()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar al supervisor del caso
  IF NEW.supervisor_id IS NOT NULL THEN
    INSERT INTO notificaciones (usuario_id, caso_id, tipo, mensaje)
    VALUES (
      NEW.supervisor_id, 
      NEW.id, 
      'NUEVA_VERSION',
      'Nueva actualización en caso: ' || NEW.numero_caso
    );
  END IF;

  -- Notificar al admin (usuario id = 1, ajustar según tu sistema)
  INSERT INTO notificaciones (usuario_id, caso_id, tipo, mensaje)
  SELECT 
    id, 
    NEW.id, 
    'NUEVA_VERSION',
    'Nueva actualización en caso: ' || NEW.numero_caso
  FROM users 
  WHERE role = 'ADMIN' AND id != COALESCE(NEW.supervisor_id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificaciones en actualizaciones
DROP TRIGGER IF EXISTS trigger_notificacion_caso ON versiones_caso;
CREATE TRIGGER trigger_notificacion_caso
AFTER INSERT ON versiones_caso
FOR EACH ROW
EXECUTE FUNCTION crear_notificacion_caso();

-- ====================
-- 8. DATOS INICIALES
-- ====================

-- Bucket por defecto
INSERT INTO s3_buckets (nombre, descripcion, creado_por)
VALUES ('sistema-legal-principal', 'Bucket principal del sistema', 1)
ON CONFLICT (nombre) DO NOTHING;

-- Actualizar usuarios existentes
UPDATE users 
SET estado_registro = 'ACTIVO', 
    email_verificado = true
WHERE password_hash IS NOT NULL;

-- ====================
-- 9. VISTAS ÚTILES
-- ====================

-- Vista de casos con información completa
CREATE OR REPLACE VIEW vista_casos_completos AS
SELECT 
  c.*,
  u_creador.nombre_completo as creador_nombre,
  u_creador.email as creador_email,
  u_supervisor.nombre_completo as supervisor_nombre,
  u_supervisor.email as supervisor_email,
  COUNT(DISTINCT d.id) as total_documentos,
  COUNT(DISTINCT v.id) as total_versiones,
  COUNT(DISTINCT com.id) as total_comentarios
FROM casos c
LEFT JOIN users u_creador ON c.creado_por = u_creador.id
LEFT JOIN users u_supervisor ON c.supervisor_id = u_supervisor.id
LEFT JOIN documentos d ON c.id = d.caso_id
LEFT JOIN versiones_caso v ON c.id = v.caso_id
LEFT JOIN caso_comentarios com ON c.id = com.caso_id
GROUP BY c.id, u_creador.id, u_supervisor.id;

COMMIT;

-- ====================
-- VERIFICACIÓN
-- ====================

-- Verificar que todas las tablas existen
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'casos', 'users', 'documentos', 'versiones_caso', 
      'caso_comentarios', 'notificaciones', 's3_buckets', 's3_archivos'
    ) THEN '✅ OK'
    ELSE '❌ FALTA'
  END as estado
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN (
    'casos', 'users', 'documentos', 'versiones_caso', 
    'caso_comentarios', 'notificaciones', 's3_buckets', 's3_archivos'
  )
ORDER BY table_name;

-- Verificar columnas de casos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'casos' 
  AND column_name IN (
    'supervisor_id', 'rubro', 'contra_quien', 
    'numero_expediente', 'juzgado_autoridad', 'ubicacion_autoridad'
  )
ORDER BY column_name;
