-- ============================================================================
-- AccessPass Database Migration: Verification Secret Hash for Private Details
-- Protects visitor PII and scannable QR passes behind a cryptographically
-- secure verification secret generated at registration time.
-- ============================================================================

USE accesspass_db;

-- 1. Add access_secret_hash column to visit_requests if not already present
-- Stores the bcrypt hash of the visitor verification secret
ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS access_secret_hash VARCHAR(255) NULL 
COMMENT 'bcrypt hash of visitor private verification secret' 
AFTER status;

-- 2. Populate seeded visit_requests with demo secret hash (Secret: SEC-DEMO-2026)
-- bcrypt hash for 'SEC-DEMO-2026'
UPDATE visit_requests 
SET access_secret_hash = '$2b$10$vqxNmasS4RwJss69/vKdau6XA6aJePyzT5poHfY05ATk8e5FiR4MW'
WHERE reference_code = 'AP-2026-X8B9K' AND access_secret_hash IS NULL;
