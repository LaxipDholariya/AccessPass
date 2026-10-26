import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * POST /api/security/verify-pass
 * Validates a digital pass by pass token or reference code.
 * Enforces building restrictions, expiration windows, blacklist status, and inside/outside state.
 */
export async function verifyPass(req, res) {
  const { code } = req.body;
  const securityUser = req.user;

  if (!code) {
    return res.status(400).json({ success: false, message: 'Please provide a pass token or reference code to scan.' });
  }

  // Support raw QR scan JSON payload decoding (e.g. {"ref":"...", "token":"..."})
  let cleanCode = code.trim();
  try {
    const parsed = JSON.parse(cleanCode);
    if (parsed.token) cleanCode = String(parsed.token).trim();
    else if (parsed.passToken) cleanCode = String(parsed.passToken).trim();
    else if (parsed.ref) cleanCode = String(parsed.ref).trim();
  } catch (e) {
    // Plain string code/token
  }

  try {
    const [rows] = await pool.execute(
      `SELECT 
         dp.id AS pass_id,
         dp.pass_code,
         dp.valid_from,
         dp.valid_until,
         dp.status AS pass_status,
         vr.id AS request_id,
         vr.reference_code,
         vr.status AS request_status,
         vr.rejection_reason,
         vr.purpose,
         vr.building_id,
         b.name AS building_name,
         b.code AS building_code,
         v.id AS visitor_id,
         v.full_name AS visitor_name,
         v.email AS visitor_email,
         v.phone AS visitor_phone,
         v.id_proof_type,
         v.id_proof_number,
         h.full_name AS host_name,
         h.phone AS host_phone
       FROM visit_requests vr
       LEFT JOIN digital_passes dp ON dp.visit_request_id = vr.id
       JOIN visitors v ON vr.visitor_id = v.id
       JOIN buildings b ON vr.building_id = b.id
       JOIN users h ON vr.host_user_id = h.id
       WHERE dp.pass_code = ? OR vr.reference_code = ?`,
      [cleanCode, cleanCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        verified: false,
        alertType: 'NOT_FOUND',
        message: 'Invalid Pass: No pass or visit record found matching this reference/token.',
      });
    }

    const pass = rows[0];

    // 1. Visit Request Approval Check
    if (pass.request_status === 'rejected') {
      return res.status(403).json({
        success: false,
        verified: false,
        alertType: 'REJECTED',
        message: `Access Denied: This visit request was rejected by the host. Reason: ${pass.rejection_reason || 'Declined by host'}`,
        building: pass.building_name,
        visitor: { name: pass.visitor_name, phone: pass.visitor_phone },
      });
    }

    if (pass.request_status === 'pending' || !pass.pass_id) {
      return res.status(400).json({
        success: false,
        verified: false,
        alertType: 'NOT_APPROVED',
        message: 'Access Denied: This visit request has not been approved by the host yet (Status: Pending).',
        building: pass.building_name,
        visitor: { name: pass.visitor_name, phone: pass.visitor_phone },
      });
    }

    // 2. Blacklist Check
    const [blacklistMatches] = await pool.execute(
      `SELECT reason FROM blacklist 
       WHERE (identifier_type = 'email' AND identifier_value = ?)
          OR (identifier_type = 'phone' AND identifier_value = ?)
          OR (identifier_type = 'id_proof' AND identifier_value = ?)`,
      [pass.visitor_email, pass.visitor_phone, pass.id_proof_number || '']
    );

    if (blacklistMatches.length > 0) {
      return res.status(403).json({
        success: false,
        verified: false,
        alertType: 'BLACKLISTED',
        message: `SECURITY ALERT: Visitor is BLACKLISTED. Reason: ${blacklistMatches[0].reason}`,
        visitor: { name: pass.visitor_name, phone: pass.visitor_phone },
      });
    }

    // 3. Building Authorization Check
    // If security guard is assigned to a specific building, reject passes destined for other buildings
    if (securityUser.building_id && securityUser.building_id !== pass.building_id) {
      return res.status(403).json({
        success: false,
        verified: false,
        alertType: 'WRONG_BUILDING',
        message: `Access Denied: This pass is issued for '${pass.building_name}', not your assigned building checkpoint.`,
        targetBuilding: pass.building_name,
      });
    }

    // 4. Revocation Check
    if (pass.pass_status === 'revoked') {
      return res.status(403).json({
        success: false,
        verified: false,
        alertType: 'REVOKED',
        message: 'SECURITY ALERT: This digital pass has been REVOKED by an authorized host or administrator.',
        validUntil: pass.valid_until,
      });
    }

    // 5. Already-Used Check (single-entry pass lifecycle)
    if (pass.pass_status === 'used') {
      return res.status(400).json({
        success: false,
        verified: false,
        alertType: 'ALREADY_USED',
        message: 'Pass Already Used: This single-entry digital pass has already completed checkout and cannot be reused.',
        validUntil: pass.valid_until,
      });
    }

    // 6. Time Window & Expiration Check
    const now = new Date();
    const validFrom = new Date(pass.valid_from);
    const validUntil = new Date(pass.valid_until);

    if (pass.pass_status === 'expired' || now > validUntil) {
      if (pass.pass_status !== 'expired') {
        await pool.execute('UPDATE digital_passes SET status = "expired" WHERE id = ?', [pass.pass_id]);
      }
      return res.status(400).json({
        success: false,
        verified: false,
        alertType: 'EXPIRED',
        message: `Pass Expired: Validity expired at ${validUntil.toLocaleTimeString()} on ${validUntil.toLocaleDateString()}.`,
        validUntil: pass.valid_until,
      });
    }

    if (now < validFrom) {
      return res.status(400).json({
        success: false,
        verified: false,
        alertType: 'NOT_YET_ACTIVE',
        message: `Pass Not Yet Active: Scheduled entry begins at ${validFrom.toLocaleTimeString()} on ${validFrom.toLocaleDateString()}.`,
        validFrom: pass.valid_from,
      });
    }

    // 7. Physical Check-in/Check-out State
    const [openLogs] = await pool.execute(
      `SELECT id, check_in_time, entry_gate 
       FROM entry_exit_logs 
       WHERE digital_pass_id = ? AND check_out_time IS NULL 
       ORDER BY id DESC LIMIT 1`,
      [pass.pass_id]
    );

    const isCurrentlyInside = openLogs.length > 0;
    const activeLog = isCurrentlyInside ? openLogs[0] : null;

    // Compute unified lifecycle status
    let lifecycleStatus = 'Approved';
    if (isCurrentlyInside) {
      lifecycleStatus = 'Inside';
    } else {
      const [closedLogs] = await pool.execute(
        'SELECT id FROM entry_exit_logs WHERE digital_pass_id = ? AND check_out_time IS NOT NULL LIMIT 1',
        [pass.pass_id]
      );
      lifecycleStatus = closedLogs.length > 0 ? 'Exited' : 'Approved';
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: isCurrentlyInside
        ? 'Pass is valid. Visitor is currently INSIDE the premises (ready for check-out).'
        : 'Pass is valid and active. Authorized for ENTRY (ready for check-in).',
      data: {
        passId: pass.pass_id,
        passCode: pass.pass_code,
        referenceCode: pass.reference_code,
        validFrom: pass.valid_from,
        validUntil: pass.valid_until,
        lifecycleStatus,
        isCurrentlyInside,
        activeLogId: activeLog ? activeLog.id : null,
        checkedInAt: activeLog ? activeLog.check_in_time : null,
        canCheckIn: !isCurrentlyInside,
        canCheckOut: isCurrentlyInside,
        visitor: {
          id: pass.visitor_id,
          name: pass.visitor_name,
          email: pass.visitor_email,
          phone: pass.visitor_phone,
          idProofType: pass.id_proof_type,
          idProofNumber: pass.id_proof_number,
        },
        host: {
          name: pass.host_name,
          phone: pass.host_phone,
        },
        building: {
          id: pass.building_id,
          name: pass.building_name,
          code: pass.building_code,
        },
        purpose: pass.purpose,
      },
    });
  } catch (error) {
    console.error('verifyPass error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify pass due to internal database error.',
    });
  }
}

