-- Migration: Add Stripe account fields to organizations table
-- Date: 2026-02-17
-- Description: Adds stripe_account_id and stripe_status columns to support Stripe Express accounts

-- Add stripe_account_id column (nullable, can be null if Stripe account creation fails)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);

-- Add stripe_status column with default value 'active'
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_status VARCHAR(20) DEFAULT 'active';

-- Add comment to columns for documentation
COMMENT ON COLUMN organizations.stripe_account_id IS 'Stripe Express account ID for the organization';
COMMENT ON COLUMN organizations.stripe_status IS 'Stripe account connection status: active or disconnected';

-- Update existing organizations to have 'active' status if stripe_status is NULL
UPDATE organizations 
SET stripe_status = 'active' 
WHERE stripe_status IS NULL;
