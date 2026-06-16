-- Check subscription status for hassan@averox.com
SELECT
    u.email,
    u.organization_id,
    o.name as organization_name,
    s.id as subscription_id,
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
FROM users u
LEFT JOIN organizations o ON o.id = u.organization_id
LEFT JOIN saas_subscriptions s ON s.organization_id = o.id
WHERE u.email = 'hassan@averox.com';
