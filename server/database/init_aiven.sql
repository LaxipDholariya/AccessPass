-- ========================================================================
-- AccessPass Cloud Database Initialization Script (Aiven / Hosted MySQL)
-- Character Set: utf8mb4 / Unicode
-- Suitable for direct execution in Aiven Query Editor, MySQL Workbench,
-- DBeaver, or via command-line mysql client.
--
-- Note: This script executes against the database you are currently
-- connected to (e.g. 'defaultdb' on Aiven or 'accesspass_db').
-- ========================================================================

-- Disable foreign key constraints during table creation
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------
-- 1. Table: buildings
-- Campus buildings and facilities where visitors seek access
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS buildings;
CREATE TABLE buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Building or facility name',
    code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique building identifier code (e.g. BLDG-STC)',
    address VARCHAR(255) NULL COMMENT 'Physical campus location',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Inactive',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Campus buildings and facilities';

-- ------------------------------------------------------------------------
-- 2. Table: users
-- Internal staff accounts: Administrators, Hosts, and Security Guards
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL COMMENT 'Full legal name',
    staff_id VARCHAR(50) NULL UNIQUE COMMENT 'Unique official employee / staff ID',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT 'Official login email',
    password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt encrypted password hash',
    role ENUM('admin', 'host', 'security') NOT NULL DEFAULT 'host' COMMENT 'System access role',
    building_id INT NULL COMMENT 'Facility assignment (NULL for campus-wide)',
    phone VARCHAR(20) NULL UNIQUE COMMENT 'Contact phone number',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Deactivated',
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved' COMMENT 'Staff lifecycle approval state',
    requested_role ENUM('host', 'security') NULL COMMENT 'Role requested during self-registration',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_staff_id (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Internal staff and authorized users';

-- ------------------------------------------------------------------------
-- 3. Table: visitors
-- Registered campus visitors (enforces uniqueness to prevent overwrites)
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS visitors;
CREATE TABLE visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL COMMENT 'Full name of visitor',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique email address',
    phone VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique contact phone number',
    id_proof_type VARCHAR(50) NOT NULL COMMENT 'Identity document type (e.g. National ID, Passport)',
    id_proof_number VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identity document number',
    is_blacklisted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Blacklisted, 0 = Clear',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_visitors_email (email),
    INDEX idx_visitors_phone (phone),
    INDEX idx_visitors_id_proof (id_proof_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registered campus visitors';

-- ------------------------------------------------------------------------
-- 4. Table: visit_requests
-- Visitor appointment requests submitted to hosts
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS visit_requests;
CREATE TABLE visit_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_code VARCHAR(30) NOT NULL UNIQUE COMMENT 'Opaque reference code (e.g. AP-2026-X8B9K)',
    visitor_id INT NOT NULL,
    building_id INT NOT NULL,
    host_user_id INT NOT NULL,
    purpose TEXT NOT NULL COMMENT 'Purpose of campus visit',
    requested_date DATE NOT NULL COMMENT 'Intended date of visit',
    expected_start_time TIME NOT NULL COMMENT 'Expected arrival time',
    expected_end_time TIME NOT NULL COMMENT 'Expected departure time',
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    rejection_reason VARCHAR(255) NULL COMMENT 'Reason if rejected by host',
    reviewed_by INT NULL COMMENT 'User ID of reviewer',
    reviewed_at TIMESTAMP NULL,
    verification_secret VARCHAR(64) NULL COMMENT 'Hashed private secret for digital pass access',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vr_visitor FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
    CONSTRAINT fk_vr_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vr_host FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vr_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_vr_ref (reference_code),
    INDEX idx_vr_status (status),
    INDEX idx_vr_date (requested_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Visitor appointment requests';

-- ------------------------------------------------------------------------
-- 5. Table: digital_passes
-- Issued digital passes with cryptographic tokens (only for approved visits)
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS digital_passes;
CREATE TABLE digital_passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visit_request_id INT NOT NULL UNIQUE COMMENT 'One-to-one link to approved request',
    pass_code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique pass token (e.g. PASS-TOK-...)',
    valid_from DATETIME NOT NULL COMMENT 'Start of pass validity period',
    valid_until DATETIME NOT NULL COMMENT 'End of pass validity period',
    status ENUM('active', 'used', 'expired', 'revoked') NOT NULL DEFAULT 'active',
    qr_payload TEXT NOT NULL COMMENT 'Privacy-preserving QR JSON payload',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dp_request FOREIGN KEY (visit_request_id) REFERENCES visit_requests(id) ON DELETE CASCADE,
    INDEX idx_dp_pass_code (pass_code),
    INDEX idx_dp_status (status),
    INDEX idx_dp_validity (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Digital QR access passes';

-- ------------------------------------------------------------------------
-- 6. Table: entry_exit_logs
-- Physical gate check-in and check-out event logs
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS entry_exit_logs;
CREATE TABLE entry_exit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pass_id INT NOT NULL,
    check_in_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Entry timestamp',
    check_out_time DATETIME NULL COMMENT 'Exit timestamp',
    entry_gate VARCHAR(50) NOT NULL COMMENT 'Entry checkpoint identifier',
    exit_gate VARCHAR(50) NULL COMMENT 'Exit checkpoint identifier',
    security_user_id INT NOT NULL COMMENT 'Officer recording the movement',
    remarks VARCHAR(255) NULL COMMENT 'Checkpoint notes',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eel_pass FOREIGN KEY (pass_id) REFERENCES digital_passes(id) ON DELETE CASCADE,
    CONSTRAINT fk_eel_security FOREIGN KEY (security_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_eel_pass_id (pass_id),
    INDEX idx_eel_check_in (check_in_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Physical gate entry and exit event logs';

-- ------------------------------------------------------------------------
-- 7. Table: blacklist
-- Security enforcement list for blocked visitors
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS blacklist;
CREATE TABLE blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier_type ENUM('email', 'phone', 'id_proof') NOT NULL,
    identifier_value VARCHAR(100) NOT NULL,
    reason VARCHAR(255) NOT NULL COMMENT 'Security justification',
    added_by INT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bl_added_by FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_blacklist_ident (identifier_type, identifier_value),
    INDEX idx_bl_lookup (identifier_type, identifier_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Security enforcement blacklist';

-- ------------------------------------------------------------------------
-- 8. Table: audit_logs
-- Immutable compliance and security event trail
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT 'User who performed action (NULL for public self-service)',
    action VARCHAR(50) NOT NULL COMMENT 'Action type (e.g. PASS_APPROVED, GATE_CHECK_IN)',
    target_entity VARCHAR(50) NOT NULL COMMENT 'Target table name',
    target_id INT NULL COMMENT 'Primary key of target record',
    details TEXT NULL COMMENT 'Human-readable action description',
    ip_address VARCHAR(45) NULL COMMENT 'Origin IPv4 / IPv6 address',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_al_action (action),
    INDEX idx_al_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Security audit trail';

-- Re-enable foreign key constraints
SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================================
-- PRODUCTION SEED DATA (System Configuration & Authorized Staff Only)
-- Password for all seeded demo accounts: Password123!
-- ========================================================================

-- 1. Baseline Campus Facilities
INSERT INTO buildings (id, name, code, address, is_active) VALUES
(1, 'Science & Technology Complex', 'BLDG-STC', 'North Campus, Academic Zone 1', 1),
(2, 'Administrative Building', 'BLDG-ADM', 'Central Campus, Main Boulevard', 1),
(3, 'Library & Research Centre', 'BLDG-LRC', 'East Campus, Research Park', 1);

-- 2. Initial System Staff Accounts
INSERT INTO users (id, full_name, staff_id, email, password_hash, role, building_id, phone, is_active, approval_status) VALUES
-- Administrator (Campus-wide)
(1, 'System Administrator', 'STF-ADM-001', 'admin@accesspass.local', 
 '$2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G', 'admin', NULL, '+91-9876543210', 1, 'approved'),

-- Faculty Host 1 (Science & Tech Complex)
(2, 'Prof. Arvind Sharma', 'STF-HST-001', 'prof.sharma@accesspass.local', 
 '$2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G', 'host', 1, '+91-9876543211', 1, 'approved'),

-- Faculty Host 2 (Administrative Building)
(3, 'Dr. Sunita Patel', 'STF-HST-002', 'dr.patel@accesspass.local', 
 '$2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G', 'host', 2, '+91-9876543212', 1, 'approved'),

-- Security Guard 1 (Science & Tech Complex Gate)
(4, 'Officer Ramesh Kumar', 'STF-SEC-001', 'guard.ramesh@accesspass.local', 
 '$2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G', 'security', 1, '+91-9876543213', 1, 'approved'),

-- Security Guard 2 (Administrative Building Gate)
(5, 'Officer Priya Nair', 'STF-SEC-002', 'guard.priya@accesspass.local', 
 '$2b$10$kiiAcj7SLOpIHKeUTjpj0OyfI.8D5Opwmq8xDFQS7DC2sC5Ltcn8G', 'security', 2, '+91-9876543214', 1, 'approved');
