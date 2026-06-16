-- Migration: Add warehouse_id and purchase_order_id to inventory_batches table
-- Created: 2026-02-17

-- Add warehouse_id column to inventory_batches
ALTER TABLE inventory_batches
ADD COLUMN IF NOT EXISTS warehouse_id INTEGER;

-- Add purchase_order_id column to inventory_batches
ALTER TABLE inventory_batches
ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER;

-- Add foreign key constraint for warehouse_id if inventory_warehouses table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_warehouses') THEN
        ALTER TABLE inventory_batches
        ADD CONSTRAINT fk_inventory_batches_warehouse_id
        FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint for purchase_order_id if inventory_purchase_orders table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_purchase_orders') THEN
        ALTER TABLE inventory_batches
        ADD CONSTRAINT fk_inventory_batches_purchase_order_id
        FOREIGN KEY (purchase_order_id) REFERENCES inventory_purchase_orders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_batches_warehouse_id ON inventory_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_purchase_order_id ON inventory_batches(purchase_order_id);
