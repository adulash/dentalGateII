const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/db');

// All profile routes require authentication
router.use(authMiddleware);

/**
 * POST /api/profile/getOptions
 * Get dropdown options for profile form
 */
router.post('/getOptions', async (req, res) => {
  try {
    // Get networks
    const networksResult = await query('SELECT id, network_id, network FROM networks ORDER BY network');
    const networks = networksResult.rows.map(n => ({ 
      value: n.id, 
      label: n.network || n.network_id 
    }));

    // Get facilities
    const facilitiesResult = await query('SELECT moh_id, facility_name_en, facility_name_ar FROM facilities ORDER BY facility_name_en');
    const facilities = facilitiesResult.rows.map(f => ({ 
      value: f.moh_id, 
      label: f.facility_name_en || f.facility_name_ar || f.moh_id 
    }));

    // Get supervisors (active users only)
    const supervisorsResult = await query('SELECT id, email FROM users WHERE status = $1 ORDER BY email', ['Active']);
    const supervisors = supervisorsResult.rows.map(u => ({ 
      value: u.id, 
      label: u.email 
    }));

    return res.json({ 
      ok: true, 
      options: { 
        networks, 
        facilities, 
        supervisors 
      } 
    });
  } catch (error) {
    console.error('Get profile options error:', error);
    return res.json({ ok: false, message: 'Failed to get options' });
  }
});

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

    // Sanitize data: convert empty strings to null for DATE/INTEGER fields
    const sanitizedData = { ...data };
    ['dob', 'network_id', 'supervisor_id'].forEach(field => {
      if (sanitizedData[field] === '') {
        sanitizedData[field] = null;
      }
    });

    // Check if profile exists
    const existing = await query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [req.user.userId]
    );

    if (existing.rows.length === 0) {
      // Insert new profile
      const keys = ['user_id', ...Object.keys(sanitizedData)];
      const values = [req.user.userId, ...Object.values(sanitizedData)];
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
      const keys = Object.keys(sanitizedData);
      const values = Object.values(sanitizedData);
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
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    // Return detailed error for debugging
    return res.json({ 
      ok: false, 
      message: 'Failed to save profile', 
      error: error.message,
      detail: error.detail || error.toString()
    });
  }
});

module.exports = router;

