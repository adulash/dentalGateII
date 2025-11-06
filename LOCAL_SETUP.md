# Local Development Setup (No Data Migration)

## Quick Test Setup - 5 Minutes

### Step 1: Install PostgreSQL

**Option A: Download Installer**
1. Download: https://www.postgresql.org/download/windows/
2. Run installer (keep default port 5432)
3. Set password for `postgres` user (remember it!)
4. Install

**Option B: Docker (Easier)**
```powershell
# Start PostgreSQL in Docker
cd C:\Users\awali\Desktop\dentalGateII
docker compose up -d postgres

# Database will be ready at: localhost:5432
# User: dentalgate
# Password: changeme (from docker-compose.yml)
```

### Step 2: Configure Backend

Edit `backend/.env`:

```env
# For Docker PostgreSQL:
DATABASE_URL=postgresql://dentalgate:changeme@localhost:5432/dentalgate

# OR for installed PostgreSQL:
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/dentalgate

# JWT Configuration
JWT_SECRET=dev-secret-key-for-local-testing-only-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 3: Create Database Schema (Empty Tables)

**Option A: Docker**
```powershell
# Create schema in Docker PostgreSQL
docker compose exec postgres psql -U dentalgate -d dentalgate -f /docker-entrypoint-initdb.d/01-schema.sql

# OR manually:
cd backend
$env:DATABASE_URL="postgresql://dentalgate:changeme@localhost:5432/dentalgate"
psql $env:DATABASE_URL -f migrations/schema.sql
```

**Option B: Installed PostgreSQL**
```powershell
cd backend
psql -U postgres -d postgres -c "CREATE DATABASE dentalgate;"
psql -U postgres -d dentalgate -f migrations/schema.sql
```

### Step 4: Create Test User (No Real Data)

```powershell
cd backend
node -e "
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function createTestUser() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://dentalgate:changeme@localhost:5432/dentalgate' });
  
  const password = await bcrypt.hash('admin123', 10);
  
  await pool.query(`
    INSERT INTO users (email, username, password_hash, role, allowed_pages, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO NOTHING
  `, ['admin@test.com', 'admin', password, 'Admin', ['Profile', 'Issues', 'Orders', 'Devices', 'Facilities', 'Networks', 'Suppliers', 'Warehouse', 'Sectors', 'Profiles', 'Roles', 'Users'], 'Active']);
  
  console.log('✓ Test admin created: admin@test.com / admin123');
  await pool.end();
}

createTestUser().catch(console.error);
"
```

### Step 5: Start Server

Server is already running in background, or:

```powershell
cd backend
npm run dev
```

### Step 6: Test Application

1. Open: http://localhost:3000
2. Login:
   - Email: `admin@test.com`
   - Password: `admin123`
3. Test features (with empty data)

---

## Verification Checklist

```powershell
# 1. Check PostgreSQL is running
# Docker:
docker compose ps

# OR Installed:
Get-Service postgresql*

# 2. Test database connection
cd backend
node -e "const {Pool}=require('pg'); new Pool({connectionString:process.env.DATABASE_URL||'postgresql://dentalgate:changeme@localhost:5432/dentalgate'}).query('SELECT NOW()').then(r=>console.log('✓ DB Connected:',r.rows[0])).catch(e=>console.error('✗ Error:',e.message))"

# 3. Check server health
curl http://localhost:3000/health

# Expected: {"status":"ok","database":"connected"}

# 4. Test login API
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"admin@test.com\",\"password\":\"admin123\"}'
```

---

## Common Issues

### Port 5432 Already in Use
```powershell
# Find process
netstat -ano | findstr :5432

# Kill it
taskkill /F /PID <PID>
```

### Can't Connect to Database
```powershell
# Check if PostgreSQL is running
docker compose ps
# OR
Get-Service postgresql*

# Check connection string
echo $env:DATABASE_URL
```

### Wrong Password
```powershell
# Docker: Password is "changeme" (from docker-compose.yml)
# Installed: Use the password you set during installation
```

---

## Next Steps (After Testing)

Once you've tested locally and everything works:

### 1. Migrate Real Data

```powershell
cd backend
node migrations/migrate-data.js
```

This will import all your data from `/data/*.json` files.

### 2. Test with Real Data

Login with your actual users:
- Password for all migrated users: `TempPass123!`

### 3. Deploy to Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) or [QUICKSTART.md](./QUICKSTART.md)

---

## Clean Up (Reset Everything)

```powershell
# Stop server (if running in background)
# Ctrl+C in the terminal

# Remove database
docker compose down -v  # Removes everything including data

# OR for installed PostgreSQL:
psql -U postgres -c "DROP DATABASE dentalgate;"
psql -U postgres -c "CREATE DATABASE dentalgate;"

# Start fresh
cd backend
psql $env:DATABASE_URL -f migrations/schema.sql
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start DB (Docker) | `docker compose up -d postgres` |
| Stop DB (Docker) | `docker compose down` |
| Start Server | `cd backend && npm run dev` |
| View Logs | `docker compose logs -f` |
| Access DB | `docker compose exec postgres psql -U dentalgate` |
| Health Check | `curl http://localhost:3000/health` |
| Create Test User | See Step 4 above |

---

**Ready to test?** Follow steps 1-6 above!