/**
 * POST /api/security/check-in
 * Records physical entry of an approved visitor.
 * Uses database transactions with row-level locks (FOR UPDATE) to prevent simultaneous duplicate entry.
 */
export async function checkIn(req, res) {
  const { passId, gate = 'Main Gate', remarks } = req.body;
  const securityUserId = req.user.id;
  const securityUser = req.user;

  if (!passId) {
    return res.status(400).json({ success: false, message: 'passId is required to record check-in.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verify pass exists and lock row for update to avoid race conditions
    const [passes] = await connection.execute(
      `SELECT dp.*, vr.reference_code, vr.building_id, 
              v.full_name AS visitor_name, v.email AS visitor_email, v.phone AS visitor_phone, v.id_proof_number
       FROM digital_passes dp
       JOIN visit_requests vr ON dp.visit_request_id = vr.id
       JOIN visitors v ON vr.visitor_id = v.id
       WHERE dp.id = ? FOR UPDATE`,
      [passId]
    );

    if (passes.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Digital pass record not found.' });
    }

    const pass = passes[0];

    // Check pass revocation
    if (pass.status === 'revoked') {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ success: false, message: 'Cannot record entry: This digital pass has been revoked.' });
    }

    // Check pass already used
    if (pass.status === 'used') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Cannot record entry: This pass has already completed checkout and cannot be reused.' });
    }

    // Check pass expiration
    if (pass.status === 'expired' || new Date() > new Date(pass.valid_until)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Cannot check in: Pass validity has expired.' });
    }

    // Check blacklist status
    const [blMatches] = await connection.execute(
      `SELECT reason FROM blacklist 
       WHERE (identifier_type = 'email' AND identifier_value = ?)
          OR (identifier_type = 'phone' AND identifier_value = ?)
          OR (identifier_type = 'id_proof' AND identifier_value = ?)`,
      [pass.visitor_email || '', pass.visitor_phone || '', pass.id_proof_number || '']
    );

    if (blMatches.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({
        success: false,
        message: `Cannot record entry: Visitor is blacklisted (${blMatches[0].reason}).`,
      });
    }

    // Check building permission
    if (securityUser.building_id && securityUser.building_id !== pass.building_id) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ success: false, message: 'Access Denied: Pass is not valid for your assigned building checkpoint.' });
    }

    // 2. Prevent duplicate entry if already checked in without exit (Lock open logs)
    const [openLogs] = await connection.execute(
      'SELECT id FROM entry_exit_logs WHERE digital_pass_id = ? AND check_out_time IS NULL FOR UPDATE',
      [passId]
    );

    if (openLogs.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Invalid Action: Visitor is already checked in. Record their check-out before logging another entry.',
      });
    }

    // 3. Insert Entry Log
    const [insertResult] = await connection.execute(
      `INSERT INTO entry_exit_logs (digital_pass_id, security_user_id, check_in_time, entry_gate, remarks)
       VALUES (?, ?, NOW(), ?, ?)`,
      [passId, securityUserId, gate.trim(), remarks ? remarks.trim() : null]
    );

    // Audit log
    await logAudit({
      userId: securityUserId,
      action: 'GATE_CHECK_IN',
      targetEntity: 'entry_exit_logs',
      targetId: insertResult.insertId,
      details: `Officer logged ENTRY for visitor ${pass.visitor_name} (${pass.reference_code}) at gate ${gate}`,
      ipAddress: req.ip || req.socket.remoteAddress,
      connection,
    });

    await connection.commit();
    connection.release();

    return res.status(201).json({
      success: true,
      message: `Entry recorded successfully for ${pass.visitor_name}.`,
      data: {
        logId: insertResult.insertId,
        visitorName: pass.visitor_name,
        referenceCode: pass.reference_code,
        checkInTime: new Date().toISOString(),
        gate,
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('checkIn error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record entry log.',
    });
  }
}

