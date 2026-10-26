import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * GET /api/admin/stats
 * Overview numbers for the Admin dashboard summary cards.
 */
export async function getStats(req, res) {
  try {
    const [[todayVisits]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM visit_requests WHERE requested_date = CURDATE()'
    );

    const [[pendingVisits]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM visit_requests WHERE status = "pending"'
    );

    const [[currentlyInside]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM entry_exit_logs WHERE check_out_time IS NULL'
    );

    const [[blacklistedCount]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM blacklist'
    );

    const [[activeStaffCount]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM users WHERE is_active = 1'
    );

    const [[buildingsCount]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM buildings WHERE is_active = 1'
    );

    return res.status(200).json({
      success: true,
      data: {
        todayVisits: todayVisits.count,
        pendingVisits: pendingVisits.count,
        currentlyInside: currentlyInside.count,
        blacklistedCount: blacklistedCount.count,
        activeStaffCount: activeStaffCount.count,
        buildingsCount: buildingsCount.count,
      },
    });
  } catch (error) {
    console.error('getStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin stats.' });
  }
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function getUsers(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.full_name, u.staff_id, u.email, u.role, u.building_id, u.phone, u.is_active, 
              u.approval_status, u.requested_role, u.created_at, b.name AS building_name
       FROM users u
       LEFT JOIN buildings b ON u.building_id = b.id
       ORDER BY (u.approval_status = 'pending') DESC, u.created_at DESC`
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
}

export async function createUser(req, res) {
  const { fullName, email, password, role, buildingId, phone, staffId } = req.body;

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Full name, email, password, and role are required.',
    });
  }

  if (!['admin', 'host', 'security'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role specified.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? String(phone).trim() : null;
    const cleanStaffId = staffId ? String(staffId).trim().toUpperCase() : null;

    // 1. Independent duplicate check: Email
    const [existingEmail] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        field: 'email',
        message: 'A staff account with this email address already exists. Please use a unique email.',
      });
    }

    // 2. Independent duplicate check: Phone
    if (cleanPhone) {
      const [existingPhone] = await pool.execute('SELECT id FROM users WHERE phone = ? LIMIT 1', [cleanPhone]);
      if (existingPhone.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'phone',
          message: 'A staff account with this phone number already exists. Please use a unique phone number.',
        });
      }
    }

    // 3. Independent duplicate check: Staff ID
    if (cleanStaffId) {
      const [existingStaffId] = await pool.execute('SELECT id FROM users WHERE staff_id = ? LIMIT 1', [cleanStaffId]);
      if (existingStaffId.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'staffId',
          message: 'A staff account with this Staff ID already exists. Please assign a unique Staff ID.',
        });
      }
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, staff_id, email, password_hash, role, building_id, phone, is_active, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'approved')`,
      [
        fullName.trim(),
        cleanStaffId,
        cleanEmail,
        passwordHash,
        role,
        buildingId ? Number(buildingId) : null,
        cleanPhone,
      ]
    );

    await logAudit({
      userId: req.user.id,
      action: 'USER_CREATED',
      targetEntity: 'users',
      targetId: result.insertId,
      details: `Created new staff user ${cleanEmail} (Staff ID: ${cleanStaffId || 'N/A'}) with role ${role}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Staff account created successfully.',
      userId: result.insertId,
      data: {
        id: result.insertId,
        fullName: fullName.trim(),
        email: cleanEmail,
        staffId: cleanStaffId,
        role,
        approvalStatus: 'approved',
        isActive: 1,
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
    console.error('createUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user account.' });
  }
}

export async function updateUser(req, res) {
  const userId = Number(req.params.id);
  const { fullName, role, buildingId, phone, staffId, isActive, password } = req.body;

  try {
    const [users] = await pool.execute('SELECT id, email, phone, staff_id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const cleanPhone = phone ? String(phone).trim() : null;
    const cleanStaffId = staffId ? String(staffId).trim().toUpperCase() : null;

    // Independent duplicate phone check if modified
    if (cleanPhone && cleanPhone !== users[0].phone) {
      const [existingPhone] = await pool.execute(
        'SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1',
        [cleanPhone, userId]
      );
      if (existingPhone.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'phone',
          message: 'Another staff account is already using this phone number.',
        });
      }
    }

    // Independent duplicate staffId check if modified
    if (cleanStaffId && cleanStaffId !== users[0].staff_id) {
      const [existingStaffId] = await pool.execute(
        'SELECT id FROM users WHERE staff_id = ? AND id != ? LIMIT 1',
        [cleanStaffId, userId]
      );
      if (existingStaffId.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'staffId',
          message: 'Another staff account is already using this Staff ID.',
        });
      }
    }

    let sql = `UPDATE users SET full_name = ?, role = ?, building_id = ?, phone = ?, staff_id = ?, is_active = ?`;
    const params = [
      fullName.trim(),
      role,
      buildingId ? Number(buildingId) : null,
      cleanPhone,
      cleanStaffId,
      isActive === undefined ? 1 : (isActive ? 1 : 0),
    ];

    if (password && password.trim().length >= 6) {
      const hash = await bcrypt.hash(password.trim(), 10);
      sql += `, password_hash = ?`;
      params.push(hash);
    }

    sql += ` WHERE id = ?`;
    params.push(userId);

    await pool.execute(sql, params);

    await logAudit({
      userId: req.user.id,
      action: 'USER_UPDATED',
      targetEntity: 'users',
      targetId: userId,
      details: `Updated user profile for ID ${userId} (Role: ${role})`,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    console.error('updateUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
}

/**
 * PATCH /api/admin/users/:id/approve
 * Approves a pending staff registration request and sets their authorized role & facility.
 */
export async function approveStaffUser(req, res) {
  const userId = Number(req.params.id);
  const { role, buildingId } = req.body;

  try {
    const [users] = await pool.execute(
      'SELECT id, full_name, email, role, requested_role, building_id, approval_status FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff user account not found.' });
    }

    const targetUser = users[0];

    // Determine final role assigned by administrator
    const finalRole = role || targetUser.requested_role || targetUser.role || 'host';
    if (!['admin', 'host', 'security'].includes(finalRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role assigned.' });
    }

    const finalBuildingId = buildingId !== undefined 
      ? (buildingId ? Number(buildingId) : null) 
      : targetUser.building_id;

    await pool.execute(
      `UPDATE users 
       SET approval_status = 'approved', is_active = 1, role = ?, building_id = ?
       WHERE id = ?`,
      [finalRole, finalBuildingId, userId]
    );

    await logAudit({
      userId: req.user.id,
      action: 'STAFF_REGISTRATION_APPROVED',
      targetEntity: 'users',
      targetId: userId,
      details: `Admin approved staff registration for ${targetUser.email} with final role ${finalRole}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Staff registration for ${targetUser.full_name} has been approved and activated as ${finalRole}.`,
      data: {
        id: userId,
        role: finalRole,
        buildingId: finalBuildingId,
        approvalStatus: 'approved',
        isActive: 1,
      },
    });
  } catch (error) {
    console.error('approveStaffUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve staff user.' });
  }
}

/**
 * PATCH /api/admin/users/:id/reject
 * Declines a pending staff registration request.
 */
export async function rejectStaffUser(req, res) {
  const userId = Number(req.params.id);
  const { reason } = req.body;

  try {
    const [users] = await pool.execute(
      'SELECT id, full_name, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff user account not found.' });
    }

    const targetUser = users[0];

    await pool.execute(
      `UPDATE users 
       SET approval_status = 'rejected', is_active = 0
       WHERE id = ?`,
      [userId]
    );

    await logAudit({
      userId: req.user.id,
      action: 'STAFF_REGISTRATION_REJECTED',
      targetEntity: 'users',
      targetId: userId,
      details: `Admin rejected staff registration for ${targetUser.email}. Reason: ${reason || 'Declined by administrator'}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Staff registration request for ${targetUser.full_name} has been declined.`,
      data: {
        id: userId,
        approvalStatus: 'rejected',
        isActive: 0,
      },
    });
  } catch (error) {
    console.error('rejectStaffUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject staff user.' });
  }
}

export async function deleteUser(req, res) {
  const userId = Number(req.params.id);

  if (userId === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot deactivate your own admin account.' });
  }

  try {
    // Soft-deactivate to preserve foreign key references in past visits
    await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);

    await logAudit({
      userId: req.user.id,
      action: 'USER_DEACTIVATED',
      targetEntity: 'users',
      targetId: userId,
      details: `Deactivated user account ID ${userId}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: 'User account deactivated.' });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to deactivate user.' });
  }
}

