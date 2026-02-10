-- Sistema de Gestión de Casos Legales - Initial Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'CONTABLE', 'JURIDICO')),
  atlassian_id VARCHAR(255),
  github_username VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  invitation_sent BOOLEAN DEFAULT false,
  invitation_token VARCHAR(255),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS casos (
  id SERIAL PRIMARY KEY,
  numero_caso VARCHAR(50) UNIQUE NOT NULL,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('CONTABLE', 'JURIDICO')),
  cliente VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  estado VARCHAR(50) NOT NULL CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'RECHAZADO')),
  monto NUMERIC(15, 2) DEFAULT 0,
  creado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  version_actual INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS documentos (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo_documento VARCHAR(100),
  tamano BIGINT,
  s_3_key TEXT NOT NULL,
  s_3_url TEXT NOT NULL,
  subido_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS versiones_caso (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  version_numero INTEGER NOT NULL,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  cambios_realizados TEXT,
  comentarios TEXT,
  actualizado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_casos_categoria ON casos(categoria);
CREATE INDEX IF NOT EXISTS idx_casos_estado ON casos(estado);
CREATE INDEX IF NOT EXISTS idx_casos_creado_por ON casos(creado_por);
CREATE INDEX IF NOT EXISTS idx_casos_fecha_creacion ON casos(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_documentos_caso_id ON documentos(caso_id);
CREATE INDEX IF NOT EXISTS idx_versiones_caso_id ON versiones_caso(caso_id);

-- Trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_ultima_actualizacion = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger
CREATE TRIGGER update_casos_updated_at BEFORE UPDATE ON casos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
