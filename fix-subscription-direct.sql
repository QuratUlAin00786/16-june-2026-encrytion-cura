-- Direct SQL to fix subscription for hassan@averox.com
-- Run this directly in your PostgreSQL database

-- Update subscription status to 'active' for the organization of hassan@averox.com
UPDATE saas_subscriptions
SET status = 'active',
    "updatedAt" = NOW()
WHERE "organizationId" IN (
    SELECT "organizationId" 
    FROM users 
    WHERE email = 'hassan@averox.com'
    LIMIT 1
);

-- Verify the update
SELECT 
    u.email,
    u."organizationId",
    s.id as subscription_id,
    s.status,
    s."updatedAt"
FROM users u
LEFT JOIN saas_subscriptions s ON s."organizationId" = u."organizationId"
WHERE u.email = 'hassan@averox.com';