// ============================================================================
// BUILDING MANAGEMENT
// ============================================================================

export async function getBuildings(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM buildings ORDER BY name ASC');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getBuildings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve buildings.' });
  }
}

export async function createBuilding(req, res) {
  const { name, code, address } = req.body;

  if (!name || !code) {
    return res.status(400).json({ success: false, message: 'Building name and code are required.' });
  }

  try {
    const cleanCode = code.trim().toUpperCase();

    const [existing] = await pool.execute('SELECT id FROM buildings WHERE code = ?', [cleanCode]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Building code already in use.' });
    }

    const [result] = await pool.execute(
      'INSERT INTO buildings (name, code, address, is_active) VALUES (?, ?, ?, 1)',
      [name.trim(), cleanCode, address ? address.trim() : null]
    );

    await logAudit({
      userId: req.user.id,
      action: 'BUILDING_CREATED',
      targetEntity: 'buildings',
      targetId: result.insertId,
      details: `Added new building ${name} (${cleanCode})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, message: 'Building created successfully.', buildingId: result.insertId });
  } catch (error) {
    console.error('createBuilding error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create building.' });
  }
}

export async function updateBuilding(req, res) {
  const buildingId = Number(req.params.id);
  const { name, code, address, isActive } = req.body;

  try {
    await pool.execute(
      `UPDATE buildings 
       SET name = ?, code = ?, address = ?, is_active = ?
       WHERE id = ?`,
      [name.trim(), code.trim().toUpperCase(), address ? address.trim() : null, isActive ? 1 : 0, buildingId]
    );

    await logAudit({
      userId: req.user.id,
      action: 'BUILDING_UPDATED',
      targetEntity: 'buildings',
      targetId: buildingId,
      details: `Updated building ID ${buildingId}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: 'Building updated successfully.' });
  } catch (error) {
    console.error('updateBuilding error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update building.' });
  }
}

