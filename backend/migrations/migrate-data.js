const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SALT_ROUNDS = 10;

// Load JSON data
function loadJSON(filename) {
  const filepath = path.join(__dirname, '../../data', filename);
  if (!fs.existsSync(filepath)) {
    console.log(`⚠ File not found: ${filename}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

async function migrateUsers() {
  console.log('\n📦 Migrating Users...');
  const users = loadJSON('Users.json');
  let count = 0;

  for (const user of users) {
    try {
      // Hash a temporary password (users will need to reset)
      const tempPassword = 'TempPass123!';
      const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

      // Parse allowed pages
      const allowedPages = user['Allowed Pages'] 
        ? user['Allowed Pages'].split(',').map(p => p.trim()).filter(p => p)
        : [];

      await pool.query(`
        INSERT INTO users (email, username, password_hash, role, allowed_pages, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
          username = EXCLUDED.username,
          role = EXCLUDED.role,
          allowed_pages = EXCLUDED.allowed_pages,
          status = EXCLUDED.status
      `, [
        user.Email.toLowerCase().trim(),
        user.Username || '',
        hashedPassword,
        user.Role || 'User',
        allowedPages,
        user.Status || 'Inactive'
      ]);

      count++;
    } catch (error) {
      console.error(`Error migrating user ${user.Email}:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} users (temp password: TempPass123!)`);
}

async function migrateNetworks() {
  console.log('\n📦 Migrating Networks...');
  const networks = loadJSON('Networks.json');
  let count = 0;

  for (const network of networks) {
    try {
      await pool.query(`
        INSERT INTO networks (network_id, network)
        VALUES ($1, $2)
        ON CONFLICT (network_id) DO UPDATE SET network = EXCLUDED.network
      `, [network.Network_ID, network.Network]);
      count++;
    } catch (error) {
      console.error(`Error migrating network:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} networks`);
}

async function migrateFacilities() {
  console.log('\n📦 Migrating Facilities...');
  const facilities = loadJSON('Facilities.json');
  let count = 0;

  for (const facility of facilities) {
    try {
      const sectors = facility.Sectors ? facility.Sectors.split(',').map(s => s.trim()) : [];
      
      await pool.query(`
        INSERT INTO facilities (moh_id, facility_name_ar, facility_name_en, email, network, sectors)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (moh_id) DO UPDATE SET
          facility_name_ar = EXCLUDED.facility_name_ar,
          facility_name_en = EXCLUDED.facility_name_en,
          email = EXCLUDED.email,
          network = EXCLUDED.network,
          sectors = EXCLUDED.sectors
      `, [
        facility.MOH_ID,
        facility.FacilityName_Ar || '',
        facility.FacilityName_En || '',
        facility.Email || '',
        facility.Network || '',
        sectors
      ]);
      count++;
    } catch (error) {
      console.error(`Error migrating facility:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} facilities`);
}

async function migrateSectors() {
  console.log('\n📦 Migrating Sectors...');
  const sectors = loadJSON('Sectors.json');
  let count = 0;

  for (const sector of sectors) {
    try {
      await pool.query(`
        INSERT INTO sectors (sector)
        VALUES ($1)
        ON CONFLICT DO NOTHING
      `, [sector.sector]);
      count++;
    } catch (error) {
      console.error(`Error migrating sector:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} sectors`);
}

async function migrateProfiles() {
  console.log('\n📦 Migrating Profiles...');
  const profiles = loadJSON('Profiles.json');
  let count = 0;

  for (const profile of profiles) {
    try {
      // Get user ID from email
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [profile.user_id.toLowerCase()]);
      if (userResult.rows.length === 0) {
        console.log(`⚠ User not found for profile: ${profile.user_id}`);
        continue;
      }
      const userId = userResult.rows[0].id;

      // Get network ID if exists
      let networkId = null;
      if (profile.network_id) {
        const networkResult = await pool.query('SELECT id FROM networks WHERE network_id = $1', [profile.network_id]);
        if (networkResult.rows.length > 0) {
          networkId = networkResult.rows[0].id;
        }
      }

      // Get supervisor ID if exists
      let supervisorId = null;
      if (profile.supervisor_id) {
        const supervisorResult = await pool.query('SELECT id FROM users WHERE email = $1', [profile.supervisor_id.toLowerCase()]);
        if (supervisorResult.rows.length > 0) {
          supervisorId = supervisorResult.rows[0].id;
        }
      }

      await pool.query(`
        INSERT INTO profiles (
          user_id, employee_id, national_id, scfhs_id, dob, gender, 
          job_title, specialty, network_id, supervisor_id, fullname_ar, 
          fullname_en, facility_id, phone, address, comments
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (user_id) DO UPDATE SET
          employee_id = EXCLUDED.employee_id,
          national_id = EXCLUDED.national_id,
          scfhs_id = EXCLUDED.scfhs_id,
          dob = EXCLUDED.dob,
          gender = EXCLUDED.gender,
          job_title = EXCLUDED.job_title,
          specialty = EXCLUDED.specialty,
          network_id = EXCLUDED.network_id,
          supervisor_id = EXCLUDED.supervisor_id,
          fullname_ar = EXCLUDED.fullname_ar,
          fullname_en = EXCLUDED.fullname_en,
          facility_id = EXCLUDED.facility_id,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          comments = EXCLUDED.comments
      `, [
        userId,
        profile.employee_id || null,
        profile.national_id || null,
        profile.scfhs_id || null,
        profile.dob || null,
        profile.gender || null,
        profile.job_title || null,
        profile.specialty || null,
        networkId,
        supervisorId,
        profile.fullname_ar || null,
        profile.fullname_en || null,
        profile.facility_id || null,
        profile.phone || null,
        profile.address || null,
        profile.comments || null
      ]);
      count++;
    } catch (error) {
      console.error(`Error migrating profile for ${profile.user_id}:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} profiles`);
}

async function migrateDevices() {
  console.log('\n📦 Migrating Devices...');
  const devices = loadJSON('Devices.json');
  let count = 0;

  for (const device of devices) {
    try {
      await pool.query(`
        INSERT INTO devices (device_name)
        VALUES ($1)
        ON CONFLICT DO NOTHING
      `, [device.device_name]);
      count++;
    } catch (error) {
      console.error(`Error migrating device:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} devices`);
}

async function migrateSuppliers() {
  console.log('\n📦 Migrating Suppliers...');
  const suppliers = loadJSON('Suppliers.json');
  let count = 0;

  for (const supplier of suppliers) {
    try {
      await pool.query(`
        INSERT INTO suppliers (supplier_id, supplier_name, phone, email, email2, email3)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (supplier_id) DO UPDATE SET
          supplier_name = EXCLUDED.supplier_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          email2 = EXCLUDED.email2,
          email3 = EXCLUDED.email3
      `, [
        supplier.Supplier_ID,
        supplier.SupplierName,
        supplier.phone || null,
        supplier.Email || null,
        supplier.email2 || null,
        supplier.email3 || null
      ]);
      count++;
    } catch (error) {
      console.error(`Error migrating supplier:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} suppliers`);
}

async function migrateWarehouses() {
  console.log('\n📦 Migrating Warehouses...');
  const warehouses = loadJSON('Warehouse.json');
  let count = 0;

  for (const warehouse of warehouses) {
    try {
      // Get network ID
      let networkId = null;
      if (warehouse.Networ_id) {
        const networkResult = await pool.query('SELECT id FROM networks WHERE network_id = $1', [warehouse.Networ_id]);
        if (networkResult.rows.length > 0) {
          networkId = networkResult.rows[0].id;
        }
      }

      // Get supervisor ID
      let supervisorId = null;
      if (warehouse.Supervisor_id) {
        const supervisorResult = await pool.query('SELECT id FROM users WHERE email = $1', [warehouse.Supervisor_id.toLowerCase()]);
        if (supervisorResult.rows.length > 0) {
          supervisorId = supervisorResult.rows[0].id;
        }
      }

      await pool.query(`
        INSERT INTO warehouses (warehouse, network_id, facility_id, supervisor_id, location)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        warehouse.Warehouse,
        networkId,
        warehouse.Facility_id || null,
        supervisorId,
        warehouse.Location || null
      ]);
      count++;
    } catch (error) {
      console.error(`Error migrating warehouse:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} warehouses`);
}

