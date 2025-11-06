#!/usr/bin/env node
/**
 * Quick Setup Script for Local Testing
 * Creates empty database schema + test admin user
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dentalgate:changeme@localhost:5432/dentalgate';

async function setup() {
  console.log('\n🚀 DentalGate II - Local Test Setup\n');
  console.log('Database:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'), '\n');

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Test connection
    console.log('1️⃣  Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('   ✓ Connected to PostgreSQL\n');

    // Check if schema exists
    console.log('2️⃣  Checking database schema...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    if (tablesResult.rows.length === 0) {
      console.log('   ⚠ No tables found. Running schema migration...');
      
      // Read and execute schema.sql
      const schemaPath = path.join(__dirname, 'migrations', 'schema.sql');
      if (!fs.existsSync(schemaPath)) {
        console.error('   ✗ Error: schema.sql not found at:', schemaPath);
        process.exit(1);
      }

      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('   ✓ Database schema created\n');
    } else {
      console.log(`   ✓ Found ${tablesResult.rows.length} tables\n`);
    }

    // Create test admin user
    console.log('3️⃣  Creating test admin user...');
    
    const testEmail = 'admin@test.com';
    const testPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);
    
    if (userCheck.rows.length > 0) {
      console.log('   ℹ Test admin already exists');
      console.log('   → Updating password to: admin123\n');
      
      await pool.query(
        'UPDATE users SET password_hash = $1, status = $2 WHERE email = $3',
        [hashedPassword, 'Active', testEmail]
      );
    } else {
      await pool.query(`
        INSERT INTO users (email, username, password_hash, role, allowed_pages, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        testEmail,
        'admin',
        hashedPassword,
        'Admin',
        ['Profile', 'Issues', 'Orders', 'Devices', 'Facilities', 'Networks', 'Suppliers', 'Warehouse', 'Sectors', 'Profiles', 'Roles', 'Users'],
        'Active'
      ]);
      
      console.log('   ✓ Test admin user created\n');
    }

    // Summary
    console.log('✅ Setup Complete!\n');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:    admin@test.com');
    console.log('🔑 Password: admin123');
    console.log('🌐 URL:      http://localhost:3000');
    console.log('═══════════════════════════════════════\n');
    console.log('💡 Next steps:');
    console.log('   1. Make sure server is running: npm run dev');
    console.log('   2. Open http://localhost:3000');
    console.log('   3. Login with credentials above');
    console.log('   4. Test the application (empty data)\n');
    console.log('📦 To import your real data later:');
    console.log('   node migrations/migrate-data.js\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\n💡 Common issues:');
    console.error('   - PostgreSQL not running?');
    console.error('     → Docker: docker compose up -d postgres');
    console.error('     → Installed: Start PostgreSQL service');
    console.error('   - Wrong connection string in .env?');
    console.error('     → Check DATABASE_URL in backend/.env');
    console.error('   - Database doesn\'t exist?');
    console.error('     → Create it: psql -U postgres -c "CREATE DATABASE dentalgate;"\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();

