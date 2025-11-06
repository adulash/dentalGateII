const { verifyAccessToken } = require('../services/auth.service');
const { query } = require('../config/db');

/**
 * Middleware to verify JWT token
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ ok: false, message: 'Unauthorized: Invalid token' });
    }

    // Verify user still exists and is active
    const result = await query(
      'SELECT id, email, role, status, allowed_pages FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Unauthorized: User not found' });
    }

    const user = result.rows[0];

    // For inactive users, only allow password setup endpoint
    if (user.status === 'Inactive' && !req.path.includes('/user/setInitialPassword')) {
      return res.status(403).json({ 
        ok: false, 
        message: 'Account inactive. Please set your password first.' 
      });
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      allowedPages: user.allowed_pages || [],
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}

/**
 * Middleware to check if user is admin
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  if (req.user.role.toLowerCase() !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Forbidden: Admin access required' });
  }

  next();
}

/**
 * Middleware to check if user has access to a specific page
 */
function requirePageAccess(pageName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    // Admin has access to all pages
    if (req.user.role.toLowerCase() === 'admin') {
      return next();
    }

    // Check if user has page in allowed_pages
    if (!req.user.allowedPages || !req.user.allowedPages.includes(pageName)) {
      return res.status(403).json({ 
        ok: false, 
        message: `Forbidden: Access to ${pageName} page not allowed` 
      });
    }

    next();
  };
}

/**
 * Middleware to check resource ownership
 * For tables like Orders and Issues where created_by matters
 */
async function requireOwnership(tableName, idField = 'id') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    // Admin bypasses ownership check
    if (req.user.role.toLowerCase() === 'admin') {
      return next();
    }

    try {
      const recordId = req.body[idField] || req.params[idField] || req.query[idField];
      
      if (!recordId) {
        return res.status(400).json({ ok: false, message: 'Record ID required' });
      }

      // Check if user owns the record
      const result = await query(
        `SELECT created_by FROM ${tableName} WHERE ${idField} = $1`,
        [recordId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, message: 'Record not found' });
      }

      const record = result.rows[0];

      if (record.created_by !== req.user.userId) {
        return res.status(403).json({ 
          ok: false, 
          message: 'Forbidden: You can only access your own records' 
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ ok: false, message: 'Internal server error' });
    }
  };
}

module.exports = {
  authMiddleware,
  requireAdmin,
  requirePageAccess,
  requireOwnership,
};

