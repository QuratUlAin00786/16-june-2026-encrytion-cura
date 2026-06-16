-- =====================================================
-- CURA EMR SYSTEM - INSERT QUERIES
-- =====================================================
-- Database: PostgreSQL (Neon Serverless)
-- Generated: October 17, 2025
-- Tables: Organizations, Users
-- =====================================================

-- =====================================================
-- ORGANIZATIONS TABLE INSERT QUERIES
-- =====================================================

-- Organization 1: Averox Healthcare (Demo Organization)
INSERT INTO organizations (
    name, 
    subdomain, 
    email, 
    region, 
    brand_name, 
    settings, 
    features, 
    access_level, 
    subscription_status
) VALUES (
    'Averox Healthcare',
    'demo',export your entire PostgreSQL database, including:

    all tables,

    constraints (primary keys, foreign keys, check constraints, etc.),

    schemas,

    and data (rows),
    into a single .sql dump file — perfect for backups or migration.
    'admin@averox-healthcare.com',
    'UK',
    'MediCore Demo',
    '{
        "theme": {
            "logoUrl": "",
            "primaryColor": "#3b82f6"
        },
        "features": {
            "aiEnabled": true,
            "billingEnabled": true
        },
        "compliance": {
            "gdprEnabled": true,
            "dataResidency": "UK"
        }
    }'::jsonb,
    '{}'::jsonb,
    'full',
    'active'
);

-- Organization 2: City Medical Center
INSERT INTO organizations (
    name, 
    subdomain, 
    email, 
    region, 
    brand_name, 
    settings, 
    features, 
    access_level, 
    subscription_status
) VALUES (
    'City Medical Center',
    'citymed',
    'admin@citymedical.com',
    'UK',
    'City Medical Center',
    '{
        "theme": {
            "logoUrl": "/logos/citymed.png",
            "primaryColor": "#4A7DFF"
        },
        "features": {
            "aiEnabled": true,
            "billingEnabled": true,
            "telemedicineEnabled": true
        },
        "compliance": {
            "gdprEnabled": true,
            "dataResidency": "UK"
        }
    }'::jsonb,
    '{
        "maxUsers": 50,
        "maxPatients": 1000,
        "storageGB": 100
    }'::jsonb,
    'full',
    'active'
);

-- Organization 3: London Health Clinic
INSERT INTO organizations (
    name, 
    subdomain, 
    email, 
    region, 
    brand_name, 
    settings, 
    features, 
    access_level, 
    subscription_status
) VALUES (
    'London Health Clinic',
    'londonhealth',
    'contact@londonhealth.co.uk',
    'UK',
    'London Health Clinic',
    '{
        "theme": {
            "logoUrl": "/logos/lhc.png",
            "primaryColor": "#7279FB"
        },
        "features": {
            "aiEnabled": true,
            "billingEnabled": true,
            "inventoryEnabled": true
        },
        "compliance": {
            "gdprEnabled": true,
            "dataResidency": "UK"
        }
    }'::jsonb,
    '{
        "maxUsers": 100,
        "maxPatients": 5000,
        "storageGB": 500
    }'::jsonb,
    'full',
    'active'
);

-- Organization 4: Manchester Family Practice
INSERT INTO organizations (
    name, 
    subdomain, 
    email, 
    region, 
    brand_name, 
    settings, 
    features, 
    access_level, 
    subscription_status
) VALUES (
    'Manchester Family Practice',
    'manchesterfp',
    'admin@manchesterfp.nhs.uk',
    'UK',
    'Manchester Family Practice',
    '{
        "theme": {
            "logoUrl": "",
            "primaryColor": "#6CFFEB"
        },
        "features": {
            "aiEnabled": false,
            "billingEnabled": true
        },
        "compliance": {
            "gdprEnabled": true,
            "dataResidency": "UK"
        }
    }'::jsonb,
    '{
        "maxUsers": 25,
        "maxPatients": 500,
        "storageGB": 50
    }'::jsonb,
    'full',
    'trial'
);