async function migrateOrders() {
  console.log('\n📦 Migrating Orders...');
  const orders = loadJSON('Orders.json');
  let count = 0;

  for (const order of orders) {
    try {
      // Get created_by user ID
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [order.created_by.toLowerCase()]);
      if (userResult.rows.length === 0) {
        console.log(`⚠ User not found for order: ${order.created_by}`);
        continue;
      }
      const createdBy = userResult.rows[0].id;

      // Get supplier ID
      let supplierId = null;
      if (order.supplier_id) {
        const supplierResult = await pool.query('SELECT id FROM suppliers WHERE supplier_id = $1', [order.supplier_id]);
        if (supplierResult.rows.length > 0) {
          supplierId = supplierResult.rows[0].id;
        }
      }

      const attachments = order.attachments ? order.attachments.split(',').map(a => a.trim()) : [];

      await pool.query(`
        INSERT INTO orders (
          warehouse_id, release_number, order_date, supplier_id, status, 
          delivered_date, waiting_days, comments, created_by, created_at, attachments
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        order.warehouse_id || null,
        order.release_number || null,
        order.order_date || null,
        supplierId,
        order.Status || 'Waiting Supplier',
        order.Delivered_Date || null,
        order.Waiting_Days || null,
        order.comments || null,
        createdBy,
        order.created_at || new Date(),
        attachments
      ]);
      count++;
    } catch (error) {
      console.error(`Error migrating order:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} orders`);
}

async function migrateIssues() {
  console.log('\n📦 Migrating Issues...');
  const issues = loadJSON('Issues.json');
  let count = 0;

  for (const issue of issues) {
    try {
      // Get created_by user ID
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [issue.created_by.toLowerCase()]);
      if (userResult.rows.length === 0) {
        console.log(`⚠ User not found for issue: ${issue.created_by}`);
        continue;
      }
      const createdBy = userResult.rows[0].id;

      // Get device ID
      let deviceId = null;
      if (issue.device) {
        const deviceResult = await pool.query('SELECT id FROM devices WHERE device_name = $1', [issue.device]);
        if (deviceResult.rows.length > 0) {
          deviceId = deviceResult.rows[0].id;
        }
      }

      // Get solved_by user ID if exists
      let solvedBy = null;
      if (issue.solved_by) {
        const solvedResult = await pool.query('SELECT id FROM users WHERE email = $1', [issue.solved_by.toLowerCase()]);
        if (solvedResult.rows.length > 0) {
          solvedBy = solvedResult.rows[0].id;
        }
      }

      await pool.query(`
        INSERT INTO issues (
          device, malfunctioned_date, malfunction_description, created_by, 
          created_at, status, waiting_days, comments, solved_by, solved_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        deviceId,
        issue.malfunctioned_date || null,
        issue.malfunction_description || null,
        createdBy,
        issue.created_at || new Date(),
        issue.status || 'Disorder',
        issue.waiting_days || null,
        issue.comments || null,
        solvedBy,
        issue.solved_at || null
      ]);
      count++;
    } catch (error) {
      console.error(`Error migrating issue:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} issues`);
}

