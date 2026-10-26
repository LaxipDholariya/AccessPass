-- ========================================================================
-- AccessPass Database Migration: Add UNIQUE Constraints to Visitors Table
-- Purpose: Prevent duplicate email, phone, and ID document numbers
-- Compatible with: MySQL 5.7+, MySQL 8.x, and MariaDB 10.x (XAMPP phpMyAdmin)
-- Safety: Preserves all existing data; does NOT reset or truncate tables
-- ========================================================================

USE accesspass_db;

-- 1. Drop old non-unique index if present (safe idempotent execution)
ALTER TABLE visitors DROP INDEX IF EXISTS idx_visitors_email;
ALTER TABLE visitors DROP INDEX IF EXISTS idx_visitors_phone;

-- 2. Drop unique constraints if they already exist from previous runs (for idempotency)
ALTER TABLE visitors DROP INDEX IF EXISTS uq_visitors_email;
ALTER TABLE visitors DROP INDEX IF EXISTS uq_visitors_phone;
ALTER TABLE visitors DROP INDEX IF EXISTS uq_visitors_id_proof;

-- 3. Add UNIQUE constraints for email, phone, and id_proof_number
-- NOTE: In InnoDB, a UNIQUE constraint on a nullable column (id_proof_number)
-- allows multiple NULL rows (visitors without ID), while strictly preventing
-- duplicate non-empty ID numbers.
ALTER TABLE visitors 
  ADD CONSTRAINT uq_visitors_email UNIQUE (email),
  ADD CONSTRAINT uq_visitors_phone UNIQUE (phone),
  ADD CONSTRAINT uq_visitors_id_proof UNIQUE (id_proof_number);
