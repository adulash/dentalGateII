const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/user/setInitialPassword
 * Set initial password for inactive users
 */
router.post('/setInitialPassword', authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.json({ ok: false, message: 'New password required' });
    }

    if (newPassword.length < 4) {
      return res.json({ ok: false, message: 'Password must be at least 4 characters' });
    }

    await authService.setInitialPassword(req.user.userId, newPassword);

    return res.json({ 
      ok: true, 
      message: 'Password set successfully. Please wait for admin approval.' 
    });
  } catch (error) {
    console.error('Set initial password error:', error);
    return res.json({ ok: false, message: error.message });
  }
});

module.exports = router;

