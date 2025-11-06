# DentalGate II - Deployment Guide

Complete guide to deploy DentalGate II with PostgreSQL backend on VPS using Coolify.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Database Migration](#database-migration)
4. [Deploy to Coolify (VPS)](#deploy-to-coolify-vps)
5. [Manual VPS Deployment](#manual-vps-deployment)
6. [Environment Variables](#environment-variables)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- Node.js 18+ and npm
- PostgreSQL 15+
- Git
- VPS with Ubuntu 22.04+ (for production)
- Domain name (optional but recommended)

### For Coolify Deployment
- VPS with 2GB+ RAM
- Coolify installed on VPS ([installation guide](https://coolify.io/docs/installation))

---

## Local Development

### 1. Clone and Setup

```bash
# Install dependencies
cd dentalGateII
npm install
cd backend && npm install && cd ..
```

### 2. Setup PostgreSQL

```bash
# Install PostgreSQL (if not installed)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE dentalgate;
CREATE USER dentalgate WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE dentalgate TO dentalgate;
\q
```

### 3. Configure Environment

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://dentalgate:your-password@localhost:5432/dentalgate

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Run Database Migrations

```bash
# Create schema
cd backend
npm run migrate:schema

# Or manually:
psql $DATABASE_URL -f migrations/schema.sql
```

### 5. Migrate Existing Data

```bash
# Make sure your data files are in /data directory
npm run migrate:data
```

**Note:** All users will get temp password: `TempPass123!`

### 6. Start Development Server

```bash
# Backend
cd backend
npm run dev

# Server runs at http://localhost:3000
```

### 7. Test Application

- Open http://localhost:3000
- Login with migrated user
- Default admin password: `TempPass123!`

---

## Database Migration

### From Firebase to PostgreSQL

If migrating from Firebase:

1. **Export Firebase Data:**

```bash
# Already have data in /data/*.json
# Skip this if you have the JSON files
```

2. **Run Migration:**

```bash
cd backend
node migrations/migrate-data.js
```

3. **Verify:**

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM orders;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM issues;"
```

---

## Deploy to Coolify (VPS)

Coolify provides the easiest deployment experience.

### Prerequisites

1. **VPS with Coolify installed** ([install guide](https://coolify.io/docs/installation))
2. **Domain pointed to VPS** (optional but recommended)
3. **GitHub/GitLab repository** (for auto-deploy)

### Step 1: Prepare Repository

```bash
# Commit all changes
git add .
git commit -m "Ready for Coolify deployment"
git push origin main
```

### Step 2: Add Project in Coolify

1. **Login to Coolify dashboard**
   - Navigate to http://your-vps-ip:3000

2. **Create New Project**
   - Click "New Project"
   - Name: `dentalgate-ii`
   - Select Git repository or use Docker Compose

### Step 3A: Deploy via Git (Recommended)

1. **Add Resource → Git Repository**
   - Repository URL: `https://github.com/yourusername/dentalGateII`
   - Branch: `main`
   - Build Pack: `Docker`

2. **Configure Build**
   - Dockerfile Path: `/Dockerfile`
   - Docker Compose Path: Leave empty (or use `/docker-compose.yml` for full stack)

3. **Set Environment Variables**
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://dentalgate:STRONG_PASSWORD@postgres:5432/dentalgate
   JWT_SECRET=generate-a-strong-secret-min-32-chars
   JWT_EXPIRES_IN=15m
   REFRESH_TOKEN_EXPIRES_IN=7d
   ALLOWED_ORIGINS=https://yourdomain.com
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Add PostgreSQL Database**
   - In project, click "Add Resource" → "Database" → "PostgreSQL"
   - Version: 15
   - Database name: `dentalgate`
   - Username: `dentalgate`
   - Password: Generate strong password
   - Copy connection string to `DATABASE_URL`

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Check logs for errors

### Step 3B: Deploy via Docker Compose

1. **Add Resource → Docker Compose**

2. **Paste docker-compose.yml content:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dentalgate
      POSTGRES_USER: dentalgate
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dentalgate"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: ghcr.io/yourusername/dentalgate:latest
    # Or build from repo:
    # build: .
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://dentalgate:${POSTGRES_PASSWORD}@postgres:5432/dentalgate
      JWT_SECRET: ${JWT_SECRET}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

3. **Set Environment Variables in Coolify**
4. **Deploy**

### Step 4: Run Database Migrations

After first deployment:

1. **Access container console** in Coolify
2. **Run migrations:**

```bash
cd /app/backend
psql $DATABASE_URL -f migrations/schema.sql
node migrations/migrate-data.js
```

Or use Coolify's "Run Command" feature.

### Step 5: Setup Domain & SSL

1. **In Coolify → Domains**
   - Add your domain: `dentalgate.yourdomain.com`
   - Enable SSL (auto-generated via Let's Encrypt)

2. **Update ALLOWED_ORIGINS**
   - Add your domain to environment variables
   - Redeploy

### Step 6: Access Application

- Navigate to `https://dentalgate.yourdomain.com`
- Login with admin account
- Default password: `TempPass123!`
- **Change admin password immediately!**

---

## Manual VPS Deployment

Without Coolify, deploy directly to VPS.

### 1. Prepare VPS

```bash
# SSH into VPS
ssh user@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install docker-compose-plugin
```

### 2. Setup Project

```bash
# Clone repository
git clone https://github.com/yourusername/dentalGateII.git
cd dentalGateII

# Copy environment file
cp env.production.example .env

# Edit environment variables
nano .env
# Set strong passwords and secrets!
```

### 3. Deploy with Docker Compose

```bash
# Build and start services
docker compose up -d

# Check logs
docker compose logs -f

# Run database migrations
docker compose exec app sh -c "cd backend && psql \$DATABASE_URL -f migrations/schema.sql"
docker compose exec app sh -c "cd backend && node migrations/migrate-data.js"
```

### 4. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/dentalgate
```

Add:

```nginx
server {
    listen 80;
    server_name dentalgate.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dentalgate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Setup SSL with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d dentalgate.yourdomain.com

# Auto-renewal is setup automatically
```

### 6. Setup Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | `your-super-secret-key-here` |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiry | `7d` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://yourdomain.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### Generate Strong JWT Secret

```bash
# Generate 32-byte random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
docker compose exec app psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL logs
docker compose logs postgres

# Verify connection string
docker compose exec app env | grep DATABASE_URL
```

### Migration Failures

```bash
# Check if schema exists
docker compose exec app psql $DATABASE_URL -c "\dt"

# Reset database (⚠️ DANGER: deletes all data)
docker compose exec app psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-run migrations
docker compose exec app sh -c "cd backend && psql \$DATABASE_URL -f migrations/schema.sql"
```

### Application Won't Start

```bash
# Check logs
docker compose logs app

# Verify environment variables
docker compose exec app env

# Restart services
docker compose restart

# Rebuild from scratch
docker compose down -v
docker compose up -d --build
```

### Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Or change port in .env file
```

### CORS Errors

1. Check `ALLOWED_ORIGINS` includes your domain
2. Verify no trailing slash in origin
3. Check browser console for exact error
4. Restart app after changing env vars

### SSL Certificate Issues

```bash
# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

### Cannot Login

1. **Check user exists:**
```bash
docker compose exec app psql $DATABASE_URL -c "SELECT email, status FROM users WHERE email='admin@dentalgate.com';"
```

2. **Reset admin password:**
```bash
# Generate new password hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('newpassword', 10).then(console.log);"

# Update in database
docker compose exec app psql $DATABASE_URL -c "UPDATE users SET password_hash='<hash>', status='Active' WHERE email='admin@dentalgate.com';"
```

3. **Check JWT secret is set**

### Performance Issues

```bash
# Check resource usage
docker stats

# Check PostgreSQL connections
docker compose exec app psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Restart services
docker compose restart
```

---

## Backup & Restore

### Backup Database

```bash
# Create backup
docker compose exec postgres pg_dump -U dentalgate dentalgate > backup_$(date +%Y%m%d).sql

# With Docker Compose
docker compose exec postgres pg_dump -U dentalgate -F c dentalgate > backup.dump
```

### Restore Database

```bash
# From SQL file
docker compose exec -T postgres psql -U dentalgate dentalgate < backup.sql

# From dump file
docker compose exec -T postgres pg_restore -U dentalgate -d dentalgate < backup.dump
```

### Automated Backups

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/dentalGateII && docker compose exec postgres pg_dump -U dentalgate -F c dentalgate > backups/backup_$(date +\%Y\%m\%d).dump
```

---

## Monitoring

### Health Check

```bash
# Application health
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"...","database":"connected"}
```

### Logs

```bash
# View all logs
docker compose logs -f

# View app logs only
docker compose logs -f app

# View last 100 lines
docker compose logs --tail=100 app
```

### Database Monitoring

```bash
# Active connections
docker compose exec postgres psql -U dentalgate -c "SELECT count(*) FROM pg_stat_activity WHERE datname='dentalgate';"

# Database size
docker compose exec postgres psql -U dentalgate -c "SELECT pg_size_pretty(pg_database_size('dentalgate'));"

# Table sizes
docker compose exec postgres psql -U dentalgate -d dentalgate -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::text)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(tablename::text) DESC;"
```

---

## Post-Deployment Checklist

- [ ] Database schema created successfully
- [ ] Data migrated from Firebase/Google Sheets
- [ ] Admin account accessible
- [ ] Changed default admin password
- [ ] SSL certificate installed and working
- [ ] CORS configured correctly
- [ ] Backup strategy implemented
- [ ] Monitoring setup (optional: Uptime Kuma, etc.)
- [ ] Firewall configured
- [ ] All users notified of new system and temporary passwords
- [ ] Documentation updated with production URLs

---

## Support & Updates

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Check logs
docker compose logs -f app
```

### Rollback

```bash
# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild
docker compose up -d --build
```

---

## Security Recommendations

1. **Change all default passwords immediately**
2. **Use strong JWT secret (min 32 chars)**
3. **Enable firewall (ufw)**
4. **Keep system updated:** `sudo apt update && sudo apt upgrade`
5. **Regular backups**
6. **Monitor logs for suspicious activity**
7. **Use HTTPS only (SSL)**
8. **Implement rate limiting** (already configured)
9. **Regular security audits**
10. **Keep Docker images updated**

---

## Cost Estimation

### Recommended VPS Specs

- **Development:** 1 CPU, 2GB RAM - $5-10/month
- **Production (< 100 users):** 2 CPU, 4GB RAM - $20-30/month
- **Production (< 500 users):** 4 CPU, 8GB RAM - $40-60/month

### Providers

- DigitalOcean: $6-48/month
- Hetzner: €4.50-27/month (cheapest, EU only)
- Linode: $5-48/month
- Vultr: $6-48/month

---

**Questions? Issues?** Check Troubleshooting section or create a GitHub issue.

