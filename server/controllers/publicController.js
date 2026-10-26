import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * GET /api/public/buildings
 * Returns active buildings to populate the visitor registration dropdown.
 */
export async function getBuildings(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, code, address FROM buildings WHERE is_active = 1 ORDER BY name ASC'
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getBuildings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve buildings list.' });
  }
}

/**
 * GET /api/public/hosts?building_id=:id
 * Returns active hosts assigned to a specific building (or campus-wide).
 */
export async function getHosts(req, res) {
  const { building_id } = req.query;

  try {
    let sql = `SELECT id, full_name, email, phone FROM users WHERE role = 'host' AND is_active = 1`;
    const params = [];

    if (building_id) {
      sql += ` AND (building_id = ? OR building_id IS NULL)`;
      params.push(Number(building_id));
    }

    sql += ` ORDER BY full_name ASC`;

    const [rows] = await pool.execute(sql, params);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getHosts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve hosts list.' });
  }
}

/**
 * POST /api/public/visits/register
 * Public self-service visitor registration.
 * Performs real-time blacklist checks and creates a new pending visit request.
 */
export async function registerVisit(req, res) {
  const {
    fullName,
    email,
    phone,
    idProofType = 'National ID',
    idProofNumber,
    buildingId,
    hostUserId,
    purpose,
    requestedDate,
    expectedStartTime,
    expectedEndTime,
  } = req.body;

  // Validate required fields
  if (
    !fullName ||
    !email ||
    !phone ||
    !buildingId ||
    !hostUserId ||
    !purpose ||
    !requestedDate ||
    !expectedStartTime ||
    !expectedEndTime
  ) {
    return res.status(400).json({
      success: false,
      message: 'Missing required registration fields. Please fill out all required details.',
    });
  }

  // Consistent normalization
  const cleanFullName = String(fullName || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').trim();
  const cleanIdProofType = idProofType ? String(idProofType).trim() : 'National ID';
  // If idProofNumber is empty or only whitespace, normalize to NULL so MySQL UNIQUE index permits it
  const cleanIdProof = (idProofNumber && String(idProofNumber).trim().length > 0)
    ? String(idProofNumber).trim()
    : null;

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({
      success: false,
      field: 'email',
      message: 'Please provide a valid email address.',
    });
  }

  try {
    // 1. Blacklist Cross-Check
    let blacklistSql = `
      SELECT identifier_type, identifier_value, reason 
      FROM blacklist 
      WHERE (identifier_type = 'email' AND identifier_value = ?)
         OR (identifier_type = 'phone' AND identifier_value = ?)
    `;
    const blacklistParams = [cleanEmail, cleanPhone];
    if (cleanIdProof !== null) {
      blacklistSql += ` OR (identifier_type = 'id_proof' AND identifier_value = ?)`;
      blacklistParams.push(cleanIdProof);
    }

    const [blacklistMatches] = await pool.execute(blacklistSql, blacklistParams);

    if (blacklistMatches.length > 0) {
      const match = blacklistMatches[0];
      return res.status(403).json({
        success: false,
        message: `Access Denied: This registration is blocked due to active security restrictions. (Ref: ${match.reason})`,
      });
    }

    // 2. Verify target building and host exist and are active
    const [bldg] = await pool.execute('SELECT id, name FROM buildings WHERE id = ? AND is_active = 1', [buildingId]);
    if (bldg.length === 0) {
      return res.status(400).json({ success: false, message: 'Selected building is invalid or inactive.' });
    }

    const [host] = await pool.execute('SELECT id, full_name FROM users WHERE id = ? AND role = "host" AND is_active = 1', [hostUserId]);
    if (host.length === 0) {
      return res.status(400).json({ success: false, message: 'Selected host is invalid or inactive.' });
    }

    // 3. Separate duplicate checks on MySQL before transaction
    // Check Email
    const [emailMatch] = await pool.execute(
      'SELECT id FROM visitors WHERE email = ? LIMIT 1',
      [cleanEmail]
    );
    if (emailMatch.length > 0) {
      return res.status(409).json({
        success: false,
        field: 'email',
        message: 'A visitor with this email address is already registered. Please use a unique email address.',
      });
    }

    // Check Phone Number
    const [phoneMatch] = await pool.execute(
      'SELECT id FROM visitors WHERE phone = ? LIMIT 1',
      [cleanPhone]
    );
    if (phoneMatch.length > 0) {
      return res.status(409).json({
        success: false,
        field: 'phone',
        message: 'A visitor with this phone number is already registered. Please use a unique phone number.',
      });
    }

    // Check ID Document Number (only if non-empty value provided)
    if (cleanIdProof !== null) {
      const [idProofMatch] = await pool.execute(
        'SELECT id FROM visitors WHERE id_proof_number = ? LIMIT 1',
        [cleanIdProof]
      );
      if (idProofMatch.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'idProofNumber',
          message: 'A visitor with this ID document number is already registered. Please check the document number.',
        });
      }
    }

    // 4. Perform Transaction: Insert NEW Visitor Profile + Visit Request
    // Note: Never update, overwrite or merge existing visitor records!
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert new visitor
      const [insertResult] = await connection.execute(
        `INSERT INTO visitors (full_name, email, phone, id_proof_type, id_proof_number)
         VALUES (?, ?, ?, ?, ?)`,
        [cleanFullName, cleanEmail, cleanPhone, cleanIdProofType, cleanIdProof]
      );
      const visitorId = insertResult.insertId;

      // Generate unique public reference code: AP-YYYY-6HEX
      const currentYear = new Date().getFullYear();
      const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const referenceCode = `AP-${currentYear}-${randomHex}`;

      // Generate cryptographically secure private verification secret (SEC-XXXX-YYYY)
      const secretBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
      const verificationSecret = `SEC-${secretBytes.slice(0, 4)}-${secretBytes.slice(4, 8)}`;
      const accessSecretHash = await bcrypt.hash(verificationSecret, 10);

      // Insert visit request linked to the new visitor with secure secret hash
      const [requestResult] = await connection.execute(
        `INSERT INTO visit_requests 
         (reference_code, visitor_id, building_id, host_user_id, purpose, requested_date, expected_start_time, expected_end_time, status, access_secret_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          referenceCode,
          visitorId,
          buildingId,
          hostUserId,
          purpose.trim(),
          requestedDate,
          expectedStartTime,
          expectedEndTime,
          accessSecretHash,
        ]
      );

      // Audit log entry (never logs verification secrets or hashes)
      await logAudit({
        userId: null,
        action: 'VISIT_REGISTERED',
        targetEntity: 'visit_requests',
        targetId: requestResult.insertId,
        details: `Visitor ${cleanFullName} requested visit under reference ${referenceCode} for host ${host[0].full_name}`,
        ipAddress: req.ip || req.socket.remoteAddress,
        connection,
      });

      await connection.commit();
      connection.release();

      return res.status(201).json({
        success: true,
        message: 'Your visit request has been submitted successfully and is awaiting host approval.',
        data: {
          referenceCode,
          verificationSecret,
          status: 'pending',
          lifecycleStatus: 'Pending',
          visitorName: cleanFullName,
          buildingName: bldg[0]?.name || '',
          requestedDate,
          expectedStartTime,
          expectedEndTime,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (transactionError) {
      await connection.rollback();
      connection.release();

      // Graceful handling of concurrent duplicate race conditions from MySQL UNIQUE constraints
      if (transactionError.code === 'ER_DUP_ENTRY' || transactionError.errno === 1062) {
        const sqlMsg = (transactionError.sqlMessage || '').toLowerCase();
        if (sqlMsg.includes('uq_visitors_email') || sqlMsg.includes('email')) {
          return res.status(409).json({
            success: false,
            field: 'email',
            message: 'A visitor with this email address is already registered. Please use a unique email address.',
          });
        }
        if (sqlMsg.includes('uq_visitors_phone') || sqlMsg.includes('phone')) {
          return res.status(409).json({
            success: false,
            field: 'phone',
            message: 'A visitor with this phone number is already registered. Please use a unique phone number.',
          });
        }
        if (sqlMsg.includes('uq_visitors_id_proof') || sqlMsg.includes('id_proof_number')) {
          return res.status(409).json({
            success: false,
            field: 'idProofNumber',
            message: 'A visitor with this ID document number is already registered. Please check the document number.',
          });
        }
        return res.status(409).json({
          success: false,
          message: 'A visitor record with one or more of these details already exists.',
        });
      }

      throw transactionError;
    }
  } catch (error) {
    console.error('registerVisit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process visitor registration. Please check inputs and try again.',
    });
  }
}

// ============================================================================
// VERIFICATION RATE LIMITING & SECURITY HELPERS
// ============================================================================
const verificationAttempts = new Map();
const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_DURATION_MS = 15 * 60 * 1000;

function checkVerificationRateLimit(ip, refCode) {
  const key = `${ip || 'unknown'}:${(refCode || '').toUpperCase()}`;
  const now = Date.now();
  const record = verificationAttempts.get(key);

  if (!record) return { allowed: true };

  // Check if locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    const minutesRemaining = Math.max(1, Math.ceil((record.lockedUntil - now) / 60000));
    return {
      allowed: false,
      message: `Too many failed verification attempts. Please wait ${minutesRemaining} minute(s) before trying again.`,
    };
  }

  // Check if sliding window expired
  if (now - record.firstAttempt > WINDOW_DURATION_MS) {
    verificationAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedVerificationAttempt(ip, refCode) {
  const key = `${ip || 'unknown'}:${(refCode || '').toUpperCase()}`;
  const now = Date.now();
  const record = verificationAttempts.get(key) || { count: 0, firstAttempt: now, lockedUntil: null };

  if (now - record.firstAttempt > WINDOW_DURATION_MS) {
    record.count = 1;
    record.firstAttempt = now;
    record.lockedUntil = null;
  } else {
    record.count += 1;
  }

  if (record.count >= MAX_VERIFY_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  verificationAttempts.set(key, record);
}

function clearVerificationAttempts(ip, refCode) {
  const key = `${ip || 'unknown'}:${(refCode || '').toUpperCase()}`;
  verificationAttempts.delete(key);
}

/**
 * Helper to reset rate limits during automated testing
 */
export function resetVerificationRateLimitForTesting() {
  verificationAttempts.clear();
}

/**
 * Determine lifecycle status based on host review and gate logs
 */
async function determineLifecycleStatus(requestStatus, passId, passStatus, validUntil) {
  if (requestStatus === 'pending') {
    return 'Pending';
  }
  if (requestStatus === 'rejected') {
    return 'Rejected';
  }
  if (requestStatus === 'approved' && passId) {
    if (passStatus === 'revoked') {
      return 'Revoked';
    }
    if (passStatus === 'expired' || (validUntil && new Date(validUntil) < new Date())) {
      if (passStatus !== 'expired') {
        pool.execute('UPDATE digital_passes SET status = "expired" WHERE id = ?', [passId]).catch(() => {});
      }
      return 'Expired';
    }
    const [logs] = await pool.execute(
      'SELECT check_in_time, check_out_time FROM entry_exit_logs WHERE digital_pass_id = ? ORDER BY id DESC LIMIT 1',
      [passId]
    );
    if (logs.length > 0) {
      if (logs[0].check_out_time === null) {
        return 'Inside';
      }
      return 'Exited';
    }
    return 'Approved';
  }
  return 'Pending';
}

/**
 * GET /api/public/visits/:referenceCode/status
 * GET /api/public/visits/:referenceCode
 * Public status lookup: returns ONLY the visit status and schedule window.
 * Strictly hides all visitor PII, host contacts, and scannable QR pass tokens.
 */
export async function getVisitStatus(req, res) {
  const { referenceCode } = req.params;

  if (!referenceCode) {
    return res.status(400).json({ success: false, message: 'Reference code is required.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT 
         vr.id AS request_id,
         vr.reference_code,
         vr.status AS request_status,
         vr.requested_date,
         vr.expected_start_time,
         vr.expected_end_time,
         vr.rejection_reason,
         vr.created_at,
         b.name AS building_name,
         b.code AS building_code,
         dp.id AS pass_id,
         dp.valid_until,
         dp.status AS pass_status
       FROM visit_requests vr
       JOIN buildings b ON vr.building_id = b.id
       LEFT JOIN digital_passes dp ON dp.visit_request_id = vr.id
       WHERE vr.reference_code = ?`,
      [referenceCode.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No visit request found matching the provided reference code.',
      });
    }

    const record = rows[0];
    const lifecycleStatus = await determineLifecycleStatus(
      record.request_status,
      record.pass_id,
      record.pass_status,
      record.valid_until
    );

    return res.status(200).json({
      success: true,
      data: {
        referenceCode: record.reference_code,
        requestStatus: record.request_status,
        lifecycleStatus,
        requestedDate: record.requested_date,
        expectedStartTime: record.expected_start_time,
        expectedEndTime: record.expected_end_time,
        rejectionReason: record.rejection_reason || null,
        building: {
          name: record.building_name,
          code: record.building_code,
        },
        createdAt: record.created_at,
      },
    });
  } catch (error) {
    console.error('getVisitStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve visit status.',
    });
  }
}

