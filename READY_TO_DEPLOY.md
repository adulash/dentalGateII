# ✅ DentalGate II - Ready for Coolify Deployment

Your application is **ready to deploy** to Coolify via Git!

---

## 🎯 What's Done

✅ Git repository initialized  
✅ All files committed  
✅ Dockerfile configured for production  
✅ Docker Compose ready  
✅ Environment templates created  
✅ Deployment guides written  
✅ Database migrations ready  

---

## 📋 Next Steps (Choose One)

### Option 1: Quick Start (5 minutes)
→ **[QUICKSTART_COOLIFY.md](./QUICKSTART_COOLIFY.md)** - Fast deployment guide

### Option 2: Detailed Guide
→ **[COOLIFY_DEPLOY.md](./COOLIFY_DEPLOY.md)** - Complete step-by-step guide

### Option 3: Checklist
→ **[COOLIFY_CHECKLIST.md](./COOLIFY_CHECKLIST.md)** - Task-by-task checklist

---

## 🚀 Quick Deploy Steps

### 1. Create GitHub Repository

```bash
# Go to: https://github.com/new
# Name: dentalGateII
# Don't initialize with README
# Click "Create repository"
```

### 2. Push Code

```bash
# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/dentalGateII.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Deploy in Coolify

1. **Login to Coolify** (http://your-vps-ip:3000)

2. **Create Project**
   - Click `+ New` → `Project`
   - Name: `dentalgate`

3. **Add Application**
   - `+ Add` → `New Resource`
   - Select `Public Repository`
   - URL: `https://github.com/YOUR_USERNAME/dentalGateII`
   - Branch: `main`
   - Build Pack: `Dockerfile`

4. **Add PostgreSQL**
   - `+ Add` → `New Resource`
   - Select `PostgreSQL 15`
   - Database: `dentalgate`
   - Username: `dentalgate`
   - **Copy the generated password!**

5. **Set Environment Variables**
   - Copy variables from: **[coolify.env.template](./coolify.env.template)**
   - Generate JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Update DATABASE_URL with password from step 4

6. **Deploy**
   - Click `Deploy` button
   - Wait 2-3 minutes

7. **Run Migrations** (in Coolify terminal)
   ```bash
   cd /app/backend
   psql $DATABASE_URL -f migrations/schema.sql
   node migrations/migrate-data.js
   ```

8. **Access Application**
   - Open: `http://your-vps-ip:3000`
   - Login: `admin@dentalgate.com` / `TempPass123!`
   - **Change password immediately!**

---

## 📦 Important Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Container build configuration |
| `docker-compose.yml` | Multi-container orchestration |
| `coolify.env.template` | Environment variables template |
| `QUICKSTART_COOLIFY.md` | 5-minute deployment guide |
| `COOLIFY_DEPLOY.md` | Detailed deployment guide |
| `COOLIFY_CHECKLIST.md` | Step-by-step checklist |
| `DEPLOYMENT.md` | Full deployment documentation |
| `backend/migrations/schema.sql` | Database schema |
| `backend/migrations/migrate-data.js` | Data migration script |

---

## ⚙️ Environment Variables Required

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://dentalgate:PASSWORD@postgres-dentalgate:5432/dentalgate
JWT_SECRET=GENERATE_32_CHAR_SECRET
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔧 System Requirements

**Development:**
- Node.js 18+
- PostgreSQL 15+
- Git

**Production (VPS):**
- 2GB+ RAM
- Ubuntu 22.04+
- Docker + Coolify installed

---

## 📊 Project Structure

```
dentalGateII/
├── backend/                    # Node.js Express backend
│   ├── src/
│   │   ├── server.js          # Main server
│   │   ├── config/db.js       # Database connection
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Auth middleware
│   │   └── services/          # Business logic
│   ├── migrations/
│   │   ├── schema.sql         # Database schema
│   │   └── migrate-data.js    # Data migration
│   └── package.json
├── public/                     # Frontend files
│   ├── index.html             # Main UI
│   ├── app.js                 # Frontend logic
│   └── config.js              # Frontend config
├── data/                       # Migration data
│   ├── Users.json
│   ├── Orders.json
│   └── ...
├── Dockerfile                  # Container image
├── docker-compose.yml          # Multi-container setup
├── coolify.env.template        # Env vars template
└── README.md                   # Documentation
```

---

## 🔒 Security Checklist

Before deploying:

- [ ] Strong JWT secret (32+ chars)
- [ ] Strong database password
- [ ] HTTPS enabled (domain + SSL)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Firewall configured on VPS
- [ ] Regular backups planned

After deploying:

- [ ] Changed admin password from `TempPass123!`
- [ ] All users notified of temporary passwords
- [ ] Health check responding: `/health`
- [ ] Monitoring setup (optional)
- [ ] Backup strategy implemented

---

## 🆘 Common Issues

### Build Fails in Coolify
→ Check build logs, verify Dockerfile syntax

### Can't Connect to Database
→ Verify DATABASE_URL hostname (usually `postgres-APPNAME`)

### CORS Error
→ Update ALLOWED_ORIGINS to match your domain exactly

### Can't Login
→ Run migrations: `node migrations/migrate-data.js`

### Port Already in Use
→ Use different APP_PORT in environment variables

**Full troubleshooting:** [COOLIFY_DEPLOY.md#troubleshooting](./COOLIFY_DEPLOY.md#troubleshooting)

---

## 📚 Documentation

- **Quick Start:** [QUICKSTART_COOLIFY.md](./QUICKSTART_COOLIFY.md)
- **Detailed Guide:** [COOLIFY_DEPLOY.md](./COOLIFY_DEPLOY.md)
- **Checklist:** [COOLIFY_CHECKLIST.md](./COOLIFY_CHECKLIST.md)
- **Full Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Database Schema:** [backend/migrations/schema.sql](./backend/migrations/schema.sql)

---

## 🎉 You're Ready!

Everything is set up and ready to deploy to Coolify.

**Start with:** [QUICKSTART_COOLIFY.md](./QUICKSTART_COOLIFY.md)

**Questions?** Check troubleshooting sections in the guides.

---

**Built with ❤️ for dental clinics**

