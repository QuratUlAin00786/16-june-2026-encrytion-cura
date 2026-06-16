-- =====================================================
-- USERS TABLE INSERT QUERIES
-- Based on existing database data
-- =====================================================

INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, working_days, working_hours, permissions, is_active, is_saas_owner, created_at) VALUES
(1, 1, 'admin@cura.com', 'admin', '$2b$12$b/B.E3VvdY.ccaJ...', 'Admin', 'User', 'admin', 'Administration', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"all": ["view", "create", "edit", "delete"]}', true, false, NOW()),
(2, 1, 'doctor@cura.com', 'doctor', '$2b$12$yvSZocn7EVU04vKn...', 'Doctor', 'User', 'doctor', 'General Medicine', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, false, NOW()),
(3, 1, 'nurse@cura.com', 'nurse', '$2b$12$Lqldotr2gnjhgW/...', 'Nurse', 'User', 'nurse', 'General Care', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "08:00", "end": "16:00"}', '{"appointments": ["view", "create"], "patients": ["view", "edit"]}', true, false, NOW()),
(4, 1, 'patient@cura.com', 'patient', '$2b$12$BVw0Bf7v5gxVDvL...', 'Patient', 'User', 'patient', NULL, '[]', '{}', '{"appointments": ["view"]}', true, false, NOW()),
(5, 1, 'labtech@cura.com', 'labtech', '$2b$12$SEbIpnZF.A6vdXN...', 'Lab', 'Technician', 'sample_taker', 'Laboratory', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "07:00", "end": "15:00"}', '{"lab_results": ["view", "create", "edit"]}', true, false, NOW()),
(6, 1, 'doctor2@cura.com', 'doctor2', '$2b$12$yvSZocn7EVU04vKn...', 'Doctor', 'Two', 'doctor', 'Cardiology', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, false, NOW()),
(7, 1, 'doctor3@cura.com', 'doctor3', '$2b$12$yvSZocn7EVU04vKn...', 'Doctor', 'Three', 'doctor', 'Pediatrics', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, false, NOW()),
(8, 1, 'doctor4@cura.com', 'doctor4', '$2b$12$yvSZocn7EVU04vKn...', 'Doctor', 'Four', 'doctor', 'Orthopedics', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, false, NOW()),
(9, 1, 'doctor5@cura.com', 'doctor5', '$2b$12$yvSZocn7EVU04vKn...', 'Doctor', 'Five', 'doctor', 'Neurology', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, false, NOW()),
(10, 1, 'receptionist@cura.com', 'receptionist', '$2b$12$b/B.E3VvdY.ccaJ...', 'Front', 'Desk', 'receptionist', 'Reception', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "08:00", "end": "18:00"}', '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, false, NOW()),
(11, 0, 'saas_admin@curaemr.al', 'saas_admin', '$2b$12$pHqRbBmVT8a1TJ...', 'SaaS', 'Admin', 'admin', 'Platform', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"all": ["view", "create", "edit", "delete"]}', true, true, NOW()),
(12, 1, 'quratulain@09911@outlo...', 'quratulain@09911@outlo...', '$2b$12$0RmFFoBNMf1/sf6...', 'Quratulain', 'User', 'doctor', 'General Medicine', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, false, NOW()),
(13, 1, 'p89689@cura.com', 'p89689@cura.com', '$2b$12$yvgqvpRuKs0a3Ztb...', 'P89689', 'User', 'patient', NULL, '[]', '{}', '{"appointments": ["view"]}', true, false, NOW()),
(14, 2, 'quratulain888@yahoo.com', 'quratulain888@yahoo.com', '$2b$12$5t.zeQUwLx41z0k...', 'Quratulain', 'User2', 'admin', 'Administration', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"all": ["view", "create", "edit", "delete"]}', true, false, NOW()),
(15, 2, 'patient0rg1@cura.com', 'patient123', '$2b$12$ExY3QsWNxqWsLOv...', 'Patient', 'Org1', 'patient', NULL, '[]', '{}', '{"appointments": ["view"]}', true, false, NOW()),
(16, 2, 'doctor77@cura.com', 'doctor77@cura.com', '$2b$12$ieyLKtwa5omqr9l...', 'Doctor', 'Seventy Seven', 'doctor', 'General Medicine', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, false, NOW()),
(17, 1, 'quratulain@09911@outlo...', 'quratulain@09911@outlo...', '$2b$12$7RG.F4I21TwsaRj...', 'Quratulain', 'User3', 'doctor', 'General Medicine', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, false, NOW());

-- Update the sequence to continue from the highest ID
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- SELECT id, organization_id, email, username, role FROM users ORDER BY id;
