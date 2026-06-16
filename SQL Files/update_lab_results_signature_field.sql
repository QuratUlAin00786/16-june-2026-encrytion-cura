-- Update lab_results table to change signature_data (text) to signature (jsonb)
-- This migration converts the existing signature structure to match prescriptions table

-- Step 1: Add new signature JSONB column
ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS signature JSONB DEFAULT '{}';

-- Step 2: Migrate existing signature_data to new signature format (if any data exists)
UPDATE lab_results
SET signature = jsonb_build_object(
  'doctorSignature', signature_data,
  'signedBy', NULL,
  'signedAt', NULL,
  'signerId', NULL
)
WHERE signature_data IS NOT NULL 
  AND signature_data != ''
  AND (signature IS NULL OR signature = '{}'::jsonb);

-- Step 3: Drop the old signature_data column (uncomment after verifying migration)
-- ALTER TABLE lab_results DROP COLUMN IF EXISTS signature_data;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_lab_results_signature ON lab_results USING gin (signature);

-- Add comments for documentation
COMMENT ON COLUMN lab_results.signature IS 'E-signature data in JSONB format: {doctorSignature, signedBy, signedAt, signerId}';
COMMENT ON COLUMN lab_results.signature->>'doctorSignature' IS 'Base64 encoded signature image';
COMMENT ON COLUMN lab_results.signature->>'signedBy' IS 'Name of the person who signed';
COMMENT ON COLUMN lab_results.signature->>'signedAt' IS 'ISO timestamp when signature was applied';
COMMENT ON COLUMN lab_results.signature->>'signerId' IS 'User ID who signed the lab result';
