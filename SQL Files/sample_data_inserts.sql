-- =====================================================
-- AVEROX HEALTHCARE - SAMPLE DATA INSERT QUERIES
-- Organizations, Users, and Related Tables
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS (Multi-tenant Healthcare Facilities)
-- =====================================================

INSERT INTO organizations (name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at) VALUES
-- UK Organizations
('London Central Medical Center', 'london-central', 'admin@londoncentralmed.uk', 'UK', 'London Central Medical', 
    '{"theme": {"primaryColor": "#2563eb", "logoUrl": ""}, "timezone": "Europe/London", "currency": "GBP"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": true}',
    'full', 'active', NOW(), NOW()),

('Manchester Family Clinic', 'manchester-family', 'contact@manchesterfamily.uk', 'UK', 'Manchester Family Clinic',
    '{"theme": {"primaryColor": "#059669", "logoUrl": ""}, "timezone": "Europe/London", "currency": "GBP"}',
    '{"appointments": true, "billing": true, "inventory": false, "telehealth": true, "ai_insights": false}',
    'full', 'active', NOW(), NOW()),

('Birmingham Health Hub', 'birmingham-hub', 'info@birminghamhealth.uk', 'UK', 'Birmingham Health Hub',
    '{"theme": {"primaryColor": "#dc2626", "logoUrl": ""}, "timezone": "Europe/London", "currency": "GBP"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": false, "ai_insights": true}',
    'full', 'trial', NOW(), NOW()),

-- EU Organizations
('Berlin Medical Zentrum', 'berlin-medical', 'kontakt@berlinmed.de', 'EU', 'Berlin Medical Zentrum',
    '{"theme": {"primaryColor": "#7c3aed", "logoUrl": ""}, "timezone": "Europe/Berlin", "currency": "EUR"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": true}',
    'full', 'active', NOW(), NOW()),

('Paris Clinique Santé', 'paris-sante', 'contact@parissante.fr', 'EU', 'Paris Clinique Santé',
    '{"theme": {"primaryColor": "#ea580c", "logoUrl": ""}, "timezone": "Europe/Paris", "currency": "EUR"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": false}',
    'full', 'active', NOW(), NOW()),

-- Middle East Organizations
('Dubai Medical Centre', 'dubai-medical', 'info@dubaimedical.ae', 'ME', 'Dubai Medical Centre',
    '{"theme": {"primaryColor": "#0891b2", "logoUrl": ""}, "timezone": "Asia/Dubai", "currency": "AED"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": true}',
    'full', 'active', NOW(), NOW()),

-- South Asia Organizations
('Mumbai Health Clinic', 'mumbai-health', 'contact@mumbaihealth.in', 'SA', 'Mumbai Health Clinic',
    '{"theme": {"primaryColor": "#f59e0b", "logoUrl": ""}, "timezone": "Asia/Kolkata", "currency": "INR"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": false, "ai_insights": true}',
    'full', 'active', NOW(), NOW()),

-- US Organizations
('New York General Hospital', 'ny-general', 'admin@nygeneralhosp.com', 'US', 'NY General Hospital',
    '{"theme": {"primaryColor": "#0f172a", "logoUrl": ""}, "timezone": "America/New_York", "currency": "USD"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": true}',
    'full', 'active', NOW(), NOW()),

('San Francisco Care Center', 'sf-care', 'hello@sfcare.com', 'US', 'SF Care Center',
    '{"theme": {"primaryColor": "#4f46e5", "logoUrl": ""}, "timezone": "America/Los_Angeles", "currency": "USD"}',
    '{"appointments": true, "billing": true, "inventory": false, "telehealth": true, "ai_insights": true}',
    'full', 'trial', NOW(), NOW()),

-- Demo/Testing Organization
('Demo Healthcare Center', 'demo', 'demo@averoxhealth.com', 'UK', 'Demo Healthcare',
    '{"theme": {"primaryColor": "#6366f1", "logoUrl": ""}, "timezone": "Europe/London", "currency": "GBP"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": true}',
    'full', 'trial', NOW(), NOW());

-- =====================================================
-- 2. SAAS OWNERS (Platform Administrators)
-- =====================================================

