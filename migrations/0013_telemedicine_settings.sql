-- Migration: Add telemedicine_settings table (per-user settings persisted in DB)
-- Run this script to create the table if it does not already exist.
-- Table is in schema curauser24nov25 (no permission on public).

CREATE TABLE IF NOT EXISTS curauser24nov25.telemedicine_settings (
    user_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id)
);

-- Optional: index for lookups by organization (e.g. admin reports)
CREATE INDEX IF NOT EXISTS idx_telemedicine_settings_organization_id ON curauser24nov25.telemedicine_settings(organization_id);
