-- =============================================
-- SAAS ADMIN INSERT QUERY
-- Retrieved from Development Database
-- User: saas_admin@curaemr.ai
-- =============================================

-- INSERT query with actual database values
INSERT INTO public.users (
    organization_id,
    email,
    username,
    password_hash,
    first_name,
    last_name,
    role,
    department,
    medical_specialty_category,
    sub_specialty,
    working_days,
    working_hours,
    permissions,
    is_active,
    is_saas_owner
) VALUES (
    0,                                                                      -- organization_id (0 = system-wide)
    'saas_admin@curaemr.ai',                                               -- email
    'saas_admin',                                                          -- username
    '$2b$12$TaWC2bPrBJcE8DGqL2fxi.73nuUjlsj6/vs7XDu6iQ1HlmLI.wvDq',      -- password_hash (bcrypt)
    'SaaS',                                                                -- first_name
    'Administrator',                                                       -- last_name
    'admin',                                                               -- role
    NULL,                                                                  -- department
    NULL,                                                                  -- medical_specialty_category
    NULL,                                                                  -- sub_specialty
    '[]'::jsonb,                                                          -- working_days (empty array)
    '{}'::jsonb,                                                          -- working_hours (empty object)
    '{}'::jsonb,                                                          -- permissions (empty object)
    true,                                                                  -- is_active
    true                                                                   -- is_saas_owner (SAAS ADMIN FLAG)
);

-- Note: id and created_at are auto-generated, so not included in INSERT


-- =============================================
-- COLUMN INSERTS FORMAT (Alternative)
-- =============================================
INSERT INTO public.users (organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner) VALUES (0, 'saas_admin@curaemr.ai', 'saas_admin', '$2b$12$TaWC2bPrBJcE8DGqL2fxi.73nuUjlsj6/vs7XDu6iQ1HlmLI.wvDq', 'SaaS', 'Administrator', 'admin', NULL, NULL, NULL, '[]', '{}', '{}', true, true);


-- =============================================
-- KEY DETAILS
-- =============================================
-- Email:             saas_admin@curaemr.ai
-- Username:          saas_admin
-- First Name:        SaaS
-- Last Name:         Administrator
-- Role:              admin
-- Organization ID:   0 (system-wide, not tied to specific org)
-- Is SaaS Owner:     true (gives system-wide access)
-- Is Active:         true
-- Password Hash:     bcrypt (12 rounds)


-- =============================================
-- WHAT MAKES THIS A SAAS ADMIN?
-- =============================================
-- 1. is_saas_owner = true
-- 2. organization_id = 0 (not tied to a specific organization)
-- 3. role = 'admin'
--
-- This combination provides:
--   ✓ Access to ALL organizations
--   ✓ SaaS subscription management
--   ✓ Global system configuration
--   ✓ Multi-tenant control
--   ✓ System-wide analytics