INSERT INTO saas_owners (username, password, email, first_name, last_name, is_active, created_at, updated_at) VALUES
('admin', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'admin@averoxhealth.com', 'System', 'Administrator', true, NOW(), NOW()),
('superadmin', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'superadmin@averoxhealth.com', 'Super', 'Admin', true, NOW(), NOW()),
('support', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'support@averoxhealth.com', 'Support', 'Team', true, NOW(), NOW());

-- =====================================================
-- 3. USERS (Staff Members per Organization)
-- =====================================================

-- London Central Medical Center (org_id: 1)
INSERT INTO users (organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, created_at) VALUES
(1, 'dr.smith@londoncentralmed.uk', 'dr.smith', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'James', 'Smith', 'doctor', 'General Medicine', 'Internal Medicine', 'Cardiology', 
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', 
    '{"start": "09:00", "end": "17:00"}',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "billing": ["view"], "prescriptions": ["view", "create"]}',
    true, false, NOW()),

(1, 'dr.jones@londoncentralmed.uk', 'dr.jones', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Sarah', 'Jones', 'doctor', 'Pediatrics', 'Pediatrics', 'Neonatology',
    '["Monday", "Tuesday", "Wednesday", "Thursday"]',
    '{"start": "08:00", "end": "16:00"}',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "billing": ["view"], "prescriptions": ["view", "create"]}',
    true, false, NOW()),

(1, 'nurse.williams@londoncentralmed.uk', 'nurse.williams', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Emily', 'Williams', 'nurse', 'Emergency', NULL, NULL,
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]',
    '{"start": "07:00", "end": "19:00"}',
    '{"appointments": ["view", "create"], "patients": ["view", "edit"], "medical_records": ["view", "create"]}',
    true, false, NOW()),

(1, 'reception@londoncentralmed.uk', 'reception.london', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Lisa', 'Taylor', 'receptionist', 'Front Desk', NULL, NULL,
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
    '{"start": "08:00", "end": "18:00"}',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "billing": ["view", "create"]}',
    true, false, NOW()),

(1, 'admin@londoncentralmed.uk', 'admin.london', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Michael', 'Brown', 'admin', 'Administration', NULL, NULL,
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
    '{"start": "09:00", "end": "17:00"}',
    '{"all": ["view", "create", "edit", "delete"]}',
    true, false, NOW()),

-- Manchester Family Clinic (org_id: 2)
INSERT INTO users (organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, created_at) VALUES
(2, 'dr.patel@manchesterfamily.uk', 'dr.patel', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Raj', 'Patel', 'doctor', 'Family Medicine', 'Family Medicine', 'General Practice',
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
    '{"start": "09:00", "end": "17:00"}',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "prescriptions": ["view", "create"]}',
    true, false, NOW()),

(2, 'dr.wilson@manchesterfamily.uk', 'dr.wilson', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'David', 'Wilson', 'doctor', 'Orthopedics', 'Orthopedics', 'Sports Medicine',
    '["Monday", "Wednesday", "Friday"]',
    '{"start": "10:00", "end": "18:00"}',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "prescriptions": ["view", "create"]}',
    true, false, NOW()),

(2, 'nurse.davies@manchesterfamily.uk', 'nurse.davies', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Jennifer', 'Davies', 'nurse', 'General Care', NULL, NULL,
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
    '{"start": "08:00", "end": "16:00"}',
    '{"appointments": ["view", "create"], "patients": ["view", "edit"], "medical_records": ["view", "create"]}',
    true, false, NOW()),

-- Birmingham Health Hub (org_id: 3)
INSERT INTO users (organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, created_at) VALUES
(3, 'dr.thompson@birminghamhealth.uk', 'dr.thompson', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Robert', 'Thompson', 'doctor', 'Surgery', 'Surgery', 'General Surgery',
    '["Monday", "Tuesday", "Wednesday", "Thursday"]',
    '{"start": "07:00", "end": "15:00"}',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "prescriptions": ["view", "create"]}',
    true, false, NOW()),

(3, 'admin@birminghamhealth.uk', 'admin.birmingham', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Sophie', 'Anderson', 'admin', 'Administration', NULL, NULL,
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
    '{"start": "09:00", "end": "17:00"}',
    '{"all": ["view", "create", "edit", "delete"]}',
    true, false, NOW()),

