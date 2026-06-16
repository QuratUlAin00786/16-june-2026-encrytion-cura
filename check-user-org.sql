-- Check which organization hassan@averox.com belongs to
SELECT 
    u.id as user_id,
    u.email,
    u."organizationId",
    o.name as organization_name,
    o.subdomain,
    s.id as subscription_id,
    s.status as subscription_status,
    s."expiresAt",
    s."currentPeriodStart",
    s."currentPeriodEnd"
FROM users u
LEFT JOIN organizations o ON o.id = u."organizationId"
LEFT JOIN saas_subscriptions s ON s."organizationId" = o.id
WHERE u.email = 'hassan@averox.com';
