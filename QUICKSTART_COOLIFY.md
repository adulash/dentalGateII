# Quick Start - Coolify Deployment (5 Minutes)

Deploy DentalGate II to Coolify in 5 minutes.

## Prerequisites

- Coolify installed on VPS
- GitHub/GitLab account

---

## Step 1: Setup Git (2 minutes)

**Windows:**
```powershell
# Run setup script
.\setup-git.bat

# Or manually:
git init
git add .
git commit -m "Initial commit"
```

**Linux/Mac:**
```bash
# Run setup script
chmod +x setup-git.sh
./setup-git.sh

# Or manually:
git init
git add .
git commit -m "Initial commit"
```

## Step 2: Push to GitHub (1 minute)

1. **Create repository on GitHub:**
   - Go to https://github.com/new
   - Name: `dentalGateII`
   - **Don't** check "Initialize with README"
   - Click "Create repository"

2. **Push code:**
```bash
git remote add origin https://github.com/YOUR_USERNAME/dentalGateII.git
git branch -M main
git push -u origin main
```

## Step 3: Add to Coolify (1 minute)

1. **Login to Coolify** (http://your-vps-ip:3000)

2. **Create Project:**
   - Click `+ New` → `Project`
   - Name: `dentalgate`
   - Create

3. **Add App:**
   - Click `+ Add` → `New Resource`
   - Select `Public Repository`
   - Paste: `https://github.com/YOUR_USERNAME/dentalGateII`
   - Branch: `main`
   - Build Pack: `Dockerfile`
   - Save

4. **Add Database:**
   - Click `+ Add` → `New Resource`
   - Select `PostgreSQL`
   - Version: `15`
   - Database: `dentalgate`
   - Username: `dentalgate`
   - Password: Auto-generated (**COPY IT!**)
   - Create

## Step 4: Configure Environment (30 seconds)

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy output**, then in Coolify:

1. Click your app → `Environment Variables`
2. Click `+ Add`
3. **Paste these** (update values):

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://dentalgate:YOUR_DB_PASSWORD@postgres-dentalgate:5432/dentalgate
JWT_SECRET=PASTE_GENERATED_SECRET_HERE
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://YOUR_VPS_IP:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important:**
- Replace `YOUR_DB_PASSWORD` with password from Step 3.4
- Replace `YOUR_VPS_IP` with your server IP
- Replace `JWT_SECRET` with generated secret

## Step 5: Deploy (30 seconds)

1. **Click `Deploy` button**
2. **Wait** for "Running" status (2-3 minutes)
3. **Access terminal** (in Coolify app view)

**Run migrations:**
```bash
cd /app/backend
psql $DATABASE_URL -f migrations/schema.sql
node migrations/migrate-data.js
```

## Step 6: Access Application (10 seconds)

**Open:** `http://YOUR_VPS_IP:3000`

**Login:**
- Email: `admin@dentalgate.com`
- Password: `TempPass123!`

**🎉 Done! Change password immediately.**

---

## With Domain (Optional - +3 minutes)

### Add Domain

1. **In Coolify app → Domains:**
   - Add: `dentalgate.yourdomain.com`
   - Save (SSL auto-generates)

2. **Update DNS:**
   - Add A record: `dentalgate` → VPS IP

3. **Update Environment:**
   - Change `ALLOWED_ORIGINS` to: `https://dentalgate.yourdomain.com`
   - Redeploy

4. **Access:** `https://dentalgate.yourdomain.com`

---

## Troubleshooting

### Build fails?
- Check logs in Coolify
- Verify Dockerfile exists in repository

### Can't connect to database?
- Verify `DATABASE_URL` hostname (usually `postgres-dentalgate`)
- Check PostgreSQL resource is running

### Can't login?
```bash
# In Coolify terminal
psql $DATABASE_URL -c "SELECT email FROM users LIMIT 5;"
# If empty, re-run: node migrations/migrate-data.js
```

### CORS error?
- Check `ALLOWED_ORIGINS` matches your URL exactly
- No trailing slash
- Include protocol (http:// or https://)

---

## Next Steps

- [ ] Change admin password
- [ ] Add domain + SSL
- [ ] Enable auto-deploy on push
- [ ] Setup backups
- [ ] Invite users

**Need detailed guide?** See [COOLIFY_DEPLOY.md](./COOLIFY_DEPLOY.md)

---

**Questions?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) or create GitHub issue.

