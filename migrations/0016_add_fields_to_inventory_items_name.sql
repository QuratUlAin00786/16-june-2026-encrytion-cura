-- Migration: Add brand_name, manufacturer, and unit_of_measurement to inventory_items_name table
-- Created: 2026-02-17

-- Add brand_name column to inventory_items_name
ALTER TABLE inventory_items_name
ADD COLUMN IF NOT EXISTS brand_name TEXT;

-- Add manufacturer column to inventory_items_name
ALTER TABLE inventory_items_name
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- Add unit_of_measurement column to inventory_items_name
ALTER TABLE inventory_items_name
ADD COLUMN IF NOT EXISTS unit_of_measurement VARCHAR(20) DEFAULT 'Piece';