async function migrateComments() {
  console.log('\n📦 Migrating Comments...');
  const comments = loadJSON('Comments.json');
  let count = 0;

  for (const comment of comments) {
    try {
      // Get created_by user ID
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [comment.created_by.toLowerCase()]);
      if (userResult.rows.length === 0) {
        console.log(`⚠ User not found for comment: ${comment.created_by}`);
        continue;
      }
      const createdBy = userResult.rows[0].id;

      await pool.query(`
        INSERT INTO comments (reference_table, reference_id, comment, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        comment.reference_table,
        comment.reference_id,
        comment.comment,
        createdBy,
        comment.created_at || new Date()
      ]);
      count++;
    } catch (error) {
      console.error(`Error migrating comment:`, error.message);
    }
  }

  console.log(`✓ Migrated ${count} comments`);
}

async function main() {
  console.log('🚀 Starting data migration...\n');

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected\n');

    // Order matters due to foreign key constraints
    await migrateUsers();
    await migrateNetworks();
    await migrateFacilities();
    await migrateSectors();
    await migrateProfiles();
    await migrateDevices();
    await migrateSuppliers();
    await migrateWarehouses();
    await migrateOrders();
    await migrateIssues();
    await migrateComments();

    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  IMPORTANT: All users have temporary password: TempPass123!');
    console.log('   Users should change their password on first login.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

