# 🏛️ Sistema de Gestión de Casos Legales

Sistema completo de gestión de casos legales con gestión de documentos en S3, control de versiones y administración de usuarios.

## 📋 Características

- ✅ Dashboard con KPIs en tiempo real
- ✅ Gestión completa de casos (CRUD)
- ✅ Sistema de roles (ADMIN, CONTABLE, JURIDICO)
- ✅ Gestión de documentos con AWS S3
- ✅ Historial de versiones de casos
- ✅ Administración de usuarios
- ✅ Autenticación JWT
- ✅ Filtros avanzados y búsqueda
- ✅ Exportación de datos

## 🚀 Stack Tecnológico

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui
- React Query (data fetching)
- React Router v6
- Zustand (state management)
- Axios

### Backend
- Node.js + Express + TypeScript
- PostgreSQL
- AWS S3 SDK
- JWT Authentication
- bcrypt
- Multer (file uploads)

## 📁 Estructura del Proyecto

```
sistema-legal-app/
├── frontend/              # Aplicación React
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/        # Páginas principales
│   │   ├── services/     # API calls
│   │   ├── hooks/        # Custom hooks
│   │   ├── store/        # Zustand stores
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utilidades
│   └── package.json
├── backend/              # API Node.js
│   ├── src/
│   │   ├── controllers/  # Controladores
│   │   ├── routes/       # Rutas API
│   │   ├── models/       # Modelos de datos
│   │   ├── middleware/   # Middleware
│   │   ├── config/       # Configuración
│   │   └── utils/        # Utilidades
│   └── package.json
├── database/             # Scripts de BD
│   ├── migrations/       # Migraciones
│   └── seeds/           # Datos de prueba
├── docker/              # Archivos Docker
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── jenkins/             # Pipeline CI/CD
│   └── Jenkinsfile
└── docs/                # Documentación
```

## 🔧 Instalación Local

### Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- AWS Account (S3)
- Git

### 1. Clonar repositorio
```bash
git clone <tu-repo>
cd sistema-legal-app
```

### 2. Configurar Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
```

### 3. Configurar Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
# Editar .env con la URL del backend
```

### 4. Configurar Base de Datos
```bash
cd ../database
# Ejecutar migraciones
psql -h tu-host -U retool retool < migrations/001_initial_schema.sql
# Cargar datos de prueba (opcional)
psql -h tu-host -U retool retool < seeds/001_sample_data.sql
```

### 5. Iniciar Desarrollo
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Accede a: http://localhost:5173

## 🐳 Deploy con Docker

### Desarrollo
```bash
docker-compose up --build
```

### Producción
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🚀 Deploy en AWS EC2 con Jenkins

### 1. Preparar EC2
```bash
# SSH a tu EC2
ssh -i tu-key.pem ubuntu@tu-ec2-ip

# Instalar Docker
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu

# Instalar Jenkins
wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo apt-key add -
sudo sh -c 'echo deb http://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
sudo apt update
sudo apt install jenkins -y
sudo systemctl start jenkins
```

### 2. Configurar Jenkins
1. Accede a `http://tu-ec2-ip:8080`
2. Obtén password inicial: `sudo cat /var/lib/jenkins/secrets/initialAdminPassword`
3. Instala plugins sugeridos
4. Crea nuevo pipeline desde este repositorio
5. Configura webhooks de GitHub (opcional)

### 3. Variables de entorno en Jenkins
En Jenkins → Credentials, agrega:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DATABASE_URL`
- `JWT_SECRET`

### 4. Deploy Automático
Cada push a `main` ejecutará el pipeline de Jenkins automáticamente.

## 🗄️ Migrar Base de Datos a AWS RDS

### Opción 1: PostgreSQL en RDS (Recomendado)

#### Crear RDS Instance
```bash
aws rds create-db-instance \
  --db-instance-identifier sistema-legal-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.7 \
  --master-username postgres \
  --master-user-password TuPasswordSeguro123 \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --db-name retool \
  --backup-retention-period 7 \
  --publicly-accessible
```

#### Migrar datos
```bash
# Exportar desde Retool DB
pg_dump -h ep-mute-morning-akn2hpau-pooler.c-3.us-west-2.retooldb.com \
  -U retool -d retool > backup.sql

# Importar a RDS
psql -h tu-rds-endpoint.rds.amazonaws.com \
  -U postgres -d retool < backup.sql
```

### Opción 2: Aurora PostgreSQL (Alta disponibilidad)

#### Crear Aurora Cluster
```bash
aws rds create-db-cluster \
  --db-cluster-identifier sistema-legal-cluster \
  --engine aurora-postgresql \
  --engine-version 14.6 \
  --master-username postgres \
  --master-user-password TuPasswordSeguro123 \
  --database-name retool \
  --vpc-security-group-ids sg-xxxxx

aws rds create-db-instance \
  --db-instance-identifier sistema-legal-instance-1 \
  --db-instance-class db.t3.medium \
  --engine aurora-postgresql \
  --db-cluster-identifier sistema-legal-cluster
```

**Ventajas Aurora:**
- Auto-scaling de almacenamiento
- Hasta 15 réplicas de lectura
- Failover automático en <30s
- Backups continuos a S3

**Costos aproximados:**
- RDS PostgreSQL (t3.micro): ~$15/mes
- Aurora (t3.medium): ~$60/mes

### Opción 3: DynamoDB (NoSQL - Requiere refactorización)

Solo si quieres escalabilidad masiva y no necesitas SQL.

## 🔐 Variables de Entorno

### Backend (.env)
```bash
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=tu-secreto-super-seguro-aqui
JWT_EXPIRES_IN=7d

# AWS S3
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
S3_BUCKET_NAME=sistema-legal-docs

# CORS
FRONTEND_URL=https://tu-dominio.com
```

### Frontend (.env)
```bash
VITE_API_URL=https://api.tu-dominio.com
VITE_APP_NAME=Sistema Legal
```

## 📊 Monitoreo

### CloudWatch (AWS)
- Logs de EC2 y RDS
- Métricas de performance
- Alertas automáticas

### Configurar CloudWatch Agent
```bash
# En EC2
sudo apt install amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test

# E2E
npm run test:e2e
```

## 📝 Licencia

MIT

## 👥 Soporte

Para preguntas o problemas, abre un issue en GitHub.

---

**Desarrollado con ❤️ para gestión legal eficiente**
