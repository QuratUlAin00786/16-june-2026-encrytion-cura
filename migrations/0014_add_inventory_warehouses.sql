-- Migration: Add inventory_warehouses table
-- Created: 2026-02-17

CREATE TABLE IF NOT EXISTS inventory_warehouses (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    warehouse_name VARCHAR(200) NOT NULL,
    location TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouses_organization_id ON inventory_warehouses(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouses_status ON inventory_warehouses(status);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouses_warehouse_name ON inventory_warehouses(warehouse_name);

-- Add foreign key constraint if organizations table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        ALTER TABLE inventory_warehouses
        ADD CONSTRAINT fk_inventory_warehouses_organization_id
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;
