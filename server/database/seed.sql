-- ========================================================================
-- AccessPass Seed Data (Development & Academic Demonstration Only)
-- Default Demo Password for ALL Users: Password123!
-- Password Hash: $2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G (bcrypt work factor 10)
-- ========================================================================

USE accesspass_db;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE entry_exit_logs;
TRUNCATE TABLE digital_passes;
TRUNCATE TABLE visit_requests;
TRUNCATE TABLE blacklist;
TRUNCATE TABLE visitors;
TRUNCATE TABLE users;
TRUNCATE TABLE buildings;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------
-- 1. Buildings (At least 2 buildings)
-- ------------------------------------------------------------------------
INSERT INTO buildings (id, name, code, address, is_active) VALUES
(1, 'Science & Technology Complex', 'BLDG-STC', 'North Campus, Academic Sector 4', 1),
(2, 'Administrative & Executive Block', 'BLDG-ADM', 'South Gate, Main Administrative Circle', 1);

-- ------------------------------------------------------------------------
-- 2. Internal Users: 1 Admin, 2 Hosts, 2 Security Guards
-- Password for all accounts: Password123!
-- ------------------------------------------------------------------------
INSERT INTO users (id, full_name, staff_id, email, password_hash, role, building_id, phone, is_active, approval_status) VALUES
-- Administrator (Campus-wide, building_id = NULL)
(1, 'System Administrator', 'STF-ADM-001', 'admin@accesspass.local', 
 '$2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G', 'admin', NULL, '+91-9876543210', 1, 'approved'),

-- Host 1: Science & Tech Complex
(2, 'Prof. Arvind Sharma', 'STF-HST-001', 'prof.sharma@accesspass.local', 
 '$2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G', 'host', 1, '+91-9876543211', 1, 'approved'),

-- Host 2: Administrative Block
(3, 'Dr. Sunita Patel', 'STF-HST-002', 'dr.patel@accesspass.local', 
 '$2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G', 'host', 2, '+91-9876543212', 1, 'approved'),

-- Security 1: Guard at Science & Tech Complex
(4, 'Officer Ramesh Kumar', 'STF-SEC-001', 'guard.ramesh@accesspass.local', 
 '$2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G', 'security', 1, '+91-9876543213', 1, 'approved'),

-- Security 2: Guard at Administrative Block
(5, 'Officer Priya Nair', 'STF-SEC-002', 'guard.priya@accesspass.local', 
 '$2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G', 'security', 2, '+91-9876543214', 1, 'approved');

-- ------------------------------------------------------------------------
-- 3. Blacklist Sample Record
-- ------------------------------------------------------------------------
INSERT INTO blacklist (id, identifier_type, identifier_value, reason, added_by) VALUES
(1, 'phone', '+919999888877', 'Repeated unauthorized access attempts and misconduct at Gate 2', 1),
(2, 'email', 'spammer@suspicious.net', 'Commercial solicitation and false identity submission', 1);

-- ------------------------------------------------------------------------
-- 4. Sample Visitors
-- ------------------------------------------------------------------------
INSERT INTO visitors (id, full_name, email, phone, id_proof_type, id_proof_number) VALUES
(1, 'Amit Verma', 'amit.verma@example.com', '+919811122233', 'National ID', 'AADHAAR-9812-4411'),
(2, 'Neha Gupta', 'neha.gupta@example.com', '+919822233344', 'Passport', 'P98765432'),
(3, 'Rajesh Khanna', 'rajesh.khanna@example.com', '+919833344455', 'Driving License', 'DL-2024-88991'),
(4, 'Deepak Joshi', 'deepak.joshi@example.com', '+919844455566', 'Student ID', 'STU-COL-2026');

