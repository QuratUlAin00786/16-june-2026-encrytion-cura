-- Migration 0002: Create dynamic form builder tables
CREATE TABLE IF NOT EXISTS forms (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_sections (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_fields (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  field_type VARCHAR(20) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  placeholder TEXT,
  field_options JSONB NOT NULL DEFAULT '[]',
  "order" INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_shares (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  sent_by INTEGER REFERENCES users(id),
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_responses (
  id SERIAL PRIMARY KEY,
  share_id INTEGER NOT NULL REFERENCES form_shares(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS form_response_values (
  id SERIAL PRIMARY KEY,
  response_id INTEGER NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES form_fields(id),
  value TEXT,
  value_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

