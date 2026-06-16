-- Add date_of_birth and gender_at_birth to users table so Edit User can save/load them for all roles (e.g. Pharmacist, Doctor).
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender_at_birth TEXT;
