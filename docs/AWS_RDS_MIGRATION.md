# Migración de Base de Datos a AWS RDS

## Opción 1: PostgreSQL RDS

### 1. Crear RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier sistema-legal-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.7 \
  --master-username admin \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --db-name retool \
  --backup-retention-period 7 \
  --publicly-accessible \
  --vpc-security-group-ids sg-xxxxxxxxx
```

### 2. Exportar datos actuales

```bash
pg_dump -h ep-mute-morning-akn2hpau-pooler.c-3.us-west-2.retooldb.com \
  -U retool \
  -d retool \
  -F c \
  -f backup.dump
```

### 3. Importar a RDS

```bash
pg_restore -h your-rds-endpoint.rds.amazonaws.com \
  -U admin \
  -d retool \
  -v backup.dump
```

### 4. Actualizar CONNECTION STRING

```
DATABASE_URL=postgresql://admin:password@your-rds-endpoint.rds.amazonaws.com:5432/retool
```

## Opción 2: Aurora PostgreSQL

### Ventajas
- Auto-scaling de almacenamiento
- Alta disponibilidad (Multi-AZ)
- Hasta 15 réplicas de lectura
- Failover automático < 30s
- Backups continuos a S3

### Crear Aurora Cluster

```bash
aws rds create-db-cluster \
  --db-cluster-identifier sistema-legal-cluster \
  --engine aurora-postgresql \
  --engine-version 14.6 \
  --master-username admin \
  --master-user-password YourSecurePassword123! \
  --database-name retool

aws rds create-db-instance \
  --db-instance-identifier sistema-legal-instance-1 \
  --db-instance-class db.t3.medium \
  --engine aurora-postgresql \
  --db-cluster-identifier sistema-legal-cluster
```

## Costos Estimados

| Opción | Configuración | Costo/mes (USD) |
|--------|---------------|-----------------|
| RDS PostgreSQL | db.t3.micro (1 vCPU, 1GB RAM) | ~$15 |
| RDS PostgreSQL | db.t3.small (2 vCPU, 2GB RAM) | ~$30 |
| Aurora PostgreSQL | db.t3.medium (2 vCPU, 4GB RAM) | ~$60 |

## Seguridad

### Security Group Rules
```
Inbound:
- Type: PostgreSQL
- Port: 5432
- Source: Your EC2 Security Group
```

### Backup Strategy
- Automated backups: 7 days retention
- Manual snapshots: Antes de cambios importantes
- Point-in-time recovery: Disponible

## Monitoreo

### CloudWatch Métricas
- DatabaseConnections
- CPUUtilization
- FreeableMemory
- ReadLatency / WriteLatency

### Alertas Recomendadas
- CPU > 80%
- Connections > 80% max_connections
- Free Storage < 2GB
