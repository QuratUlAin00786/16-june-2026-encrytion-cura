-- Organization holiday calendar (national, regional, company) and weekend rules
CREATE TABLE IF NOT EXISTS organization_holiday_settings (
  organization_id INTEGER PRIMARY KEY NOT NULL,
  weekend_days TEXT[] NOT NULL DEFAULT ARRAY['Saturday', 'Sunday'],
  weekends_non_working BOOLEAN NOT NULL DEFAULT true,
  default_allow_shifts_on_holidays BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_holidays (
  id SERIAL PRIMARY KEY NOT NULL,
  organization_id INTEGER NOT NULL,
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  holiday_type VARCHAR(20) NOT NULL DEFAULT 'national',
  region TEXT,
  allow_shifts BOOLEAN NOT NULL DEFAULT false,
  is_working_day BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, holiday_date, name)
);

CREATE INDEX IF NOT EXISTS idx_organization_holidays_org_date
  ON organization_holidays (organization_id, holiday_date);
