const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/db');

/**
 * POST /api/auth/login
 * Login endpoint
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ ok: false, message: 'Email and password are required' });
    }

    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const result = await authService.login(email, password, ipAddress, userAgent);

    return res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    return res.json({ ok: false, message: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.logout(refreshToken);
    return res.json(result);
  } catch (error) {
    console.error('Logout error:', error);
    return res.json({ ok: false, message: error.message });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.json({ ok: false, message: 'Refresh token required' });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    return res.json(result);
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.json({ ok: false, message: error.message });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for logged-in user
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.json({ ok: false, message: 'Current and new password required' });
    }

    if (newPassword.length < 4) {
      return res.json({ ok: false, message: 'Password must be at least 4 characters' });
    }

    await authService.changePassword(req.user.userId, currentPassword, newPassword);
    return res.json({ ok: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.json({ ok: false, message: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, username, role, allowed_pages, status, last_login FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ ok: false, message: 'User not found' });
    }

    const user = result.rows[0];
    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        allowedPages: user.allowed_pages,
        status: user.status,
        lastLogin: user.last_login,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.json({ ok: false, message: 'Failed to get user info' });
  }
});

module.exports = router;