/**
 * POST /api/security/check-out
 * Records physical departure of a visitor.
 * Uses database transactions with row-level locks (FOR UPDATE) to prevent duplicate check-outs.
 */
export async function checkOut(req, res) {
  const { passId, gate = 'Main Gate', remarks } = req.body;
  const securityUserId = req.user.id;
  const securityUser = req.user;

  if (!passId) {
    return res.status(400).json({ success: false, message: 'passId is required to record check-out.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Locate open entry log with row-level lock
    const [openLogs] = await connection.execute(
      `SELECT el.id, el.check_in_time, v.full_name AS visitor_name, vr.reference_code, vr.building_id
       FROM entry_exit_logs el
       JOIN digital_passes dp ON el.digital_pass_id = dp.id
       JOIN visit_requests vr ON dp.visit_request_id = vr.id
       JOIN visitors v ON vr.visitor_id = v.id
       WHERE el.digital_pass_id = ? AND el.check_out_time IS NULL
       ORDER BY el.id DESC LIMIT 1 FOR UPDATE`,
      [passId]
    );

    if (openLogs.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Invalid Action: No active check-in record found. Visitor is not registered as currently inside.',
      });
    }

    const log = openLogs[0];

    // Enforce checkpoint building permission on departure
    if (securityUser.building_id && securityUser.building_id !== log.building_id) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not authorized to record departure for another building checkpoint.',
      });
    }

    await connection.execute(
      `UPDATE entry_exit_logs 
       SET check_out_time = NOW(), exit_gate = ?, remarks = COALESCE(CONCAT(IFNULL(remarks, ''), ' | Exit remarks: ', ?), remarks)
       WHERE id = ?`,
      [gate.trim(), remarks ? remarks.trim() : 'None', log.id]
    );

    // Mark digital pass as used
    await connection.execute(
      'UPDATE digital_passes SET status = "used" WHERE id = ?',
      [passId]
    );

    // Audit log
    await logAudit({
      userId: securityUserId,
      action: 'GATE_CHECK_OUT',
      targetEntity: 'entry_exit_logs',
      targetId: log.id,
      details: `Officer logged DEPARTURE for visitor ${log.visitor_name} (${log.reference_code}) at gate ${gate}`,
      ipAddress: req.ip || req.socket.remoteAddress,
      connection,
    });

    await connection.commit();
    connection.release();

    return res.status(200).json({
      success: true,
      message: `Departure recorded successfully for ${log.visitor_name}.`,
      data: {
        logId: log.id,
        visitorName: log.visitor_name,
        referenceCode: log.reference_code,
        checkOutTime: new Date().toISOString(),
        gate,
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('checkOut error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record check-out log.',
    });
  }
}