// ============================================================================
// BLACKLIST MANAGEMENT
// ============================================================================

export async function getBlacklist(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT bl.id, bl.identifier_type, bl.identifier_value, bl.reason, bl.created_at, u.full_name AS added_by_name
       FROM blacklist bl
       LEFT JOIN users u ON bl.added_by = u.id
       ORDER BY bl.created_at DESC`
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getBlacklist error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve blacklist.' });
  }
}

export async function addBlacklist(req, res) {
  const { identifierType, identifierValue, reason } = req.body;

  if (!identifierType || !identifierValue || !reason) {
    return res.status(400).json({
      success: false,
      message: 'identifierType (email|phone|id_proof), identifierValue, and reason are required.',
    });
  }

  try {
    const cleanValue = identifierValue.trim();

    const [result] = await pool.execute(
      `INSERT INTO blacklist (identifier_type, identifier_value, reason, added_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
      [identifierType, cleanValue, reason.trim(), req.user.id]
    );

    await logAudit({
      userId: req.user.id,
      action: 'BLACKLIST_ADDED',
      targetEntity: 'blacklist',
      targetId: result.insertId,
      details: `Blacklisted ${identifierType}: ${cleanValue}. Reason: ${reason}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, message: 'Blacklist entry saved.' });
  } catch (error) {
    console.error('addBlacklist error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save blacklist entry.' });
  }
}

export async function removeBlacklist(req, res) {
  const id = Number(req.params.id);

  try {
    await pool.execute('DELETE FROM blacklist WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      action: 'BLACKLIST_REMOVED',
      targetEntity: 'blacklist',
      targetId: id,
      details: `Removed blacklist entry ID ${id}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: 'Blacklist entry removed.' });
  } catch (error) {
    console.error('removeBlacklist error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete blacklist entry.' });
  }
}

// ============================================================================
// AUDIT LOGS & REPORT EXPORT
// ============================================================================

export async function getAuditLogs(req, res) {
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    const [rows] = await pool.execute(
      `SELECT al.id, al.action, al.target_entity, al.target_id, al.details, al.ip_address, al.created_at, u.full_name AS user_name, u.role AS user_role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT ${limit}`
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve audit trail.' });
  }
}

/**
 * GET /api/admin/reports/visits-csv
 * Exports the complete visit registry as a downloadable CSV spreadsheet.
 */
export async function exportVisitsCSV(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT 
         vr.reference_code,
         v.full_name AS visitor_name,
         v.phone AS visitor_phone,
         v.email AS visitor_email,
         b.name AS building_name,
         h.full_name AS host_name,
         vr.purpose,
         vr.requested_date,
         vr.status,
         el.check_in_time,
         el.check_out_time
       FROM visit_requests vr
       JOIN visitors v ON vr.visitor_id = v.id
       JOIN buildings b ON vr.building_id = b.id
       JOIN users h ON vr.host_user_id = h.id
       LEFT JOIN digital_passes dp ON dp.visit_request_id = vr.id
       LEFT JOIN entry_exit_logs el ON el.digital_pass_id = dp.id
       ORDER BY vr.requested_date DESC, vr.id DESC`
    );

    // Build CSV Content
    const headers = [
      'Reference Code',
      'Visitor Name',
      'Phone',
      'Email',
      'Building',
      'Host Name',
      'Purpose',
      'Visit Date',
      'Status',
      'Check-In Time',
      'Check-Out Time',
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const csvLines = [headers.join(',')];
    for (const r of rows) {
      csvLines.push(
        [
          escapeCsv(r.reference_code),
          escapeCsv(r.visitor_name),
          escapeCsv(r.visitor_phone),
          escapeCsv(r.visitor_email),
          escapeCsv(r.building_name),
          escapeCsv(r.host_name),
          escapeCsv(r.purpose),
          escapeCsv(r.requested_date ? new Date(r.requested_date).toISOString().split('T')[0] : ''),
          escapeCsv(r.status),
          escapeCsv(r.check_in_time ? new Date(r.check_in_time).toISOString().replace('T', ' ').substring(0, 19) : ''),
          escapeCsv(r.check_out_time ? new Date(r.check_out_time).toISOString().replace('T', ' ').substring(0, 19) : ''),
        ].join(',')
      );
    }

    const csvContent = csvLines.join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="accesspass_visits_report.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('exportVisitsCSV error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate CSV export.' });
  }
}
