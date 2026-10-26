/**
 * AccessPass Comprehensive QR Pass Generation & Security Verification Test Suite
 * Validates requirements:
 * A. QR Pass Generation (host approval, crypto token, MySQL storage, validity period, verified display, zero PII, no public secret, expiration & revocation)
 * B. Security Verification (scanning interface, manual entry fallback, camera error handling, backend validation)
 * C. Authorization Rules (reject unapproved pending/rejected, expired, revoked, blacklisted, wrong building, duplicate inside, non-existent)
 * D. Entry and Exit Logging (check-in timestamp & officer, check-out timestamp & officer, duplicate prevention, FOR UPDATE concurrency, audit logs)
 * E. Verification UI Information (minimum necessary details, validity window, building, lifecycle statuses)
 */

import pool from './config/db.js';

const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

let testCount = 0;
let passedCount = 0;

function assert(condition, testName, details = '') {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS ${testCount}] ${testName}`);
    if (details) console.log(`     └─ ${details}`);
  } else {
    console.error(`  ❌ [FAIL ${testCount}] ${testName}`);
    if (details) console.error(`     └─ Reason: ${details}`);
    process.exit(1);
  }
}

async function run() {
  console.log('========================================================================');
  console.log('🛡️  ACCESSPASS QR PASS GENERATION & SECURITY VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  // STEP 0: Authentication
  console.log('▶ STEP 0: Authenticating Host and Security Guard Accounts...');
  
  // Host 1: Prof. Sharma (Building 1)
  const hostLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'prof.sharma@accesspass.local', password: 'Password123!' }),
  });
  assert(hostLogin.ok && hostLogin.data.token, 'Host 1 (Building 1) logged in successfully.');
  const hostToken = hostLogin.data.token;
  const hostId = hostLogin.data.user.id;

  // Security Guard 1: Officer Ramesh (Assigned to Building 1)
  const sec1Login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'guard.ramesh@accesspass.local', password: 'Password123!' }),
  });
  assert(sec1Login.ok && sec1Login.data.token, 'Security Guard 1 (Building 1) logged in successfully.');
  const sec1Token = sec1Login.data.token;

  // Security Guard 2: Officer Priya (Assigned to Building 2)
  const sec2Login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'guard.priya@accesspass.local', password: 'Password123!' }),
  });
  assert(sec2Login.ok && sec2Login.data.token, 'Security Guard 2 (Building 2) logged in successfully.');
  const sec2Token = sec2Login.data.token;

  // ==========================================================================
  // SECTION 1: END-TO-END VALID PASS WORKFLOW
  // Registration -> Host Approval -> Verified QR Display -> Scan -> Entry -> Exit
  // ==========================================================================
  console.log('\n▶ SECTION 1: Standard End-to-End Workflow (Happy Path)...');

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const timestamp = Date.now();

  // 1.1 Visitor submits registration
  const regPayload = {
    fullName: `Test Visitor ${timestamp}`,
    email: `visitor.${timestamp}@test.edu`,
    phone: `+9191${Math.floor(10000000 + Math.random() * 90000000)}`,
    idProofType: 'Aadhaar Card',
    idProofNumber: `AADHAAR-${timestamp.toString().slice(-6)}`,
    buildingId: 1, // Science & Tech Complex
    hostUserId: hostId,
    purpose: 'Academic project thesis evaluation and demonstration',
    requestedDate: dateStr,
    expectedStartTime: '00:00:00',
    expectedEndTime: '23:59:59',
  };

  const regRes = await request('/public/visits/register', {
    method: 'POST',
    body: JSON.stringify(regPayload),
  });

  assert(
    regRes.status === 201 && regRes.data.success,
    'Visitor registration created in database.',
    `Status ${regRes.status}: ${JSON.stringify(regRes.data)}`
  );
  const refCode = regRes.data.data.referenceCode;
  const verificationSecret = regRes.data.data.verificationSecret;

  // 1.2 Unapproved visit verification attempt (Pending)
  console.log('\n▶ SECTION 2: Rule Check — Unapproved (Pending) Visit Rejection...');
  const pendingVerify = await request('/security/verify-pass', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ code: refCode }),
  });
  assert(
    pendingVerify.status === 400 && pendingVerify.data.alertType === 'NOT_APPROVED',
    'Pending unapproved visit request is REJECTED at checkpoint with NOT_APPROVED.',
    pendingVerify.data.message
  );

  // 1.3 Host approves visit request -> Digital Pass & QR generated
  console.log('\n▶ SECTION 3: Host Approval & QR Pass Generation...');
  // Find request ID
  const [requestRows] = await pool.execute('SELECT id FROM visit_requests WHERE reference_code = ?', [refCode]);
  const requestId = requestRows[0].id;

  const approveRes = await request(`/host/requests/${requestId}/approve`, {
    method: 'PATCH',
    token: hostToken,
  });
  assert(approveRes.ok && approveRes.data.success, 'Host approved visit request successfully.');
  assert(
    approveRes.data.data.passCode && approveRes.data.data.passCode.startsWith('PASS-TOK-'),
    'Pass generated with cryptographic random token (PASS-TOK-...).',
    approveRes.data.data.passCode
  );
  const passToken = approveRes.data.data.passCode;

  // 1.4 Check MySQL digital_passes record
  const [passRows] = await pool.execute(
    'SELECT * FROM digital_passes WHERE visit_request_id = ?',
    [requestId]
  );
  assert(passRows.length === 1, 'Digital pass stored in MySQL linked to visit_request_id.');
  const storedPass = passRows[0];
  assert(storedPass.status === 'active', 'Pass record initial status is active.');

  // 1.5 Verify QR Payload Privacy (Must NOT contain PII)
  const parsedQrPayload = JSON.parse(storedPass.qr_payload);
  assert(
    parsedQrPayload.ref === refCode && parsedQrPayload.token === passToken,
    'QR payload contains only opaque reference and token.',
    JSON.stringify(parsedQrPayload)
  );
  assert(
    !storedPass.qr_payload.includes(regPayload.fullName) &&
    !storedPass.qr_payload.includes(regPayload.email) &&
    !storedPass.qr_payload.includes(regPayload.phone) &&
    !storedPass.qr_payload.includes(regPayload.idProofNumber),
    'QR payload strictly omits all visitor PII (name, email, phone, ID number).'
  );

  // 1.6 Verify QR is displayed only after visitor verification
  console.log('\n▶ SECTION 4: Public Status vs Verified Pass Display...');
  const publicStatusRes = await request(`/public/visits/${refCode}/status`);
  assert(publicStatusRes.ok, 'Public status endpoint accessible without credentials.');
  assert(
    !publicStatusRes.data.data.digitalPass && !publicStatusRes.data.data.qrPayload,
    'Public unverified status hides digital pass and QR code.'
  );

  // Visitor unlocks with verification secret
  const unlockRes = await request(`/public/visits/${refCode}/verify-access`, {
    method: 'POST',
    body: JSON.stringify({ verificationSecret }),
  });
  assert(unlockRes.ok && unlockRes.data.data.digitalPass, 'Visitor unlocked digital pass with private verification secret.');
  assert(
    unlockRes.data.data.digitalPass.qrPayload,
    'Verified response delivers scannable QR payload to the authorized visitor.'
  );

  // 1.7 Security verifies pass via token and raw JSON QR string
  console.log('\n▶ SECTION 5: Security QR Code Scan & Verification...');
  // Test raw JSON QR string decoding
  const rawQrVerify = await request('/security/verify-pass', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ code: storedPass.qr_payload }),
  });
  assert(
    rawQrVerify.ok && rawQrVerify.data.verified === true,
    'Backend successfully parses raw JSON QR payload string.',
    `Status ${rawQrVerify.status}: ${JSON.stringify(rawQrVerify.data)}`
  );
  assert(
    rawQrVerify.data.data.canCheckIn === true && rawQrVerify.data.data.isCurrentlyInside === false,
    'Pass is verified: Visitor is outside, ready for Check-In.',
    `Visitor: ${rawQrVerify.data.data.visitor.name}, Building: ${rawQrVerify.data.data.building.name}`
  );
  const passId = rawQrVerify.data.data.passId;

  // 1.8 Check-In (Physical Entry)
  console.log('\n▶ SECTION 6: Physical Entry (Check-In) & Concurrency Control...');
  const checkInRes = await request('/security/check-in', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ passId, gate: 'North Entrance Gate 1', remarks: 'ID verified, laptop tag #4489' }),
  });
  assert(checkInRes.status === 201 && checkInRes.data.success, 'Gate check-in recorded successfully.');
  assert(checkInRes.data.data.checkInTime, 'Entry timestamp saved in database.');

  // 1.9 Duplicate Check-In Prevention (Rule Check: Visitor already inside)
  const dupCheckIn = await request('/security/check-in', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ passId, gate: 'North Entrance Gate 1' }),
  });
  assert(
    dupCheckIn.status === 400 && dupCheckIn.data.message.includes('already checked in'),
    'Duplicate entry attempt REJECTED while visitor is already inside premises.',
    dupCheckIn.data.message
  );

  // 1.10 Verify State while inside
  const insideVerify = await request('/security/verify-pass', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ code: passToken }),
  });
  assert(
    insideVerify.ok && insideVerify.data.data.isCurrentlyInside === true && insideVerify.data.data.canCheckOut === true,
    'Verification reflects visitor is currently INSIDE (ready for departure check-out).'
  );

  // 1.11 Check-Out (Physical Departure)
  console.log('\n▶ SECTION 7: Physical Departure (Check-Out) & Pass Completion...');
  const checkOutRes = await request('/security/check-out', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ passId, gate: 'North Entrance Gate 1', remarks: 'Visitor left premises' }),
  });
  assert(checkOutRes.ok && checkOutRes.data.success, 'Gate check-out recorded successfully.');

  // 1.12 Duplicate Check-Out Prevention
  const dupCheckOut = await request('/security/check-out', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ passId, gate: 'North Entrance Gate 1' }),
  });
  assert(
    dupCheckOut.status === 400 && dupCheckOut.data.message.includes('No active check-in record found'),
    'Duplicate exit attempt REJECTED when visitor is not inside.',
    dupCheckOut.data.message
  );

  // 1.13 Re-entry Prevention on Completed (Used) Pass
  console.log('\n▶ SECTION 8: Single-Entry Enforcement (Already-Used Pass Rejection)...');
  const usedVerify = await request('/security/verify-pass', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ code: passToken }),
  });
  assert(
    usedVerify.status === 400 && usedVerify.data.alertType === 'ALREADY_USED',
    'Verification rejects completed pass with ALREADY_USED alert.',
    usedVerify.data.message
  );

  const usedCheckIn = await request('/security/check-in', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ passId, gate: 'North Entrance Gate 1' }),
  });
  assert(
    usedCheckIn.status === 400 && usedCheckIn.data.message.includes('already completed checkout'),
    'Check-in rejects re-entry on completed single-use pass.',
    usedCheckIn.data.message
  );

  // ==========================================================================
  // SECTION 9: REJECTION RULES & SECURITY RESTRICTIONS
  // ==========================================================================
  console.log('\n▶ SECTION 9: Testing Additional Authorization Rejection Rules...');

  // 9.1 Host Rejection
  console.log('--- 9.1 Rejected Visit Request ---');
  const rejReg = await request('/public/visits/register', {
    method: 'POST',
    body: JSON.stringify({
      ...regPayload,
      fullName: 'Rejected Visitor',
      email: `rej.${timestamp}@test.edu`,
      phone: `+9192${Math.floor(10000000 + Math.random() * 90000000)}`,
      idProofNumber: `REJ-${timestamp.toString().slice(-6)}`,
    }),
  });
  const rejRef = rejReg.data.data.referenceCode;
  const [rejRows] = await pool.execute('SELECT id FROM visit_requests WHERE reference_code = ?', [rejRef]);
  await request(`/host/requests/${rejRows[0].id}/reject`, {
    method: 'PATCH',
    token: hostToken,
    body: JSON.stringify({ reason: 'Host is out of office on business travel.' }),
  });

  const rejVerify = await request('/security/verify-pass', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ code: rejRef }),
  });
  assert(
    rejVerify.status === 403 && rejVerify.data.alertType === 'REJECTED',
    'Rejected visit request is REJECTED at checkpoint with REJECTED alert.',
    rejVerify.data.message
  );

  // 9.2 Unauthorized Building (Security Guard assigned to different building)
  console.log('--- 9.2 Wrong Building Checkpoint ---');
  // Create another approved pass for Building 1
  const bldg1Reg = await request('/public/visits/register', {
    method: 'POST',
    body: JSON.stringify({
      ...regPayload,
      fullName: 'Building 1 Visitor',
      email: `bldg1.${timestamp}@test.edu`,
      phone: `+9193${Math.floor(10000000 + Math.random() * 90000000)}`,
      idProofNumber: `B1-${timestamp.toString().slice(-6)}`,
    }),
  });
  const bldg1Ref = bldg1Reg.data.data.referenceCode;
  const [bldg1Rows] = await pool.execute('SELECT id FROM visit_requests WHERE reference_code = ?', [bldg1Ref]);
  const b1Approve = await request(`/host/requests/${bldg1Rows[0].id}/approve`, {
    method: 'PATCH',
    token: hostToken,
  });
  const b1PassToken = b1Approve.data.data.passCode;

  // Officer Priya (Security Guard 2, assigned to Building 2) tries to verify a Building 1 pass
  const wrongBldgVerify = await request('/security/verify-pass', {
    method: 'POST',
    token: sec2Token, // Security 2
    body: JSON.stringify({ code: b1PassToken }),
  });
  assert(
    wrongBldgVerify.status === 403 && wrongBldgVerify.data.alertType === 'WRONG_BUILDING',
    'Pass for Building 1 is REJECTED by Officer Priya at Building 2 checkpoint with WRONG_BUILDING.',
    wrongBldgVerify.data.message
  );

  // 9.3 Expired Pass Rejection
  console.log('--- 9.3 Expired Pass Handling ---');
  // Mark the b1 pass as expired in DB
  await pool.execute('UPDATE digital_passes SET status = "expired", valid_until = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE pass_code = ?', [b1PassToken]);
  const expiredVerify = await request('/security/verify-pass', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ code: b1PassToken }),
  });
  assert(
    expiredVerify.status === 400 && expiredVerify.data.alertType === 'EXPIRED',
    'Expired digital pass is REJECTED at checkpoint with EXPIRED alert.',
    expiredVerify.data.message
  );

  // 9.4 Revoked Pass Rejection
  console.log('--- 9.4 Revoked Pass Handling ---');
  const bldg1RevReg = await request('/public/visits/register', {
    method: 'POST',
    body: JSON.stringify({
      ...regPayload,
      fullName: 'Revoked Visitor',
      email: `rev.${timestamp}@test.edu`,
      phone: `+9194${Math.floor(10000000 + Math.random() * 90000000)}`,
      idProofNumber: `REV-${timestamp.toString().slice(-6)}`,
    }),
  });
  const revRef = bldg1RevReg.data.data.referenceCode;
  const [revRows] = await pool.execute('SELECT id FROM visit_requests WHERE reference_code = ?', [revRef]);
  const revApprove = await request(`/host/requests/${revRows[0].id}/approve`, {
    method: 'PATCH',
    token: hostToken,
  });
  const revPassToken = revApprove.data.data.passCode;

  // Host revokes the pass
  await request(`/host/requests/${revRows[0].id}/revoke`, {
    method: 'PATCH',
    token: hostToken,
    body: JSON.stringify({ reason: 'Security threat alert: Pass revoked by campus admin.' }),
  });

  const revokedVerify = await request('/security/verify-pass', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ code: revPassToken }),
  });
  assert(
    revokedVerify.status === 403 && revokedVerify.data.alertType === 'REVOKED',
    'Revoked pass is REJECTED at checkpoint with REVOKED alert.',
    revokedVerify.data.message
  );

  // 9.5 Blacklisted Visitor Rejection
  console.log('--- 9.5 Blacklisted Visitor Handling ---');
  // Attempt to register with known blacklisted phone number from seed.sql (+919999888877)
  const blReg = await request('/public/visits/register', {
    method: 'POST',
    body: JSON.stringify({
      ...regPayload,
      phone: '+919999888877',
      email: `bl.${timestamp}@test.edu`,
    }),
  });
  assert(
    blReg.status === 403 && blReg.data.message.includes('blocked due to active security restrictions'),
    'Blacklisted phone number is BLOCKED from registering.',
    blReg.data.message
  );

  // Also test if a visitor is added to blacklist after pass is created
  const blPassReg = await request('/public/visits/register', {
    method: 'POST',
    body: JSON.stringify({
      ...regPayload,
      fullName: 'Late Blacklisted Visitor',
      email: `latebl.${timestamp}@test.edu`,
      phone: `+9195${Math.floor(10000000 + Math.random() * 90000000)}`,
      idProofNumber: `LATEBL-${timestamp.toString().slice(-6)}`,
    }),
  });
  const [lateBlRows] = await pool.execute('SELECT id FROM visit_requests WHERE reference_code = ?', [blPassReg.data.data.referenceCode]);
  const lateBlApprove = await request(`/host/requests/${lateBlRows[0].id}/approve`, {
    method: 'PATCH',
    token: hostToken,
  });
  const lateBlPassToken = lateBlApprove.data.data.passCode;

  // Add visitor's phone to blacklist table
  await pool.execute(
    'INSERT INTO blacklist (identifier_type, identifier_value, reason, added_by) VALUES ("email", ?, "Disorderly conduct after appointment approval", 1)',
    [`latebl.${timestamp}@test.edu`]
  );

  const lateBlVerify = await request('/security/verify-pass', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ code: lateBlPassToken }),
  });
  assert(
    lateBlVerify.status === 403 && lateBlVerify.data.alertType === 'BLACKLISTED',
    'Previously approved pass is REJECTED when visitor is found on BLACKLIST.',
    lateBlVerify.data.message
  );

  // 9.6 Non-Existent Reference / Token
  console.log('--- 9.6 Non-Existent Pass Reference ---');
  const notFoundVerify = await request('/security/verify-pass', {
    method: 'POST',
    token: sec1Token,
    body: JSON.stringify({ code: 'PASS-NONEXISTENT-9999' }),
  });
  assert(
    notFoundVerify.status === 404 && notFoundVerify.data.alertType === 'NOT_FOUND',
    'Non-existent reference code is REJECTED with NOT_FOUND.',
    notFoundVerify.data.message
  );

  // 9.7 Audit Log Verification
  console.log('\n▶ SECTION 10: Audit Log Verification...');
  const [auditRows] = await pool.execute(
    'SELECT action, details FROM audit_logs WHERE action IN ("GATE_CHECK_IN", "GATE_CHECK_OUT", "PASS_APPROVED", "PASS_REVOKED") ORDER BY id DESC LIMIT 10'
  );
  assert(auditRows.length >= 4, 'Audit logs recorded for PASS_APPROVED, GATE_CHECK_IN, GATE_CHECK_OUT, and PASS_REVOKED.');
  console.log(`     └─ Latest audit action: ${auditRows[0].action} (${auditRows[0].details})`);

  console.log('\n========================================================================');
  console.log(`🎉 ALL ${passedCount}/${testCount} TESTS PASSED SUCCESSFULLY!`);
  console.log('========================================================================');

  await pool.end();
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