-- ------------------------------------------------------------------------
-- 5. Sample Visit Requests (Demonstrating various lifecycle states)
-- ------------------------------------------------------------------------
INSERT INTO visit_requests 
(id, reference_code, visitor_id, building_id, host_user_id, purpose, requested_date, expected_start_time, expected_end_time, status, rejection_reason, reviewed_by, reviewed_at) 
VALUES
-- Visit 1: Approved and Active Today (Has Digital Pass)
(1, 'AP-2026-X8B9K', 1, 1, 2, 'Research Project Consultation on Distributed Systems', 
 CURDATE(), '10:00:00', '13:00:00', 'approved', NULL, 2, NOW()),

-- Visit 2: Completed Visit (Checked in and Checked out earlier today)
(2, 'AP-2026-C4M7P', 2, 2, 3, 'Campus Placement Partnership Discussion', 
 CURDATE(), '09:00:00', '11:30:00', 'approved', NULL, 3, NOW()),

-- Visit 3: Pending Host Review (Awaiting Host Action)
(3, 'AP-2026-P2L8Q', 3, 1, 2, 'Academic Syllabus Review and Guest Lecture Discussion', 
 DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', '16:00:00', 'pending', NULL, NULL, NULL),

-- Visit 4: Rejected Visit
(4, 'AP-2026-R9W1Z', 4, 2, 3, 'Vendor Software Demonstration', 
 CURDATE(), '11:00:00', '12:00:00', 'rejected', 'Host is traveling for an accreditation conference', 3, NOW());

-- ------------------------------------------------------------------------
-- 6. Digital Passes (Only issued for approved visits: #1 and #2)
-- ------------------------------------------------------------------------
INSERT INTO digital_passes (id, visit_request_id, pass_code, valid_from, valid_until, status, qr_payload) VALUES
-- Active pass for Visit 1 (Valid for the entire current day)
(1, 1, 'PASS-TOK-8F3A9C12E47B08D2', 
 CONCAT(CURDATE(), ' 09:30:00'), CONCAT(CURDATE(), ' 14:00:00'), 'active', 
 '{"ref":"AP-2026-X8B9K","passToken":"PASS-TOK-8F3A9C12E47B08D2","building":"BLDG-STC","host":"Prof. Arvind Sharma"}'),

-- Completed/Used pass for Visit 2
(2, 2, 'PASS-TOK-9A2E1D78F53B44C1', 
 CONCAT(CURDATE(), ' 08:30:00'), CONCAT(CURDATE(), ' 12:30:00'), 'used', 
 '{"ref":"AP-2026-C4M7P","passToken":"PASS-TOK-9A2E1D78F53B44C1","building":"BLDG-ADM","host":"Dr. Sunita Patel"}');

-- ------------------------------------------------------------------------
-- 7. Entry and Exit Logs (Physical Security Records)
-- ------------------------------------------------------------------------
INSERT INTO entry_exit_logs (id, digital_pass_id, security_user_id, check_in_time, check_out_time, entry_gate, exit_gate, remarks) VALUES
-- Visit 2 arrived at 08:55 AM, authorized by Guard Priya, and left at 11:20 AM
(1, 2, 5, CONCAT(CURDATE(), ' 08:55:00'), CONCAT(CURDATE(), ' 11:20:00'), 'South Main Gate', 'South Main Gate', 'Visitor checked in with valid Passport proof.');

-- ------------------------------------------------------------------------
-- 8. Audit Trail Records
-- ------------------------------------------------------------------------
INSERT INTO audit_logs (id, user_id, action, target_entity, target_id, details, ip_address) VALUES
(1, 1, 'SYSTEM_BOOTSTRAP', 'system', 1, 'AccessPass schema and seed data initialized', '127.0.0.1'),
(2, 2, 'VISIT_APPROVED', 'visit_requests', 1, 'Host Prof. Arvind Sharma approved visit request AP-2026-X8B9K', '127.0.0.1'),
(3, 5, 'SECURITY_CHECK_IN', 'digital_passes', 2, 'Guard Priya verified pass PASS-TOK-9A2E1D78F53B44C1 and logged entry', '192.168.1.105'),
(4, 5, 'SECURITY_CHECK_OUT', 'digital_passes', 2, 'Visitor Neha Gupta completed visit and departed', '192.168.1.105');
