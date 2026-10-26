import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

/**
 * Middleware: Verifies the JSON Web Token in the Authorization header.
 * Attaches the authenticated user's database record to req.user.
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied: Authorization token is missing or malformed.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_accesspass_jwt_key_2026');

    // Verify user still exists and is currently active in MySQL
    const [rows] = await pool.execute(
      'SELECT id, full_name, email, role, building_id, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session: User account no longer exists.',
      });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended: Please contact your system administrator.',
      });
    }

    // Attach active user context to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.',
    });
  }
}

/**
 * Middleware Factory: Enforces Role-Based Access Control (RBAC).
 * 
 * @param {string[]} allowedRoles - List of roles permitted to access this endpoint (e.g. ['admin', 'host'])
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required before checking role permissions.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
}
