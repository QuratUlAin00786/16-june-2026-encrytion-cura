-- =====================================================
-- AVEROX HEALTHCARE - COMPLETE DEVELOPMENT DATABASE
-- Sample INSERT Queries for ALL Tables
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS
-- =====================================================

INSERT INTO organizations (name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at) VALUES
('London Central Medical', 'london-central', 'admin@londoncentral.uk', 'UK', 'London Central Medical', 
    '{"theme": {"primaryColor": "#2563eb", "logoUrl": ""}, "timezone": "Europe/London", "currency": "GBP"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": true}',
    'full', 'active', NOW(), NOW()),
('Demo Healthcare', 'demo', 'demo@averox.com', 'UK', 'Demo Healthcare',
    '{"theme": {"primaryColor": "#6366f1", "logoUrl": ""}, "timezone": "Europe/London", "currency": "GBP"}',
    '{"appointments": true, "billing": true, "inventory": true, "telehealth": true, "ai_insights": true}',
    'full', 'trial', NOW(), NOW());

-- =====================================================
-- 2. SAAS OWNERS
-- =====================================================

INSERT INTO saas_owners (username, password, email, first_name, last_name, is_active, created_at, updated_at) VALUES
('admin', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'admin@averox.com', 'System', 'Admin', true, NOW(), NOW());

-- =====================================================
-- 3. SAAS PACKAGES
-- =====================================================

INSERT INTO saas_packages (name, description, price, billing_cycle, features, is_active, show_on_website, created_at, updated_at) VALUES
('Starter', 'Perfect for small clinics', 49.00, 'monthly', '{"max_users": 5, "max_patients": 500}', true, true, NOW(), NOW()),
('Professional', 'For growing practices', 149.00, 'monthly', '{"max_users": 20, "max_patients": 2000}', true, true, NOW(), NOW()),
('Enterprise', 'Complete solution', 399.00, 'monthly', '{"max_users": -1, "max_patients": -1}', true, true, NOW(), NOW());

-- =====================================================
-- 4. SAAS SUBSCRIPTIONS
-- =====================================================

INSERT INTO saas_subscriptions (organization_id, package_id, status, current_period_start, current_period_end, created_at, updated_at) VALUES
(1, 3, 'active', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', NOW(), NOW()),
(2, 3, 'active', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days', NOW(), NOW());

-- =====================================================
-- 5. SAAS PAYMENTS
-- =====================================================

INSERT INTO saas_payments (organization_id, subscription_id, invoice_number, amount, currency, payment_method, payment_status, due_date, period_start, period_end, created_at) VALUES
(1, 1, 'SAAS-INV-2024-001', 399.00, 'GBP', 'stripe', 'completed', CURRENT_DATE, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, NOW()),
(2, 2, 'SAAS-INV-2024-002', 399.00, 'GBP', 'stripe', 'pending', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '23 days', NOW());

-- =====================================================
-- 6. SAAS INVOICES
-- =====================================================

INSERT INTO saas_invoices (organization_id, subscription_id, invoice_number, amount, status, issue_date, due_date, period_start, period_end, created_at) VALUES
(1, 1, 'SAAS-INV-2024-001', 399.00, 'paid', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, NOW()),
(2, 2, 'SAAS-INV-2024-002', 399.00, 'sent', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '23 days', NOW());

-- =====================================================
-- 7. SAAS SETTINGS
-- =====================================================

INSERT INTO saas_settings (key, value, description, category, created_at, updated_at) VALUES
('platform_name', '"Averox Healthcare"', 'Platform name', 'general', NOW(), NOW()),
('trial_period_days', '14', 'Trial period', 'billing', NOW(), NOW()),
('enable_ai_features', 'true', 'AI features', 'features', NOW(), NOW());

-- =====================================================
-- 8. USERS
-- =====================================================

INSERT INTO users (organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, created_at) VALUES
-- London Central Medical
(1, 'dr.smith@londoncentral.uk', 'dr.smith', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'James', 'Smith', 'doctor', 'Cardiology', 'Internal Medicine', 'Cardiology', 
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, NOW()),
(1, 'dr.jones@londoncentral.uk', 'dr.jones', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Sarah', 'Jones', 'doctor', 'Pediatrics', 'Pediatrics', 'Neonatology',
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "08:00", "end": "16:00"}',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, NOW()),
(1, 'nurse.williams@londoncentral.uk', 'nurse.williams', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Emily', 'Williams', 'nurse', 'Emergency', NULL, NULL,
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "07:00", "end": "19:00"}',
    '{"appointments": ["view", "create"], "patients": ["view", "edit"]}', true, NOW()),
(1, 'admin@londoncentral.uk', 'admin', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Michael', 'Brown', 'admin', 'Administration', NULL, NULL,
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}',
    '{"all": ["view", "create", "edit", "delete"]}', true, NOW()),
-- Demo Healthcare
(2, 'demo.doctor@averox.com', 'demo.doctor', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Demo', 'Doctor', 'doctor', 'General Medicine', 'Internal Medicine', 'General Practice',
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}',
    '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, NOW()),
(2, 'demo.admin@averox.com', 'demo.admin', '$2b$10$rOZxHVqJKqBNfKLxFtJ8Mu7JXhVZKzLKJZqXqh0yt.GJxMKqvPK3C', 'Demo', 'Admin', 'admin', 'Administration', NULL, NULL,
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}',
    '{"all": ["view", "create", "edit", "delete"]}', true, NOW());

-- =====================================================
-- 9. ROLES
-- =====================================================

INSERT INTO roles (organization_id, name, display_name, description, permissions, is_system, created_at, updated_at) VALUES
(1, 'admin', 'Administrator', 'Full access', '{"all": ["view", "create", "edit", "delete"]}', true, NOW(), NOW()),
(1, 'doctor', 'Doctor', 'Medical provider', '{"appointments": ["view", "create", "edit", "delete"], "patients": ["view", "create", "edit"]}', true, NOW(), NOW()),
(1, 'nurse', 'Nurse', 'Nursing staff', '{"appointments": ["view", "create"], "patients": ["view", "edit"]}', true, NOW(), NOW()),
(2, 'admin', 'Administrator', 'Full access', '{"all": ["view", "create", "edit", "delete"]}', true, NOW(), NOW());

-- =====================================================
-- 10. USER DOCUMENT PREFERENCES
-- =====================================================

INSERT INTO user_document_preferences (organization_id, user_id, clinic_info, header_preferences, created_at, updated_at) VALUES
(1, 1, '{"clinicName": "London Central Medical", "address": "123 Harley Street, London", "phone": "+44 20 7946 0958"}', 
    '{"showLogo": true, "showClinicName": true}', NOW(), NOW()),
(2, 5, '{"clinicName": "Demo Healthcare", "address": "1 Demo Street, London", "phone": "+44 20 1234 5678"}',
    '{"showLogo": true, "showClinicName": true}', NOW(), NOW());

-- =====================================================
-- 11. DOCTOR DEFAULT SHIFTS
-- =====================================================

