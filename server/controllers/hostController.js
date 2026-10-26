import crypto from 'crypto';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * GET /api/host/requests
 * Retrieves visitor requests assigned to the logged-in host.
 * Supports filtering by status (?status=pending|approved|rejected).
 */
export async function getHostRequests(req, res) {
  const hostId = req.user.id;
  const { status } = req.query;

  try {
    let sql = `
      SELECT 
        vr.id,
        vr.reference_code,
        vr.purpose,
        vr.requested_date,
        vr.expected_start_time,
        vr.expected_end_time,
        vr.status,
        vr.rejection_reason,
        vr.created_at,
        v.full_name AS visitor_name,
        v.email AS visitor_email,
        v.phone AS visitor_phone,
        v.id_proof_type,
        v.id_proof_number,
        b.name AS building_name,
        dp.pass_code,
        dp.valid_until,
        dp.status AS pass_status
      FROM visit_requests vr
      JOIN visitors v ON vr.visitor_id = v.id
      JOIN buildings b ON vr.building_id = b.id
      LEFT JOIN digital_passes dp ON dp.visit_request_id = vr.id
      WHERE (vr.host_user_id = ? OR ? = 'admin')
    `;

    const params = [hostId, req.user.role];

    if (status) {
      sql += ' AND vr.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY vr.requested_date DESC, vr.expected_start_time ASC';

    const [rows] = await pool.execute(sql, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('getHostRequests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve host visit requests.',
    });
  }
}

/**
 * PATCH /api/host/requests/:id/approve
 * Approves a pending visit request and generates a digital pass with a cryptographic QR token.
 * Prevents hosts from approving requests assigned to other hosts.
 */
export async function approveRequest(req, res) {
  const requestId = Number(req.params.id);
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  if (!requestId) {
    return res.status(400).json({ success: false, message: 'Invalid request ID.' });
  }

  const connection = await pool.getConnection();

  try {
    // 1. Fetch target visit request
    const [requests] = await connection.execute(
      `SELECT vr.*, v.full_name AS visitor_name, b.name AS building_name, b.code AS building_code
       FROM visit_requests vr
       JOIN visitors v ON vr.visitor_id = v.id
       JOIN buildings b ON vr.building_id = b.id
       WHERE vr.id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Visit request not found.' });
    }

    const request = requests[0];

    // 2. Strict Permission Guard: Prevent hosts from approving requests assigned to other hosts
    if (request.host_user_id !== currentUserId && currentUserRole !== 'admin') {
      connection.release();
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to approve requests assigned to another host.',
      });
    }

    // 3. State Guard: Only pending requests can be approved
    if (request.status !== 'pending') {
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Cannot approve request: This visit is already marked as '${request.status}'.`,
      });
    }

    // 4. Begin Database Transaction
    await connection.beginTransaction();

    // Update visit request state
    await connection.execute(
      `UPDATE visit_requests 
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = NULL
       WHERE id = ?`,
      [currentUserId, requestId]
    );

    // Compute activation and expiration window
    // Format date string safely using local date components to avoid UTC timezone shifts
    const reqDate = new Date(request.requested_date);
    const dateStr = typeof request.requested_date === 'string' 
      ? request.requested_date.split('T')[0]
      : `${reqDate.getFullYear()}-${String(reqDate.getMonth() + 1).padStart(2, '0')}-${String(reqDate.getDate()).padStart(2, '0')}`;
    const validFrom = `${dateStr} ${request.expected_start_time}`;
    const validUntil = `${dateStr} ${request.expected_end_time}`;

    // Generate random secure pass token (16-byte hex)
    const passToken = `PASS-TOK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // Payload stored in QR code for security gate reader:
    // PRIVACY NOTICE: Must strictly contain only the secure token / ref code.
    // Never expose visitor full name, email, or personal details in raw QR data.
    const qrPayload = JSON.stringify({
      ref: request.reference_code,
      token: passToken,
    });

    // Insert digital pass
    const [passResult] = await connection.execute(
      `INSERT INTO digital_passes (visit_request_id, pass_code, valid_from, valid_until, status, qr_payload)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [requestId, passToken, validFrom, validUntil, qrPayload]
    );

    // Record audit log
    await logAudit({
      userId: currentUserId,
      action: 'PASS_APPROVED',
      targetEntity: 'digital_passes',
      targetId: passResult.insertId,
      details: `Host approved visit request ${request.reference_code} for ${request.visitor_name}`,
      ipAddress: req.ip || req.socket.remoteAddress,
      connection,
    });

    await connection.commit();
    connection.release();

    return res.status(200).json({
      success: true,
      message: 'Visit request approved successfully and digital pass issued.',
      data: {
        requestId,
        referenceCode: request.reference_code,
        passCode: passToken,
        validFrom,
        validUntil,
        status: 'approved',
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('approveRequest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve visit request due to an internal server error.',
    });
  }
}