-- Organization 5: Metro Health Center
INSERT INTO organizations (
    name, 
    subdomain, 
    email, 
    region, 
    brand_name, 
    settings, 
    features, 
    access_level, 
    subscription_status
) VALUES (
    'Metro Health Center',
    'metro44',
    'admin@metrohealthcenter.com',
    'UK',
    'Metro Health',
    '{
        "theme": {
            "logoUrl": "/logos/metro.png",
            "primaryColor": "#4A7DFF"
        },
        "features": {
            "aiEnabled": true,
            "billingEnabled": true,
            "telemedicineEnabled": true,
            "inventoryEnabled": true
        },
        "compliance": {
            "gdprEnabled": true,
            "dataResidency": "UK"
        }
    }'::jsonb,
    '{
        "maxUsers": 200,
        "maxPatients": 10000,
        "storageGB": 1000,
        "prioritySupport": true
    }'::jsonb,
    'full',
    'active'
);

-- Organization 6: Birmingham Dental Care
INSERT INTO organizations (
    name, 
    subdomain, 
    email, 
    region, 
    brand_name, 
    settings, 
    features, 
    access_level, 
    subscription_status
) VALUES (
    'Birmingham Dental Care',
    'birminghamdental',
    'reception@birminghamdental.co.uk',
    'UK',
    'Birmingham Dental Care',
    '{
        "theme": {
            "logoUrl": "",
            "primaryColor": "#3b82f6"
        },
        "features": {
            "aiEnabled": false,
            "billingEnabled": true
        },
        "compliance": {
            "gdprEnabled": true,
            "dataResidency": "UK"
        }
    }'::jsonb,
    '{
        "maxUsers": 15,
        "maxPatients": 300,
        "storageGB": 25
    }'::jsonb,
    'full',
    'active'
);

-- =====================================================
-- USERS TABLE INSERT QUERIES
-- =====================================================

-- Note: Password hash is for "password123" (bcrypt hashed)
-- In production, always use properly hashed passwords!

-- Users for Organization 1 (Averox Healthcare - demo)

