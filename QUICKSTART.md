# DentalGate II - Quick Start Guide

Get up and running in 10 minutes!

## 🎯 What You Have Now

✅ **PostgreSQL + Express Backend** - No Firebase dependency  
✅ **JWT Authentication** - Secure token-based auth  
✅ **Docker Ready** - Easy deployment  
✅ **Coolify Compatible** - One-click deploy  
✅ **Complete Migration** - All your existing data  

## 🚀 Quick Deploy to Coolify (Recommended)

**Time:** 5 minutes

### Prerequisites
- VPS with Coolify installed ([install guide](https://coolify.io/docs/installation))
- Your data files in `/data/*.json`

### Steps

1. **Push to Git**
   ```bash
   git add .
   git commit -m "PostgreSQL migration complete"
   git push origin main
   ```

2. **In Coolify Dashboard:**
   - New Project → "DentalGate II"
   - Add Git Repository
   - Select your repo + `main` branch
   - Build Pack: Docker

3. **Add PostgreSQL Database:**
   - Add Resource → Database → PostgreSQL 15
   - Copy connection string

4. **Set Environment Variables:**
   ```env
   DATABASE_URL=<connection-string-from-step-3>
   JWT_SECRET=<generate-with-command-below>
   NODE_ENV=production
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

   **Generate JWT Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes

6. **Run Migrations:**
   - In Coolify, open container console
   - Run:
   ```bash
   cd backend
   psql $DATABASE_URL -f migrations/schema.sql
   node migrations/migrate-data.js
   ```

7. **Access Your App:**
   - Open your domain
   - Login with: Email from your data, Password: `TempPass123!`
   - **Change password immediately!**

**Done!** 🎉

---

## 💻 Local Development

**Time:** 10 minutes

### 1. Install Dependencies

```bash
npm install
cd backend && npm install && cd ..
```

### 2. Setup PostgreSQL

```bash
# Install PostgreSQL (if needed)
sudo apt install postgresql

# Create database
sudo -u postgres psql -c "CREATE DATABASE dentalgate;"
sudo -u postgres psql -c "CREATE USER dentalgate WITH PASSWORD 'dev123';"
sudo -u postgres psql -c "GRANT ALL ON DATABASE dentalgate TO dentalgate;"
```

### 3. Configure

Create `backend/.env`:

```env
DATABASE_URL=postgresql://dentalgate:dev123@localhost:5432/dentalgate
JWT_SECRET=dev-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### 4. Run Migrations

```bash
cd backend

# Create schema
psql $DATABASE_URL -f migrations/schema.sql

# Import data
node migrations/migrate-data.js
```

### 5. Start Server

```bash
npm run dev
```

### 6. Access App

Open http://localhost:3000

**Login:**
- Email: (from your migrated users)
- Password: `TempPass123!`

---

## 🐳 Docker Deployment (Manual VPS)

**Time:** 15 minutes

### 1. Prepare VPS

```bash
# SSH into VPS
ssh user@your-vps-ip

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Clone & Configure

```bash
# Clone repo
git clone <your-repo-url>
cd dentalGateII

# Copy env file
cp env.production.example .env

# Edit environment
nano .env
```

**Set these variables:**
```env
POSTGRES_PASSWORD=<strong-password>
JWT_SECRET=<generate-random-32-chars>
ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. Start Services

```bash
# Start
docker compose up -d

# Check logs
docker compose logs -f
```

### 4. Run Migrations

```bash
docker compose exec app sh -c "cd backend && psql \$DATABASE_URL -f migrations/schema.sql"
docker compose exec app sh -c "cd backend && node migrations/migrate-data.js"
```

### 5. Setup Nginx + SSL

```bash
# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx

# Create config
sudo nano /etc/nginx/sites-available/dentalgate
```

**Add:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable
sudo ln -s /etc/nginx/sites-available/dentalgate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL
sudo certbot --nginx -d yourdomain.com
```

### 6. Access

Open https://yourdomain.com

---

## 📂 Project Structure

```
dentalGateII/
├── backend/                      # Backend application
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js            # PostgreSQL connection
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT authentication
│   │   ├── routes/              # API routes
│   │   │   ├── auth.routes.js   # /api/auth/*
│   │   │   ├── admin.routes.js  # /api/admin/*
│   │   │   ├── api.routes.js    # /api/*
│   │   │   ├── profile.routes.js
│   │   │   └── comments.routes.js
│   │   ├── services/
│   │   │   └── auth.service.js  # Auth logic
│   │   └── server.js            # Main server file
│   ├── migrations/
│   │   ├── schema.sql           # Database schema
│   │   └── migrate-data.js      # Data migration
│   └── package.json
├── public/                       # Frontend
│   ├── index-new.html           # Main HTML (PostgreSQL version)
│   ├── app-new.js               # Main JS (PostgreSQL version)
│   └── config.js                # API configuration
├── data/                         # Your existing data
│   ├── Users.json
│   ├── Orders.json
│   ├── Issues.json
│   └── ...
├── Dockerfile                    # Docker build
├── docker-compose.yml            # Docker services
├── README.md                     # Full documentation
├── DEPLOYMENT.md                 # Detailed deployment guide
└── QUICKSTART.md                 # This file
```

---

## 🔑 Important Files to Update

### For Production:

1. **Replace Frontend Files:**
   ```bash
   # Backup old files
   mv public/index.html public/index-firebase-backup.html
   mv public/app.js public/app-firebase-backup.js

   # Use new files
   mv public/index-new.html public/index.html
   mv public/app-new.js public/app.js
   ```

2. **Update Environment:**
   - Set strong `JWT_SECRET` (32+ chars)
   - Set production `DATABASE_URL`
   - Set your `ALLOWED_ORIGINS`

3. **Secure Passwords:**
   - Change admin password from `TempPass123!`
   - Force all users to change passwords

---

## 🎓 Default Credentials

After migration, **all users** have:
- **Password:** `TempPass123!`

**First Login Flow:**
1. User logs in with temp password
2. Status is "Inactive" → shown password change form
3. User sets new password
4. Admin activates account
5. User can now login normally

**Admin must:** Activate users after they set passwords

---

## ✅ Post-Deployment Checklist

- [ ] App accessible at your domain
- [ ] SSL certificate installed (https://)
- [ ] Can login with migrated users
- [ ] Changed admin password
- [ ] Database migrations ran successfully
- [ ] All data visible (Orders, Issues, etc.)
- [ ] Comments working
- [ ] Profile page working
- [ ] Admin panel accessible
- [ ] Backups configured
- [ ] Monitoring setup (optional)

---

## 🆘 Common Issues

### Can't Login

**Check user exists:**
```bash
# Docker
docker compose exec app psql $DATABASE_URL -c "SELECT email, status FROM users;"

# Local
psql $DATABASE_URL -c "SELECT email, status FROM users;"
```

**Reset password:**
```bash
cd backend
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('newpass',10).then(console.log);"
# Copy hash, then:
psql $DATABASE_URL -c "UPDATE users SET password_hash='<hash>', status='Active' WHERE email='your@email.com';"
```

### Database Connection Failed

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# If fails, check:
# 1. Is PostgreSQL running?
sudo systemctl status postgresql  # or: docker compose ps

# 2. Is DATABASE_URL correct?
echo $DATABASE_URL

# 3. Can you connect manually?
psql $DATABASE_URL
```

### Port Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill it
sudo kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Migrations Failed

```bash
# Check if database exists
psql -U postgres -l | grep dentalgate

# If not, create it:
createdb dentalgate

# Drop and recreate (⚠️ deletes all data)
dropdb dentalgate
createdb dentalgate

# Re-run migrations
cd backend
psql $DATABASE_URL -f migrations/schema.sql
node migrations/migrate-data.js
```

---

## 📚 Next Steps

1. **Read Full Documentation:** [README.md](./README.md)
2. **Detailed Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
3. **Database Schema:** [backend/migrations/schema.sql](./backend/migrations/schema.sql)
4. **Customize Your App** - Update branding, add features
5. **Setup Backups** - See [DEPLOYMENT.md](./DEPLOYMENT.md#backup--restore)
6. **Monitor Your App** - Setup Uptime monitoring

---

## 🎉 You're Done!

Your DentalGate II is now running on:
- ✅ PostgreSQL (no Firebase)
- ✅ JWT authentication
- ✅ Your own VPS
- ✅ Your own domain
- ✅ Full control

**No more Firebase billing walls!** 🎊

---

**Need help?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) or create an issue on GitHub.

