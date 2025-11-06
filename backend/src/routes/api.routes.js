const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query, getClient } = require('../config/db');

// All API routes require authentication
router.use(authMiddleware);

// Table name mapping and configuration
const TABLE_CONFIG = {
  'Users': { table: 'users', primaryKey: 'id' },
  'Issues': { table: 'issues', primaryKey: 'issue_id', ownershipField: 'created_by' },
  'Orders': { table: 'orders', primaryKey: 'order_id', ownershipField: 'created_by' },
  'Devices': { table: 'devices', primaryKey: 'id' },
  'Facilities': { table: 'facilities', primaryKey: 'id' },
  'Networks': { table: 'networks', primaryKey: 'id' },
  'Suppliers': { table: 'suppliers', primaryKey: 'id' },
  'Warehouse': { table: 'warehouses', primaryKey: 'id' },
  'Sectors': { table: 'sectors', primaryKey: 'id' },
  'Profiles': { table: 'profiles', primaryKey: 'id' },
  'Roles': { table: 'roles', primaryKey: 'id' },
  'Comments': { table: 'comments', primaryKey: 'id' },
};

/**
 * POST /api/list
 * List records from a table
 */
router.post('/list', async (req, res) => {
  try {
    const { table, page = 1, pageSize = 25, filters = {} } = req.body;

    const config = TABLE_CONFIG[table];
    if (!config) {
      return res.json({ ok: false, message: 'Invalid table name' });
    }

    const offset = (page - 1) * pageSize;
    
    // Build WHERE clause for ownership
    let whereClause = '';
    let queryParams = [];
    
    // Non-admin users can only see their own data for ownership tables
    if (config.ownershipField && req.user.role.toLowerCase() !== 'admin') {
      whereClause = `WHERE ${config.ownershipField} = $1`;
      queryParams.push(req.user.userId);
    }

    // Get data
    const dataQuery = `
      SELECT * FROM ${config.table}
      ${whereClause}
      ORDER BY ${config.primaryKey} DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(pageSize, offset);

    const result = await query(dataQuery, queryParams);

    // Get columns
    const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];

    return res.json({
      ok: true,
      rows: result.rows,
      columns,
      page,
      pageSize,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('List error:', error);
    return res.json({ ok: false, message: 'Failed to list records' });
  }
});

/**
 * POST /api/create
 * Create a new record
 */
router.post('/create', async (req, res) => {
  try {
    const { table, data } = req.body;

    const config = TABLE_CONFIG[table];
    if (!config) {
      return res.json({ ok: false, message: 'Invalid table name' });
    }

    // Add created_by for ownership tables
    if (config.ownershipField) {
      data.created_by = req.user.userId;
      data.created_at = new Date();
    }

    // Build INSERT query
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const insertQuery = `
      INSERT INTO ${config.table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await query(insertQuery, values);

    return res.json({ ok: true, record: result.rows[0] });
  } catch (error) {
    console.error('Create error:', error);
    return res.json({ ok: false, message: 'Failed to create record: ' + error.message });
  }
});

/**
 * POST /api/updateStatus
 * Update status for Orders or Issues
 */
router.post('/updateStatus', async (req, res) => {
  try {
    const { table, recordId, status } = req.body;

    if (table !== 'Issues' && table !== 'Orders') {
      return res.json({ ok: false, message: 'Invalid table for status update' });
    }

    const config = TABLE_CONFIG[table];
    const client = await getClient();

    try {
      await client.query('BEGIN');

      if (table === 'Issues') {
        // Update issue status
        const updateQuery = `
          UPDATE issues 
          SET status = $1, 
              solved_by = CASE WHEN $1 = 'Solved' THEN $2 ELSE solved_by END,
              solved_at = CASE WHEN $1 = 'Solved' THEN CURRENT_TIMESTAMP ELSE solved_at END
          WHERE issue_id = $3
          RETURNING *
        `;
        const result = await client.query(updateQuery, [status, req.user.userId, recordId]);

        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.json({ ok: false, message: 'Issue not found' });
        }

        await client.query('COMMIT');
        return res.json({ ok: true, record: result.rows[0] });

      } else if (table === 'Orders') {
        // Update order status
        const updateQuery = `
          UPDATE orders 
          SET status = $1,
              delivered_date = CASE WHEN $1 = 'Delivered' THEN CURRENT_DATE ELSE delivered_date END
          WHERE order_id = $2
          RETURNING *
        `;
        const result = await client.query(updateQuery, [status, recordId]);

        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.json({ ok: false, message: 'Order not found' });
        }

        await client.query('COMMIT');
        return res.json({ ok: true, record: result.rows[0] });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update status error:', error);
    return res.json({ ok: false, message: 'Failed to update status' });
  }
});

/**
 * POST /api/formMeta
 * Get form metadata for creating records
 */
router.post('/formMeta', async (req, res) => {
  try {
    const { table } = req.body;

    const config = TABLE_CONFIG[table];
    if (!config) {
      return res.json({ ok: false, message: 'Invalid table name' });
    }

    // Get table columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;
    const result = await query(columnsQuery, [config.table]);

    // Build form fields
    const fields = result.rows
      .filter(col => {
        // Exclude auto-generated and system fields
        const excluded = ['id', 'created_at', 'updated_at', 'created_by', 'solved_by', 'solved_at', 'waiting_days'];
        // For Issues, keep device_id; For Orders, keep supplier_id
        if (table === 'Issues' && col.column_name === 'device_id') return true;
        if (table === 'Orders' && col.column_name === 'supplier_id') return true;
        return !excluded.includes(col.column_name) && !col.column_name.endsWith('_id');
      })
      .map(col => ({
        name: col.column_name,
        label: col.column_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: col.data_type === 'date' ? 'date' : 'text',
        inputType: col.data_type === 'date' ? 'date' : 'text',
        required: col.is_nullable === 'NO',
        readonly: false,
      }));

    // Add select options for status fields and foreign keys
    if (table === 'Issues') {
      const statusField = fields.find(f => f.name === 'status');
      if (statusField) {
        statusField.type = 'select';
        statusField.options = [
          { value: 'Disorder', label: 'Disorder' },
          { value: 'Solved', label: 'Solved' },
        ];
        statusField.defaultValue = 'Disorder';
      }
      
      // Add device dropdown
      const deviceField = fields.find(f => f.name === 'device_id');
      if (deviceField) {
        const devicesResult = await query('SELECT id, device_name FROM devices ORDER BY device_name');
        deviceField.type = 'select';
        deviceField.options = devicesResult.rows.map(d => ({
          value: d.id,
          label: d.device_name || `Device ${d.id}`
        }));
      }
    } else if (table === 'Orders') {
      const statusField = fields.find(f => f.name === 'status');
      if (statusField) {
        statusField.type = 'select';
        statusField.options = [
          { value: 'Waiting Supplier', label: 'Waiting Supplier' },
          { value: 'Delivered', label: 'Delivered' },
        ];
        statusField.defaultValue = 'Waiting Supplier';
      }
      
      // Add supplier dropdown
      const supplierField = fields.find(f => f.name === 'supplier_id');
      if (supplierField) {
        const suppliersResult = await query('SELECT id, supplier_name FROM suppliers ORDER BY supplier_name');
        supplierField.type = 'select';
        supplierField.options = suppliersResult.rows.map(s => ({
          value: s.id,
          label: s.supplier_name || `Supplier ${s.id}`
        }));
      }
    }

    return res.json({ ok: true, fields });
  } catch (error) {
    console.error('Form meta error:', error);
    return res.json({ ok: false, message: 'Failed to get form metadata' });
  }
});

/**
 * POST /api/pages_list
 * Get list of all pages
 */
router.post('/pages_list', async (req, res) => {
  try {
    const result = await query('SELECT page FROM pages ORDER BY page');
    const pages = result.rows.map(row => row.page);
    return res.json({ ok: true, pages });
  } catch (error) {
    console.error('Pages list error:', error);
    return res.json({ ok: false, message: 'Failed to list pages' });
  }
});

module.exports = router;

