# DentalGate II - PostgreSQL + Express Backend

Modern web application for dental clinic management with PostgreSQL database and Express.js backend. Designed for easy deployment on VPS using Coolify or manual Docker deployment.

## 🚀 Features

- **JWT Authentication** - Secure token-based authentication with refresh tokens
- **Role-Based Access Control** - Admin, User, Manager roles
- **PostgreSQL Database** - Reliable, scalable data storage
- **RESTful API** - Clean Express.js backend
- **Modern UI** - Responsive Bootstrap 5 design
- **Docker Ready** - Easy deployment with Docker Compose
- **Coolify Compatible** - One-click deployment support
- **Auto-calculated Fields** - Waiting days, status updates
- **Comments System** - Add comments to Orders and Issues
- **Profile Management** - Complete user profile system
- **Dashboard Analytics** - Charts and statistics
- **Mobile Responsive** - Works on all devices

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

## ⚡ Quick Start

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/yourusername/dentalGateII.git
cd dentalGateII

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Setup PostgreSQL database
createdb dentalgate

# 4. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# 5. Run migrations
cd backend
npm run migrate:schema
npm run migrate:data

# 6. Start development server
npm run dev

# 7. Access application
# Open http://localhost:3000
```

### Docker (Production)

```bash
# 1. Copy environment file
cp env.production.example .env

# 2. Edit .env with production values
nano .env

# 3. Start services
docker compose up -d

# 4. Run migrations
docker compose exec app sh -c "cd backend && npm run migrate:schema && npm run migrate:data"

# 5. Access application
# Open http://localhost:3000
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│              (Bootstrap 5 + Vanilla JS)                  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     ├─────────────────────────────────────┐
┌────────────────────▼────────────────┐  ┌─────────────────▼──────┐
│        Nginx Reverse Proxy          │  │    Docker Container     │
│          (SSL Termination)          │  │   Node.js + Express     │
└────────────────────┬────────────────┘  └──────────┬──────────────┘
                     │                              │
                     │                              │ TCP 5432
                     │                   ┌──────────▼──────────────┐
                     │                   │  PostgreSQL Database     │
                     │                   │     (Docker Container)   │
                     │                   └─────────────────────────┘
                     │
                     │ File System
                     ▼
            ┌─────────────────┐
            │  Static Assets   │
            │   (public/)      │
            └─────────────────┘
```

### Technology Stack

**Backend:**
- Node.js 18+
- Express.js 4.x
- PostgreSQL 15
- JWT (jsonwebtoken)
- bcrypt (password hashing)

**Frontend:**
- HTML5 / CSS3 / JavaScript (ES6+)
- Bootstrap 5.3
- Chart.js 4.x
- Boxicons

**Deployment:**
- Docker & Docker Compose
- Nginx (reverse proxy)
- Coolify (optional)

## 📦 Requirements

### Development
- Node.js 18+ and npm
- PostgreSQL 15+
- Git

### Production
- VPS with 2GB+ RAM
- Docker & Docker Compose
- Domain name (recommended)
- SSL certificate (Let's Encrypt)

## 🛠️ Installation

### 1. Install Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # Should be v18+
npm --version
```

### 2. Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
postgres=# CREATE DATABASE dentalgate;
postgres=# CREATE USER dentalgate WITH ENCRYPTED PASSWORD 'your-password';
postgres=# GRANT ALL PRIVILEGES ON DATABASE dentalgate TO dentalgate;
postgres=# \q
```

### 3. Clone and Setup Project

```bash
git clone https://github.com/yourusername/dentalGateII.git
cd dentalGateII

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 4. Configure Environment

Create `backend/.env`:

```env
DATABASE_URL=postgresql://dentalgate:your-password@localhost:5432/dentalgate
JWT_SECRET=generate-a-strong-secret-key-here-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### 5. Run Database Migrations

```bash
cd backend

# Create schema
npm run migrate:schema

