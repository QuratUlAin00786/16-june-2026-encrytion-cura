-- ============================================
-- CURA EMR - Organizations and Users INSERT Queries
-- Generated: November 16, 2025
-- ============================================

-- ============================================
-- ORGANIZATIONS TABLE INSERTS
-- ============================================

-- Organization 1: Averox Healthcare (Demo)
INSERT INTO organizations (id, name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at)
VALUES (
  1,
  'Averox Healthcare',
  'demo',
  'admin@averox-healthcare.com',
  'UK',
  'MediCore Demo',
  '{"theme": {"logoUrl": "", "primaryColor": "#3b82f6"}, "features": {"aiEnabled": true, "billingEnabled": true}, "compliance": {"gdprEnabled": true, "dataResidency": "UK"}}'::jsonb,
  '{}'::jsonb,
  'full',
  'active',
  '2025-10-28 08:20:47.461294',
  '2025-10-28 08:20:47.461294'
);

-- Organization 2: Health
INSERT INTO organizations (id, name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at)
VALUES (
  2,
  'health',
  'health',
  'quratulain009911@outlook.com',
  'UK',
  'health',
  '{}'::jsonb,
  '{"maxUsers": 10, "aiEnabled": true, "maxPatients": 100, "billingEnabled": true, "analyticsEnabled": true, "telemedicineEnabled": true}'::jsonb,
  'full',
  'active',
  '2025-10-28 14:02:33.122624',
  '2025-10-28 14:02:33.122624'
);

-- Organization 3: Cura Healthcare
INSERT INTO organizations (id, name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at)
VALUES (
  3,
  'Cura Healthcare',
  'cura',
  'admin@curaemr.ai',
  'UK',
  'Cura EMR',
  '{"theme": {"logoUrl": "", "primaryColor": "#3b82f6"}, "features": {"aiEnabled": true, "billingEnabled": true}, "compliance": {"gdprEnabled": true, "dataResidency": "UK"}}'::jsonb,
  '{}'::jsonb,
  'full',
  'active',
  '2025-10-29 19:51:12.545201',
  '2025-10-29 19:51:12.545201'
);

-- Organization 4: Medical Center
INSERT INTO organizations (id, name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at)
VALUES (
  4,
  'Medical center',
  'medical-center',
  'maryamkhann214@gmail.com',
  'UK',
  'Medical Health',
  '{}'::jsonb,
  '{"maxUsers": 20, "aiEnabled": true, "maxPatients": 100, "billingEnabled": true, "analyticsEnabled": true, "telemedicineEnabled": true}'::jsonb,
  'full',
  'active',
  '2025-11-01 07:27:35.092375',
  '2025-11-01 07:27:35.092375'
);

-- ============================================
-- USERS TABLE INSERTS
-- ============================================

-- User 1: System Admin (Organization 1)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  1,
  1,
  'admin@cura.com',
  'admin',
  '$2b$12$w54vDRWfGGi9zBlhUvGBHeLlF3VuzkUO7RmDF5xjOXgUeaxuxVaVK',
  'John',
  'Administrator',
  'admin',
  'Administration',
  NULL,
  NULL,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  '{"end": "17:00", "start": "09:00"}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 08:20:50.10928'
);

-- User 2: Doctor - Sarah Smith (Organization 1)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  2,
  1,
  'doctor@cura.com',
  'doctor',
  '$2b$12$zhRaOGhZc5KXkd.Zyid40eRM.PlLctLabr3toxzMybPzk.5wilp8i',
  'Sarah',
  'Smith',
  'doctor',
  'Cardiology',
  NULL,
  NULL,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  '{"end": "17:00", "start": "08:00"}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 08:20:50.10928'
);

-- User 3: Nurse - Emily Johnson (Organization 1)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  3,
  1,
  'nurse@cura.com',
  'nurse',
  '$2b$12$Slmtt9fDo5XpiRCOWdZMBeEXbWouQLib76Fh30tQgGEgvfN1QOfbK',
  'Emily',
  'Johnson',
  'nurse',
  'General Medicine',
  NULL,
  NULL,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  '{"end": "19:00", "start": "07:00"}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 08:20:50.10928'
);

-- User 4: Patient - Michael Patient (Organization 1)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  4,
  1,
  'patient@cura.com',
  'patient',
  '$2b$12$FlhVqP39HHSoYziKhSmAF.7cPfR0HDXh/p1n6R41wzaJ3WWspyBTO',
  'Michael',
  'Patient',
  'patient',
  NULL,
  NULL,
  NULL,
  ARRAY[]::text[],
  '{}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 08:20:50.10928'
);

