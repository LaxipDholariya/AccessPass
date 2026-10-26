/**
 * AccessPass Verification Workflow Test Suite
 * Tests the enhanced visitor privacy & verification architecture:
 * 1. Valid Registration & Secret Generation (plain secret returned once, stored as bcrypt hash)
 * 2. Unauthorized Details Access (Public lookup hides PII, visitor data & QR pass)
 * 3. Invalid Secrets (Generic 401 error, no enumeration)
 * 4. Valid Verification & Digital Pass Access (Unlocked QR code & personal details)
 * 5. Cross-Visitor Isolation (Secrets cannot unlock another visitor's pass)
 * 6. Repeated Attempts Rate Limiting (5 failures lock out with HTTP 429)
 */

import pool from './config/db.js';
import bcrypt from 'bcrypt';

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

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runVerificationTests() {
  console.log('================================================================');
  console.log('🔒 ACCESSPASS VISITOR VERIFICATION & PRIVACY TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Registration Workflow & Credential Generation
  // -------------------------------------------------------------------------
  console.log('[TEST 1] Registering fresh visitor...');
  const uniqueId = Date.now();
  const visitorPayload = {
    fullName: `Rohan Verma ${uniqueId}`,
    email: `rohan.${uniqueId}@example.com`,
    phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    idProofType: 'National ID',
    idProofNumber: `ID-${uniqueId}`,
    buildingId: 1,
    hostUserId: 2, // Prof. Arvind Sharma
    purpose: 'Faculty Discussion on Machine Learning Ethics',
    requestedDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
    expectedStartTime: '00:00:00',
    expectedEndTime: '23:59:59',
  };

  const regRes = await request('/public/visits/register', {
    method: 'POST',
    body: JSON.stringify(visitorPayload),
  });

  assert(regRes.status === 201, `Registration returned HTTP 201 Created (got ${regRes.status})`);
  assert(regRes.data.success === true, 'Registration reports success: true');
  assert(typeof regRes.data.data.referenceCode === 'string' && regRes.data.data.referenceCode.startsWith('AP-'), 'Generated valid reference code (AP-YYYY-XXXX)');
  assert(typeof regRes.data.data.verificationSecret === 'string' && regRes.data.data.verificationSecret.startsWith('SEC-'), 'Generated valid verification secret (SEC-XXXX-YYYY)');

  const refCode = regRes.data.data.referenceCode;
  const secret = regRes.data.data.verificationSecret;
  console.log(`   -> Reference Code: ${refCode}`);
  console.log(`   -> Plain Secret:   ${secret}`);

  // Verify DB stores only bcrypt hash, never plain text secret
  const [dbRows] = await pool.execute(
    'SELECT access_secret_hash FROM visit_requests WHERE reference_code = ?',
    [refCode]
  );
  assert(dbRows.length === 1, 'Visit request found in database');
  const storedHash = dbRows[0].access_secret_hash;
  assert(storedHash && storedHash.startsWith('$2b$'), 'Database stores valid bcrypt hash in access_secret_hash');
  assert(storedHash !== secret, 'Database does NOT store plain text verification secret');
  const hashMatches = await bcrypt.compare(secret, storedHash);
  assert(hashMatches === true, 'Stored bcrypt hash cryptographically verifies the generated plain secret');

  // -------------------------------------------------------------------------
  // TEST 2: Unauthorized Details Access (Public Reference Code Alone)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 2] Checking public status lookup with reference code alone...');
  const publicRes = await request(`/public/visits/${refCode}/status`);
  assert(publicRes.status === 200, `Public lookup returned HTTP 200 (got ${publicRes.status})`);
  assert(publicRes.data.data.referenceCode === refCode, 'Public response includes reference code');
  assert(publicRes.data.data.lifecycleStatus === 'Pending', 'Lifecycle status is "Pending"');
  assert(publicRes.data.data.building && publicRes.data.data.building.name, 'Public response includes safe building name');
  
  // Strict Privacy Checks: zero PII and zero pass tokens
  assert(publicRes.data.data.visitor === undefined, 'Public status strictly OMITS visitor profile');
  assert(publicRes.data.data.visitorName === undefined, 'Public status strictly OMITS visitor name');
  assert(publicRes.data.data.phone === undefined && publicRes.data.data.visitor_phone === undefined, 'Public status strictly OMITS phone number');
  assert(publicRes.data.data.email === undefined && publicRes.data.data.visitor_email === undefined, 'Public status strictly OMITS email address');
  assert(publicRes.data.data.idProofNumber === undefined && publicRes.data.data.id_proof_number === undefined, 'Public status strictly OMITS ID proof number');
  assert(publicRes.data.data.digitalPass === undefined || publicRes.data.data.digitalPass === null, 'Public status strictly OMITS digital pass object');
  assert(publicRes.data.data.passCode === undefined, 'Public status strictly OMITS pass code');
  assert(publicRes.data.data.qrPayload === undefined, 'Public status strictly OMITS QR payload');
  assert(publicRes.data.data.access_secret_hash === undefined, 'Public status strictly OMITS secret hash');

  // -------------------------------------------------------------------------
  // TEST 3: Invalid Verification Secrets & Generic Error Handling
  // -------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing invalid verification secrets & non-existent references...');
  const invalidSecretRes = await request(`/public/visits/${refCode}/verify-access`, {
    method: 'POST',
    body: JSON.stringify({ verificationSecret: 'SEC-WRONG-9999' }),
  });
  assert(invalidSecretRes.status === 401, `Invalid secret returned HTTP 401 (got ${invalidSecretRes.status})`);
  assert(invalidSecretRes.data.message === 'Invalid visit reference or verification secret.', 'Returns generic error message for invalid secret');
  assert(invalidSecretRes.data.data === undefined, 'No data leaked on invalid secret');

  const nonExistentRefRes = await request('/public/visits/AP-9999-NOTEXIST/verify-access', {
    method: 'POST',
    body: JSON.stringify({ verificationSecret: secret }),
  });
  assert(nonExistentRefRes.status === 401, `Non-existent reference returned HTTP 401 (got ${nonExistentRefRes.status})`);
  assert(nonExistentRefRes.data.message === 'Invalid visit reference or verification secret.', 'Non-existent reference returns IDENTICAL generic error (no enumeration)');

  // -------------------------------------------------------------------------
  // TEST 4: Valid Verification & Digital Pass Access Workflow
  // -------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing valid verification before and after host approval...');
  // 4a: Verify while still pending
  const pendingVerifyRes = await request(`/public/visits/${refCode}/verify-access`, {
    method: 'POST',
    body: JSON.stringify({ verificationSecret: secret }),
  });
  assert(pendingVerifyRes.status === 200, `Valid secret returned HTTP 200 (got ${pendingVerifyRes.status})`);
  assert(pendingVerifyRes.data.data.visitor.name === `Rohan Verma ${uniqueId}`, 'Correctly unlocked visitor name');
  assert(pendingVerifyRes.data.data.visitor.email === `rohan.${uniqueId}@example.com`, 'Correctly unlocked visitor email');
  assert(pendingVerifyRes.data.data.digitalPass === null, 'No digital pass issued yet while request is Pending');

  // 4b: Host logs in and approves visit request
  console.log('   -> Host approving visit request...');
  const hostLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'prof.sharma@accesspass.local', password: 'Password123!' }),
  });
  assert(hostLogin.ok, 'Host authenticated successfully');
  const hostToken = hostLogin.data.token;

  // Retrieve host requests to get request ID
  const hostRequests = await request('/host/requests?status=pending', { token: hostToken });
  const pendingItem = hostRequests.data.data.find(r => r.reference_code === refCode);
  assert(pendingItem !== undefined, `Found request ${refCode} in host queue`);

  const approveRes = await request(`/host/requests/${pendingItem.id}/approve`, {
    method: 'PATCH',
    token: hostToken,
  });
  assert(approveRes.ok, 'Host approved request and pass was created');
  const issuedPassToken = approveRes.data.data.passCode;
  console.log(`   -> Digital Pass Code: ${issuedPassToken}`);

  // 4c: Public status lookup after approval (STILL HIDES QR PASS & PII)
  const postApprovePublic = await request(`/public/visits/${refCode}/status`);
  assert(postApprovePublic.data.data.lifecycleStatus === 'Approved', 'Public status updated to "Approved"');
  assert(postApprovePublic.data.data.visitor === undefined, 'Public status STILL hides visitor personal details');
  assert(postApprovePublic.data.data.digitalPass === undefined, 'Public status STILL hides digital pass & QR payload');

  // 4d: Verified access unlocks digital pass and QR code
  console.log('   -> Visitor submits valid verification secret to unlock QR badge...');
  const approvedVerifyRes = await request(`/public/visits/${refCode}/verify-access`, {
    method: 'POST',
    body: JSON.stringify({ verificationSecret: secret }),
  });
  assert(approvedVerifyRes.status === 200, 'Verification successful after approval');
  assert(approvedVerifyRes.data.data.digitalPass !== null, 'Digital pass unlocked');
  assert(approvedVerifyRes.data.data.digitalPass.passCode === issuedPassToken, 'Unlocked correct digital pass token');
  assert(typeof approvedVerifyRes.data.data.digitalPass.qrPayload === 'string', 'Unlocked valid QR payload string');

  const parsedQR = JSON.parse(approvedVerifyRes.data.data.digitalPass.qrPayload);
  assert(parsedQR.ref === refCode, 'QR payload contains matching reference code');
  assert(parsedQR.token === issuedPassToken, 'QR payload contains matching cryptographic pass token');

  // -------------------------------------------------------------------------
  // TEST 5: Cross-Visitor Credential Isolation
  // -------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing cross-visitor credential isolation...');
  // Seeded visit AP-2026-X8B9K has demo secret 'SEC-DEMO-2026'
  // Using Rohan's secret on AP-2026-X8B9K must be rejected
  const crossVerifyRes = await request('/public/visits/AP-2026-X8B9K/verify-access', {
    method: 'POST',
    body: JSON.stringify({ verificationSecret: secret }),
  });
  assert(crossVerifyRes.status === 401, `Foreign secret on another reference returned HTTP 401 (got ${crossVerifyRes.status})`);
  assert(crossVerifyRes.data.message === 'Invalid visit reference or verification secret.', 'Cross-visitor verification rejected with generic error');

  // Using correct demo secret on seeded visit must succeed
  const seededVerifyRes = await request('/public/visits/AP-2026-X8B9K/verify-access', {
    method: 'POST',
    body: JSON.stringify({ verificationSecret: 'SEC-DEMO-2026' }),
  });
  assert(seededVerifyRes.status === 200, 'Seeded demo secret SEC-DEMO-2026 unlocks AP-2026-X8B9K');
  assert(seededVerifyRes.data.data.visitor.name === 'Amit Verma', 'Unlocked Amit Verma profile');

  // -------------------------------------------------------------------------
  // TEST 6: Repeated Failed Attempts (Rate Limiting)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 6] Testing verification attempt rate limiting on dedicated reference...');
  const rateLimitRef = `AP-RATE-${Date.now()}`;
  for (let i = 1; i <= 5; i++) {
    const res = await request(`/public/visits/${rateLimitRef}/verify-access`, {
      method: 'POST',
      body: JSON.stringify({ verificationSecret: `SEC-BAD-${i}` }),
    });
    assert(res.status === 401, `Failed attempt ${i} returns HTTP 401`);
  }

  // 6th attempt should trigger HTTP 429
  const rateLimitRes = await request(`/public/visits/${rateLimitRef}/verify-access`, {
    method: 'POST',
    body: JSON.stringify({ verificationSecret: 'SEC-BAD-6' }),
  });
  assert(rateLimitRes.status === 429, `6th failed attempt returned HTTP 429 Too Many Requests (got ${rateLimitRes.status})`);
  assert(rateLimitRes.data.message.includes('Too many failed verification attempts'), `Rate limit message informs user of lockout: "${rateLimitRes.data.message}"`);

  console.log('\n================================================================');
  console.log('🎉 ALL 6 VERIFICATION & PRIVACY TEST SUITES PASSED FLAWLESSLY!');
  console.log('================================================================\n');
  process.exit(0);
}

runVerificationTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