/**
 * PATCH /api/host/requests/:id/reject
 * Rejects a visit request with an explanation reason.
 * Prevents hosts from rejecting requests assigned to other hosts.
 */
export async function rejectRequest(req, res) {
  const requestId = Number(req.params.id);
  const { reason } = req.body;
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  if (!requestId) {
    return res.status(400).json({ success: false, message: 'Invalid request ID.' });
  }

  const rejectionReason = (reason || 'No specific reason provided by host.').trim();

  try {
    const [requests] = await pool.execute(
      'SELECT id, host_user_id, status, reference_code FROM visit_requests WHERE id = ?',
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Visit request not found.' });
    }

    const request = requests[0];

    // Strict Permission Guard
    if (request.host_user_id !== currentUserId && currentUserRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to reject requests assigned to another host.',
      });
    }

    // State Guard
    if (request.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject a request that has already been approved and issued a pass.',
      });
    }

    // Update status to rejected
    await pool.execute(
      `UPDATE visit_requests 
       SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [rejectionReason, currentUserId, requestId]
    );

    // Audit log
    await logAudit({
      userId: currentUserId,
      action: 'PASS_REJECTED',
      targetEntity: 'visit_requests',
      targetId: requestId,
      details: `Host rejected visit ${request.reference_code}. Reason: ${rejectionReason}`,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      message: 'Visit request has been rejected.',
      data: {
        requestId,
        referenceCode: request.reference_code,
        status: 'rejected',
        reason: rejectionReason,
      },
    });
  } catch (error) {
    console.error('rejectRequest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject visit request.',
    });
  }
}

/**
 * PATCH /api/host/requests/:id/revoke
 * Revokes an issued digital pass (can be invoked by host or admin).
 */
export async function revokeRequest(req, res) {
  const requestId = Number(req.params.id);
  const { reason = 'Revoked by authorized personnel' } = req.body;
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  if (!requestId) {
    return res.status(400).json({ success: false, message: 'Invalid request ID.' });
  }

  const connection = await pool.getConnection();

  try {
    const [requests] = await connection.execute(
      `SELECT vr.*, dp.id AS pass_id, dp.status AS pass_status, v.full_name AS visitor_name
       FROM visit_requests vr
       LEFT JOIN digital_passes dp ON dp.visit_request_id = vr.id
       JOIN visitors v ON vr.visitor_id = v.id
       WHERE vr.id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Visit request not found.' });
    }

    const request = requests[0];

    // Permission Guard
    if (request.host_user_id !== currentUserId && currentUserRole !== 'admin') {
      connection.release();
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to revoke passes assigned to another host.',
      });
    }

    if (!request.pass_id) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'No digital pass has been issued for this request to revoke.',
      });
    }

    if (request.pass_status === 'revoked') {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'This pass has already been revoked.',
      });
    }

    await connection.beginTransaction();

    await connection.execute(
      'UPDATE digital_passes SET status = "revoked" WHERE id = ?',
      [request.pass_id]
    );

    // Audit log
    await logAudit({
      userId: currentUserId,
      action: 'PASS_REVOKED',
      targetEntity: 'digital_passes',
      targetId: request.pass_id,
      details: `Revoked pass for ${request.visitor_name} (${request.reference_code}). Reason: ${reason}`,
      ipAddress: req.ip || req.socket.remoteAddress,
      connection,
    });

    await connection.commit();
    connection.release();

    return res.status(200).json({
      success: true,
      message: 'Digital pass has been revoked successfully.',
      data: {
        requestId,
        referenceCode: request.reference_code,
        status: 'revoked',
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('revokeRequest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke pass.',
    });
  }
}

