-- Add subscription management fields for Stripe integration
-- This migration adds fields needed for upgrade, downgrade, cancel, and billing cycle changes

-- Add stripe_customer_id to organizations table (for platform billing subscriptions)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(64);

-- Add missing fields to saas_subscriptions table
ALTER TABLE saas_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly';

-- Add comments for documentation
COMMENT ON COLUMN organizations.stripe_customer_id IS 'Stripe Customer ID for platform subscription billing (separate from stripe_account_id which is for Connect)';
COMMENT ON COLUMN saas_subscriptions.stripe_customer_id IS 'Stripe Customer ID for this subscription';
COMMENT ON COLUMN saas_subscriptions.stripe_price_id IS 'Stripe Price ID for the current plan and billing cycle';
COMMENT ON COLUMN saas_subscriptions.billing_cycle IS 'Billing cycle: monthly or annual';

-- Update existing subscriptions to have 'monthly' billing cycle if null
UPDATE saas_subscriptions
SET billing_cycle = 'monthly'
WHERE billing_cycle IS NULL;
