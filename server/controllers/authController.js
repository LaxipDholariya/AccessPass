import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * POST /api/auth/login
 * Authenticates internal staff (Admin, Host, Security) using bcrypt and issues a signed JWT.
 */
export async function login(req, res) {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.',
    });
  }

  try {
    // Look up user by email
    const [users] = await pool.execute(
      `SELECT u.id, u.full_name, u.staff_id, u.email, u.password_hash, u.role, u.building_id, u.is_active, u.approval_status, b.name AS building_name
       FROM users u
       LEFT JOIN buildings b ON u.building_id = b.id
       WHERE u.email = ?`,
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    const user = users[0];

    // Check staff account approval status
    if (user.approval_status === 'pending') {
      return res.status(403).json({
        success: false,
        approvalStatus: 'pending',
        message: 'Your staff account registration is pending administrator approval. Please wait for an administrator to review and activate your account.',
      });
    }

    if (user.approval_status === 'rejected') {
      return res.status(403).json({
        success: false,
        approvalStatus: 'rejected',
        message: 'Your staff account registration was declined by an administrator.',
      });
    }

    // Check account active status
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact an administrator.',
      });
    }

    // Compare bcrypt password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    // Generate signed JWT
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      building_id: user.building_id,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'super_secret_accesspass_jwt_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Record login audit log
    await logAudit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetEntity: 'users',
      targetId: user.id,
      details: `User ${user.email} logged in successfully as role ${user.role}`,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        staffId: user.staff_id,
        email: user.email,
        role: user.role,
        buildingId: user.building_id,
        buildingName: user.building_name || 'Campus-Wide',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred during authentication.',
    });
  }
}

/**
 * GET /api/auth/me
 * Retrieves current authenticated user context from database using JWT token.
 */
export async function getMe(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.full_name, u.staff_id, u.email, u.role, u.building_id, u.phone, u.approval_status, b.name AS building_name
       FROM users u
       LEFT JOIN buildings b ON u.building_id = b.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    const user = rows[0];

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        staffId: user.staff_id,
        email: user.email,
        role: user.role,
        buildingId: user.building_id,
        buildingName: user.building_name || 'Campus-Wide',
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.',
    });
  }
}
