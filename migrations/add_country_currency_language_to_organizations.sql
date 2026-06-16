-- Migration: Add country_code, currency_code, currency_symbol, and language_code to organizations table
-- Date: 2026-03-12
-- Description: Adds country, currency, and language fields to organizations for automatic population based on country selection

-- Add new columns to organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS currency_code CHAR(3),
  ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10),
  ADD COLUMN IF NOT EXISTS language_code CHAR(5);

-- Add comments for documentation
COMMENT ON COLUMN organizations.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., AE, GB, US)';
COMMENT ON COLUMN organizations.currency_code IS 'ISO 4217 currency code (e.g., AED, GBP, USD)';
COMMENT ON COLUMN organizations.currency_symbol IS 'Currency symbol (e.g., د.إ, £, $)';
COMMENT ON COLUMN organizations.language_code IS 'Locale code (e.g., ar-AE, en-GB, en-US)';

-- Optional: Create an index on country_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_country_code ON organizations(country_code);
