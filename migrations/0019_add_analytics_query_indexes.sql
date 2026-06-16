-- Migration: Add indexes for analytics treatment queries
-- Scope: Performance-only (no logic changes)

-- Appointments filtering/join helpers
CREATE INDEX IF NOT EXISTS idx_appointments_treatment_id
  ON appointments (treatment_id);

CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at
  ON appointments (scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_org_id
  ON appointments (organization_id);

-- Composite/partial indexes for the exact analytics filters
CREATE INDEX IF NOT EXISTS idx_appointments_org_scheduled_treatment
  ON appointments (organization_id, scheduled_at, treatment_id);

CREATE INDEX IF NOT EXISTS idx_appointments_org_scheduled_treatment_partial
  ON appointments (organization_id, scheduled_at)
  WHERE treatment_id IS NOT NULL;

-- Join helpers on organization scoping
CREATE INDEX IF NOT EXISTS idx_treatments_org_id
  ON treatments (organization_id);

CREATE INDEX IF NOT EXISTS idx_treatments_info_org_id
  ON treatments_info (organization_id);

