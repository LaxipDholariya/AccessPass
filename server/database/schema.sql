-- ========================================================================
-- AccessPass Database Schema
-- Digital Visitor Access Management System
-- Engine: MySQL 8.x / 5.7+ (Compatible with XAMPP MariaDB/MySQL)
-- Character Set: utf8mb4 / Unicode
-- ========================================================================

-- Create and select database
CREATE DATABASE IF NOT EXISTS accesspass_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE accesspass_db;

-- Disable foreign key checks during schema creation
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------
-- 1. Table: buildings
-- Campus buildings or physical facilities where visitors seek access
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS buildings;
CREATE TABLE buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Building or facility name',
    code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Short unique building code (e.g. BLDG-STC)',
    address VARCHAR(255) NULL COMMENT 'Physical location or campus zone',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Inactive',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Campus buildings and facilities';

-- ------------------------------------------------------------------------
-- 2. Table: users
-- Internal staff accounts: Administrators, Hosts (Faculty/Staff), and Security
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL COMMENT 'Full name of the user',
    staff_id VARCHAR(50) NULL UNIQUE COMMENT 'Unique official staff/employee ID',
    email VARCHAR(120) NOT NULL UNIQUE COMMENT 'Official login email',
    password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed password (never plain-text)',
    role ENUM('admin', 'host', 'security') NOT NULL COMMENT 'System role for authorization',
    building_id INT NULL COMMENT 'Assigned building (NULL for campus-wide Admin)',
    phone VARCHAR(20) NULL UNIQUE COMMENT 'Contact phone number (unique)',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Deactivated account',
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved' COMMENT 'Staff approval status',
    requested_role ENUM('host', 'security') NULL COMMENT 'Role requested during public registration',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_building 
        FOREIGN KEY (building_id) REFERENCES buildings(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='System users: Admin, Host, and Security guards';

-- ------------------------------------------------------------------------
-- 3. Table: visitors
-- Profiles of external persons requesting access
-- Separated from requests to allow multiple visit records per visitor
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS visitors;
CREATE TABLE visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL COMMENT 'Visitor legal full name',
    email VARCHAR(120) NOT NULL COMMENT 'Visitor email address',
    phone VARCHAR(20) NOT NULL COMMENT 'Visitor phone number',
    id_proof_type ENUM('National ID', 'Passport', 'Driving License', 'Student ID', 'Other') 
        NOT NULL DEFAULT 'National ID' COMMENT 'Type of government/institution identity card',
    id_proof_number VARCHAR(50) NULL COMMENT 'Masked or full ID proof document number',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_visitors_email UNIQUE (email),
    CONSTRAINT uq_visitors_phone UNIQUE (phone),
    CONSTRAINT uq_visitors_id_proof UNIQUE (id_proof_number)
) ENGINE=InnoDB COMMENT='Registered visitors directory';

-- ------------------------------------------------------------------------
-- 4. Table: blacklist
-- Prevented individuals who cannot register or enter premises
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS blacklist;
CREATE TABLE blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier_type ENUM('email', 'phone', 'id_proof') NOT NULL COMMENT 'Field used to match',
    identifier_value VARCHAR(150) NOT NULL COMMENT 'Specific email, phone, or ID number',
    reason VARCHAR(255) NOT NULL COMMENT 'Administrative rationale for blacklisting',
    added_by INT NULL COMMENT 'Admin who enforced the blacklist',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_blacklist_entry UNIQUE (identifier_type, identifier_value),
    CONSTRAINT fk_blacklist_admin 
        FOREIGN KEY (added_by) REFERENCES users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Blacklisted visitor credentials';

