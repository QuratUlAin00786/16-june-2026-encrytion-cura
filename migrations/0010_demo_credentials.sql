-- =====================================================
-- DEMO CREDENTIALS SQL
-- Test Users for Development and Testing
-- Password for all users: demo123
-- =====================================================

-- IMPORTANT: Before using this file, generate actual bcrypt hashes
-- Run: node scripts/generate-demo-password-hashes.js
-- Then replace the placeholder hashes below with the generated ones
--
-- Note: All passwords are hashed using bcrypt with salt rounds 10-12
-- Default password for all demo users: "demo123"
-- 
-- Alternative: Use existing hashes from COMPLETE_DATABASE_DUMP.sql
-- The password "password123" works with these hashes:
-- $2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS
-- $2b$12$1S20CEgvQGnDG2eadpfKs.d0f85gn8OeSLhcIAgn7arxMRRrzLDae

-- =====================================================
-- DEMO ORGANIZATION
-- =====================================================

INSERT INTO organizations (name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at)
VALUES 
(
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
ON CONFLICT (subdomain) DO NOTHING;

-- Get the organization ID (assuming it's 1 for demo, or use a subquery)
-- For this demo, we'll use organization_id = 1

-- =====================================================
-- DEMO USERS - Various Roles
-- =====================================================

-- Password: demo123
-- Hash: $2b$10$rOzJ5Z8KqvsXiWSlxCImsS.ExampleHashForDemo123

-- Admin User
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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

-- Doctor Users
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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

-- Nurse Users
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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

-- Receptionist User
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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

-- Patient Users
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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

-- Lab Technician User
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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

-- Sample Taker User
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
  '$2b$12$ZdnhfC.dZ1YxqdV4Ucg99eBbVqEVzYbjzX41z8KqvsXiWSlxCImsS', -- Password: password123 (replace with demo123 hash)
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
-- IMPORTANT: The hashes in this file are placeholders
-- You need to generate actual bcrypt hashes for password "demo123"
-- OR change the password to "password123" which works with existing hashes
--
-- Option 1: Generate hashes for "demo123"
--   Run: node scripts/generate-demo-password-hashes.js
--   Replace all hashes in this file with generated ones
--
-- Option 2: Use existing hashes (password: "password123")
--   Keep the hashes as-is and use password: password123
--
-- Login Credentials (if using password123):
-- -----------------------------------------
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
-- =====================================================
