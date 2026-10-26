-- ========================================================================
-- AccessPass Database Migration: Staff Registration & Approval Workflow
-- Run this script in phpMyAdmin if updating an existing accesspass_db
-- ========================================================================

USE accesspass_db;

-- 1. Add staff_id column
ALTER TABLE users 
ADD COLUMN staff_id VARCHAR(50) NULL AFTER full_name;

-- 2. Populate staff IDs for existing seeded staff accounts
UPDATE users SET staff_id = 'STF-ADM-001' WHERE id = 1 AND (staff_id IS NULL OR staff_id = '');
UPDATE users SET staff_id = 'STF-HST-001' WHERE id = 2 AND (staff_id IS NULL OR staff_id = '');
UPDATE users SET staff_id = 'STF-HST-002' WHERE id = 3 AND (staff_id IS NULL OR staff_id = '');
UPDATE users SET staff_id = 'STF-SEC-001' WHERE id = 4 AND (staff_id IS NULL OR staff_id = '');
UPDATE users SET staff_id = 'STF-SEC-002' WHERE id = 5 AND (staff_id IS NULL OR staff_id = '');

-- 3. Add UNIQUE constraint on staff_id
ALTER TABLE users 
ADD CONSTRAINT uq_users_staff_id UNIQUE (staff_id);

-- 4. Add UNIQUE constraint on phone
ALTER TABLE users 
ADD CONSTRAINT uq_users_phone UNIQUE (phone);

-- 5. Add approval_status and requested_role columns
ALTER TABLE users 
ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved' AFTER is_active,
ADD COLUMN requested_role ENUM('host', 'security') NULL AFTER approval_status;
