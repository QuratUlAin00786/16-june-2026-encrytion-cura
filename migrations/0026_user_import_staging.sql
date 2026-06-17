CREATE TABLE IF NOT EXISTS user_import_staging (
  id serial PRIMARY KEY,
  organization_id integer NOT NULL,
  import_batch_id text NOT NULL,
  email text,
  username text,
  first_name text,
  last_name text,
  role text DEFAULT 'patient',
  password_hash text,
  import_status varchar(20) NOT NULL DEFAULT 'Pending',
  validation_status varchar(20) NOT NULL DEFAULT 'Pending',
  error_message text,
  duplicate_reason text,
  imported_user_id integer,
  matched_patient_staging_id integer,
  created_at timestamp NOT NULL DEFAULT now(),
  imported_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_user_import_staging_batch
  ON user_import_staging (organization_id, import_batch_id);
