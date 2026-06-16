-- Fix subscription for hassan@averox.com's organization
-- This will update the subscription status to 'active' for whatever organization hassan@averox.com belongs to

UPDATE saas_subscriptions
SET status = 'active',
    "updatedAt" = NOW()
WHERE "organizationId" IN (
    SELECT "organizationId" 
    FROM users 
    WHERE email = 'hassan@averox.com'
    LIMIT 1
)
RETURNING 
    id,
    "organizationId",
    status,
    "expiresAt",
    "updatedAt";

-- Verify the update
SELECT 
    u.email,
    u."organizationId",
    o.name as organization_name,
    s.id as subscription_id,
    s.status,
    s."expiresAt"
FROM users u
LEFT JOIN organizations o ON o.id = u."organizationId"
LEFT JOIN saas_subscriptions s ON s."organizationId" = o.id
WHERE u.email = 'hassan@averox.com';