-- User 1: Admin
INSERT INTO users (
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
    1,
    'admin@cura.com',
    'admin',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'John',
    'Administrator',
    'admin',
    'Administration',
    NULL,
    NULL,
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start": "09:00", "end": "17:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 2: Doctor
INSERT INTO users (
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
    1,
    'doctor@cura.com',
    'doctor',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Sarah',
    'Smith',
    'doctor',
    'General Practice',
    'General Practice',
    'Family Medicine',
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start": "08:00", "end": "16:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 3: Nurse
INSERT INTO users (
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
    1,
    'nurse@cura.com',
    'nurse',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Emily',
    'Johnson',
    'nurse',
    'Nursing',
    NULL,
    NULL,
    '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'::jsonb,
    '{"start": "07:00", "end": "15:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 4: Patient
INSERT INTO users (
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
    1,
    'patient@cura.com',
    'patient',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Michael',
    'Patient',
    'patient',
    NULL,
    NULL,
    NULL,
    '[]'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 5: Lab Technician
INSERT INTO users (
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
    1,
    'labtech@cura.com',
    'labtech',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Maria',
    'Rodriguez',
    'lab_technician',
    'Laboratory',
    NULL,
    NULL,
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start": "06:00", "end": "14:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 6: Receptionist
INSERT INTO users (
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
    1,
    'receptionist@cura.com',
    'receptionist',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Jessica',
    'Williams',
    'receptionist',
    'Front Desk',
    NULL,
    NULL,
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start": "08:00", "end": "17:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- Users for Organization 2 (City Medical Center)

-- User 7: Admin for City Medical
INSERT INTO users (
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
    2,
    'admin@citymedical.com',
    'citymed_admin',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Robert',
    'Taylor',
    'admin',
    'Administration',
    NULL,
    NULL,
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start": "09:00", "end": "18:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 8: Cardiologist
INSERT INTO users (
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
    2,
    'dr.heart@citymedical.com',
    'dr_cardiologist',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'James',
    'Heart',
    'doctor',
    'Cardiology',
    'Cardiology',
    'Interventional Cardiology',
    '["Monday","Tuesday","Wednesday","Thursday"]'::jsonb,
    '{"start": "08:00", "end": "17:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 9: Dentist
INSERT INTO users (
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
    2,
    'dr.teeth@citymedical.com',
    'dr_dentist',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Amanda',
    'Bright',
    'dentist',
    'Dentistry',
    'Dentistry',
    'Cosmetic Dentistry',
    '["Monday","Wednesday","Friday"]'::jsonb,
    '{"start": "09:00", "end": "16:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- Users for Organization 3 (London Health Clinic)

-- User 10: Admin for London Health
INSERT INTO users (
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
    3,
    'admin@londonhealth.co.uk',
    'london_admin',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Victoria',
    'London',
    'admin',
    'Administration',
    NULL,
    NULL,
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start": "08:30", "end": "17:30"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 11: Physiotherapist
INSERT INTO users (
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
    3,
    'physio@londonhealth.co.uk',
    'physio_specialist',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'David',
    'Strong',
    'physiotherapist',
    'Physiotherapy',
    'Physiotherapy',
    'Sports Rehabilitation',
    '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'::jsonb,
    '{"start": "07:00", "end": "15:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 12: Pharmacist
INSERT INTO users (
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
    3,
    'pharmacist@londonhealth.co.uk',
    'pharmacist_london',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Sophie',
    'Medic',
    'pharmacist',
    'Pharmacy',
    NULL,
    NULL,
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start": "09:00", "end": "18:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- Users for Organization 5 (Metro Health Center - metro44)

-- User 13: Admin for Metro Health
INSERT INTO users (
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
    5,
    'admin@metrohealthcenter.com',
    'metro_admin',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Alexander',
    'Metro',
    'admin',
    'Administration',
    NULL,
    NULL,
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start": "08:00", "end": "17:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 14: Aesthetician
INSERT INTO users (
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
    5,
    'aesthetician@metrohealthcenter.com',
    'aesthetician_metro',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Isabella',
    'Beauty',
    'aesthetician',
    'Aesthetics',
    'Aesthetics',
    'Facial Treatments',
    '["Tuesday","Wednesday","Thursday","Friday","Saturday"]'::jsonb,
    '{"start": "10:00", "end": "18:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- User 15: Optician
INSERT INTO users (
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
    5,
    'optician@metrohealthcenter.com',
    'optician_metro',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'Oliver',
    'Vision',
    'optician',
    'Optometry',
    'Optometry',
    'Contact Lens Specialist',
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start": "09:00", "end": "17:00"}'::jsonb,
    '{}'::jsonb,
    true,
    false
);

-- SaaS Owner (System-wide user with organizationId = 0)
INSERT INTO users (
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
    0,
    'saas_admin@curaemr.ai',
    'saas_admin',
    '$2b$10$rZL3DKZhYKGJvPz5XKqIqO5RZG3FvK/b1gP0Wz5xJqPr0p5YqK5Hm',
    'SaaS',
    'Administrator',
    'admin',
    'Platform Administration',
    NULL,
    NULL,
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start": "00:00", "end": "23:59"}'::jsonb,
    '{}'::jsonb,
    true,
    true
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count organizations
-- SELECT COUNT(*) as total_organizations FROM organizations;

-- Count users per organization
-- SELECT organization_id, COUNT(*) as user_count 
-- FROM users 
-- WHERE is_saas_owner = false
-- GROUP BY organization_id 
-- ORDER BY organization_id;

-- List all users with their organizations
-- SELECT 
--     u.id,
--     u.email,
--     u.username,
--     u.first_name,
--     u.last_name,
--     u.role,
--     o.name as organization_name,
--     o.subdomain
-- FROM users u
-- LEFT JOIN organizations o ON u.organization_id = o.id
-- ORDER BY u.organization_id, u.id;

-- =====================================================
-- NOTES
-- =====================================================

-- 1. Password Hash: All users have password "password123" (hashed with bcrypt)
--    In production, use strong, unique passwords!

-- 2. Multi-Tenancy: Users are isolated by organization_id
--    - organizationId = 0 is for SaaS owners (platform admins)
--    - organizationId > 0 is for organization-specific users

-- 3. Roles Available:
--    - admin: Full system access
--    - doctor: Medical practitioners
--    - nurse: Nursing staff
--    - patient: Patient portal users
--    - receptionist: Front desk staff
--    - lab_technician: Laboratory staff
--    - pharmacist: Pharmacy staff
--    - dentist: Dental practitioners
--    - dental_nurse: Dental nursing staff
--    - phlebotomist: Blood sample collection
--    - aesthetician: Aesthetic treatments
--    - optician: Eye care specialists
--    - paramedic: Emergency medical services
--    - physiotherapist: Physical therapy
--    - sample_taker: Sample collection staff
--    - other: Other roles

-- 4. Working Days Format: JSON array of day names
--    Example: '["Monday","Tuesday","Wednesday","Thursday","Friday"]'

-- 5. Working Hours Format: JSON object with start and end times
--    Example: '{"start": "09:00", "end": "17:00"}'

-- =====================================================
-- END OF INSERT QUERIES
-- =====================================================
