-- Create subscription history/audit log table
CREATE TABLE IF NOT EXISTS saas_subscription_history (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES saas_subscriptions(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'upgrade', 'downgrade', 'cancel', 'renew', 'change_cycle', 'create', 'update'
  performed_by INTEGER REFERENCES users(id), -- User who performed the action (SaaS admin or org admin)
  performed_by_type VARCHAR(20) DEFAULT 'admin', -- 'saas_admin' or 'org_admin'
  old_package_id INTEGER REFERENCES saas_packages(id),
  new_package_id INTEGER REFERENCES saas_packages(id),
  old_billing_cycle VARCHAR(20), -- 'monthly' or 'annual'
  new_billing_cycle VARCHAR(20), -- 'monthly' or 'annual'
  old_status VARCHAR(20), -- 'active', 'trial', 'cancelled', etc.
  new_status VARCHAR(20), -- 'active', 'trial', 'cancelled', etc.
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  details JSONB DEFAULT '{}', -- Additional details like proration amount, reason, etc.
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_history_organization ON saas_subscription_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON saas_subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_action ON saas_subscription_history(action);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON saas_subscription_history(created_at DESC);

-- Add comments
COMMENT ON TABLE saas_subscription_history IS 'Audit trail for all subscription changes (upgrade, downgrade, cancel, etc.)';
COMMENT ON COLUMN saas_subscription_history.action IS 'Type of action: upgrade, downgrade, cancel, renew, change_cycle, create, update';
COMMENT ON COLUMN saas_subscription_history.performed_by_type IS 'Type of user who performed action: saas_admin or org_admin';
