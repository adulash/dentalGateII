# Coolify Deployment Checklist

Quick reference checklist for deploying DentalGate II to Coolify.

## Pre-Deployment

- [ ] Git repository created (GitHub/GitLab)
- [ ] All code committed and pushed
- [ ] VPS with Coolify installed
- [ ] Domain name ready (optional)
- [ ] DNS A record pointing to VPS

## Coolify Setup

- [ ] Created new project in Coolify
- [ ] Added Git repository resource
- [ ] Set build pack to Dockerfile
- [ ] Added PostgreSQL database resource
- [ ] Copied database connection string

## Environment Variables

Generate and set these in Coolify:

- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `DATABASE_URL=postgresql://...` (from Coolify PostgreSQL)
- [ ] `JWT_SECRET=` (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] `JWT_EXPIRES_IN=15m`
- [ ] `REFRESH_TOKEN_EXPIRES_IN=7d`
- [ ] `ALLOWED_ORIGINS=https://yourdomain.com`
- [ ] `RATE_LIMIT_WINDOW_MS=900000`
- [ ] `RATE_LIMIT_MAX_REQUESTS=100`

## Domain Setup (Optional)

- [ ] Added domain in Coolify
- [ ] DNS A record configured
- [ ] SSL certificate generated (auto)
- [ ] Updated ALLOWED_ORIGINS with domain

## Initial Deployment

- [ ] Clicked Deploy button
- [ ] Build completed successfully
- [ ] Application status: Running
- [ ] Health check passes: `curl https://yourdomain.com/health`

## Database Setup

- [ ] Accessed container terminal
- [ ] Ran schema migration: `cd /app/backend && psql $DATABASE_URL -f migrations/schema.sql`
- [ ] Ran data migration: `cd /app/backend && node migrations/migrate-data.js`
- [ ] Verified users exist: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"`

## Post-Deployment

- [ ] Accessed application URL
- [ ] Logged in successfully
- [ ] Changed admin password immediately
- [ ] Tested creating new record
- [ ] Tested viewing lists
- [ ] Tested comments feature
- [ ] Verified HTTPS is working

## Security

- [ ] Strong JWT secret (32+ characters)
- [ ] Strong database password
- [ ] Admin password changed from default
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] All sensitive data in environment variables (not code)

## Optional Enhancements

- [ ] Enabled auto-deploy on git push
- [ ] Setup automatic database backups
- [ ] Configured monitoring/alerts
- [ ] Setup custom 404/500 error pages
- [ ] Documented production URLs for team

## Credentials to Save

**Database:**
- Host: `postgres-dentalgate` (internal)
- Port: `5432`
- Database: `dentalgate`
- Username: `dentalgate`
- Password: `_______________`

**JWT:**
- Secret: `_______________`

**Admin Account:**
- Email: `_______________`
- Password: `_______________` (changed from default)

**Application URL:**
- Production: `https://_______________`

**Coolify Access:**
- URL: `https://_______________`
- Username: `_______________`

---

## Quick Commands

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test database connection (in container)
psql $DATABASE_URL -c "SELECT 1"

# Health check
curl https://yourdomain.com/health

# View users
psql $DATABASE_URL -c "SELECT email, role, status FROM users;"

# Reset password
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('NewPass123!', 10).then(console.log);"
psql $DATABASE_URL -c "UPDATE users SET password_hash='HASH_HERE' WHERE email='admin@dentalgate.com';"
```

---

**Need help?** See [COOLIFY_DEPLOY.md](./COOLIFY_DEPLOY.md) for detailed guide.

