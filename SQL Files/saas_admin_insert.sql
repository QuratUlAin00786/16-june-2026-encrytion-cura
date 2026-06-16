-- =============================================
-- SAAS ADMIN INSERT QUERY
-- Generated: 2025-11-03T05:36:23.841Z
-- =============================================

-- SaaS Administrator User
-- Email: saasadmin@curaemr.ai
-- Password: saas123
-- Role: admin (with is_saas_owner = true)

INSERT INTO public.users (
    organization_id,
    email,
    username,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    is_saas_owner
) VALUES (
    1,                                    -- organization_id
    'saasadmin@curaemr.ai',                 -- email
    'saasadmin',              -- username
    '$2b$10$UUqa7ZqoyWnnn9gBKxop0OwF9V5.hw3aeHWYRxtYrjFBQAhBm26d2',  -- password_hash (bcrypt)
    'SaaS',             -- first_name
    'Administrator',              -- last_name
    'admin',                              -- role
    true,                                 -- is_active
    true                                  -- is_saas_owner (THIS MAKES IT SAAS ADMIN)
);


-- =============================================
-- NOTES
-- =============================================
-- A SaaS Admin is defined by:
--   1. role = "admin"
--   2. is_saas_owner = true
--
-- This gives the user full system access including:
--   - Multi-organization management
--   - SaaS subscription management
--   - Global system settings
--   - All admin privileges


-- =============================================
-- LOGIN CREDENTIALS
-- =============================================
-- Email: saasadmin@curaemr.ai
-- Password: saas123

-- =============================================
-- ADDITIONAL SAAS ADMIN EXAMPLES
-- =============================================

-- Example 2: SaaS Admin with custom credentials
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active, is_saas_owner
) VALUES (
    1,
    'admin@yourdomain.com',
    'admin',
    '$2b$10$[YOUR_BCRYPT_HASH_HERE]',  -- Generate with bcrypt
    'Admin',
    'User',
    'admin',
    true,
    true  -- SaaS Owner flag
);


-- =============================================
-- KEY DIFFERENCES: SaaS Admin vs Regular Admin
-- =============================================

-- REGULAR ADMIN (Organization-level access only)
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active, is_saas_owner
) VALUES (
    1, 'regular.admin@hospital.com', 'regular_admin', '[hash]',
    'Regular', 'Admin', 'admin', true, false  -- is_saas_owner = FALSE
);

-- SAAS ADMIN (System-wide access, multi-organization)
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active, is_saas_owner
) VALUES (
    1, 'saas.admin@curaemr.ai', 'saas_admin', '[hash]',
    'SaaS', 'Admin', 'admin', true, true  -- is_saas_owner = TRUE
);


-- =============================================
-- PERMISSIONS COMPARISON
-- =============================================
-- 
-- Regular Admin (is_saas_owner = false):
--   ✓ Manage users in their organization
--   ✓ View/edit organization settings
--   ✓ Access to billing for their organization
--   ✗ Cannot access other organizations
--   ✗ Cannot manage SaaS subscriptions
--   ✗ Cannot manage global settings
--
-- SaaS Admin (is_saas_owner = true):
--   ✓ Full access to ALL organizations
--   ✓ Manage SaaS subscriptions & packages
--   ✓ Global system configuration
--   ✓ Multi-tenant management
--   ✓ View system-wide analytics
--   ✓ All regular admin privileges

