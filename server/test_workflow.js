/**
 * End-to-End Workflow Verification Script for AccessPass
 * Tests full lifecycle: Registration -> Pending -> Host Approval -> Digital Pass & QR
 * -> Security Verification -> Check-in -> Duplicate Prevention -> Check-out
 * -> Blacklist enforcement -> Revocation -> Audit Logging.
 */

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
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function run() {
  console.log('====================================================');
  console.log('🚀 STARTING ACCESSPASS INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  // 1. Health check
  console.log('[STEP 1] Testing Health Endpoint...');
  const health = await request('/health');
  assert(health.ok && health.data.database === 'connected', 'Backend server and MySQL database are connected.');

  // 2. Fetch public buildings and hosts
  console.log('\n[STEP 2] Fetching Buildings & Active Hosts...');
  const buildingsRes = await request('/public/buildings');
  assert(buildingsRes.ok && buildingsRes.data.data.length > 0, 'Loaded buildings successfully.');
  const scienceBlock = buildingsRes.data.data.find(b => b.code === 'SB-01') || buildingsRes.data.data[0];
  console.log(`   -> Target Building: ${scienceBlock.name} (ID: ${scienceBlock.id})`);

  const hostsRes = await request(`/public/hosts?building_id=${scienceBlock.id}`);
  assert(hostsRes.ok && hostsRes.data.data.length > 0, 'Loaded hosts successfully.');
  const host = hostsRes.data.data[0];
  console.log(`   -> Selected Host: ${host.full_name} (${host.email}, ID: ${host.id})`);

  // 3. Visitor Registration (Workflow Step 1 & 2)
  console.log('\n[STEP 3] Registering new visitor visit request...');
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const regPayload = {
    fullName: 'Ananya Verma',
    email: `ananya.verma.${Date.now()}@college.edu`,
    phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    idProofType: 'Aadhaar Card',
    idProofNumber: `4567${Math.floor(10000000 + Math.random() * 90000000)}`,
    buildingId: scienceBlock.id,
    hostUserId: host.id,
    purpose: 'Academic Mentorship & Lab Demonstration',
    requestedDate: dateStr,
    expectedStartTime: '00:00:00',
    expectedEndTime: '23:59:59',
  };

  const regRes = await request('/public/visits/register', {
    method: 'POST',
    body: JSON.stringify(regPayload),
  });
  assert(regRes.status === 201 && regRes.data.success, 'Visit request registered as pending.');
  const refCode = regRes.data.data.referenceCode;
  console.log(`   -> Generated Public Reference Code: ${refCode}`);

  // 4. Check initial pass status
  console.log('\n[STEP 4] Visitor looks up pending request...');
  const lookupRes1 = await request(`/public/visits/${refCode}`);
  assert(lookupRes1.ok && lookupRes1.data.data.lifecycleStatus === 'Pending', 'Pass status correctly displayed as "Pending".');
  assert(lookupRes1.data.data.digitalPass === undefined, 'No digital pass exposed on public status lookup.');

  // 5. Host Login
  console.log('\n[STEP 5] Host logs into dashboard...');
  const hostLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: host.email, password: 'Password123!' }),
  });
  assert(hostLogin.ok && hostLogin.data.token, 'Host authenticated successfully.');
  const hostToken = hostLogin.data.token;

  // 6. Host views incoming requests
  console.log('\n[STEP 6] Host views pending requests list...');
  const hostRequests = await request('/host/requests?status=pending', { token: hostToken });
  assert(hostRequests.ok, 'Host requests retrieved.');
  const targetReq = hostRequests.data.data.find(r => r.reference_code === refCode);
  assert(targetReq !== undefined, `Found request ${refCode} in host's pending queue.`);

  // 7. Host Approves Request (Workflow Step 3 & 4)
  console.log('\n[STEP 7] Host approves request and backend issues digital pass...');
  const approveRes = await request(`/host/requests/${targetReq.id}/approve`, {
    method: 'PATCH',
    token: hostToken,
  });
  assert(approveRes.ok && approveRes.data.data.passCode, 'Request approved and digital pass token issued.');
  const passToken = approveRes.data.data.passCode;
  console.log(`   -> Issued Pass Token: ${passToken}`);

  // 8. Visitor Checks Pass & QR Privacy (Workflow Step 5)
  console.log('\n[STEP 8] Visitor checks status and unlocks digital badge with verification secret...');
  const lookupRes2 = await request(`/public/visits/${refCode}`);
  assert(lookupRes2.ok && lookupRes2.data.data.lifecycleStatus === 'Approved', 'Pass status correctly displayed as "Approved".');
  assert(lookupRes2.data.data.digitalPass === undefined, 'Public status strictly hides digital pass without secret.');

  // Unlock pass using verification secret
  const visitorUnlockRes = await request(`/public/visits/${refCode}/verify-access`, {
    method: 'POST',
    body: JSON.stringify({ verificationSecret: regRes.data.data.verificationSecret }),
  });
  assert(visitorUnlockRes.ok && visitorUnlockRes.data.data.digitalPass, 'Pass unlocked successfully using verification secret.');
  const qrPayloadRaw = visitorUnlockRes.data.data.digitalPass.qrPayload;
  console.log(`   -> Raw QR Payload: ${qrPayloadRaw}`);
  const qrPayload = JSON.parse(qrPayloadRaw);
  assert(qrPayload.ref === refCode && qrPayload.token === passToken, 'QR payload contains secure ref and token.');
  assert(!qrPayload.visitorName && !qrPayload.phone && !qrPayload.email, 'QR payload does NOT expose visitor personal info.');

  // 9. Building Authorization Check (Negative Test)
  console.log('\n[STEP 9] Testing Building Authorization Rule for Security Officers...');
  // Guard Ramesh is assigned to Building 1
  const guardRameshLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'guard.ramesh@accesspass.local', password: 'Password123!' }),
  });
  assert(guardRameshLogin.ok && guardRameshLogin.data.token, 'Guard Ramesh authenticated.');
  
  // Guard Priya is assigned to Building 2
  const guardPriyaLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'guard.priya@accesspass.local', password: 'Password123!' }),
  });
  assert(guardPriyaLogin.ok && guardPriyaLogin.data.token, 'Guard Priya authenticated.');

  // If pass was issued for Building 2, Ramesh (Building 1) should be denied!
  // If pass was issued for Building 1, Priya (Building 2) should be denied!
  const wrongGuardToken = targetReq.building_id === 1 ? guardPriyaLogin.data.token : guardRameshLogin.data.token;
  const correctGuardToken = targetReq.building_id === 1 ? guardRameshLogin.data.token : guardPriyaLogin.data.token;

  const crossBuildingScan = await request('/security/verify-pass', {
    method: 'POST',
    token: wrongGuardToken,
    body: JSON.stringify({ code: passToken }),
  });
  assert(crossBuildingScan.status === 403 && crossBuildingScan.data.alertType === 'WRONG_BUILDING', 
    'Security checkpoint correctly DENIED pass for a different building (Building Permission Guard working!).');
  console.log(`   -> Guard notice: "${crossBuildingScan.data.message}"`);

  // 10. Security verifies Pass with assigned building guard (Workflow Step 6 & 7)
  console.log('\n[STEP 10] Assigned Building Security Officer scans pass token...');
  const verifyRes = await request('/security/verify-pass', {
    method: 'POST',
    token: correctGuardToken,
    body: JSON.stringify({ code: passToken }),
  });
  assert(verifyRes.ok && verifyRes.data.verified === true, 'Pass verified as valid by assigned building security.');
  assert(verifyRes.data.data.canCheckIn === true, 'Pass is eligible for physical check-in.');
  assert(verifyRes.data.data.isCurrentlyInside === false, 'Visitor correctly marked as currently OUTSIDE.');
  const passId = verifyRes.data.data.passId;
  const guardToken = correctGuardToken;

  // 11. Security records Check-In (Workflow Step 8)
  console.log('\n[STEP 11] Security records physical check-in...');
  const checkInRes = await request('/security/check-in', {
    method: 'POST',
    token: guardToken,
    body: JSON.stringify({
      passId,
      gate: 'Main North Gate',
      remarks: 'Student ID verified; Laptop registered',
    }),
  });
  assert(checkInRes.status === 201 && checkInRes.data.success, 'Physical entry logged successfully.');

  // 12. Prevent Duplicate Check-In (Workflow Step 9)
  console.log('\n[STEP 12] Security attempts duplicate check-in while visitor is inside...');
  const dupCheckInRes = await request('/security/check-in', {
    method: 'POST',
    token: guardToken,
    body: JSON.stringify({
      passId,
      gate: 'Main North Gate',
    }),
  });
  assert(dupCheckInRes.status === 400 && dupCheckInRes.data.success === false, 'Duplicate entry was REJECTED by backend locking.');
  console.log(`   -> Rejection message: "${dupCheckInRes.data.message}"`);

  // 13. Public status reflects "Inside"
  console.log('\n[STEP 13] Checking visitor lifecycle status while inside...');
  const lookupRes3 = await request(`/public/visits/${refCode}`);
  assert(lookupRes3.data.data.lifecycleStatus === 'Inside', 'Pass status dynamically reflects "Inside".');

  // 14. Security records Check-Out (Workflow Step 8)
  console.log('\n[STEP 14] Security records physical check-out...');
  const checkOutRes = await request('/security/check-out', {
    method: 'POST',
    token: guardToken,
    body: JSON.stringify({
      passId,
      gate: 'Main North Gate',
      remarks: 'Visitor exited safely',
    }),
  });
  assert(checkOutRes.ok && checkOutRes.data.success, 'Physical departure logged successfully.');

  // 15. Public status reflects "Exited"
  console.log('\n[STEP 15] Checking visitor lifecycle status after departure...');
  const lookupRes4 = await request(`/public/visits/${refCode}`);
  assert(lookupRes4.data.data.lifecycleStatus === 'Exited', 'Pass status dynamically reflects "Exited".');

  // 16. Blacklist Enforcement (Workflow Step 11)
  console.log('\n[STEP 16] Testing blacklist enforcement during registration...');
  const blacklistedReg = await request('/public/visits/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Vikram Suspicious',
      email: 'spammer@suspicious.net',
      phone: '+919999888877',
      idProofType: 'Aadhaar Card',
      buildingId: scienceBlock.id,
      hostUserId: host.id,
      purpose: 'Unclear',
      requestedDate: dateStr,
      expectedStartTime: '10:00:00',
      expectedEndTime: '12:00:00',
    }),
  });
  assert(blacklistedReg.status === 403 && !blacklistedReg.data.success, 'Blacklisted visitor registration was blocked with 403 Forbidden.');
  console.log(`   -> Block message: "${blacklistedReg.data.message}"`);

  // 17. Pass Revocation Test (Workflow Step 10)
  console.log('\n[STEP 17] Testing pass revocation workflow...');
  // Create another quick visit to test revocation
  const reg2 = await request('/public/visits/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Kavita Singh',
      email: `kavita.${Date.now()}@test.org`,
      phone: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
      idProofType: 'Passport',
      buildingId: scienceBlock.id,
      hostUserId: host.id,
      purpose: 'Guest Lecture',
      requestedDate: dateStr,
      expectedStartTime: '08:00:00',
      expectedEndTime: '22:00:00',
    }),
  });
  const ref2 = reg2.data.data.referenceCode;

  // Find req2Id from host pending requests
  const hostReqs2 = await request('/host/requests?status=pending', { token: hostToken });
  const targetReq2 = hostReqs2.data.data.find(r => r.reference_code === ref2);
  assert(targetReq2 !== undefined, 'Found second request in host queue.');
  const req2Id = targetReq2.id;

  // Approve it
  const app2 = await request(`/host/requests/${req2Id}/approve`, {
    method: 'PATCH',
    token: hostToken,
  });
  const token2 = app2.data.data.passCode;

  // Host revokes the pass
  const revokeRes = await request(`/host/requests/${req2Id}/revoke`, {
    method: 'PATCH',
    token: hostToken,
    body: JSON.stringify({ reason: 'Meeting cancelled by host' }),
  });
  assert(revokeRes.ok && revokeRes.data.success, 'Host revoked the pass successfully.');

  // Security verifies revoked pass
  const verifyRevoked = await request('/security/verify-pass', {
    method: 'POST',
    token: guardToken,
    body: JSON.stringify({ code: token2 }),
  });
  assert(verifyRevoked.status === 403 && verifyRevoked.data.alertType === 'REVOKED', 'Security checkpoint blocked revoked pass with 403 REVOKED alert.');

  // Public status reflects Revoked
  const lookupRevoked = await request(`/public/visits/${ref2}`);
  assert(lookupRevoked.data.data.lifecycleStatus === 'Revoked', 'Pass status reflects "Revoked".');

  // 18. Audit Logs Verification (Workflow Step 12)
  console.log('\n[STEP 18] Admin logs in to verify audit log entries...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@accesspass.local', password: 'Password123!' }),
  });
  assert(adminLogin.ok && adminLogin.data.token, 'Admin authenticated successfully.');
  const adminToken = adminLogin.data.token;

  const auditRes = await request('/admin/audit-logs?limit=10', { token: adminToken });
  assert(auditRes.ok && auditRes.data.data.length > 0, 'Audit logs retrieved successfully.');
  const actions = auditRes.data.data.map(l => l.action);
  console.log(`   -> Recent Audit Actions: ${[...new Set(actions)].join(', ')}`);
  assert(actions.includes('GATE_CHECK_IN') || actions.includes('GATE_CHECK_OUT') || actions.includes('PASS_APPROVED'), 'Critical workflow events recorded in audit log.');

  console.log('\n====================================================');
  console.log('🎉 ALL 18 INTEGRATION TEST PHASES PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
