-- Migration 0003: Ensure saas_packages has a display order column
ALTER TABLE saas_packages
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

UPDATE saas_packages
SET display_order = id
WHERE display_order IS NULL OR display_order = 0;
