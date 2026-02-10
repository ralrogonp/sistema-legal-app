# 🚀 Quick Start Guide

## Opción 1: Desarrollo Local (más rápido para empezar)

### Requisitos
- Node.js 18+
- PostgreSQL 14+
- Cuenta AWS (solo para S3)

### Pasos:

1. **Instalar dependencias:**
```bash
./setup.sh
```

2. **Configurar variables de entorno:**
```bash
# Backend
cd backend
nano .env  # Editar con tus credenciales

# Frontend
cd ../frontend
nano .env
```

3. **Configurar base de datos:**
```bash
# Usar tu conexión actual de Retool
psql postgresql://retool:npg_rwpclNH7G8IE@ep-mute-morning-akn2hpau-pooler.c-3.us-west-2.retooldb.com/retool < database/migrations/001_initial_schema.sql
```

4. **Iniciar desarrollo:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

5. **Acceder:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

---

## Opción 2: Deploy con Docker (producción)

### Requisitos
- Docker y Docker Compose instalados

### Pasos:

1. **Configurar .env:**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Editar archivos .env
```

2. **Desplegar:**
```bash
./deploy.sh
```

3. **Acceder:**
- Aplicación: http://localhost
- API: http://localhost:3000/api

---

## Opción 3: Deploy en AWS EC2 con Jenkins

Ver documentación completa en: `docs/EC2_DEPLOYMENT.md`

### Resumen:

1. **Crear EC2 instance** (t3.small, Ubuntu 22.04)

2. **Instalar dependencias en EC2:**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

3. **Clonar y desplegar:**
```bash
git clone https://github.com/your-repo/sistema-legal-app.git
cd sistema-legal-app
./deploy.sh
```

4. **Configurar dominio y SSL**

---

## 🗄️ Migrar Base de Datos a AWS RDS

Ver guía completa en: `docs/AWS_RDS_MIGRATION.md`

### Opción Recomendada: PostgreSQL RDS

```bash
# 1. Crear RDS instance
aws rds create-db-instance \
  --db-instance-identifier sistema-legal-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --allocated-storage 20

# 2. Exportar datos actuales
pg_dump -h ep-mute-morning-akn2hpau-pooler.c-3.us-west-2.retooldb.com \
  -U retool -d retool -F c -f backup.dump

# 3. Importar a RDS
pg_restore -h your-rds-endpoint.rds.amazonaws.com \
  -U admin -d retool backup.dump

# 4. Actualizar DATABASE_URL en .env
DATABASE_URL=postgresql://admin:password@your-rds-endpoint.rds.amazonaws.com:5432/retool
```

---

## 📊 Credenciales por Defecto

Después de cargar los datos de ejemplo:

- **Email:** admin@legal.com
- **Password:** admin123 (cambiar inmediatamente)

---

## 🆘 Troubleshooting

### Puerto 3000 ya en uso
```bash
lsof -i :3000
kill -9 <PID>
```

### Error de conexión a base de datos
- Verificar que PostgreSQL esté corriendo
- Confirmar credenciales en .env
- Verificar firewall/security groups

### Error al instalar dependencias
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Documentación Adicional

- [README principal](README.md)
- [Migración AWS RDS](docs/AWS_RDS_MIGRATION.md)
- [Deploy EC2](docs/EC2_DEPLOYMENT.md)
- [Estructura del proyecto](PROJECT_STRUCTURE.txt)