INSERT INTO doctor_default_shifts (organization_id, user_id, start_time, end_time, working_days, created_at, updated_at) VALUES
(1, 1, '09:00', '17:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], NOW(), NOW()),
(1, 2, '08:00', '16:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], NOW(), NOW()),
(2, 5, '09:00', '17:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], NOW(), NOW());

-- =====================================================
-- 12. STAFF SHIFTS
-- =====================================================

INSERT INTO staff_shifts (organization_id, staff_id, date, shift_type, start_time, end_time, status, is_available, created_by, created_at, updated_at) VALUES
(1, 1, CURRENT_DATE, 'regular', '09:00', '17:00', 'scheduled', true, 4, NOW(), NOW()),
(1, 2, CURRENT_DATE, 'regular', '08:00', '16:00', 'scheduled', true, 4, NOW(), NOW()),
(1, 3, CURRENT_DATE, 'regular', '07:00', '19:00', 'scheduled', true, 4, NOW(), NOW()),
(2, 5, CURRENT_DATE, 'regular', '09:00', '17:00', 'scheduled', true, 6, NOW(), NOW());

-- =====================================================
-- 13. PATIENTS
-- =====================================================

INSERT INTO patients (organization_id, patient_id, first_name, last_name, date_of_birth, gender_at_birth, email, phone, nhs_number, address, insurance_info, emergency_contact, medical_history, risk_level, is_active, created_by, created_at, updated_at) VALUES
(1, 'P001', 'John', 'Anderson', '1985-03-15', 'Male', 'john.anderson@email.com', '+44 7700 900001', 'NHS1234567', 
    '{"street": "10 Baker Street", "city": "London", "postcode": "NW1 6XE", "country": "UK"}',
    '{"provider": "Bupa", "policyNumber": "BUPA123456", "coverageType": "primary"}',
    '{"name": "Jane Anderson", "relationship": "Wife", "phone": "+44 7700 900002"}',
    '{"allergies": ["Penicillin"], "conditions": ["Hypertension"], "medications": ["Lisinopril 10mg"]}',
    'low', true, 1, NOW(), NOW()),

(1, 'P002', 'Mary', 'Johnson', '1990-07-22', 'Female', 'mary.johnson@email.com', '+44 7700 900003', 'NHS2345678',
    '{"street": "25 Oxford Street", "city": "London", "postcode": "W1D 2DW", "country": "UK"}',
    '{"provider": "AXA", "policyNumber": "AXA987654", "coverageType": "primary"}',
    '{"name": "Robert Johnson", "relationship": "Husband", "phone": "+44 7700 900004"}',
    '{"allergies": [], "conditions": ["Diabetes Type 2"], "medications": ["Metformin 500mg"]}',
    'medium', true, 1, NOW(), NOW()),

(1, 'P003', 'David', 'Williams', '1978-11-30', 'Male', 'david.williams@email.com', '+44 7700 900005', 'NHS3456789',
    '{"street": "42 Abbey Road", "city": "London", "postcode": "NW8 9AY", "country": "UK"}',
    '{"provider": "Vitality", "policyNumber": "VIT555666", "coverageType": "primary"}',
    '{"name": "Sarah Williams", "relationship": "Sister", "phone": "+44 7700 900006"}',
    '{"allergies": ["Sulfa drugs"], "conditions": ["Asthma"], "medications": ["Salbutamol inhaler"]}',
    'low', true, 2, NOW(), NOW()),

(1, 'P004', 'Emma', 'Brown', '2015-05-10', 'Female', 'parent@email.com', '+44 7700 900007', 'NHS4567890',
    '{"street": "78 Park Lane", "city": "London", "postcode": "W1K 1LB", "country": "UK"}',
    '{"provider": "NHS", "policyNumber": "", "coverageType": "primary"}',
    '{"name": "Lisa Brown", "relationship": "Mother", "phone": "+44 7700 900007"}',
    '{"allergies": [], "conditions": [], "medications": []}',
    'low', true, 2, NOW(), NOW()),

(1, 'P005', 'Robert', 'Taylor', '1965-09-18', 'Male', 'robert.taylor@email.com', '+44 7700 900008', 'NHS5678901',
    '{"street": "15 Downing Street", "city": "London", "postcode": "SW1A 2AA", "country": "UK"}',
    '{"provider": "Cigna", "policyNumber": "CIG789012", "coverageType": "primary"}',
    '{"name": "Margaret Taylor", "relationship": "Wife", "phone": "+44 7700 900009"}',
    '{"allergies": ["Aspirin"], "conditions": ["High Cholesterol", "Coronary Artery Disease"], "medications": ["Atorvastatin 40mg", "Clopidogrel 75mg"]}',
    'high', true, 1, NOW(), NOW()),

(2, 'P101', 'Demo', 'Patient', '1988-01-01', 'Male', 'demo.patient@email.com', '+44 7700 900100', 'NHS9999999',
    '{"street": "1 Demo Street", "city": "London", "postcode": "SW1A 1AA", "country": "UK"}',
    '{"provider": "NHS", "policyNumber": "", "coverageType": "primary"}',
    '{"name": "Demo Contact", "relationship": "Spouse", "phone": "+44 7700 900101"}',
    '{"allergies": [], "conditions": [], "medications": []}',
    'low', true, 5, NOW(), NOW());

-- =====================================================
-- 14. APPOINTMENTS
-- =====================================================

INSERT INTO appointments (organization_id, patient_id, provider_id, title, description, scheduled_at, duration, status, type, location, created_by, created_at) VALUES
-- Past appointments
(1, 1, 1, 'Annual Checkup', 'Routine annual physical examination', CURRENT_TIMESTAMP - INTERVAL '7 days', 30, 'completed', 'consultation', 'Room 101', 1, NOW()),
(1, 2, 2, 'Diabetes Follow-up', 'Monitor blood sugar levels', CURRENT_TIMESTAMP - INTERVAL '5 days', 20, 'completed', 'follow_up', 'Room 102', 2, NOW()),
(1, 3, 1, 'Asthma Review', 'Review asthma management', CURRENT_TIMESTAMP - INTERVAL '3 days', 25, 'completed', 'consultation', 'Room 101', 1, NOW()),

-- Today appointments
(1, 4, 2, 'Pediatric Checkup', 'Child wellness visit', CURRENT_TIMESTAMP + INTERVAL '2 hours', 30, 'scheduled', 'routine_checkup', 'Room 102', 2, NOW()),
(1, 5, 1, 'Cardiology Consultation', 'Heart condition review', CURRENT_TIMESTAMP + INTERVAL '4 hours', 45, 'scheduled', 'consultation', 'Room 101', 1, NOW()),

-- Future appointments
(1, 1, 1, 'Follow-up Consultation', 'Review test results', CURRENT_TIMESTAMP + INTERVAL '2 days', 20, 'scheduled', 'follow_up', 'Room 101', 1, NOW()),
(1, 2, 2, 'Diabetes Management', 'Review medication', CURRENT_TIMESTAMP + INTERVAL '5 days', 30, 'scheduled', 'consultation', 'Room 102', 2, NOW()),

-- Demo appointments
(2, 6, 5, 'General Consultation', 'Health checkup', CURRENT_TIMESTAMP + INTERVAL '1 day', 30, 'scheduled', 'consultation', 'Room 1', 5, NOW());

-- =====================================================
-- 15. MEDICAL RECORDS
-- =====================================================

INSERT INTO medical_records (organization_id, patient_id, provider_id, type, title, notes, diagnosis, treatment, prescription, created_at) VALUES
(1, 1, 1, 'consultation', 'Annual Physical Exam', 
    'Patient presents for routine annual checkup. Vitals stable. No acute concerns.', 
    'Hypertension (controlled)', 
    'Continue current medications. Follow up in 6 months.',
    '{"medications": [{"name": "Lisinopril", "dosage": "10mg", "frequency": "Once daily"}]}',
    NOW() - INTERVAL '7 days'),

(1, 2, 2, 'consultation', 'Diabetes Follow-up',
    'Patient reports good compliance with medication. HbA1c improved from 8.2% to 7.1%.',
    'Type 2 Diabetes Mellitus (improving)',
    'Continue Metformin. Dietary counseling provided.',
    '{"medications": [{"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily"}]}',
    NOW() - INTERVAL '5 days'),

(1, 3, 1, 'consultation', 'Asthma Review',
    'Patient using rescue inhaler 2-3 times per week. No nocturnal symptoms.',
    'Asthma (well controlled)',
    'Continue current regimen. Peak flow monitoring advised.',
    '{"medications": [{"name": "Salbutamol", "dosage": "100mcg", "frequency": "As needed"}]}',
    NOW() - INTERVAL '3 days'),

(1, 5, 1, 'consultation', 'Cardiology Assessment',
    'Patient with history of MI in 2020. Currently stable on dual antiplatelet therapy.',
    'Coronary Artery Disease, Hyperlipidemia',
    'Continue aspirin and clopidogrel. Statin therapy. Cardiac rehab recommended.',
    '{"medications": [{"name": "Atorvastatin", "dosage": "40mg", "frequency": "Once daily"}, {"name": "Clopidogrel", "dosage": "75mg", "frequency": "Once daily"}]}',
    NOW() - INTERVAL '10 days');

-- =====================================================
-- 16. PRESCRIPTIONS
-- =====================================================

INSERT INTO prescriptions (organization_id, patient_id, doctor_id, medication_name, dosage, frequency, duration, instructions, refills, status, issued_date, created_at, updated_at) VALUES
(1, 1, 1, 'Lisinopril', '10mg', 'Once daily', '90 days', 'Take in the morning with water', 2, 'active', NOW() - INTERVAL '7 days', NOW(), NOW()),
(1, 2, 2, 'Metformin', '500mg', 'Twice daily', '90 days', 'Take with meals', 3, 'active', NOW() - INTERVAL '5 days', NOW(), NOW()),
(1, 3, 1, 'Salbutamol Inhaler', '100mcg', 'As needed', '30 days', 'Use when breathless, max 8 puffs per day', 1, 'active', NOW() - INTERVAL '3 days', NOW(), NOW()),
(1, 5, 1, 'Atorvastatin', '40mg', 'Once daily', '90 days', 'Take at bedtime', 2, 'active', NOW() - INTERVAL '10 days', NOW(), NOW()),
(1, 5, 1, 'Clopidogrel', '75mg', 'Once daily', '90 days', 'Take with food', 2, 'active', NOW() - INTERVAL '10 days', NOW(), NOW()),
(2, 6, 5, 'Ibuprofen', '400mg', 'Three times daily', '7 days', 'Take with food', 0, 'active', NOW() - INTERVAL '1 day', NOW(), NOW());

-- =====================================================
-- 17. LAB RESULTS
-- =====================================================

INSERT INTO lab_results (organization_id, patient_id, test_name, test_type, result_value, unit, reference_range, status, abnormal_flag, ordered_by, ordered_at, completed_at, created_at) VALUES
(1, 1, 'Blood Pressure', 'Vital Signs', '128/82', 'mmHg', '120/80', 'completed', false, 1, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW()),
(1, 2, 'HbA1c', 'Blood Test', '7.1', '%', '<5.7', 'completed', true, 2, NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', NOW()),
(1, 2, 'Fasting Glucose', 'Blood Test', '142', 'mg/dL', '70-100', 'completed', true, 2, NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', NOW()),
(1, 3, 'Peak Flow', 'Pulmonary Function', '420', 'L/min', '400-600', 'completed', false, 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW()),
(1, 5, 'Lipid Panel - Total Cholesterol', 'Blood Test', '165', 'mg/dL', '<200', 'completed', false, 1, NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days', NOW()),
(1, 5, 'Lipid Panel - LDL', 'Blood Test', '88', 'mg/dL', '<100', 'completed', false, 1, NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days', NOW()),
(1, 5, 'Troponin I', 'Blood Test', '0.02', 'ng/mL', '<0.04', 'completed', false, 1, NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days', NOW());

-- =====================================================
-- 18. INVOICES
-- =====================================================

INSERT INTO invoices (organization_id, invoice_number, patient_id, patient_name, nhs_number, date_of_service, invoice_date, due_date, status, invoice_type, subtotal, tax, discount, total_amount, paid_amount, items, created_by, created_at, updated_at) VALUES
(1, 'INV-2024-001', 'P001', 'John Anderson', 'NHS1234567', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days', 'paid', 'payment', 150.00, 0.00, 0.00, 150.00, 150.00,
    '[{"description": "Annual Physical Examination", "quantity": 1, "unitPrice": 150.00, "total": 150.00}]', 1, NOW(), NOW()),

(1, 'INV-2024-002', 'P002', 'Mary Johnson', 'NHS2345678', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 'paid', 'payment', 200.00, 0.00, 0.00, 200.00, 200.00,
    '[{"description": "Diabetes Consultation", "quantity": 1, "unitPrice": 100.00, "total": 100.00}, {"description": "HbA1c Test", "quantity": 1, "unitPrice": 50.00, "total": 50.00}, {"description": "Glucose Test", "quantity": 1, "unitPrice": 50.00, "total": 50.00}]', 2, NOW(), NOW()),

(1, 'INV-2024-003', 'P003', 'David Williams', 'NHS3456789', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days', 'sent', 'payment', 120.00, 0.00, 0.00, 120.00, 0.00,
    '[{"description": "Asthma Consultation", "quantity": 1, "unitPrice": 100.00, "total": 100.00}, {"description": "Peak Flow Test", "quantity": 1, "unitPrice": 20.00, "total": 20.00}]', 1, NOW(), NOW()),

(1, 'INV-2024-004', 'P005', 'Robert Taylor', 'NHS5678901', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 'paid', 'payment', 350.00, 0.00, 0.00, 350.00, 350.00,
    '[{"description": "Cardiology Consultation", "quantity": 1, "unitPrice": 200.00, "total": 200.00}, {"description": "Lipid Panel", "quantity": 1, "unitPrice": 100.00, "total": 100.00}, {"description": "Troponin Test", "quantity": 1, "unitPrice": 50.00, "total": 50.00}]', 1, NOW(), NOW()),

(2, 'INV-2024-101', 'P101', 'Demo Patient', 'NHS9999999', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days', 'draft', 'payment', 100.00, 0.00, 0.00, 100.00, 0.00,
    '[{"description": "General Consultation", "quantity": 1, "unitPrice": 100.00, "total": 100.00}]', 5, NOW(), NOW());

-- =====================================================
-- 19. PAYMENTS
-- =====================================================

INSERT INTO payments (organization_id, invoice_id, patient_id, transaction_id, amount, currency, payment_method, payment_status, payment_date, created_at, updated_at) VALUES
(1, 1, 'P001', 'TXN-2024-001', 150.00, 'GBP', 'card', 'completed', NOW() - INTERVAL '7 days', NOW(), NOW()),
(1, 2, 'P002', 'TXN-2024-002', 200.00, 'GBP', 'online', 'completed', NOW() - INTERVAL '5 days', NOW(), NOW()),
(1, 4, 'P005', 'TXN-2024-003', 350.00, 'GBP', 'card', 'completed', NOW() - INTERVAL '9 days', NOW(), NOW());

-- =====================================================
-- 20. REVENUE RECORDS
-- =====================================================

INSERT INTO revenue_records (organization_id, month, revenue, expenses, profit, collections, target, created_at) VALUES
(1, '2024-01', 45000.00, 28000.00, 17000.00, 42000.00, 50000.00, NOW()),
(1, '2024-02', 52000.00, 30000.00, 22000.00, 48000.00, 50000.00, NOW()),
(1, '2024-03', 48000.00, 29000.00, 19000.00, 45000.00, 50000.00, NOW()),
(2, '2024-01', 12000.00, 8000.00, 4000.00, 11000.00, 15000.00, NOW()),
(2, '2024-02', 15000.00, 9000.00, 6000.00, 14000.00, 15000.00, NOW());

-- =====================================================
-- 21. INSURANCE VERIFICATIONS
-- =====================================================

INSERT INTO insurance_verifications (organization_id, patient_id, patient_name, provider, policy_number, coverage_type, status, eligibility_status, effective_date, expiration_date, benefits, created_at, updated_at) VALUES
(1, 1, 'John Anderson', 'Bupa', 'BUPA123456', 'primary', 'active', 'verified', '2024-01-01', '2024-12-31', 
    '{"copay": 20, "deductible": 500, "coverage_percentage": 80}', NOW(), NOW()),
(1, 2, 'Mary Johnson', 'AXA', 'AXA987654', 'primary', 'active', 'verified', '2024-01-01', '2024-12-31',
    '{"copay": 25, "deductible": 1000, "coverage_percentage": 75}', NOW(), NOW()),
(1, 3, 'David Williams', 'Vitality', 'VIT555666', 'primary', 'active', 'verified', '2024-01-01', '2024-12-31',
    '{"copay": 15, "deductible": 250, "coverage_percentage": 90}', NOW(), NOW());

-- =====================================================
-- 22. CLAIMS
-- =====================================================

INSERT INTO claims (organization_id, patient_id, invoice_id, claim_number, insurance_provider, total_billed, total_approved, total_paid, status, submission_date, response_date, created_at) VALUES
(1, 1, 1, 'CLM-2024-001', 'Bupa', 150.00, 120.00, 120.00, 'approved', NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days', NOW()),
(1, 2, 2, 'CLM-2024-002', 'AXA', 200.00, 150.00, 150.00, 'approved', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day', NOW()),
(1, 3, 3, 'CLM-2024-003', 'Vitality', 120.00, 108.00, NULL, 'submitted', NOW() - INTERVAL '2 days', NULL, NOW());

-- =====================================================
-- 23. AI INSIGHTS
-- =====================================================

INSERT INTO ai_insights (organization_id, patient_id, type, title, description, severity, action_required, confidence, status, created_at) VALUES
(1, 2, 'risk_alert', 'Diabetes Control Monitoring', 'Patient HbA1c has improved but still above target. Consider medication adjustment.', 'medium', true, 'high', 'active', NOW()),
(1, 5, 'risk_alert', 'Cardiovascular Risk Assessment', 'Patient with CAD history. Ensure compliance with dual antiplatelet therapy.', 'high', true, 'high', 'active', NOW()),
(1, 1, 'preventive_care', 'Screening Reminder', 'Patient due for cholesterol screening based on age and risk factors.', 'low', false, 'medium', 'active', NOW()),
(1, 3, 'treatment_suggestion', 'Asthma Management', 'Consider adding inhaled corticosteroid for better asthma control.', 'medium', false, 'medium', 'active', NOW());

-- =====================================================
-- 24. MEDICATIONS DATABASE
-- =====================================================

INSERT INTO medications_database (organization_id, name, category, dosage, interactions, warnings, severity, is_active, created_at) VALUES
(1, 'Lisinopril', 'ACE Inhibitor', '10mg', '["NSAIDs", "Potassium supplements"]', '["Monitor kidney function", "Risk of angioedema"]', 'medium', true, NOW()),
(1, 'Metformin', 'Antidiabetic', '500mg', '["Alcohol", "Contrast dye"]', '["Risk of lactic acidosis", "Monitor B12 levels"]', 'medium', true, NOW()),
(1, 'Atorvastatin', 'Statin', '40mg', '["Grapefruit juice", "Fibrates"]', '["Monitor liver enzymes", "Muscle pain"]', 'medium', true, NOW()),
(1, 'Aspirin', 'Antiplatelet', '75mg', '["NSAIDs", "Warfarin"]', '["Bleeding risk", "GI irritation"]', 'medium', true, NOW()),
(1, 'Salbutamol', 'Beta-2 Agonist', '100mcg', '["Beta blockers"]', '["Tachycardia", "Tremor"]', 'low', true, NOW());

-- =====================================================
-- 25. PATIENT DRUG INTERACTIONS
-- =====================================================

INSERT INTO patient_drug_interactions (organization_id, patient_id, medication1_name, medication1_dosage, medication2_name, medication2_dosage, interaction_type, severity, description, warnings, reported_by, reported_at, status, created_at, updated_at) VALUES
(1, 5, 'Atorvastatin', '40mg', 'Clopidogrel', '75mg', 'drug-drug', 'low', 'Potential interaction but benefits outweigh risks in CAD patients',
    '["Monitor for increased bleeding", "Watch for muscle symptoms"]', 1, NOW(), 'active', NOW(), NOW());

-- =====================================================
-- 26. CLINICAL PROCEDURES
-- =====================================================

INSERT INTO clinical_procedures (organization_id, name, category, duration, complexity, prerequisites, steps, complications, is_active, created_at) VALUES
(1, 'ECG (Electrocardiogram)', 'Diagnostic', '10-15 minutes', 'low',
    '["Patient consent", "Clean electrode sites"]',
    '["Position patient supine", "Attach electrodes", "Record tracing", "Interpret results"]',
    '["Skin irritation", "Artifact from movement"]', true, NOW()),

(1, 'Blood Glucose Test', 'Laboratory', '5 minutes', 'low',
    '["Patient fasting (if required)", "Glucometer calibrated"]',
    '["Clean finger", "Lance finger", "Apply blood to test strip", "Record result"]',
    '["Pain at puncture site", "Minor bleeding"]', true, NOW()),

(1, 'Blood Pressure Measurement', 'Vital Signs', '5 minutes', 'low',
    '["Patient rested for 5 minutes", "Appropriate cuff size"]',
    '["Position arm at heart level", "Apply cuff", "Inflate and deflate", "Record readings"]',
    '["Inaccurate reading if improper technique"]', true, NOW());

-- =====================================================
-- 27. EMERGENCY PROTOCOLS
-- =====================================================

INSERT INTO emergency_protocols (organization_id, title, priority, steps, is_active, created_at) VALUES
(1, 'Cardiac Arrest Response', 'critical',
    '[{"step": 1, "action": "Call emergency services immediately"}, {"step": 2, "action": "Begin CPR - 30 compressions, 2 breaths"}, {"step": 3, "action": "Apply AED if available"}, {"step": 4, "action": "Continue until help arrives"}]',
    true, NOW()),

(1, 'Anaphylaxis Management', 'critical',
    '[{"step": 1, "action": "Assess airway, breathing, circulation"}, {"step": 2, "action": "Administer epinephrine 0.3mg IM"}, {"step": 3, "action": "Call emergency services"}, {"step": 4, "action": "Position patient lying down with legs elevated"}, {"step": 5, "action": "Monitor vital signs every 5 minutes"}]',
    true, NOW()),

(1, 'Hypoglycemia Protocol', 'high',
    '[{"step": 1, "action": "Confirm blood glucose <70 mg/dL"}, {"step": 2, "action": "If conscious: give 15-20g fast-acting carbs"}, {"step": 3, "action": "Recheck glucose after 15 minutes"}, {"step": 4, "action": "If unconscious: call emergency and administer glucagon if available"}]',
    true, NOW());

-- =====================================================
-- 28. CONSULTATIONS
-- =====================================================

INSERT INTO consultations (organization_id, patient_id, provider_id, consultation_type, status, scheduled_at, started_at, ended_at, duration, notes, diagnosis, follow_up_required, created_at, updated_at) VALUES
(1, 1, 1, 'in_person', 'completed', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '30 minutes', 30,
    'Patient presented for annual checkup. All systems reviewed.',
    'Hypertension (controlled)',
    true, NOW(), NOW()),

(1, 2, 2, 'in_person', 'completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '20 minutes', 20,
    'Diabetes follow-up. Patient compliance good.',
    'Type 2 Diabetes Mellitus',
    true, NOW(), NOW());

-- =====================================================
-- 29. SYMPTOM CHECKS
-- =====================================================

INSERT INTO symptom_checks (organization_id, patient_id, symptoms, severity, ai_assessment, recommendations, urgency_level, follow_up_required, status, created_at, updated_at) VALUES
(1, 1, '{"primary": "Headache", "duration": "2 days", "severity": "moderate", "associated": ["Fatigue"]}',
    'moderate',
    'Likely tension headache. No red flags identified.',
    '["Rest and hydration", "OTC pain relief", "Follow up if persists >7 days"]',
    'routine', true, 'reviewed', NOW(), NOW());

-- =====================================================
-- 30. PATIENT COMMUNICATIONS
-- =====================================================

INSERT INTO patient_communications (organization_id, patient_id, sent_by, channel, message_type, subject, message, status, sent_at, created_at, updated_at) VALUES
(1, 1, 1, 'email', 'appointment_reminder', 'Appointment Reminder',
    'This is a reminder of your upcoming appointment on ' || (CURRENT_DATE + INTERVAL '2 days')::text || ' at 09:00 AM.',
    'sent', NOW() - INTERVAL '1 day', NOW(), NOW()),

(1, 2, 2, 'sms', 'test_result', 'Lab Results Available',
    'Your recent lab results are now available. Please log in to the patient portal to view them.',
    'delivered', NOW() - INTERVAL '4 days', NOW(), NOW()),

(1, 4, 2, 'email', 'appointment_reminder', 'Pediatric Appointment',
    'Reminder: Emma has an appointment tomorrow at 11:00 AM for a wellness checkup.',
    'sent', NOW() - INTERVAL '1 day', NOW(), NOW());

-- =====================================================
-- 31. NOTIFICATIONS
-- =====================================================

INSERT INTO notifications (organization_id, user_id, type, title, message, priority, is_read, created_at, updated_at) VALUES
(1, 1, 'appointment', 'New Appointment Booked', 'Robert Taylor has booked a cardiology consultation for today at 2:00 PM', 'high', false, NOW(), NOW()),
(1, 2, 'alert', 'Lab Results Critical', 'Critical lab result for Mary Johnson - HbA1c 7.1%', 'urgent', true, NOW() - INTERVAL '5 days', NOW()),
(1, 1, 'reminder', 'Follow-up Required', 'John Anderson requires follow-up appointment scheduling', 'normal', false, NOW() - INTERVAL '1 day', NOW()),
(1, 3, 'message', 'New Message', 'You have a new message from Dr. Smith', 'normal', false, NOW(), NOW());

-- =====================================================
-- 32. CONVERSATIONS & MESSAGES
-- =====================================================

INSERT INTO conversations (id, organization_id, participants, last_message, unread_count, is_patient_conversation, created_at, updated_at) VALUES
('conv-001', 1, '[{"id": 1, "name": "Dr. James Smith", "role": "doctor"}, {"id": 3, "name": "Nurse Emily Williams", "role": "nurse"}]',
    '{"content": "Patient in Room 3 needs vitals check", "timestamp": "' || NOW()::text || '"}',
    1, false, NOW(), NOW()),

('conv-002', 1, '[{"id": 1, "name": "Dr. James Smith", "role": "doctor"}, {"id": 2, "name": "Dr. Sarah Jones", "role": "doctor"}]',
    '{"content": "Can you review this ECG?", "timestamp": "' || (NOW() - INTERVAL '2 hours')::text || '"}',
    0, false, NOW() - INTERVAL '1 day', NOW());

INSERT INTO messages (id, organization_id, conversation_id, sender_id, sender_name, sender_role, subject, content, timestamp, is_read, priority, type, created_at) VALUES
('msg-001', 1, 'conv-001', 1, 'Dr. James Smith', 'doctor', 'Patient Check', 'Patient in Room 3 needs vitals check', NOW(), false, 'normal', 'internal', NOW()),
('msg-002', 1, 'conv-001', 3, 'Nurse Emily Williams', 'nurse', 'Re: Patient Check', 'Will check now', NOW() - INTERVAL '5 minutes', true, 'normal', 'internal', NOW() - INTERVAL '5 minutes'),
('msg-003', 1, 'conv-002', 1, 'Dr. James Smith', 'doctor', 'ECG Review', 'Can you review this ECG?', NOW() - INTERVAL '2 hours', true, 'high', 'internal', NOW() - INTERVAL '2 hours');

-- =====================================================
-- 33. DOCUMENTS
-- =====================================================

INSERT INTO documents (organization_id, user_id, name, type, content, is_template, created_at, updated_at) VALUES
(1, 1, 'Medical Certificate Template', 'medical_form', 
    'This is to certify that [PATIENT_NAME] was examined on [DATE] and is advised to rest for [DURATION] due to [CONDITION].',
    true, NOW(), NOW()),

(1, 1, 'Referral Letter Template', 'medical_form',
    'Dear Dr. [SPECIALIST_NAME], I am referring [PATIENT_NAME] for [REASON]. Patient history: [HISTORY]. Thank you for your assistance.',
    true, NOW(), NOW());

-- =====================================================
-- 34. LETTER DRAFTS
-- =====================================================

INSERT INTO letter_drafts (organization_id, user_id, patient_id, letter_type, subject, recipient, body, status, created_at, updated_at) VALUES
(1, 1, 1, 'referral', 'Cardiology Referral', 'Dr. Heart Specialist',
    'I am referring Mr. John Anderson for cardiology assessment. He has controlled hypertension and would benefit from specialist review.',
    'draft', NOW(), NOW());

-- =====================================================
-- 35. VOICE NOTES
-- =====================================================

INSERT INTO voice_notes (id, organization_id, patient_id, patient_name, provider_id, provider_name, type, status, recording_duration, transcript, confidence, created_at, updated_at) VALUES
('vn-001', 1, '1', 'John Anderson', '1', 'Dr. James Smith', 'consultation', 'completed', 180,
    'Patient presents with headache for 2 days. No visual disturbances. Likely tension headache. Advised rest and hydration.',
    0.92, NOW() - INTERVAL '7 days', NOW());

-- =====================================================
-- 36. MUSCLES POSITION (Facial Analysis)
-- =====================================================

INSERT INTO muscles_position (organization_id, patient_id, position, value, is_detected, detected_at, created_at) VALUES
(1, 1, 1, 'Normal', true, NOW() - INTERVAL '7 days', NOW()),
(1, 1, 2, 'Normal', true, NOW() - INTERVAL '7 days', NOW()),
(1, 1, 3, 'Normal', true, NOW() - INTERVAL '7 days', NOW());

-- =====================================================
-- 37. MEDICAL IMAGES
-- =====================================================

INSERT INTO medical_images (organization_id, patient_id, title, image_type, modality, body_part, image_url, status, acquired_at, created_at, updated_at) VALUES
(1, 5, 'Chest X-Ray', 'X-Ray', 'CR', 'Chest', '/uploads/images/chest-xray-001.jpg', 'reported', NOW() - INTERVAL '11 days', NOW(), NOW()),
(1, 5, 'ECG 12-Lead', 'X-Ray', 'ECG', 'Heart', '/uploads/images/ecg-001.jpg', 'reported', NOW() - INTERVAL '10 days', NOW(), NOW());

-- =====================================================
-- 38. CLINICAL PHOTOS
-- =====================================================

INSERT INTO clinical_photos (organization_id, patient_id, captured_by, title, description, body_part, photo_url, taken_at, created_at, updated_at) VALUES
(1, 3, 1, 'Skin Rash Assessment', 'Mild erythematous rash on forearm', 'Right Forearm', '/uploads/photos/rash-001.jpg', NOW() - INTERVAL '3 days', NOW(), NOW());

-- =====================================================
-- 39. SUBSCRIPTIONS (Telehealth)
-- =====================================================

INSERT INTO subscriptions (organization_id, patient_id, plan_name, status, start_date, end_date, amount, billing_cycle, created_at, updated_at) VALUES
(1, 1, 'Premium Health Plan', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days', 99.00, 'monthly', NOW(), NOW());

-- =====================================================
-- 40. GDPR CONSENTS
-- =====================================================

INSERT INTO gdpr_consents (organization_id, patient_id, consent_type, consent_given, consent_text, consent_version, consented_at, created_at, updated_at) VALUES
(1, 1, 'data_processing', true, 'I consent to my health data being processed for medical care purposes.', '1.0', NOW() - INTERVAL '30 days', NOW(), NOW()),
(1, 1, 'marketing', false, 'I consent to receiving marketing communications.', '1.0', NOW() - INTERVAL '30 days', NOW(), NOW()),
(1, 2, 'data_processing', true, 'I consent to my health data being processed for medical care purposes.', '1.0', NOW() - INTERVAL '25 days', NOW(), NOW()),
(1, 3, 'data_processing', true, 'I consent to my health data being processed for medical care purposes.', '1.0', NOW() - INTERVAL '20 days', NOW(), NOW());

-- =====================================================
-- 41. GDPR DATA REQUESTS
-- =====================================================

INSERT INTO gdpr_data_requests (organization_id, patient_id, request_type, status, request_details, requested_at, created_at, updated_at) VALUES
(1, 1, 'access', 'completed', 'Request for copy of all medical records', NOW() - INTERVAL '10 days', NOW(), NOW());

-- =====================================================
-- 42. GDPR AUDIT TRAIL
-- =====================================================

INSERT INTO gdpr_audit_trail (organization_id, user_id, patient_id, action, resource_type, resource_id, timestamp) VALUES
(1, 1, 1, 'view', 'patient', 1, NOW() - INTERVAL '1 hour'),
(1, 1, 1, 'view', 'medical_record', 1, NOW() - INTERVAL '1 hour'),
(1, 2, 2, 'view', 'patient', 2, NOW() - INTERVAL '2 hours'),
(1, 2, 2, 'update', 'medical_record', 2, NOW() - INTERVAL '2 hours'),
(1, 1, 5, 'view', 'patient', 5, NOW() - INTERVAL '3 hours');

-- =====================================================
-- 43. GDPR PROCESSING ACTIVITIES
-- =====================================================

INSERT INTO gdpr_processing_activities (organization_id, activity_name, purpose, legal_basis, data_categories, retention_period, is_active, created_at, updated_at) VALUES
(1, 'Patient Medical Records', 'Providing healthcare services', 'vital_interest', 
    '["Personal details", "Health data", "Medical history"]', '7 years', true, NOW(), NOW()),

(1, 'Appointment Scheduling', 'Managing patient appointments', 'contract',
    '["Contact details", "Appointment preferences"]', '2 years', true, NOW(), NOW());

-- =====================================================
-- 44. INVENTORY CATEGORIES
-- =====================================================

INSERT INTO inventory_categories (organization_id, name, description, is_active, created_at, updated_at) VALUES
(1, 'Medications', 'Pharmaceutical products', true, NOW(), NOW()),
(1, 'Medical Supplies', 'General medical supplies', true, NOW(), NOW()),
(1, 'Diagnostic Equipment', 'Diagnostic tools and equipment', true, NOW(), NOW());

-- =====================================================
-- 45. INVENTORY ITEMS
-- =====================================================

INSERT INTO inventory_items (organization_id, category_id, name, description, sku, purchase_price, sale_price, current_stock, minimum_stock, reorder_point, is_active, created_at, updated_at) VALUES
(1, 1, 'Paracetamol 500mg', 'Pain relief medication', 'MED-PARA-500', 5.00, 10.00, 500, 100, 150, true, NOW(), NOW()),
(1, 1, 'Ibuprofen 400mg', 'Anti-inflammatory', 'MED-IBU-400', 6.00, 12.00, 300, 80, 120, true, NOW(), NOW()),
(1, 2, 'Disposable Gloves (Box of 100)', 'Latex-free examination gloves', 'SUP-GLOVE-100', 8.00, 15.00, 50, 20, 30, true, NOW(), NOW()),
(1, 2, 'Blood Pressure Cuff', 'Adult size BP cuff', 'SUP-BP-CUFF', 25.00, 45.00, 15, 5, 8, true, NOW(), NOW()),
(1, 3, 'Thermometer Digital', 'Digital oral thermometer', 'DIAG-THERM-01', 12.00, 25.00, 30, 10, 15, true, NOW(), NOW());

-- =====================================================
-- 46. INVENTORY SUPPLIERS
-- =====================================================

INSERT INTO inventory_suppliers (organization_id, name, contact_person, email, phone, address, city, country, is_active, created_at, updated_at) VALUES
(1, 'MedSupply UK Ltd', 'John Supplier', 'john@medsupply.co.uk', '+44 20 1234 5678', '10 Supply Street', 'London', 'UK', true, NOW(), NOW()),
(1, 'Healthcare Direct', 'Sarah Distributor', 'sarah@healthdirect.com', '+44 20 9876 5432', '25 Medical Avenue', 'Manchester', 'UK', true, NOW(), NOW());

-- =====================================================
-- 47. INVENTORY PURCHASE ORDERS
-- =====================================================

INSERT INTO inventory_purchase_orders (organization_id, po_number, supplier_id, order_date, status, total_amount, created_by, created_at, updated_at) VALUES
(1, 'PO-2024-001', 1, NOW() - INTERVAL '5 days', 'received', 1000.00, 4, NOW(), NOW()),
(1, 'PO-2024-002', 2, NOW() - INTERVAL '2 days', 'sent', 750.00, 4, NOW(), NOW());

-- =====================================================
-- 48. INVENTORY PURCHASE ORDER ITEMS
-- =====================================================

INSERT INTO inventory_purchase_order_items (organization_id, purchase_order_id, item_id, quantity, unit_price, total_price, received_quantity, created_at) VALUES
(1, 1, 1, 100, 5.00, 500.00, 100, NOW()),
(1, 1, 2, 50, 6.00, 300.00, 50, NOW()),
(1, 1, 3, 10, 8.00, 80.00, 10, NOW()),
(1, 2, 4, 10, 25.00, 250.00, 0, NOW()),
(1, 2, 5, 20, 12.00, 240.00, 0, NOW());

-- =====================================================
-- 49. INVENTORY BATCHES
-- =====================================================

INSERT INTO inventory_batches (organization_id, item_id, batch_number, expiry_date, quantity, remaining_quantity, purchase_price, received_date, status, created_at) VALUES
(1, 1, 'BATCH-PARA-001', NOW() + INTERVAL '2 years', 100, 90, 5.00, NOW() - INTERVAL '5 days', 'active', NOW()),
(1, 2, 'BATCH-IBU-001', NOW() + INTERVAL '18 months', 50, 45, 6.00, NOW() - INTERVAL '5 days', 'active', NOW()),
(1, 3, 'BATCH-GLOVE-001', NOW() + INTERVAL '3 years', 10, 8, 8.00, NOW() - INTERVAL '5 days', 'active', NOW());

-- =====================================================
-- 50. INVENTORY SALES
-- =====================================================

INSERT INTO inventory_sales (organization_id, patient_id, sale_number, sale_date, total_amount, payment_method, payment_status, sold_by, created_at) VALUES
(1, 1, 'SALE-2024-001', NOW() - INTERVAL '3 days', 30.00, 'card', 'paid', 1, NOW()),
(1, 2, 'SALE-2024-002', NOW() - INTERVAL '2 days', 24.00, 'cash', 'paid', 1, NOW());

-- =====================================================
-- 51. INVENTORY SALE ITEMS
-- =====================================================

INSERT INTO inventory_sale_items (organization_id, sale_id, item_id, batch_id, quantity, unit_price, total_price, created_at) VALUES
(1, 1, 1, 1, 3, 10.00, 30.00, NOW()),
(1, 2, 2, 2, 2, 12.00, 24.00, NOW());

-- =====================================================
-- 52. INVENTORY STOCK MOVEMENTS
-- =====================================================

INSERT INTO inventory_stock_movements (organization_id, item_id, batch_id, movement_type, quantity, previous_stock, new_stock, created_by, created_at) VALUES
(1, 1, 1, 'purchase', 100, 400, 500, 4, NOW() - INTERVAL '5 days'),
(1, 1, 1, 'sale', -3, 500, 497, 1, NOW() - INTERVAL '3 days'),
(1, 2, 2, 'purchase', 50, 250, 300, 4, NOW() - INTERVAL '5 days'),
(1, 2, 2, 'sale', -2, 300, 298, 1, NOW() - INTERVAL '2 days');

-- =====================================================
-- 53. INVENTORY STOCK ALERTS
-- =====================================================

INSERT INTO inventory_stock_alerts (organization_id, item_id, alert_type, threshold_value, current_value, status, message, is_read, created_at) VALUES
(1, 4, 'low_stock', 5, 5, 'active', 'Blood Pressure Cuff stock is at minimum level', false, NOW());

-- =====================================================
-- 54. FORECAST MODELS
-- =====================================================

INSERT INTO forecast_models (organization_id, name, type, algorithm, accuracy, is_active, created_at, updated_at) VALUES
(1, 'Revenue Forecast Model', 'revenue', 'linear', 85.50, true, NOW(), NOW()),
(1, 'Expense Forecast Model', 'expenses', 'seasonal', 78.20, true, NOW(), NOW());

-- =====================================================
-- 55. FINANCIAL FORECASTS
-- =====================================================

INSERT INTO financial_forecasts (organization_id, category, forecast_period, current_value, projected_value, variance, trend, confidence, model_id, created_at, updated_at) VALUES
(1, 'Revenue', '2024-04', 48000.00, 52000.00, 4000.00, 'up', 85, 1, NOW(), NOW()),
(1, 'Revenue', '2024-05', 52000.00, 55000.00, 3000.00, 'up', 82, 1, NOW(), NOW()),
(1, 'Expenses', '2024-04', 29000.00, 30500.00, 1500.00, 'up', 78, 2, NOW(), NOW());

-- =====================================================
-- 56. CHATBOT CONFIGS
-- =====================================================

INSERT INTO chatbot_configs (organization_id, name, description, is_active, primary_color, welcome_message, appointment_booking_enabled, prescription_requests_enabled, api_key, created_at, updated_at) VALUES
(1, 'London Central Assistant', 'AI healthcare assistant', true, '#2563eb', 'Hello! How can I help you today?', true, true, 'chatbot-api-key-123', NOW(), NOW()),
(2, 'Demo Healthcare Bot', 'Demo chatbot', true, '#6366f1', 'Welcome to Demo Healthcare!', true, true, 'chatbot-api-key-456', NOW(), NOW());

-- =====================================================
-- 57. CHATBOT SESSIONS
-- =====================================================

INSERT INTO chatbot_sessions (organization_id, config_id, session_id, visitor_id, status, created_at, updated_at) VALUES
(1, 1, 'session-001', 'visitor-001', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(1, 1, 'session-002', 'visitor-002', 'active', NOW(), NOW());

-- =====================================================
-- 58. CHATBOT MESSAGES
-- =====================================================

INSERT INTO chatbot_messages (organization_id, session_id, message_id, sender, content, ai_processed, created_at) VALUES
(1, 1, 'msg-chatbot-001', 'user', 'I need to book an appointment', true, NOW() - INTERVAL '1 day'),
(1, 1, 'msg-chatbot-002', 'bot', 'I can help you with that. What date works for you?', true, NOW() - INTERVAL '1 day'),
(1, 2, 'msg-chatbot-003', 'user', 'Hello', true, NOW()),
(1, 2, 'msg-chatbot-004', 'bot', 'Hello! How can I help you today?', true, NOW());

-- =====================================================
-- 59. CHATBOT ANALYTICS
-- =====================================================

INSERT INTO chatbot_analytics (organization_id, config_id, date, total_sessions, completed_sessions, total_messages, appointments_booked, created_at) VALUES
(1, 1, NOW() - INTERVAL '1 day', 10, 8, 45, 3, NOW()),
(1, 1, NOW(), 5, 2, 20, 1, NOW());

-- =====================================================
-- 60. QUICKBOOKS CONNECTIONS
-- =====================================================

INSERT INTO quickbooks_connections (organization_id, realm_id, access_token, refresh_token, token_expires_at, refresh_token_expires_at, is_active, created_at, updated_at) VALUES
(1, 'QB-REALM-001', 'qb-access-token-encrypted', 'qb-refresh-token-encrypted', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '100 days', true, NOW(), NOW());

-- =====================================================
-- 61. QUICKBOOKS SYNC CONFIGS
-- =====================================================

INSERT INTO quickbooks_sync_configs (organization_id, auto_sync_enabled, sync_customers, sync_invoices, sync_payments, created_at, updated_at) VALUES
(1, true, true, true, true, NOW(), NOW());

-- =====================================================
-- 62. QUICKBOOKS CUSTOMER MAPPINGS
-- =====================================================

INSERT INTO quickbooks_customer_mappings (organization_id, patient_id, quickbooks_customer_id, sync_status, last_synced_at, created_at, updated_at) VALUES
(1, 1, 'QB-CUST-001', 'synced', NOW() - INTERVAL '1 day', NOW(), NOW()),
(1, 2, 'QB-CUST-002', 'synced', NOW() - INTERVAL '1 day', NOW(), NOW());

-- =====================================================
-- 63. QUICKBOOKS INVOICE MAPPINGS
-- =====================================================

INSERT INTO quickbooks_invoice_mappings (organization_id, local_invoice_id, quickbooks_invoice_id, quickbooks_invoice_number, sync_status, last_synced_at, created_at, updated_at) VALUES
(1, 1, 'QB-INV-001', 'QB-1001', 'synced', NOW() - INTERVAL '6 days', NOW(), NOW()),
(1, 2, 'QB-INV-002', 'QB-1002', 'synced', NOW() - INTERVAL '4 days', NOW(), NOW());

-- =====================================================
-- 64. QUICKBOOKS PAYMENT MAPPINGS
-- =====================================================

INSERT INTO quickbooks_payment_mappings (organization_id, local_payment_id, quickbooks_payment_id, sync_status, last_synced_at, created_at, updated_at) VALUES
(1, 1, 'QB-PAY-001', 'synced', NOW() - INTERVAL '6 days', NOW(), NOW()),
(1, 2, 'QB-PAY-002', 'synced', NOW() - INTERVAL '4 days', NOW(), NOW());

-- =====================================================
-- 65. QUICKBOOKS SYNC LOGS
-- =====================================================

INSERT INTO quickbooks_sync_logs (organization_id, sync_type, direction, status, entity_type, entity_id, quickbooks_id, created_at) VALUES
(1, 'customer', 'to_quickbooks', 'success', 'patient', 1, 'QB-CUST-001', NOW() - INTERVAL '1 day'),
(1, 'invoice', 'to_quickbooks', 'success', 'invoice', 1, 'QB-INV-001', NOW() - INTERVAL '6 days'),
(1, 'payment', 'to_quickbooks', 'success', 'payment', 1, 'QB-PAY-001', NOW() - INTERVAL '6 days');

-- =====================================================
-- 66. QUICKBOOKS ACCOUNT MAPPINGS
-- =====================================================

INSERT INTO quickbooks_account_mappings (organization_id, account_type, local_account_name, quickbooks_account_id, quickbooks_account_name, is_active, created_at, updated_at) VALUES
(1, 'revenue', 'Medical Services Revenue', 'QB-ACC-001', 'Medical Services Income', true, NOW(), NOW()),
(1, 'ar', 'Accounts Receivable', 'QB-ACC-002', 'Accounts Receivable', true, NOW(), NOW());

-- =====================================================
-- 67. QUICKBOOKS ITEM MAPPINGS
-- =====================================================

INSERT INTO quickbooks_item_mappings (organization_id, service_code, service_description, quickbooks_item_id, quickbooks_item_name, unit_price, is_active, created_at, updated_at) VALUES
(1, 'CONSULT-GEN', 'General Consultation', 'QB-ITEM-001', 'General Consultation', 100.00, true, NOW(), NOW()),
(1, 'TEST-BLOOD', 'Blood Test', 'QB-ITEM-002', 'Blood Test', 50.00, true, NOW(), NOW());

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count records per table
-- SELECT 'organizations' as table_name, COUNT(*) as count FROM organizations
-- UNION ALL SELECT 'users', COUNT(*) FROM users
-- UNION ALL SELECT 'patients', COUNT(*) FROM patients
-- UNION ALL SELECT 'appointments', COUNT(*) FROM appointments
-- UNION ALL SELECT 'medical_records', COUNT(*) FROM medical_records
-- UNION ALL SELECT 'prescriptions', COUNT(*) FROM prescriptions
-- UNION ALL SELECT 'lab_results', COUNT(*) FROM lab_results
-- UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
-- UNION ALL SELECT 'payments', COUNT(*) FROM payments
-- ORDER BY table_name;

-- =====================================================
-- SUMMARY
-- =====================================================

-- ✅ 67 Tables Populated with Sample Data
-- ✅ 2 Organizations (London Central Medical + Demo Healthcare)
-- ✅ 6 Users (Doctors, Nurses, Admin)
-- ✅ 6 Patients with complete medical histories
-- ✅ 8 Appointments (past, current, future)
-- ✅ 4 Medical Records
-- ✅ 6 Prescriptions
-- ✅ 7 Lab Results
-- ✅ 5 Invoices
-- ✅ 3 Payments
-- ✅ 3 Insurance Verifications
-- ✅ 3 Claims
-- ✅ Revenue Records, AI Insights, Medications Database
-- ✅ Clinical Procedures, Emergency Protocols
-- ✅ GDPR Compliance Records
-- ✅ Inventory Management (Items, Suppliers, Sales, Stock)
-- ✅ Chatbot Configuration and Analytics
-- ✅ QuickBooks Integration Mappings
-- ✅ All related data with proper foreign key relationships

-- Default Login Credentials:
-- Email: dr.smith@londoncentral.uk | Password: password123
-- Email: demo.doctor@averox.com | Password: password123
