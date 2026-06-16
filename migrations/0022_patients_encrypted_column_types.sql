-- Encrypted patient field envelopes are JSON strings far longer than varchar(20).
-- date_of_birth must be text to store encrypted values (plaintext dates remain ISO strings).

ALTER TABLE patients
  ALTER COLUMN gender_at_birth TYPE text USING gender_at_birth::text;

ALTER TABLE patients
  ALTER COLUMN relation TYPE text USING relation::text;

ALTER TABLE patients
  ALTER COLUMN date_of_birth TYPE text USING date_of_birth::text;
