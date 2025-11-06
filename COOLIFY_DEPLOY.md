# Coolify Deployment Guide - DentalGate II

Quick deployment guide for deploying DentalGate II to Coolify via Git repository.

## Prerequisites

- VPS with Coolify installed
- Git repository (GitHub/GitLab/Bitbucket)
- Domain name (optional but recommended)

## Step 1: Push to Git Repository

```bash
# Add all files
git add .

# Commit
git commit -m "Ready for Coolify deployment"

# Push to repository
git push origin main
```

## Step 2: Add Project in Coolify

1. **Login to Coolify**
   - Navigate to `http://your-vps-ip:3000` or your Coolify domain

2. **Create New Project**
   - Click `+ New` → `Project`
   - Name: `dentalgate`

## Step 3: Add Application Resource

1. **Add Resource**
   - Click `+ Add` → `New Resource`
   - Select `Public Repository` or `Private Repository` (with Git credentials)

2. **Configure Repository**
   - Repository URL: `https://github.com/yourusername/dentalGateII`
   - Branch: `main` (or your branch name)
   - Build Pack: Select `Dockerfile`

3. **Build Configuration**
   - Dockerfile Location: `/Dockerfile`
   - Build Context: `/`
   - Port Exposed: `3000`

## Step 4: Add PostgreSQL Database

1. **Add Database Resource**
   - In same project, click `+ Add` → `New Resource`
   - Select `PostgreSQL`
   - Version: `15`
   - Database name: `dentalgate`
   - Username: `dentalgate`
   - Password: *Auto-generated (copy it!)*

2. **Copy Connection String**
   - Coolify will show: `postgresql://dentalgate:PASSWORD@postgres:5432/dentalgate`
   - Save this for environment variables

## Step 5: Configure Environment Variables

Click on your app → `Environment Variables` → Add these:

### Required Variables

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://dentalgate:YOUR_DB_PASSWORD@postgres-dentalgate:5432/dentalgate
JWT_SECRET=GENERATE_STRONG_SECRET_HERE
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Generate JWT Secret

**On your local machine:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Or online:** Use any secure random string generator (min 32 chars)

### Important Notes

- Replace `YOUR_DB_PASSWORD` with the password from Step 4
- Replace `yourdomain.com` with your actual domain
- For `DATABASE_URL`: Use the internal Docker network name shown in Coolify (usually `postgres-dentalgate`)

## Step 6: Configure Domain (Optional)

1. **Add Domain**
   - In app settings → `Domains`
   - Add: `dentalgate.yourdomain.com`
   
2. **DNS Configuration**
   - Add A record: `dentalgate` → VPS IP
   
3. **SSL Certificate**
   - Coolify auto-generates Let's Encrypt certificate
   - Wait 1-2 minutes for certificate issuance

4. **Update ALLOWED_ORIGINS**
   - Go back to Environment Variables
   - Update `ALLOWED_ORIGINS=https://dentalgate.yourdomain.com`

## Step 7: Deploy Application

1. **Click `Deploy` button**
   - Watch build logs in real-time
   - Wait for "Application started" message
   - Should take 2-5 minutes

2. **Check Deployment Status**
   - Status should show "Running"
   - Green indicator means success

## Step 8: Run Database Migrations

**After first successful deployment:**

1. **Access Container Console**
   - In Coolify app view → `Terminal` or `Execute Command`

2. **Run Migrations**

```bash
# Create database schema
cd /app/backend
psql $DATABASE_URL -f migrations/schema.sql

# Migrate data (if you have data in /data directory)
node migrations/migrate-data.js
```

**Or use Coolify's "Run Command" feature:**
- Command 1: `cd /app/backend && psql $DATABASE_URL -f migrations/schema.sql`
- Command 2: `cd /app/backend && node migrations/migrate-data.js`

## Step 9: Verify Deployment

1. **Health Check**
```bash
curl https://dentalgate.yourdomain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

2. **Access Application**
   - Navigate to `https://dentalgate.yourdomain.com`
   - Login page should appear

3. **Test Login**
   - Email: `admin@dentalgate.com` (or migrated user email)
   - Password: `TempPass123!` (default temp password)
   - **Change password immediately after first login!**

## Step 10: Post-Deployment

### Security Checklist

- [ ] Changed admin password
- [ ] Verified JWT_SECRET is strong (32+ characters)
- [ ] SSL certificate is active (https)
- [ ] Database password is strong
- [ ] ALLOWED_ORIGINS configured correctly
- [ ] Tested all major features

### Setup Auto-Deploy (Optional)

1. **In Coolify App Settings**
   - Enable `Automatic Deployment on Git Push`
   - Set branch: `main`

2. **Webhook (if needed)**
   - Copy webhook URL from Coolify
   - Add to GitHub/GitLab repository webhooks

Now every push to `main` auto-deploys!

## Environment Variables Reference

### Application Environment

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Don't change |
| `PORT` | `3000` | Must match Dockerfile EXPOSE |
| `DATABASE_URL` | `postgresql://...` | From Coolify PostgreSQL resource |
| `JWT_SECRET` | Random 32+ chars | Generate unique secret |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `ALLOWED_ORIGINS` | Your domain | CORS whitelist |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 15 minutes in ms |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

### Database Connection Format

**Internal (Docker network):**
```
postgresql://dentalgate:PASSWORD@postgres-APPNAME:5432/dentalgate
```

**External (from internet):**
```
postgresql://dentalgate:PASSWORD@your-vps-ip:EXPOSED_PORT/dentalgate
```