-- Demo Healthcare Center (org_id: 10)
INSERT INTO users (organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, created_at) VALUES
(10, 'demo.doctor@averoxhealth.com', 'demo.doctor', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Demo', 'Doctor', 'doctor', 'General Medicine', 'Internal Medicine', 'General Practice',
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
    '{"start": "09:00", "end": "17:00"}',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "prescriptions": ["view", "create"]}',
    true, false, NOW()),

(10, 'demo.nurse@averoxhealth.com', 'demo.nurse', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Demo', 'Nurse', 'nurse', 'General Care', NULL, NULL,
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
    '{"start": "08:00", "end": "16:00"}',
    '{"appointments": ["view", "create"], "patients": ["view", "edit"], "medical_records": ["view", "create"]}',
    true, false, NOW()),

(10, 'demo.admin@averoxhealth.com', 'demo.admin', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Demo', 'Admin', 'admin', 'Administration', NULL, NULL,
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
    '{"start": "09:00", "end": "17:00"}',
    '{"all": ["view", "create", "edit", "delete"]}',
    true, false, NOW());

-- =====================================================
-- 4. ROLES (Permission Templates)
-- =====================================================

INSERT INTO roles (organization_id, name, display_name, description, permissions, is_system, created_at, updated_at) VALUES
-- London Central Medical Center
(1, 'admin', 'Administrator', 'Full system access with all permissions', 
    '{"all": ["view", "create", "edit", "delete"]}', true, NOW(), NOW()),

(1, 'doctor', 'Doctor', 'Medical provider with clinical permissions',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "medical_records": ["view", "create", "edit"], "prescriptions": ["view", "create", "edit"], "billing": ["view"]}', 
    true, NOW(), NOW()),

(1, 'nurse', 'Nurse', 'Nursing staff with care permissions',
    '{"appointments": ["view", "create"], "patients": ["view", "edit"], "medical_records": ["view", "create"], "vitals": ["view", "create", "edit"]}',
    true, NOW(), NOW()),

(1, 'receptionist', 'Receptionist', 'Front desk staff with scheduling permissions',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "billing": ["view", "create"]}',
    true, NOW(), NOW()),

-- Demo organization
(10, 'admin', 'Administrator', 'Full system access', 
    '{"all": ["view", "create", "edit", "delete"]}', true, NOW(), NOW()),

(10, 'doctor', 'Doctor', 'Medical provider permissions',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "medical_records": ["view", "create", "edit"], "prescriptions": ["view", "create", "edit"]}',
    true, NOW(), NOW());

-- =====================================================
-- 5. DOCTOR DEFAULT SHIFTS
-- =====================================================

INSERT INTO doctor_default_shifts (organization_id, user_id, start_time, end_time, working_days, created_at, updated_at) VALUES
-- London Central Medical Center
(1, 1, '09:00', '17:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], NOW(), NOW()),
(1, 2, '08:00', '16:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday'], NOW(), NOW()),

-- Manchester Family Clinic
(2, 6, '09:00', '17:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], NOW(), NOW()),
(2, 7, '10:00', '18:00', ARRAY['Monday', 'Wednesday', 'Friday'], NOW(), NOW()),

-- Birmingham Health Hub
(3, 9, '07:00', '15:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday'], NOW(), NOW()),

