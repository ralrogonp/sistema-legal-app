-- Sample Data for Testing

-- Insert admin user (password: admin123)
INSERT INTO users (email, nombre_completo, password_hash, role, activo)
VALUES ('admin@legal.com', 'Admin Usuario', '$2a$10$YourHashedPasswordHere', 'ADMIN', true)
ON CONFLICT (email) DO NOTHING;

-- Insert sample cases
INSERT INTO casos (numero_caso, categoria, cliente, descripcion, estado, monto, creado_por)
VALUES 
  ('CON-12345001-123', 'CONTABLE', 'Empresa ABC S.A.', 'Revisión de estados financieros Q4 2023', 'PENDIENTE', 50000, 1),
  ('JUR-12345002-456', 'JURIDICO', 'Juan Pérez', 'Caso laboral - despido injustificado', 'EN_PROCESO', 25000, 1),
  ('CON-12345003-789', 'CONTABLE', 'Comercial XYZ', 'Auditoría anual', 'COMPLETADO', 75000, 1)
ON CONFLICT (numero_caso) DO NOTHING;