Use **internal** format in application environment variables.

## Troubleshooting

### Build Fails

**Check logs:**
- View build logs in Coolify
- Look for npm install errors or Dockerfile issues

**Common fixes:**
```bash
# Clear build cache
In Coolify: Settings → Clear Build Cache

# Verify Dockerfile path is correct: /Dockerfile
```

### Database Connection Error

**Verify connection string:**
1. Check Coolify PostgreSQL resource for correct hostname
2. Usually format: `postgres-{appname}` or `postgres-{resourceid}`
3. Update `DATABASE_URL` environment variable
4. Restart application

**Test connection:**
```bash
# In container terminal
psql $DATABASE_URL -c "SELECT 1"
```

### Can't Access Application

**Check deployment status:**
- Application status should be "Running" (green)
- Check logs for startup errors

**Verify port:**
- Port 3000 must be exposed in Dockerfile (it is)
- Coolify should auto-detect exposed port

**Check domain:**
- DNS A record pointing to VPS IP
- Wait 5-10 minutes for DNS propagation
- Try direct IP: `http://vps-ip:port`

### Migration Fails

**Check data directory:**
- Ensure `/data/*.json` files exist in repository
- Files should be committed to Git

**Manual migration:**
```bash
# Access container terminal in Coolify
cd /app/backend

# Check data files
ls -la /app/data/

# Run migration with verbose output
node migrations/migrate-data.js
```

### CORS Errors

**Update ALLOWED_ORIGINS:**
1. Check browser console for exact origin
2. Add to `ALLOWED_ORIGINS` in environment variables
3. Restart application
4. Clear browser cache

**Format:**
```env
# Single domain
ALLOWED_ORIGINS=https://dentalgate.yourdomain.com

# Multiple domains
ALLOWED_ORIGINS=https://dentalgate.yourdomain.com,https://www.dentalgate.yourdomain.com
```

### Can't Login After Deployment

**Check user exists:**
```bash
psql $DATABASE_URL -c "SELECT email, status FROM users LIMIT 5;"
```

**If no users, run migration:**
```bash
cd /app/backend
node migrations/migrate-data.js
```

**Reset admin password:**
```bash
# Generate new hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('NewPass123!', 10).then(console.log);"

# Update database
psql $DATABASE_URL -c "UPDATE users SET password_hash='GENERATED_HASH', status='Active' WHERE email='admin@dentalgate.com';"
```

### Logs Show Database Error

**Check PostgreSQL is running:**
- In Coolify, verify PostgreSQL resource status
- Should show "Running"

**Restart PostgreSQL:**
- Click PostgreSQL resource → Restart

**Check database exists:**
```bash
psql $DATABASE_URL -c "\l"
```

## Backup Strategy

### Manual Backup

```bash
# In Coolify container terminal
pg_dump $DATABASE_URL > /tmp/backup_$(date +%Y%m%d).sql

# Download via Coolify file browser
```

### Automated Backup

**Setup in Coolify:**
1. Go to PostgreSQL resource
2. Enable automatic backups
3. Set schedule (e.g., daily at 2 AM)
4. Set retention period

**Or use external backup service:**
- Backup to S3/DigitalOcean Spaces
- Use `pg_dump` with cron job

## Scaling & Performance

### Increase Resources

1. **In Coolify App Settings:**
   - CPU Limit: 1-2 cores
   - Memory Limit: 2-4 GB

2. **Database:**
   - Adjust PostgreSQL memory settings
   - Add connection pooling if needed

### Monitor Performance

**Check logs:**
```bash
# In Coolify
View app logs for slow queries or errors
```

**Database stats:**
```bash
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

## Updates & Maintenance

### Update Application

```bash
# Local development
git add .
git commit -m "Update feature"
git push origin main

# Coolify auto-deploys (if enabled)
# Or manually click "Deploy" in Coolify
```

### Database Migrations

**When updating schema:**

1. **Create migration file**
   - Add new SQL in `backend/migrations/`

2. **Deploy code first**
   - Push to Git
   - Let Coolify deploy

3. **Run migration**
   - Access container terminal
   - Execute migration SQL

```bash
psql $DATABASE_URL -f migrations/new_migration.sql
```

## Cost Optimization

### VPS Requirements

**Development/Testing:**
- 1 CPU, 2 GB RAM
- $5-10/month
- DigitalOcean, Hetzner, Vultr

**Production (<100 users):**
- 2 CPU, 4 GB RAM
- $20-30/month

**Production (>100 users):**
- 4 CPU, 8 GB RAM
- $40-60/month

### Tips

- Use Hetzner for cheapest VPS (€4.50/month)
- Enable Coolify automatic backups
- Monitor resource usage in Coolify dashboard
- Scale up only when needed

## Support

**Issues:**
- Check logs first
- Review troubleshooting section
- GitHub Issues: [Create issue](https://github.com/yourusername/dentalGateII/issues)

**Coolify Docs:**
- https://coolify.io/docs

---

## Quick Command Reference

```bash
# Access container terminal
# (In Coolify → Terminal)

# Check app health
curl http://localhost:3000/health

# View database tables
psql $DATABASE_URL -c "\dt"

# Count users
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Check logs
# (In Coolify → Logs)

# Restart app
# (In Coolify → Restart button)

# Clear build cache
# (In Coolify → Settings → Clear Build Cache)
```

---

**Deployment complete! 🚀**

Access your app at: `https://dentalgate.yourdomain.com`

