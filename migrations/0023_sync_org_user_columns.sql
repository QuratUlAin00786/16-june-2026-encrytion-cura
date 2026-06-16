-- Align organizations + users with Drizzle schema (login / tenant / seed)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS currency_code CHAR(3),
  ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10),
  ADD COLUMN IF NOT EXISTS language_code CHAR(5);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "Professional_RegistrationID" TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture_path TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS medical_specialty_category TEXT,
  ADD COLUMN IF NOT EXISTS sub_specialty TEXT,
  ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_saas_owner BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_of_birth TEXT,
  ADD COLUMN IF NOT EXISTS gender_at_birth TEXT;