-- Demo
(10, 11, '09:00', '17:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], NOW(), NOW());

-- =====================================================
-- 6. USER DOCUMENT PREFERENCES
-- =====================================================

INSERT INTO user_document_preferences (organization_id, user_id, clinic_info, header_preferences, created_at, updated_at) VALUES
-- Dr. Smith - London Central
(1, 1, 
    '{"clinicName": "London Central Medical Center", "address": "123 Harley Street, London, W1G 6AB", "phone": "+44 20 7946 0958", "email": "dr.smith@londoncentralmed.uk", "website": "www.londoncentralmed.uk"}',
    '{"showLogo": true, "showClinicName": true, "showAddress": true, "showPhone": true, "showEmail": true, "headerColor": "#2563eb"}',
    NOW(), NOW()),

-- Dr. Jones - London Central
(1, 2,
    '{"clinicName": "London Central Medical Center - Pediatrics", "address": "123 Harley Street, London, W1G 6AB", "phone": "+44 20 7946 0959", "email": "dr.jones@londoncentralmed.uk", "website": "www.londoncentralmed.uk"}',
    '{"showLogo": true, "showClinicName": true, "showAddress": true, "showPhone": true, "showEmail": true, "headerColor": "#059669"}',
    NOW(), NOW()),

-- Dr. Patel - Manchester Family
(2, 6,
    '{"clinicName": "Manchester Family Clinic", "address": "45 Oxford Road, Manchester, M1 5EJ", "phone": "+44 161 234 5678", "email": "dr.patel@manchesterfamily.uk", "website": "www.manchesterfamily.uk"}',
    '{"showLogo": true, "showClinicName": true, "showAddress": true, "showPhone": true, "showEmail": true, "headerColor": "#059669"}',
    NOW(), NOW()),

-- Demo Doctor
(10, 11,
    '{"clinicName": "Demo Healthcare Center", "address": "1 Demo Street, London, SW1A 1AA", "phone": "+44 20 1234 5678", "email": "demo.doctor@averoxhealth.com", "website": "www.demo.averoxhealth.com"}',
    '{"showLogo": true, "showClinicName": true, "showAddress": true, "showPhone": true, "showEmail": true, "headerColor": "#6366f1"}',
    NOW(), NOW());

-- =====================================================
-- 7. STAFF SHIFTS (Current Week Schedule)
-- =====================================================

INSERT INTO staff_shifts (organization_id, staff_id, date, shift_type, start_time, end_time, status, is_available, created_by, created_at, updated_at) VALUES
-- London Central Medical Center - This Week
(1, 1, CURRENT_DATE, 'regular', '09:00', '17:00', 'scheduled', true, 5, NOW(), NOW()),
(1, 1, CURRENT_DATE + INTERVAL '1 day', 'regular', '09:00', '17:00', 'scheduled', true, 5, NOW(), NOW()),
(1, 1, CURRENT_DATE + INTERVAL '2 days', 'regular', '09:00', '17:00', 'scheduled', true, 5, NOW(), NOW()),

(1, 2, CURRENT_DATE, 'regular', '08:00', '16:00', 'scheduled', true, 5, NOW(), NOW()),
(1, 2, CURRENT_DATE + INTERVAL '1 day', 'regular', '08:00', '16:00', 'scheduled', true, 5, NOW(), NOW()),

(1, 3, CURRENT_DATE, 'regular', '07:00', '19:00', 'scheduled', true, 5, NOW(), NOW()),
(1, 3, CURRENT_DATE + INTERVAL '1 day', 'regular', '07:00', '19:00', 'scheduled', true, 5, NOW(), NOW()),

-- Demo organization
(10, 11, CURRENT_DATE, 'regular', '09:00', '17:00', 'scheduled', true, 13, NOW(), NOW()),
(10, 11, CURRENT_DATE + INTERVAL '1 day', 'regular', '09:00', '17:00', 'scheduled', true, 13, NOW(), NOW()),
(10, 12, CURRENT_DATE, 'regular', '08:00', '16:00', 'scheduled', true, 13, NOW(), NOW());

-- =====================================================
-- 8. SAAS PACKAGES
-- =====================================================

INSERT INTO saas_packages (name, description, price, billing_cycle, features, is_active, show_on_website, created_at, updated_at) VALUES
('Starter', 'Perfect for small clinics and solo practitioners', 49.00, 'monthly',
    '{"max_users": 5, "max_patients": 500, "appointments": true, "billing": true, "inventory": false, "telehealth": false, "ai_insights": false, "support": "email"}',
    true, true, NOW(), NOW()),

('Professional', 'Ideal for growing medical practices', 149.00, 'monthly',
    '{"max_users": 20, "max_patients": 2000, "appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": false, "support": "email+phone"}',
    true, true, NOW(), NOW()),

('Enterprise', 'Complete solution for large healthcare organizations', 399.00, 'monthly',
    '{"max_users": -1, "max_patients": -1, "appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": true, "support": "24/7"}',
    true, true, NOW(), NOW()),

('Annual Starter', 'Starter plan with annual billing (2 months free)', 490.00, 'yearly',
    '{"max_users": 5, "max_patients": 500, "appointments": true, "billing": true, "inventory": false, "telehealth": false, "ai_insights": false, "support": "email"}',
    true, true, NOW(), NOW()),

('Annual Professional', 'Professional plan with annual billing (2 months free)', 1490.00, 'yearly',
    '{"max_users": 20, "max_patients": 2000, "appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": false, "support": "email+phone"}',
    true, true, NOW(), NOW());

-- =====================================================
-- 9. SAAS SUBSCRIPTIONS
-- =====================================================

INSERT INTO saas_subscriptions (organization_id, package_id, status, current_period_start, current_period_end, cancel_at_period_end, trial_end, created_at, updated_at) VALUES
-- Active subscriptions
(1, 3, 'active', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', false, NULL, NOW(), NOW()),
(2, 2, 'active', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '10 days', false, NULL, NOW(), NOW()),
(4, 3, 'active', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', false, NULL, NOW(), NOW()),
(5, 2, 'active', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', false, NULL, NOW(), NOW()),
(6, 3, 'active', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '18 days', false, NULL, NOW(), NOW()),
(7, 2, 'active', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE + INTERVAL '22 days', false, NULL, NOW(), NOW()),
(8, 3, 'active', CURRENT_DATE - INTERVAL '18 days', CURRENT_DATE + INTERVAL '12 days', false, NULL, NOW(), NOW()),

-- Trial subscriptions
(3, 1, 'active', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '9 days', false, CURRENT_DATE + INTERVAL '9 days', NOW(), NOW()),
(9, 2, 'active', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '11 days', false, CURRENT_DATE + INTERVAL '11 days', NOW(), NOW()),
(10, 3, 'active', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days', false, CURRENT_DATE + INTERVAL '7 days', NOW(), NOW());

-- =====================================================
-- 10. SAAS SETTINGS
-- =====================================================

INSERT INTO saas_settings (key, value, description, category, created_at, updated_at) VALUES
('platform_name', '"Averox Healthcare Management System"', 'Platform display name', 'general', NOW(), NOW()),
('support_email', '"support@averoxhealth.com"', 'Support contact email', 'general', NOW(), NOW()),
('trial_period_days', '14', 'Default trial period in days', 'billing', NOW(), NOW()),
('max_login_attempts', '5', 'Maximum failed login attempts before lockout', 'security', NOW(), NOW()),
('session_timeout_minutes', '60', 'User session timeout in minutes', 'security', NOW(), NOW()),
('enable_2fa', 'true', 'Enable two-factor authentication', 'security', NOW(), NOW()),
('smtp_host', '"smtp.sendgrid.net"', 'SMTP server host', 'email', NOW(), NOW()),
('smtp_port', '587', 'SMTP server port', 'email', NOW(), NOW()),
('default_currency', '"GBP"', 'Default platform currency', 'billing', NOW(), NOW()),
('enable_ai_features', 'true', 'Enable AI-powered features', 'features', NOW(), NOW()),
('data_retention_days', '2555', 'Data retention period (7 years for healthcare)', 'compliance', NOW(), NOW()),
('gdpr_enabled', 'true', 'GDPR compliance features enabled', 'compliance', NOW(), NOW());

-- =====================================================
-- SUMMARY OF INSERTED DATA
-- =====================================================

-- Organizations: 10 healthcare facilities across UK, EU, ME, SA, US regions
-- SaaS Owners: 3 platform administrators
-- Users: 13 staff members (doctors, nurses, receptionists, admins)
-- Roles: 6 permission templates
-- Doctor Default Shifts: 6 default schedules
-- User Document Preferences: 4 customized clinic headers
-- Staff Shifts: 10 current week schedules
-- SaaS Packages: 5 subscription plans
-- SaaS Subscriptions: 10 organization subscriptions (7 active, 3 trial)
-- SaaS Settings: 12 platform configuration settings

-- Default Password for all users: 'password123' (hashed with bcrypt)
-- Use these credentials to login:
--   - admin@londoncentralmed.uk / password123
--   - dr.smith@londoncentralmed.uk / password123
--   - demo.doctor@averoxhealth.com / password123
--   - etc.

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check organizations
-- SELECT id, name, subdomain, region, subscription_status FROM organizations ORDER BY id;

-- Check users per organization
-- SELECT u.id, u.email, u.first_name, u.last_name, u.role, o.name as org_name 
-- FROM users u JOIN organizations o ON u.organization_id = o.id 
-- ORDER BY u.organization_id, u.id;

-- Check active subscriptions
-- SELECT o.name, sp.name as package, ss.status, ss.current_period_end
-- FROM saas_subscriptions ss
-- JOIN organizations o ON ss.organization_id = o.id
-- JOIN saas_packages sp ON ss.package_id = sp.id
-- ORDER BY o.id;