# Or manually:
psql $DATABASE_URL -f migrations/schema.sql
```

### 6. Migrate Data

If you have existing data in `/data/*.json`:

```bash
cd backend
npm run migrate:data
```

**Note:** All users will get temporary password: `TempPass123!`

### 7. Start Development Server

```bash
cd backend
npm run dev

# Or for production:
npm start
```

Server runs at: http://localhost:3000

## 🚢 Deployment

See detailed guide: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

### Quick Deploy with Coolify

1. Install Coolify on your VPS
2. Add Git repository to Coolify
3. Set environment variables
4. Deploy!

[Full Coolify Guide →](./DEPLOYMENT.md#deploy-to-coolify-vps)

### Manual Docker Deployment

```bash
# Copy environment file
cp env.production.example .env

# Edit environment variables
nano .env

# Start services
docker compose up -d

# Run migrations
docker compose exec app sh -c "cd backend && npm run migrate:schema && npm run migrate:data"
```

[Full Docker Guide →](./DEPLOYMENT.md#manual-vps-deployment)

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`
Login user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "ok": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "abc123...",
  "user": {
    "email": "user@example.com",
    "role": "Admin",
    "status": "Active"
  },
  "pages": ["Profile", "Orders", "Issues"]
}
```

#### POST `/api/auth/refresh`
Refresh access token

**Request:**
```json
{
  "refreshToken": "abc123..."
}
```

#### POST `/api/auth/logout`
Logout user

#### GET `/api/auth/me`
Get current user (requires authentication)

### Data Endpoints

All require authentication header: `Authorization: Bearer <token>`

#### POST `/api/list`
List records from a table

**Request:**
```json
{
  "table": "Orders",
  "page": 1,
  "pageSize": 25,
  "filters": {}
}
```

#### POST `/api/create`
Create new record

**Request:**
```json
{
  "table": "Orders",
  "data": {
    "warehouse_id": 1,
    "release_number": "ORD-001",
    "order_date": "2024-01-15",
    "supplier_id": 1,
    "status": "Waiting Supplier"
  }
}
```

#### POST `/api/updateStatus`
Update status (Orders/Issues only)

**Request:**
```json
{
  "table": "Orders",
  "recordId": 123,
  "status": "Delivered"
}
```

### Admin Endpoints

All require admin role.

#### POST `/api/admin/listUsers`
List all users

#### POST `/api/admin/createUser`
Create new user

**Request:**
```json
{
  "email": "newuser@example.com",
  "role": "User"
}
```

**Response:**
```json
{
  "ok": true,
  "tempPassword": "TempPass8x9a",
  "message": "User created successfully"
}
```

#### POST `/api/admin/setAllowedPages`
Set allowed pages for user

**Request:**
```json
{
  "email": "user@example.com",
  "pages": ["Orders", "Issues"]
}
```

#### POST `/api/admin/setUserStatus`
Activate/deactivate user

**Request:**
```json
{
  "email": "user@example.com",
  "status": "Active"
}
```

[Full API Reference →](./API.md) *(to be created)*

## 🗄️ Database Schema

### Core Tables

**users** - User authentication and authorization
- id, email, password_hash, role, allowed_pages, status

**profiles** - User profile information
- user_id, employee_id, national_id, fullname_ar, fullname_en, etc.

**orders** - Supply orders
- order_id, warehouse_id, supplier_id, status, order_date, delivered_date

**issues** - Device issues
- issue_id, device, status, created_by, malfunctioned_date, solved_at

**comments** - Comments for orders and issues
- id, reference_table, reference_id, comment, created_by

**Supporting Tables:**
- facilities, networks, warehouses, sectors, devices, suppliers, roles, pages

[Full Schema →](./backend/migrations/schema.sql)

### Relationships

```
users (1) ──── (1) profiles
  │
  ├──── (many) orders [created_by]
  ├──── (many) issues [created_by]
  └──── (many) comments [created_by]

orders (many) ──── (1) warehouses
orders (many) ──── (1) suppliers

issues (many) ──── (1) devices
```

## ⚙️ Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | - |
| `JWT_SECRET` | Yes | Secret for JWT tokens (32+ chars) | - |
| `JWT_EXPIRES_IN` | No | Access token expiry | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | No | Refresh token expiry | `7d` |
| `PORT` | No | Server port | `3000` |
| `NODE_ENV` | No | Environment | `development` |
| `ALLOWED_ORIGINS` | No | CORS allowed origins | `*` |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window | `100` |

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🔄 Migration Guide

### From Firebase

1. **Export data** (already in `/data/*.json`)
2. **Setup PostgreSQL** database
3. **Run schema migration:**
   ```bash
   cd backend
   npm run migrate:schema
   ```
4. **Migrate data:**
   ```bash
   npm run migrate:data
   ```
5. **Update frontend** (replace `public/index.html` and `public/app.js` with `-new` versions)

### From Google Sheets

1. **Export each sheet as CSV** → Save to `/data/*.csv`
2. **Convert to JSON:**
   ```bash
   node scripts/csv-to-json.js data/*.csv
   ```
3. **Follow steps 2-5 above**

## 🐛 Troubleshooting

### Can't Connect to Database

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string
echo $DATABASE_URL
```

### Migration Fails

```bash
# Check if database exists
psql -U postgres -c "\l"

# Drop and recreate (⚠️ DELETES ALL DATA)
dropdb dentalgate
createdb dentalgate

# Re-run migrations
cd backend && npm run migrate:schema
```

### Can't Login

```bash
# Check user exists
psql $DATABASE_URL -c "SELECT email, status FROM users WHERE email='admin@dentalgate.com';"

# Reset password
cd backend
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('newpass', 10).then(console.log);"
# Copy hash and update:
psql $DATABASE_URL -c "UPDATE users SET password_hash='<hash>', status='Active' WHERE email='admin@dentalgate.com';"
```

### Port Already in Use

```bash
# Find process
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

[More Troubleshooting →](./DEPLOYMENT.md#troubleshooting)

## 📖 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Complete deployment instructions
- [Database Schema](./backend/migrations/schema.sql) - Full schema definition
- [Migration Scripts](./backend/migrations/) - Data migration tools

## 🔒 Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with short expiry
- Refresh token rotation
- SQL injection protection (parameterized queries)
- CORS configuration
- Rate limiting
- Helmet.js security headers
- Input validation

**Security Checklist:**
- [ ] Changed default admin password
- [ ] Strong JWT secret (32+ characters)
- [ ] HTTPS enabled (SSL certificate)
- [ ] Firewall configured
- [ ] Regular backups
- [ ] Monitoring enabled
- [ ] Keep dependencies updated

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Original Author** - Initial Firebase version
- **PostgreSQL Migration** - Claude & Team

## 🙏 Acknowledgments

- Bootstrap 5 for UI components
- Express.js for backend framework
- PostgreSQL for reliable database
- Coolify for easy deployment
- Chart.js for analytics

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/dentalGateII/issues)
- **Docs:** [Deployment Guide](./DEPLOYMENT.md)
- **Email:** support@dentalgate.com

## 🗺️ Roadmap

- [ ] Email notifications
- [ ] PDF report generation
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Audit log system
- [ ] Backup automation
- [ ] Advanced search filters
- [ ] Export to Excel/CSV
- [ ] Two-factor authentication

---

**Built with ❤️ for dental clinics**

