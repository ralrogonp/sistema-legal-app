# Guía de Despliegue en AWS EC2

## 1. Preparar EC2 Instance

### Especificaciones Recomendadas
- Instance Type: t3.small o superior
- OS: Ubuntu 22.04 LTS
- Storage: 20GB SSD (gp3)
- Security Groups: Puertos 80, 443, 22, 3000

### Conectar a EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

## 2. Instalar Dependencias

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar Nginx (reverse proxy)
sudo apt install -y nginx

# Instalar PM2 (process manager)
sudo npm install -g pm2
```

## 3. Clonar Repositorio

```bash
cd /home/ubuntu
git clone https://github.com/your-repo/sistema-legal-app.git
cd sistema-legal-app
```

## 4. Configurar Aplicación

```bash
# Backend
cd backend
cp .env.example .env
nano .env  # Editar con tus credenciales

# Frontend
cd ../frontend
cp .env.example .env
nano .env
```

## 5. Desplegar con Docker

```bash
cd /home/ubuntu/sistema-legal-app
chmod +x deploy.sh
./deploy.sh
```

## 6. Configurar Nginx como Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/sistema-legal
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sistema-legal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 7. SSL con Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 8. Auto-start con PM2 (alternativa a Docker)

```bash
cd backend
pm2 start npm --name "legal-backend" -- start
pm2 startup
pm2 save
```

## 9. Monitoreo

```bash
# Ver logs
docker-compose logs -f

# Estado de containers
docker-compose ps

# Uso de recursos
docker stats
```