/**
 * GET /api/security/today-logs
 * Retrieves entry and exit activities recorded today.
 */
export async function getTodayLogs(req, res) {
  const securityUser = req.user;

  try {
    let sql = `
      SELECT 
        el.id,
        el.check_in_time,
        el.check_out_time,
        el.entry_gate,
        el.exit_gate,
        el.remarks,
        v.full_name AS visitor_name,
        v.phone AS visitor_phone,
        vr.reference_code,
        vr.purpose,
        b.name AS building_name,
        h.full_name AS host_name,
        s.full_name AS guard_name
      FROM entry_exit_logs el
      JOIN digital_passes dp ON el.digital_pass_id = dp.id
      JOIN visit_requests vr ON dp.visit_request_id = vr.id
      JOIN visitors v ON vr.visitor_id = v.id
      JOIN buildings b ON vr.building_id = b.id
      JOIN users h ON vr.host_user_id = h.id
      JOIN users s ON el.security_user_id = s.id
      WHERE DATE(el.check_in_time) = CURDATE()
    `;

    const params = [];

    if (securityUser.building_id) {
      sql += ' AND vr.building_id = ?';
      params.push(securityUser.building_id);
    }

    sql += ' ORDER BY el.check_in_time DESC';

    const [rows] = await pool.execute(sql, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('getTodayLogs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve today logs.',
    });
  }
}