/**
 * Backwards-compatible alias for getVisitStatus
 */
export const getVisitByReference = getVisitStatus;

/**
 * POST /api/public/visits/:referenceCode/verify-access
 * Authenticates visitor using their private verification secret.
 * On success, unlocks full appointment details and scannable QR pass.
 * Protected by rate limiting and generic error responses.
 */
export async function verifyVisitAccess(req, res) {
  const { referenceCode } = req.params;
  const { verificationSecret } = req.body || {};
  const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';

  if (!referenceCode) {
    return res.status(400).json({ success: false, message: 'Reference code is required.' });
  }

  // 1. Enforce verification rate limiting
  const rateLimit = checkVerificationRateLimit(clientIp, referenceCode);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: rateLimit.message,
    });
  }

  // 2. Validate input format
  if (!verificationSecret || typeof verificationSecret !== 'string' || !verificationSecret.trim()) {
    recordFailedVerificationAttempt(clientIp, referenceCode);
    return res.status(401).json({
      success: false,
      message: 'Invalid visit reference or verification secret.',
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT 
         vr.id AS request_id,
         vr.reference_code,
         vr.status AS request_status,
         vr.purpose,
         vr.requested_date,
         vr.expected_start_time,
         vr.expected_end_time,
         vr.rejection_reason,
         vr.reviewed_at,
         vr.access_secret_hash,
         vr.created_at,
         v.full_name AS visitor_name,
         v.email AS visitor_email,
         v.phone AS visitor_phone,
         v.id_proof_type,
         b.name AS building_name,
         b.code AS building_code,
         b.address AS building_address,
         h.full_name AS host_name,
         h.email AS host_email,
         dp.id AS pass_id,
         dp.pass_code,
         dp.valid_from,
         dp.valid_until,
         dp.status AS pass_status,
         dp.qr_payload
       FROM visit_requests vr
       JOIN visitors v ON vr.visitor_id = v.id
       JOIN buildings b ON vr.building_id = b.id
       JOIN users h ON vr.host_user_id = h.id
       LEFT JOIN digital_passes dp ON dp.visit_request_id = vr.id
       WHERE vr.reference_code = ?`,
      [referenceCode.trim().toUpperCase()]
    );

    // Return generic error if reference does not exist (prevents enumeration)
    if (rows.length === 0) {
      recordFailedVerificationAttempt(clientIp, referenceCode);
      return res.status(401).json({
        success: false,
        message: 'Invalid visit reference or verification secret.',
      });
    }

    const record = rows[0];

    // Reject if no secret hash exists on this request
    if (!record.access_secret_hash) {
      recordFailedVerificationAttempt(clientIp, referenceCode);
      return res.status(401).json({
        success: false,
        message: 'Invalid visit reference or verification secret.',
      });
    }

    // Securely compare verification secret against stored bcrypt hash
    const isMatch = await bcrypt.compare(verificationSecret.trim(), record.access_secret_hash);
    if (!isMatch) {
      recordFailedVerificationAttempt(clientIp, referenceCode);
      return res.status(401).json({
        success: false,
        message: 'Invalid visit reference or verification secret.',
      });
    }

    // Reset rate limit counter upon successful verification
    clearVerificationAttempts(clientIp, referenceCode);

    // Compute accurate lifecycle status
    const lifecycleStatus = await determineLifecycleStatus(
      record.request_status,
      record.pass_id,
      record.pass_status,
      record.valid_until
    );

    let passStatus = record.pass_status;
    if (lifecycleStatus === 'Expired') {
      passStatus = 'expired';
    }

    return res.status(200).json({
      success: true,
      message: 'Verification successful. Visit details and digital pass unlocked.',
      data: {
        referenceCode: record.reference_code,
        requestStatus: record.request_status,
        lifecycleStatus,
        purpose: record.purpose,
        requestedDate: record.requested_date,
        expectedStartTime: record.expected_start_time,
        expectedEndTime: record.expected_end_time,
        rejectionReason: record.rejection_reason,
        createdAt: record.created_at,
        visitor: {
          name: record.visitor_name,
          email: record.visitor_email,
          phone: record.visitor_phone,
          idProofType: record.id_proof_type,
        },
        building: {
          name: record.building_name,
          code: record.building_code,
          address: record.building_address,
        },
        host: {
          name: record.host_name,
          email: record.host_email,
        },
        digitalPass: record.pass_id
          ? {
              passCode: record.pass_code,
              validFrom: record.valid_from,
              validUntil: record.valid_until,
              status: passStatus,
              lifecycleStatus,
              qrPayload: record.qr_payload,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('verifyVisitAccess error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify visit credentials.',
    });
  }
}

/**
 * POST /api/public/staff/register
 * Public self-service staff registration request.
 * Enforces strict security constraints:
 * - Public applicants CANNOT grant themselves active accounts or arbitrary roles.
 * - Public self-registration as Admin is strictly blocked (HTTP 403).
 * - Account is created with approval_status = 'pending' and is_active = 0.
 * - The requested role (e.g. host or security) is recorded in requested_role.
 * - Validates duplicate email, phone, and staff_id independently before inserting.
 * - Hashes password using bcrypt.
 * - Never returns password or password hash in response.
 */
export async function registerStaff(req, res) {
  const { fullName, email, phone, staffId, password, requestedRole = 'host', buildingId } = req.body;

  // 1. Validate required fields
  if (!fullName || !email || !phone || !staffId || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide full name, official email, phone number, staff ID, and password.',
    });
  }

  // 2. Normalize and validate inputs
  const cleanFullName = String(fullName).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPhone = String(phone).trim();
  const cleanStaffId = String(staffId).trim().toUpperCase();
  const cleanRequestedRole = String(requestedRole).trim().toLowerCase();
  const cleanBuildingId = buildingId ? Number(buildingId) : null;

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({
      success: false,
      field: 'email',
      message: 'Please provide a valid official email address.',
    });
  }

  // Password length validation
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      field: 'password',
      message: 'Password must be at least 6 characters long.',
    });
  }

  // Security Rule: Public visitors cannot register as Admin
  if (cleanRequestedRole === 'admin') {
    return res.status(403).json({
      success: false,
      field: 'requestedRole',
      message: 'Access Denied: Self-registration as Administrator is strictly prohibited. Administrator accounts must be provisioned internally.',
    });
  }

  // Allow only valid staff roles to be requested
  if (!['host', 'security'].includes(cleanRequestedRole)) {
    return res.status(400).json({
      success: false,
      field: 'requestedRole',
      message: 'Invalid role requested. Permitted staff roles for application are Host and Security.',
    });
  }

  // Verify building if provided
  if (cleanBuildingId) {
    const [bldg] = await pool.execute('SELECT id, name FROM buildings WHERE id = ? AND is_active = 1', [cleanBuildingId]);
    if (bldg.length === 0) {
      return res.status(400).json({
        success: false,
        field: 'buildingId',
        message: 'Selected facility is invalid or inactive.',
      });
    }
  }

  try {
    // 3. Independent Duplicate Checks on users table
    // Check Email
    const [emailMatch] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
    if (emailMatch.length > 0) {
      return res.status(409).json({
        success: false,
        field: 'email',
        message: 'A staff account with this email address already exists. Please use a unique email address.',
      });
    }

    // Check Phone Number
    const [phoneMatch] = await pool.execute('SELECT id FROM users WHERE phone = ? LIMIT 1', [cleanPhone]);
    if (phoneMatch.length > 0) {
      return res.status(409).json({
        success: false,
        field: 'phone',
        message: 'A staff account with this phone number already exists. Please use a unique phone number.',
      });
    }

    // Check Staff ID
    const [staffIdMatch] = await pool.execute('SELECT id FROM users WHERE staff_id = ? LIMIT 1', [cleanStaffId]);
    if (staffIdMatch.length > 0) {
      return res.status(409).json({
        success: false,
        field: 'staffId',
        message: 'A staff account with this Staff ID already exists. Please check your staff identifier.',
      });
    }

    // 4. Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Insert new staff applicant as PENDING and INACTIVE
    const [result] = await pool.execute(
      `INSERT INTO users 
       (full_name, staff_id, email, password_hash, role, building_id, phone, is_active, approval_status, requested_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?)`,
      [
        cleanFullName,
        cleanStaffId,
        cleanEmail,
        passwordHash,
        cleanRequestedRole,
        cleanBuildingId,
        cleanPhone,
        cleanRequestedRole,
      ]
    );

    // 6. Audit log
    await logAudit({
      userId: null,
      action: 'STAFF_REGISTRATION_REQUESTED',
      targetEntity: 'users',
      targetId: result.insertId,
      details: `Staff registration request submitted by ${cleanFullName} (${cleanEmail}, Staff ID: ${cleanStaffId}, Requested Role: ${cleanRequestedRole})`,
      ipAddress: req.ip || req.socket?.remoteAddress,
    });

    return res.status(201).json({
      success: true,
      message: 'Staff registration request submitted successfully. Your account is pending administrator review and approval before activation.',
      data: {
        id: result.insertId,
        fullName: cleanFullName,
        staffId: cleanStaffId,
        email: cleanEmail,
        requestedRole: cleanRequestedRole,
        approvalStatus: 'pending',
        isActive: false,
      },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      const msg = (error.sqlMessage || '').toLowerCase();
      if (msg.includes('staff_id')) {
        return res.status(409).json({ success: false, field: 'staffId', message: 'Staff ID is already in use.' });
      }
      if (msg.includes('phone')) {
        return res.status(409).json({ success: false, field: 'phone', message: 'Phone number is already in use.' });
      }
      if (msg.includes('email')) {
        return res.status(409).json({ success: false, field: 'email', message: 'Email address is already in use.' });
      }
    }
    console.error('registerStaff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process staff registration request due to an internal server error.',
    });
  }
}
