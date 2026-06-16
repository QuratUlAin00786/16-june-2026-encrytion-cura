-- Legacy patient import staging, audit, and searchable hash columns

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS cnic_hash text,
  ADD COLUMN IF NOT EXISTS phone_hash text,
  ADD COLUMN IF NOT EXISTS email_hash text,
  ADD COLUMN IF NOT EXISTS is_encrypted boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_patients_cnic_hash ON patients (organization_id, cnic_hash) WHERE cnic_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_phone_hash ON patients (organization_id, phone_hash) WHERE phone_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_email_hash ON patients (organization_id, email_hash) WHERE email_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS patient_import_staging (
  id serial PRIMARY KEY,
  organization_id integer NOT NULL,
  import_batch_id text NOT NULL,
  full_name text,
  cnic text,
  phone text,
  email text,
  date_of_birth text,
  gender text,
  address text,
  import_status varchar(20) NOT NULL DEFAULT 'Pending',
  validation_status varchar(20) NOT NULL DEFAULT 'Pending',
  error_message text,
  duplicate_reason text,
  imported_patient_id integer,
  created_at timestamp NOT NULL DEFAULT now(),
  imported_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_patient_import_staging_batch ON patient_import_staging (organization_id, import_batch_id);
CREATE INDEX IF NOT EXISTS idx_patient_import_staging_status ON patient_import_staging (import_batch_id, import_status);

CREATE TABLE IF NOT EXISTS patient_import_audit (
  id serial PRIMARY KEY,
  organization_id integer NOT NULL,
  user_id integer,
  action varchar(50) NOT NULL,
  file_name text,
  import_batch_id text,
  total_records integer DEFAULT 0,
  valid_records integer DEFAULT 0,
  invalid_records integer DEFAULT 0,
  duplicate_records integer DEFAULT 0,
  imported_records integer DEFAULT 0,
  failed_records integer DEFAULT 0,
  existing_records integer DEFAULT 0,
  details jsonb DEFAULT '{}',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_import_audit_org ON patient_import_audit (organization_id, created_at DESC);
