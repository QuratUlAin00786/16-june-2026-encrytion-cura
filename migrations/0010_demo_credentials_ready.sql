-- =====================================================
-- DEMO CREDENTIALS SQL - READY TO USE
-- Test Users for Development and Testing
-- Password for all users: password123
-- =====================================================

-- This file uses working bcrypt hashes from the existing database
-- All users can login with password: password123

-- Ensure organization exists first
INSERT INTO organizations (id, name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at)
VALUES 
(
  1,
  'Demo Healthcare Clinic',
  'demo',
  'admin@demo-clinic.com',
  'UK',
  'Demo Clinic',
  '{"theme": {"logoUrl": "", "primaryColor": "#3b82f6"}, "features": {"aiEnabled": true, "billingEnabled": true}, "compliance": {"gdprEnabled": true, "dataResidency": "UK"}}',
  '{"maxUsers": 50, "maxPatients": 1000, "aiEnabled": true, "telemedicineEnabled": true, "billingEnabled": true, "analyticsEnabled": true}',
  'full',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subdomain = EXCLUDED.subdomain,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Admin User (password: password123)
INSERT INTO users (
  organization_id, 
  email, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  role, 
  department, 
  working_days, 
  working_hours, 
  permissions, 
  is_active, 
  is_saas_owner, 
  created_at
)
VALUES 
(
  1,
  'admin@demo.com',
  'admin',
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS',
  'John',
  'Administrator',
  'admin',
  'Administration',
  '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
  '{"start": "09:00", "end": "17:00"}',
  '{"modules": {"patients": {"view": true, "create": true, "edit": true, "delete": true}, "appointments": {"view": true, "create": true, "edit": true, "delete": true}, "medicalRecords": {"view": true, "create": true, "edit": true, "delete": true}, "prescriptions": {"view": true, "create": true, "edit": true, "delete": true}, "billing": {"view": true, "create": true, "edit": true, "delete": true}}}',
  true,
  false,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Doctor Users (password: password123)
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
  working_days, 
  working_hours, 
  permissions, 
  is_active, 
  is_saas_owner, 
  created_at
)
VALUES 
(
  1,
  'doctor@demo.com',
  'doctor',
  '$2b$12$1S20CEgvQGnDG2eadpfKs.d0f85gn8OeSLhcIAgn7arxMRRrzLDae',
  'Sarah',
  'Smith',
  'doctor',
  'Cardiology',
  'Cardiology',
  '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
  '{"start": "08:00", "end": "17:00"}',
  '{}',
  true,
  false,
  NOW()
),
(
  1,
  'doctor2@demo.com',
  'doctor2',
  '$2b$12$1S20CEgvQGnDG2eadpfKs.d0f85gn8OeSLhcIAgn7arxMRRrzLDae',
  'Michael',
  'Johnson',
  'doctor',
  'Neurology',
  'Neurology',
  '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
  '{"start": "09:00", "end": "18:00"}',
  '{}',
  true,
  false,
  NOW()
),
(
  1,
  'doctor3@demo.com',
  'doctor3',
  '$2b$12$1S20CEgvQGnDG2eadpfKs.d0f85gn8OeSLhcIAgn7arxMRRrzLDae',
  'David',
  'Wilson',
  'doctor',
  'Orthopedics',
  'Orthopedics',
  '["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]',
  '{"start": "08:30", "end": "16:30"}',
  '{}',
  true,
  false,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Nurse Users (password: password123)
INSERT INTO users (
  organization_id, 
  email, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  role, 
  department, 
  working_days, 
  working_hours, 
  permissions, 
  is_active, 
  is_saas_owner, 
  created_at
)
VALUES 
(
  1,
  'nurse@demo.com',
  'nurse',
  '$2b$12$ICMbdvIDvWPNpCJ6VmpASOm6DP3kpetC/h5A6Bgg/ucSjzMGgASJe',
  'Emily',
  'Johnson',
  'nurse',
  'General Medicine',
  '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]',
  '{"start": "07:00", "end": "19:00"}',
  '{}',
  true,
  false,
  NOW()
),
(
  1,
  'nurse2@demo.com',
  'nurse2',
  '$2b$12$ICMbdvIDvWPNpCJ6VmpASOm6DP3kpetC/h5A6Bgg/ucSjzMGgASJe',
  'Jennifer',
  'Brown',
  'nurse',
  'Emergency',
  '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
  '{"start": "08:00", "end": "16:00"}',
  '{}',
  true,
  false,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Receptionist User (password: password123)
INSERT INTO users (
  organization_id, 
  email, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  role, 
  department, 
  working_days, 
  working_hours, 
  permissions, 
  is_active, 
  is_saas_owner, 
  created_at
)
VALUES 
(
  1,
  'receptionist@demo.com',
  'receptionist',
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS',
  'Jane',
  'Thompson',
  'receptionist',
  'Front Desk',
  '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
  '{"start": "08:00", "end": "17:00"}',
  '{}',
  true,
  false,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Patient Users (password: password123)
INSERT INTO users (
  organization_id, 
  email, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  role, 
  department, 
  working_days, 
  working_hours, 
  permissions, 
  is_active, 
  is_saas_owner, 
  created_at
)
VALUES 
(
  1,
  'patient@demo.com',
  'patient',
  '$2b$12$.f8QJZ5CKKpv0kQ1ljMwZusOKuUrmI/II6F7xhH7eyw49Kt3xOK26',
  'Michael',
  'Patient',
  'patient',
  NULL,
  '[]',
  '{}',
  '{}',
  true,
  false,
  NOW()
),
(
  1,
  'patient2@demo.com',
  'patient2',
  '$2b$12$.f8QJZ5CKKpv0kQ1ljMwZusOKuUrmI/II6F7xhH7eyw49Kt3xOK26',
  'Emma',
  'Williams',
  'patient',
  NULL,
  '[]',
  '{}',
  '{}',
  true,
  false,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Lab Technician User (password: password123)
INSERT INTO users (
  organization_id, 
  email, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  role, 
  department, 
  working_days, 
  working_hours, 
  permissions, 
  is_active, 
  is_saas_owner, 
  created_at
)
VALUES 
(
  1,
  'labtech@demo.com',
  'labtech',
  '$2b$12$p9M56FsvliatdGowZmgmMOjVl8cR5S9mEMRrNbM1hOYbxfkCP/q1.',
  'Maria',
  'Rodriguez',
  'lab_technician',
  'Laboratory',
  '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
  '{"start": "06:00", "end": "14:00"}',
  '{}',
  true,
  false,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Sample Taker User (password: password123)
INSERT INTO users (
  organization_id, 
  email, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  role, 
  department, 
  working_days, 
  working_hours, 
  permissions, 
  is_active, 
  is_saas_owner, 
  created_at
)
VALUES 
(
  1,
  'sampletaker@demo.com',
  'sampletaker',
  '$2b$12$p9M56FsvliatdGowZmgmMOjVl8cR5S9mEMRrNbM1hOYbxfkCP/q1.',
  'Robert',
  'Davis',
  'sample_taker',
  'Laboratory',
  '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]',
  '{"start": "08:00", "end": "16:00"}',
  '{}',
  true,
  false,
  NOW()
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- CREDENTIALS SUMMARY
-- =====================================================
-- 
-- All users use password: password123
--
-- Login Credentials:
-- -----------------
-- Admin:        admin@demo.com / admin / password123
-- Doctor 1:     doctor@demo.com / doctor / password123
-- Doctor 2:     doctor2@demo.com / doctor2 / password123
-- Doctor 3:     doctor3@demo.com / doctor3 / password123
-- Nurse 1:      nurse@demo.com / nurse / password123
-- Nurse 2:      nurse2@demo.com / nurse2 / password123
-- Receptionist: receptionist@demo.com / receptionist / password123
-- Patient 1:    patient@demo.com / patient / password123
-- Patient 2:    patient2@demo.com / patient2 / password123
-- Lab Tech:     labtech@demo.com / labtech / password123
-- Sample Taker: sampletaker@demo.com / sampletaker / password123
--
-- Organization Subdomain: demo
-- Organization ID: 1
-- =====================================================