-- User 6: Doctor - Michael Johnson (Organization 1)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  6,
  1,
  'doctor2@cura.com',
  'doctor2',
  '$2b$12$zhRaOGhZc5KXkd.Zyid40eRM.PlLctLabr3toxzMybPzk.5wilp8i',
  'Michael',
  'Johnson',
  'doctor',
  'Neurology',
  NULL,
  NULL,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  '{"end": "18:00", "start": "09:00"}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 08:20:50.10928'
);

-- User 7: Doctor - David Wilson (Organization 1)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  7,
  1,
  'doctor3@cura.com',
  'doctor3',
  '$2b$12$zhRaOGhZc5KXkd.Zyid40eRM.PlLctLabr3toxzMybPzk.5wilp8i',
  'David',
  'Wilson',
  'doctor',
  'Orthopedics',
  NULL,
  NULL,
  ARRAY['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  '{"end": "16:30", "start": "08:30"}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 08:20:50.10928'
);

-- User 8: Doctor - Lisa Anderson (Organization 1)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  8,
  1,
  'doctor4@cura.com',
  'doctor4',
  '$2b$12$zhRaOGhZc5KXkd.Zyid40eRM.PlLctLabr3toxzMybPzk.5wilp8i',
  'Lisa',
  'Anderson',
  'doctor',
  'Pediatrics',
  NULL,
  NULL,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  '{"end": "16:00", "start": "08:00"}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 08:20:50.10928'
);

-- User 9: Doctor - Robert Brown (Organization 1)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  9,
  1,
  'doctor5@cura.com',
  'doctor5',
  '$2b$12$zhRaOGhZc5KXkd.Zyid40eRM.PlLctLabr3toxzMybPzk.5wilp8i',
  'Robert',
  'Brown',
  'doctor',
  'Dermatology',
  NULL,
  NULL,
  ARRAY['Monday', 'Wednesday', 'Friday'],
  '{"end": "18:00", "start": "10:00"}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 08:20:50.10928'
);

-- User 10: Receptionist - Jane Thompson (Organization 1)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  10,
  1,
  'receptionist@cura.com',
  'receptionist',
  '$2b$12$w54vDRWfGGi9zBlhUvGBHeLlF3VuzkUO7RmDF5xjOXgUeaxuxVaVK',
  'Jane',
  'Thompson',
  'receptionist',
  'Front Desk',
  NULL,
  NULL,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  '{"end": "17:00", "start": "08:00"}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 08:20:50.10928'
);

-- User 12: Lab Technician - Maria Rodriguez (Organization 1)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  12,
  1,
  'labtech@cura.com',
  'labtech',
  '$2b$10$M20eZISsX6Ev9DbtvM2H4eXJ9PWFGRuEp459r4F1Q2hDADDr5COOO',
  'Maria',
  'Rodriguez',
  'lab_technician',
  'Laboratory',
  NULL,
  NULL,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  '{"end": "14:00", "start": "06:00"}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 09:07:50.767653'
);

-- User 14: Admin - Qurat Ain (Organization 2)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at)
VALUES (
  14,
  2,
  'quratulain009911@outlook.com',
  'quratulain009911@outlook.com',
  '$2b$10$nIOJLCaMLUdcrYuVKaEZ7enQ3ywpmsIR2zGzU3V0guDX6S.GFRIv.',
  'Qurat',
  'Ain',
  'admin',
  NULL,
  NULL,
  NULL,
  ARRAY[]::text[],
  '{}'::jsonb,
  '{}'::jsonb,
  true,
  false,
  NULL,
  '2025-10-28 14:02:33.854345'
);

-- ============================================
-- SEQUENCE UPDATES
-- ============================================

-- Update the organizations sequence to the next available ID
SELECT setval('organizations_id_seq', (SELECT MAX(id) FROM organizations));

-- Update the users sequence to the next available ID
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- ============================================
-- NOTES
-- ============================================
-- Password hashes are bcrypt encrypted
-- Default passwords for demo users:
--   - Most users: 'password123' (hashed)
--   - Specific users may have different passwords
-- 
-- Organizations:
--   - Organization 1: Averox Healthcare (demo subdomain)
--   - Organization 2: Health (health subdomain)
--   - Organization 3: Cura Healthcare (cura subdomain)
--   - Organization 4: Medical Center (medical-center subdomain)
--
-- Multi-tenancy:
--   - Each user is associated with an organization via organization_id
--   - Users can only access data within their organization
--   - Subdomain-based routing isolates tenant data
