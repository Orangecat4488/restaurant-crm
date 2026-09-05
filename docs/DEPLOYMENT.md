# 🚀 Deployment Guide — Restaurant CRM Licensing & Subscription System

Пошаговое руководство по развёртыванию коммерческой системы лицензирования в production-окружении.

---

## 1. Системные требования

- **ОС**: Linux Ubuntu 22.04 LTS / Debian 12 / RHEL 9
- **Node.js**: v20.x LTS или v22.x LTS
- **PostgreSQL**: 15+ или 16+
- **Nginx**: 1.22+ с модулем SSL (Certbot)
- **Оперативная память**: минимум 2 GB RAM (рекомендуется 4 GB)

---

## 2. Развёртывание базы данных PostgreSQL

```bash
# Установка PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Создание пользователя и БД
sudo -u postgres psql -c "CREATE USER crm_user WITH PASSWORD 'StrongDatabasePassword123!';"
sudo -u postgres psql -c "CREATE DATABASE crm_restaurant OWNER crm_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE crm_restaurant TO crm_user;"

# Применение схемы
psql -U crm_user -d crm_restaurant -f backend/src/database/schema.sql
```

---

## 3. Настройка переменных окружения (.env)

Скопируйте пример конфигурации:
```bash
cp backend/.env.example backend/.env
```

Отредактируйте параметры:
```ini
DATABASE_URL=postgresql://crm_user:StrongDatabasePassword123!@localhost:5432/crm_restaurant
PORT=5000
NODE_ENV=production

JWT_ACCESS_SECRET=your-32-char-cryptographically-secure-access-secret
JWT_REFRESH_SECRET=your-32-char-cryptographically-secure-refresh-secret

STRIPE_SECRET_KEY=sk_live_51...
STRIPE_PUBLIC_KEY=pk_live_51...
STRIPE_WEBHOOK_SECRET=whsec_...

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
SMTP_FROM=licensing@crm-restaurant.com

LICENSE_ENCRYPTION_KEY=your-32-byte-aes-secret-key-prod
```

---

## 4. Сборка и запуск сервисов через PM2

```bash
# Backend
cd backend
npm install --production=false
npm run build
npm run seed # Инициализация начальных планов
pm2 start dist/main.js --name "crm-licensing-api" -i max

# Frontend
cd ../frontend
npm install
npm run build
# Статические файлы frontend раздаются через Nginx из frontend/dist
```

---

## 5. Конфигурация Nginx & SSL

```nginx
server {
    listen 80;
    server_name api.crm-restaurant.com crm-restaurant.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.crm-restaurant.com;

    ssl_certificate /etc/letsencrypt/live/api.crm-restaurant.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.crm-restaurant.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
