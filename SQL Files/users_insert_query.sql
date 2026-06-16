-- =============================================
-- USERS TABLE INSERT QUERY
-- =============================================

-- Basic INSERT (Auto-increment ID, default timestamps)
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
    1,                                    -- organization_id (required)
    'doctor@example.com',                 -- email (required, unique)
    'dr.john.doe',                        -- username (required, unique)
    '$2b$10$hashexample...',              -- password_hash (bcrypt hash, required)
    'John',                               -- first_name (required)
    'Doe',                                -- last_name (required)
    'doctor',                             -- role: doctor, nurse, admin, patient, etc.
    'Cardiology',                         -- department (optional)
    'Internal Medicine',                  -- medical_specialty_category (optional)
    'Cardiology',                         -- sub_specialty (optional)
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,  -- working_days
    '{"start":"09:00","end":"17:00"}'::jsonb,  -- working_hours
    '{}'::jsonb,                          -- permissions (JSON object)
    true,                                 -- is_active (default: true)
    false                                 -- is_saas_owner (default: false)
);
-- Note: id and created_at are auto-generated


-- =============================================
-- SAMPLE INSERTS FOR DIFFERENT ROLES
-- =============================================

-- 1. Doctor User
INSERT INTO public.users (
    organization_id, email, username, password_hash, 
    first_name, last_name, role, department,
    medical_specialty_category, sub_specialty,
    working_days, working_hours, is_active
) VALUES (
    1,
    'dr.smith@hospital.com',
    'dr.smith',
    '$2b$10$examplehash123',
    'Sarah',
    'Smith',
    'doctor',
    'Emergency Medicine',
    'Emergency Medicine',
    'Trauma',
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '{"start":"08:00","end":"18:00"}'::jsonb,
    true
);

-- 2. Nurse User
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, department, is_active
) VALUES (
    1,
    'nurse.johnson@hospital.com',
    'nurse.johnson',
    '$2b$10$examplehash456',
    'Mary',
    'Johnson',
    'nurse',
    'Pediatrics',
    true
);

-- 3. Admin User
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, permissions, is_active
) VALUES (
    1,
    'admin@hospital.com',
    'admin',
    '$2b$10$examplehash789',
    'Admin',
    'User',
    'admin',
    '{"full_access": true}'::jsonb,
    true
);

-- 4. Receptionist User
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active
) VALUES (
    1,
    'reception@hospital.com',
    'receptionist',
    '$2b$10$examplehash012',
    'Lisa',
    'Brown',
    'receptionist',
    true
);

-- 5. Lab Technician User
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, department, is_active
) VALUES (
    1,
    'lab.tech@hospital.com',
    'labtech',
    '$2b$10$examplehash345',
    'Robert',
    'Wilson',
    'lab_technician',
    'Laboratory',
    true
);


-- =============================================
-- BULK INSERT (Multiple Users)
-- =============================================

INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active
) VALUES
    (1, 'user1@example.com', 'user1', '$2b$10$hash1', 'First1', 'Last1', 'doctor', true),
    (1, 'user2@example.com', 'user2', '$2b$10$hash2', 'First2', 'Last2', 'nurse', true),
    (1, 'user3@example.com', 'user3', '$2b$10$hash3', 'First3', 'Last3', 'admin', true);


-- =============================================
-- QUERY TO GENERATE PASSWORD HASH (Using bcrypt)
-- =============================================
-- In Node.js/JavaScript:
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('password123', 10);


-- =============================================
-- AVAILABLE ROLES
-- =============================================
-- Common roles in the system:
-- - doctor
-- - nurse
-- - admin
-- - patient
-- - receptionist
-- - lab_technician
-- - radiologist
-- - pharmacist
-- - accountant
-- - billing_clerk


-- =============================================
-- NOTES
-- =============================================
-- 1. id: Auto-incremented, don't include in INSERT
-- 2. created_at: Auto-generated timestamp, don't include
-- 3. last_login_at: Initially NULL, updated on login
-- 4. password_hash: Must be bcrypt hashed, never plain text
-- 5. email & username: Must be unique
-- 6. working_days: JSON array of day names
-- 7. working_hours: JSON object with start/end times
-- 8. permissions: JSON object for custom permissions

