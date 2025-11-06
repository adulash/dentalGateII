const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/db');

// All profile routes require authentication
router.use(authMiddleware);

/**
 * POST /api/profile/get
 * Get current user's profile
 */
router.post('/get', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      // Return empty profile if doesn't exist
      return res.json({ 
        ok: true, 
        profile: {
          user_id: req.user.userId,
          employee_id: '',
          national_id: '',
          scfhs_id: '',
          dob: '',
          gender: '',
          job_title: '',
          specialty: '',
          network_id: '',
          supervisor_id: '',
          fullname_ar: '',
          fullname_en: '',
          facility_id: '',
          phone: '',
          address: '',
          comments: '',
        } 
      });
    }

    return res.json({ ok: true, profile: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.json({ ok: false, message: 'Failed to get profile' });
  }
});

/**
 * POST /api/profile/upsert
 * Create or update user's profile
 */
router.post('/upsert', async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.json({ ok: false, message: 'Profile data is required' });
    }

    // Check if profile exists
    const existing = await query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [req.user.userId]
    );

    if (existing.rows.length === 0) {
      // Insert new profile
      const keys = ['user_id', ...Object.keys(data)];
      const values = [req.user.userId, ...Object.values(data)];
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

      const insertQuery = `
        INSERT INTO profiles (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await query(insertQuery, values);
      return res.json({ ok: true, profile: result.rows[0] });
    } else {
      // Update existing profile
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

      const updateQuery = `
        UPDATE profiles
        SET ${setClause}
        WHERE user_id = $${keys.length + 1}
        RETURNING *
      `;

      const result = await query(updateQuery, [...values, req.user.userId]);
      return res.json({ ok: true, profile: result.rows[0] });
    }
  } catch (error) {
    console.error('Upsert profile error:', error);
    return res.json({ ok: false, message: 'Failed to save profile' });
  }
});

module.exports = router;

