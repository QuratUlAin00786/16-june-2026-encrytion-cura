-- Find which organization hassan@averox.com belongs to
SELECT 
    u.id as user_id,
    u.email,
    u.organization_id,
    o.name as organization_name,
    o.subdomain,
    o.id as org_id
FROM users u
LEFT JOIN organizations o ON o.id = u.organization_id
WHERE u.email = 'hassan@averox.com';

-- Then check that organization's subscription
-- (Replace ORG_ID with the organization_id from above)
SELECT 
    s.id as subscription_id,
    s.organization_id,
    s.status,
    s.payment_status,
    s.expires_at,
    s.current_period_start,
    s.current_period_end,
    CASE 
        WHEN s.expires_at IS NULL THEN 'No expiration date'
        WHEN s.expires_at < NOW() THEN 'EXPIRED'
        ELSE 'ACTIVE'
    END as expiration_status
FROM saas_subscriptions s
WHERE s.organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = 'hassan@averox.com'
    LIMIT 1
);
