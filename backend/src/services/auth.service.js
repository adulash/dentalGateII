const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, getClient } = require('../config/db');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate refresh token
 */
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Verify JWT access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Calculate refresh token expiry date
 */
function getRefreshTokenExpiry() {
  const days = parseInt(REFRESH_TOKEN_EXPIRES_IN.replace('d', ''));
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Login user
 */
async function login(email, password, ipAddress = null, userAgent = null) {
  const cleanEmail = email.toLowerCase().trim();

  // Get user from database
  const result = await query(
    'SELECT id, email, password_hash, role, allowed_pages, status FROM users WHERE email = $1',
    [cleanEmail]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Check if user needs password setup
  if (user.status === 'Inactive') {
    return {
      ok: true,
      needsPasswordSetup: true,
      user: {
        email: user.email,
        role: user.role,
        status: user.status,
      },
      // Generate token for password setup only
      accessToken: generateAccessToken(user),
    };
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = getRefreshTokenExpiry();

  // Store refresh token in database
  await query(
    `INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, refreshToken, expiresAt, ipAddress, userAgent]
  );

  // Update last login
  await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  return {
    ok: true,
    accessToken,
    refreshToken,
    user: {
      email: user.email,
      role: user.role,
      status: user.status,
    },
    pages: user.allowed_pages || [],
  };
}

/**
 * Logout user (invalidate refresh token)
 */
async function logout(refreshToken) {
  if (!refreshToken) {
    return { ok: true };
  }

  await query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
  return { ok: true };
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken) {
  // Verify refresh token exists and is valid
  const result = await query(
    `SELECT s.user_id, s.expires_at, u.email, u.role, u.status
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token = $1`,
    [refreshToken]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid refresh token');
  }

  const session = result.rows[0];

  // Check if token expired
  if (new Date(session.expires_at) < new Date()) {
    await query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
    throw new Error('Refresh token expired');
  }

  // Check if user is still active
  if (session.status !== 'Active') {
    throw new Error('User account is inactive');
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    id: session.user_id,
    email: session.email,
    role: session.role,
  });

  return {
    ok: true,
    accessToken,
  };
}

/**
 * Set initial password for inactive user
 */
async function setInitialPassword(userId, newPassword) {
  // Get user
  const result = await query('SELECT status FROM users WHERE id = $1', [userId]);

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];

  if (user.status !== 'Inactive') {
    throw new Error('This endpoint is only for initial password setup');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password (keep status as Inactive - admin must activate)
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);

  return { ok: true };
}

/**
 * Change password for active user
 */
async function changePassword(userId, currentPassword, newPassword) {
  // Get user
  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.password_hash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);

  // Invalidate all sessions except current
  // (in a real app, you'd want to keep current session)
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);

  return { ok: true };
}

/**
 * Clean up expired sessions
 */
async function cleanupExpiredSessions() {
  const result = await query('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP');
  return { deleted: result.rowCount };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  login,
  logout,
  refreshAccessToken,
  setInitialPassword,
  changePassword,
  cleanupExpiredSessions,
};

