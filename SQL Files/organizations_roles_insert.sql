-- =====================================================
-- ORGANIZATIONS AND ROLES TABLE INSERT QUERIES
-- For Development Database
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS TABLE
-- =====================================================

INSERT INTO organizations (id, name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at) VALUES
(1, 'Cura Healthcare', 'cura', 'admin@cura.com', 'UK', 'Cura Healthcare', 
    '{"theme": {"primaryColor": "#2563eb", "logoUrl": ""}, "timezone": "Europe/London", "currency": "GBP"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": true, "quickbooks": true}',
    'full', 'active', NOW(), NOW()),

(2, 'Healthcare Plus', 'healthcareplus', 'admin@healthcareplus.com', 'UK', 'Healthcare Plus',
    '{"theme": {"primaryColor": "#059669", "logoUrl": ""}, "timezone": "Europe/London", "currency": "GBP"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": false, "quickbooks": false}',
    'full', 'active', NOW(), NOW());

-- Update the sequence to continue from the highest ID
SELECT setval('organizations_id_seq', (SELECT MAX(id) FROM organizations));

-- =====================================================
-- 2. ROLES TABLE
-- =====================================================

-- Roles for Organization 1 (Cura Healthcare)
INSERT INTO roles (organization_id, name, display_name, description, permissions, is_system, created_at, updated_at) VALUES
(1, 'admin', 'Administrator', 'Full system access with all permissions', 
    '{"all": ["view", "create", "edit", "delete"], "users": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit", "delete"], "appointments": ["view", "create", "edit", "delete"], "billing": ["view", "create", "edit", "delete"], "inventory": ["view", "create", "edit", "delete"], "reports": ["view", "create", "edit", "delete"], "settings": ["view", "create", "edit", "delete"]}', 
    true, NOW(), NOW()),

(1, 'doctor', 'Doctor', 'Medical provider with clinical permissions',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "medical_records": ["view", "create", "edit"], "prescriptions": ["view", "create", "edit", "delete"], "lab_results": ["view", "create", "edit"], "billing": ["view"], "reports": ["view"]}', 
    true, NOW(), NOW()),

(1, 'nurse', 'Nurse', 'Nursing staff with care and vital signs permissions',
    '{"appointments": ["view", "create", "edit"], "patients": ["view", "edit"], "medical_records": ["view", "create"], "prescriptions": ["view"], "lab_results": ["view"], "vitals": ["view", "create", "edit"], "clinical_photos": ["view", "create"]}',
    true, NOW(), NOW()),

(1, 'receptionist', 'Receptionist', 'Front desk staff with scheduling and billing permissions',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "billing": ["view", "create", "edit"], "payments": ["view", "create"], "invoices": ["view", "create", "edit"], "insurance": ["view", "edit"]}',
    true, NOW(), NOW()),

(1, 'sample_taker', 'Lab Technician', 'Laboratory staff for sample collection and test results',
    '{"appointments": ["view"], "patients": ["view"], "lab_results": ["view", "create", "edit"], "medical_images": ["view", "create"], "clinical_photos": ["view", "create"]}',
    true, NOW(), NOW()),

(1, 'patient', 'Patient', 'Patient portal access with limited permissions',
    '{"appointments": ["view"], "medical_records": ["view"], "prescriptions": ["view"], "lab_results": ["view"], "billing": ["view"], "payments": ["view"]}',
    true, NOW(), NOW()),

(1, 'pharmacist', 'Pharmacist', 'Pharmacy staff for medication dispensing',
    '{"prescriptions": ["view", "edit"], "medications": ["view", "create", "edit"], "inventory": ["view", "create", "edit"], "patients": ["view"]}',
    false, NOW(), NOW()),

(1, 'billing_clerk', 'Billing Clerk', 'Billing and insurance claims specialist',
    '{"billing": ["view", "create", "edit", "delete"], "invoices": ["view", "create", "edit", "delete"], "payments": ["view", "create", "edit"], "claims": ["view", "create", "edit"], "insurance": ["view", "create", "edit"], "patients": ["view"]}',
    false, NOW(), NOW());

-- Roles for Organization 2 (Healthcare Plus)
INSERT INTO roles (organization_id, name, display_name, description, permissions, is_system, created_at, updated_at) VALUES
(2, 'admin', 'Administrator', 'Full system access', 
    '{"all": ["view", "create", "edit", "delete"]}', 
    true, NOW(), NOW()),

(2, 'doctor', 'Doctor', 'Medical provider permissions',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "medical_records": ["view", "create", "edit"], "prescriptions": ["view", "create", "edit"]}',
    true, NOW(), NOW()),

(2, 'nurse', 'Nurse', 'Nursing staff permissions',
    '{"appointments": ["view", "create"], "patients": ["view", "edit"], "medical_records": ["view", "create"]}',
    true, NOW(), NOW()),

(2, 'receptionist', 'Receptionist', 'Front desk permissions',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"], "billing": ["view", "create"]}',
    true, NOW(), NOW()),

(2, 'patient', 'Patient', 'Patient portal access',
    '{"appointments": ["view"], "medical_records": ["view"], "prescriptions": ["view"]}',
    true, NOW(), NOW());

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- View all organizations
-- SELECT id, name, subdomain, email, region, subscription_status FROM organizations ORDER BY id;

-- View all roles per organization
-- SELECT r.id, r.organization_id, o.name as org_name, r.name as role_name, r.display_name, r.is_system 
-- FROM roles r 
-- JOIN organizations o ON r.organization_id = o.id 
-- ORDER BY r.organization_id, r.id;

-- Count roles per organization
-- SELECT o.id, o.name, COUNT(r.id) as role_count 
-- FROM organizations o 
-- LEFT JOIN roles r ON o.id = r.organization_id 
-- GROUP BY o.id, o.name 
-- ORDER BY o.id;

-- =====================================================
-- SUMMARY
-- =====================================================

-- ✅ Organizations: 2 healthcare facilities
--    - Organization 1 (Cura Healthcare): Full featured, active subscription
--    - Organization 2 (Healthcare Plus): Standard features, active subscription
--
-- ✅ Roles: 13 total roles
--    - Organization 1: 8 roles (admin, doctor, nurse, receptionist, sample_taker, patient, pharmacist, billing_clerk)
--    - Organization 2: 5 roles (admin, doctor, nurse, receptionist, patient)
--
-- ✅ All roles have detailed permissions for different modules
-- ✅ System roles (is_system=true) are core roles, custom roles have is_system=false
