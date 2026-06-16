-- Migration: Fix analytics_subject_treatments.treatment_id foreign key to point at treatments_info
-- Created: 2026-03-16

-- Drop old FK (created earlier pointing to treatments)
ALTER TABLE analytics_subject_treatments
  DROP CONSTRAINT IF EXISTS analytics_subject_treatments_treatment_id_fkey;

-- Add new FK to treatments_info
ALTER TABLE analytics_subject_treatments
  ADD CONSTRAINT analytics_subject_treatments_treatment_id_fkey
  FOREIGN KEY (treatment_id) REFERENCES treatments_info(id) ON DELETE CASCADE;