-- ------------------------------------------------------------------------
-- 5. Table: visit_requests
-- An application for building entry submitted by or for a visitor
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS visit_requests;
CREATE TABLE visit_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_code VARCHAR(32) NOT NULL UNIQUE COMMENT 'Unguessable public tracking code (e.g. AP-2026-X8B9K)',
    visitor_id INT NOT NULL COMMENT 'Linked visitor profile',
    building_id INT NOT NULL COMMENT 'Building to be visited',
    host_user_id INT NOT NULL COMMENT 'Staff member acting as host',
    purpose VARCHAR(255) NOT NULL COMMENT 'Reason for the visit',
    requested_date DATE NOT NULL COMMENT 'Scheduled visit date (YYYY-MM-DD)',
    expected_start_time TIME NOT NULL COMMENT 'Earliest expected arrival (HH:MM:SS)',
    expected_end_time TIME NOT NULL COMMENT 'Latest expected departure (HH:MM:SS)',
    status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT 'Approval workflow state',
    access_secret_hash VARCHAR(255) NULL COMMENT 'bcrypt hash of visitor private verification secret',
    rejection_reason VARCHAR(255) NULL COMMENT 'Host remarks if request is declined',
    reviewed_by INT NULL COMMENT 'User ID who approved or rejected',
    reviewed_at DATETIME NULL COMMENT 'Timestamp when host decision was recorded',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_visits_visitor 
        FOREIGN KEY (visitor_id) REFERENCES visitors(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_visits_building 
        FOREIGN KEY (building_id) REFERENCES buildings(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_visits_host 
        FOREIGN KEY (host_user_id) REFERENCES users(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_visits_reviewer 
        FOREIGN KEY (reviewed_by) REFERENCES users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    INDEX idx_visits_ref_code (reference_code),
    INDEX idx_visits_date_status (requested_date, status)
) ENGINE=InnoDB COMMENT='Visitor appointments and host decisions';

-- ------------------------------------------------------------------------
-- 6. Table: digital_passes
-- Issued only AFTER a visit request is approved.
-- Holds the cryptographic QR token and expiration window.
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS digital_passes;
CREATE TABLE digital_passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visit_request_id INT NOT NULL UNIQUE COMMENT 'One-to-one link to approved request',
    pass_code VARCHAR(64) NOT NULL UNIQUE COMMENT 'Cryptographic token encoded into the QR code',
    valid_from DATETIME NOT NULL COMMENT 'Pass activation timestamp',
    valid_until DATETIME NOT NULL COMMENT 'Pass expiration timestamp',
    status ENUM('active', 'used', 'expired', 'revoked') NOT NULL DEFAULT 'active' COMMENT 'Pass validity state',
    qr_payload TEXT NULL COMMENT 'QR content string rendered for scanning',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_passes_request 
        FOREIGN KEY (visit_request_id) REFERENCES visit_requests(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    INDEX idx_passes_code (pass_code),
    INDEX idx_passes_validity (valid_from, valid_until, status)
) ENGINE=InnoDB COMMENT='Approved digital access badges with QR tokens';

-- ------------------------------------------------------------------------
-- 7. Table: entry_exit_logs
-- Gate security checkpoint logs recording physical entry and exit
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS entry_exit_logs;
CREATE TABLE entry_exit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    digital_pass_id INT NOT NULL COMMENT 'The verified digital pass',
    security_user_id INT NOT NULL COMMENT 'Security officer who scanned & authorized entry',
    check_in_time DATETIME NOT NULL COMMENT 'Actual gate arrival timestamp',
    check_out_time DATETIME NULL COMMENT 'Actual gate departure timestamp (NULL while inside)',
    entry_gate VARCHAR(50) NOT NULL DEFAULT 'Main Gate' COMMENT 'Checkpoint name of entry',
    exit_gate VARCHAR(50) NULL COMMENT 'Checkpoint name of exit',
    remarks VARCHAR(255) NULL COMMENT 'Security guard notes (e.g. laptop serial logged)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_pass 
        FOREIGN KEY (digital_pass_id) REFERENCES digital_passes(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_logs_security 
        FOREIGN KEY (security_user_id) REFERENCES users(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    INDEX idx_logs_check_in (check_in_time)
) ENGINE=InnoDB COMMENT='Physical gate access timestamps';

-- ------------------------------------------------------------------------
-- 8. Table: audit_logs
-- Immutable audit log for administrative, host, and security actions
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT 'Acting user (NULL for public actions like self-registration)',
    action VARCHAR(50) NOT NULL COMMENT 'Action verb (e.g. USER_LOGIN, PASS_APPROVED, CHECK_IN)',
    target_entity VARCHAR(50) NOT NULL COMMENT 'Affected table (e.g. visit_requests, users)',
    target_id INT NULL COMMENT 'Primary key of affected record',
    details TEXT NULL COMMENT 'Descriptive details or JSON summary of changes',
    ip_address VARCHAR(45) NULL COMMENT 'Client IP address',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user 
        FOREIGN KEY (user_id) REFERENCES users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    INDEX idx_audit_action (action),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB COMMENT='System activity and security audit trail';

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
