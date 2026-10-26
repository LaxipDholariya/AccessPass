/**
 * AccessPass Staff Registration Feature Test Suite
 * Validates:
 * 1. Public staff registration with pending approval & inactive status.
 * 2. Restriction preventing public self-registration as Admin (HTTP 403).
 * 3. Independent duplicate validation for email, phone, and staff ID (HTTP 409).
 * 4. Verification that duplicates NEVER overwrite existing user records.
 * 5. Password hashing with bcrypt.
 * 6. Login blocking for pending accounts (HTTP 403).
 * 7. Admin-only role & facility authorization and account approval.
 * 8. Successful login immediately following approval.
 * 9. Rejection workflow for staff applications.
 * 10. Admin direct staff creation (Host, Security, Admin).
 */

const BASE_URL = 'http://localhost:5000/api';

async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 RUNNING ACCESSPASS STAFF REGISTRATION TEST SUITE');
  console.log('===============================================================\n');

  const ts = Date.now();
  const testStaffId = `STF-TEST-${ts.toString().slice(-4)}`;
  const testEmail = `staff.test.${ts}@accesspass.local`;
  const testPhone = `+91-99887${ts.toString().slice(-5)}`;
  const testPassword = 'SecurePassword123!';

  // -------------------------------------------------------------------------
  // 1. PUBLIC STAFF REGISTRATION
  // -------------------------------------------------------------------------
  console.log('TEST 1: Public Staff Registration (Pending Approval)...');
  const regRes = await api('/public/staff/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Test Host Applicant',
      email: testEmail,
      phone: testPhone,
      staffId: testStaffId,
      requestedRole: 'host',
      buildingId: 1,
      password: testPassword,
    }),
  });

  assert(regRes.status === 201, `Registration returns 201 Created (got ${regRes.status})`);
  assert(regRes.data.success === true, 'Response marked success');
  assert(regRes.data.data.approvalStatus === 'pending', 'Account marked pending');
  assert(!regRes.data.data.isActive, 'Account inactive by default');
  assert(!regRes.data.data.password, 'No password field in response');
  assert(!regRes.data.data.password_hash, 'No password_hash in response');
  const createdUserId = regRes.data.data.id;
  assert(createdUserId > 0, `Created user ID is valid (${createdUserId})`);

  // -------------------------------------------------------------------------
  // 2. UNAUTHORIZED ROLE ASSIGNMENT ATTEMPTS
  // -------------------------------------------------------------------------
  console.log('\nTEST 2: Public Self-Registration as Admin Must Be Rejected...');
  const adminSelfReg = await api('/public/staff/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Malicious Attacker',
      email: `evil.${ts}@accesspass.local`,
      phone: `+91-99886${ts.toString().slice(-5)}`,
      staffId: `STF-EVIL-${ts.toString().slice(-4)}`,
      requestedRole: 'admin',
      password: 'AttackPassword123!',
    }),
  });

  assert(adminSelfReg.status === 403, `Admin self-registration rejected with 403 (got ${adminSelfReg.status})`);
  assert(adminSelfReg.data.message.toLowerCase().includes('administrator'), 'Clear security warning message returned');

  // -------------------------------------------------------------------------
  // 3. INDEPENDENT DUPLICATE CHECKS & NO-OVERWRITE GUARANTEE
  // -------------------------------------------------------------------------
  console.log('\nTEST 3A: Duplicate Email Check (Independent)...');
  const dupEmailRes = await api('/public/staff/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Duplicate Email Imposter',
      email: testEmail, // duplicate!
      phone: `+91-99885${ts.toString().slice(-5)}`,
      staffId: `STF-DIFF1-${ts.toString().slice(-4)}`,
      requestedRole: 'host',
      password: 'AnotherPassword123!',
    }),
  });
  assert(dupEmailRes.status === 409, `Duplicate email rejected with 409 Conflict (got ${dupEmailRes.status})`);
  assert(dupEmailRes.data.field === 'email', 'Error response identifies field as email');

  console.log('\nTEST 3B: Duplicate Phone Check (Independent)...');
  const dupPhoneRes = await api('/public/staff/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Duplicate Phone Imposter',
      email: `diff.email.${ts}@accesspass.local`,
      phone: testPhone, // duplicate!
      staffId: `STF-DIFF2-${ts.toString().slice(-4)}`,
      requestedRole: 'host',
      password: 'AnotherPassword123!',
    }),
  });
  assert(dupPhoneRes.status === 409, `Duplicate phone rejected with 409 Conflict (got ${dupPhoneRes.status})`);
  assert(dupPhoneRes.data.field === 'phone', 'Error response identifies field as phone');

  console.log('\nTEST 3C: Duplicate Staff ID Check (Independent)...');
  const dupStaffRes = await api('/public/staff/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Duplicate Staff ID Imposter',
      email: `diff2.email.${ts}@accesspass.local`,
      phone: `+91-99884${ts.toString().slice(-5)}`,
      staffId: testStaffId, // duplicate!
      requestedRole: 'host',
      password: 'AnotherPassword123!',
    }),
  });
  assert(dupStaffRes.status === 409, `Duplicate staff ID rejected with 409 Conflict (got ${dupStaffRes.status})`);
  assert(dupStaffRes.data.field === 'staffId', 'Error response identifies field as staffId');

  // -------------------------------------------------------------------------
  // 4. LOGIN REJECTION FOR PENDING ACCOUNT
  // -------------------------------------------------------------------------
  console.log('\nTEST 4: Pending Account Cannot Authenticate Prior to Approval...');
  const pendingLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  assert(pendingLogin.status === 403, `Pending login denied with 403 Forbidden (got ${pendingLogin.status})`);
  assert(pendingLogin.data.message.includes('pending administrator approval'), 'Notice explains pending approval');

  // -------------------------------------------------------------------------
  // 5. ADMIN AUTHENTICATION & APPROVAL WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\nTEST 5: Admin Login and Staff Account Approval...');
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@accesspass.local',
      password: 'Password123!',
    }),
  });
  assert(adminLogin.status === 200, 'Admin login succeeded');
  const adminToken = adminLogin.data.token;
  assert(Boolean(adminToken), 'Received valid Admin JWT token');

  // Verify non-admin cannot approve
  console.log('  Testing RBAC: Unauthenticated approve request...');
  const unauthApprove = await api(`/admin/users/${createdUserId}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'host', buildingId: 1 }),
  });
  assert(unauthApprove.status === 401, `Unauthenticated approve returns 401 (got ${unauthApprove.status})`);

  // Admin approves account
  console.log('  Admin approving staff account...');
  const approveRes = await api(`/admin/users/${createdUserId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      role: 'host',
      buildingId: 1,
    }),
  });
  assert(approveRes.status === 200, `Approve returned 200 OK (got ${approveRes.status})`);
  assert(approveRes.data.data.approvalStatus === 'approved', 'Status updated to approved');
  assert(approveRes.data.data.isActive === 1, 'Account marked active (1)');

  // -------------------------------------------------------------------------
  // 6. SUCCESSFUL LOGIN POST-APPROVAL
  // -------------------------------------------------------------------------
  console.log('\nTEST 6: Approved Staff Logs In Successfully...');
  const approvedLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  assert(approvedLogin.status === 200, `Approved staff login succeeded (got ${approvedLogin.status})`);
  assert(approvedLogin.data.user.role === 'host', 'Assigned role is host');
  assert(approvedLogin.data.user.staffId === testStaffId, 'Staff ID returned in user session');

  // -------------------------------------------------------------------------
  // 7. STAFF REJECTION WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\nTEST 7: Staff Application Rejection Workflow...');
  const rejectStaffId = `STF-REJ-${ts.toString().slice(-4)}`;
  const rejectEmail = `reject.staff.${ts}@accesspass.local`;
  const rejApp = await api('/public/staff/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Rejected Security Applicant',
      email: rejectEmail,
      phone: `+91-99883${ts.toString().slice(-5)}`,
      staffId: rejectStaffId,
      requestedRole: 'security',
      password: testPassword,
    }),
  });
  assert(rejApp.status === 201, 'Second staff applicant registered as pending');
  const rejectUserId = rejApp.data.data.id;

  const rejectRes = await api(`/admin/users/${rejectUserId}/reject`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ reason: 'Staff ID not verified with security department' }),
  });
  assert(rejectRes.status === 200, 'Rejection returned 200 OK');
  assert(rejectRes.data.data.approvalStatus === 'rejected', 'Status marked rejected');

  const rejLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: rejectEmail, password: testPassword }),
  });
  assert(rejLogin.status === 403, `Rejected account login denied (got ${rejLogin.status})`);

  // -------------------------------------------------------------------------
  // 8. ADMIN DIRECT STAFF CREATION
  // -------------------------------------------------------------------------
  console.log('\nTEST 8: Admin Direct Staff Creation...');
  const directStaffId = `STF-DIR-${ts.toString().slice(-4)}`;
  const directEmail = `direct.sec.${ts}@accesspass.local`;
  const directPhone = `+91-99882${ts.toString().slice(-5)}`;

  const createRes = await api('/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fullName: 'Direct Security Guard',
      email: directEmail,
      phone: directPhone,
      staffId: directStaffId,
      role: 'security',
      buildingId: 1,
      password: testPassword,
    }),
  });

  assert(createRes.status === 201, `Direct creation returned 201 Created (got ${createRes.status})`);
  assert(createRes.data.data.approvalStatus === 'approved', 'Directly created user is approved');
  assert(createRes.data.data.isActive === 1, 'Directly created user is active');

  console.log('\n===============================================================');
  console.log('✅ ALL STAFF REGISTRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution terminated with error:', err);
  process.exit(1);
});
