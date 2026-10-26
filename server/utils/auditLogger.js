import pool from '../config/db.js';

/**
 * Helper to record administrative, security, and lifecycle operations in audit_logs.
 * Accepts either a pool or an active transaction connection.
 * 
 * @param {Object} params
 * @param {number|null} [params.userId] - The ID of the authenticated user performing the action
 * @param {string} params.action - Action identifier (e.g. 'LOGIN_SUCCESS', 'VISIT_APPROVED')
 * @param {string} params.targetEntity - Table or entity name (e.g. 'visit_requests', 'users')
 * @param {number|null} [params.targetId] - Primary key of the affected record
 * @param {string|Object|null} [params.details] - Human-readable explanation or JSON metadata
 * @param {string|null} [params.ipAddress] - Client IP address
 * @param {Object|null} [params.connection] - Optional MySQL connection if inside a transaction
 */
export async function logAudit({
  userId = null,
  action,
  targetEntity,
  targetId = null,
  details = null,
  ipAddress = null,
  connection = null,
}) {
  const db = connection || pool;
  const sql = `
    INSERT INTO audit_logs (user_id, action, target_entity, target_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const detailsString = typeof details === 'object' ? JSON.stringify(details) : details;

  try {
    await db.execute(sql, [
      userId,
      action,
      targetEntity,
      targetId,
      detailsString,
      ipAddress || '127.0.0.1',
    ]);
  } catch (error) {
    // Audit log failures should not crash the primary transaction, but should be logged to stderr
    console.error(`⚠️ Failed to record audit log (${action}):`, error.message);
  }
}
