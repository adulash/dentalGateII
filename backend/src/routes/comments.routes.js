const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/db');

// All comments routes require authentication
router.use(authMiddleware);

/**
 * POST /api/comments/list
 * Get comments for a specific record
 */
router.post('/list', async (req, res) => {
  try {
    const { table, recordId } = req.body;

    if (!table || !recordId) {
      return res.json({ ok: false, message: 'Table and recordId are required' });
    }

    const result = await query(`
      SELECT c.*, u.email as created_by_email
      FROM comments c
      JOIN users u ON u.id = c.created_by
      WHERE c.reference_table = $1 AND c.reference_id = $2
      ORDER BY c.created_at DESC
    `, [table, recordId]);

    const comments = result.rows.map(row => ({
      id: row.id,
      comment: row.comment,
      created_by: row.created_by_email,
      created_at: new Date(row.created_at).toLocaleString(),
    }));

    return res.json({ ok: true, comments });
  } catch (error) {
    console.error('List comments error:', error);
    return res.json({ ok: false, message: 'Failed to list comments' });
  }
});

/**
 * POST /api/comments/add
 * Add a comment to a record
 */
router.post('/add', async (req, res) => {
  try {
    const { table, recordId, comment } = req.body;

    if (!table || !recordId || !comment) {
      return res.json({ ok: false, message: 'Table, recordId, and comment are required' });
    }

    const result = await query(`
      INSERT INTO comments (reference_table, reference_id, comment, created_by, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `, [table, recordId, comment.trim(), req.user.userId]);

    return res.json({ ok: true, comment: result.rows[0] });
  } catch (error) {
    console.error('Add comment error:', error);
    return res.json({ ok: false, message: 'Failed to add comment' });
  }
});

module.exports = router;

