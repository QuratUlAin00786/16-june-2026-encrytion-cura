-- Migration: Add inventory_items_name table
-- Created: 2026-01-18

CREATE TABLE IF NOT EXISTS inventory_items_name (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_name_organization_id ON inventory_items_name(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name_is_active ON inventory_items_name(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name_name ON inventory_items_name(name);
