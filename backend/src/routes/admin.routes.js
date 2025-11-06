const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { query } = require('../config/db');
const authService = require('../services/auth.service');

// All admin routes require authentication and admin role
router.use(authMiddleware, requireAdmin);

/**
 * GET /api/admin/listUsers
 * List all users
 */
router.post('/listUsers', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, email, username, role, allowed_pages, status, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `);

    const users = result.rows.map(user => ({
      Email: user.email,
      Username: user.username,
      Role: user.role,
      Allowed_Pages: user.allowed_pages || [],
      Status: user.status,
      Created_At: user.created_at,
      Last_Login: user.last_login,
    }));

    return res.json({ ok: true, users });
  } catch (error) {
    console.error('List users error:', error);
    return res.json({ ok: false, message: 'Failed to list users' });
  }
});

/**
 * POST /api/admin/createUser
 * Create new user
 */
router.post('/createUser', async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.json({ ok: false, message: 'Email and role are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.json({ ok: false, message: 'User already exists' });
    }

    // Generate temporary password
    const tempPassword = 'TempPass' + Math.random().toString(36).substring(2, 8);
    const hashedPassword = await authService.hashPassword(tempPassword);

    // Insert user
    await query(`
      INSERT INTO users (email, password_hash, role, status, allowed_pages)
      VALUES ($1, $2, $3, $4, $5)
    `, [cleanEmail, hashedPassword, role, 'Inactive', []]);

    return res.json({ 
      ok: true, 
      tempPassword,
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.json({ ok: false, message: 'Failed to create user' });
  }
});

/**
 * POST /api/admin/setAllowedPages
 * Set allowed pages for a user
 */
router.post('/setAllowedPages', async (req, res) => {
  try {
    const { email, pages } = req.body;

    if (!email) {
      return res.json({ ok: false, message: 'Email is required' });
    }

    const pagesArray = Array.isArray(pages) ? pages : [];

    await query(
      'UPDATE users SET allowed_pages = $1 WHERE email = $2',
      [pagesArray, email.toLowerCase().trim()]
    );

    return res.json({ ok: true, message: 'Allowed pages updated' });
  } catch (error) {
    console.error('Set allowed pages error:', error);
    return res.json({ ok: false, message: 'Failed to update allowed pages' });
  }
});

/**
 * POST /api/admin/setUserStatus
 * Set user status (Active/Inactive)
 */
router.post('/setUserStatus', async (req, res) => {
  try {
    const { email, status } = req.body;

    if (!email || !status) {
      return res.json({ ok: false, message: 'Email and status are required' });
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.json({ ok: false, message: 'Invalid status. Must be Active or Inactive' });
    }

    await query(
      'UPDATE users SET status = $1 WHERE email = $2',
      [status, email.toLowerCase().trim()]
    );

    return res.json({ ok: true, message: 'User status updated' });
  } catch (error) {
    console.error('Set user status error:', error);
    return res.json({ ok: false, message: 'Failed to update user status' });
  }
});

/**
 * POST /api/admin/setUserRole
 * Set user role
 */
router.post('/setUserRole', async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.json({ ok: false, message: 'Email and role are required' });
    }

    await query(
      'UPDATE users SET role = $1 WHERE email = $2',
      [role, email.toLowerCase().trim()]
    );

    return res.json({ ok: true, message: 'User role updated' });
  } catch (error) {
    console.error('Set user role error:', error);
    return res.json({ ok: false, message: 'Failed to update user role' });
  }
});

/**
 * POST /api/admin/deleteUser
 * Delete a user
 */
router.post('/deleteUser', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ ok: false, message: 'Email is required' });
    }

    // Prevent self-deletion
    if (email.toLowerCase().trim() === req.user.email.toLowerCase()) {
      return res.json({ ok: false, message: 'Cannot delete your own account' });
    }

    const result = await query(
      'DELETE FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      return res.json({ ok: false, message: 'User not found' });
    }

    return res.json({ ok: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.json({ ok: false, message: 'Failed to delete user' });
  }
});

/**
 * POST /api/admin/resetPassword
 * Reset user password (generate new temp password)
 */
router.post('/resetPassword', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ ok: false, message: 'Email is required' });
    }

    // Generate new temporary password
    const tempPassword = 'TempPass' + Math.random().toString(36).substring(2, 8);
    const hashedPassword = await authService.hashPassword(tempPassword);

    await query(
      'UPDATE users SET password_hash = $1, status = $2 WHERE email = $3',
      [hashedPassword, 'Inactive', email.toLowerCase().trim()]
    );

    return res.json({ 
      ok: true, 
      tempPassword,
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.json({ ok: false, message: 'Failed to reset password' });
  }
});

module.exports = router;

