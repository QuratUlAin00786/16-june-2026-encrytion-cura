-- COMPLETE CURA EMR PRODUCTION DATABASE EXPORT
-- Generated from Development Environment
-- Contains all tables, schemas, and data for production deployment

-- =============================================================================
-- STEP 1: ORGANIZATIONS
-- =============================================================================
INSERT INTO organizations (id, name, subdomain, email, created_at, region, brand_name, settings, features, access_level, subscription_status, updated_at) VALUES
(2, 'Demo Healthcare Clinic', 'demo', 'demo@healthcare.com', '2025-09-01 12:12:56.476285', 'UK', 'Demo Clinic', '{}', '{}', 'full', 'active', '2025-09-01 12:12:56.476285'),
(0, 'System', 'system', 'system@curaemr.ai', '2025-09-04 10:26:08.674021', 'UK', 'System', '{}', '{}', 'full', 'active', '2025-09-04 10:26:08.674021')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  subdomain = EXCLUDED.subdomain,
  email = EXCLUDED.email,
  region = EXCLUDED.region,
  brand_name = EXCLUDED.brand_name,
  settings = EXCLUDED.settings,
  features = EXCLUDED.features,
  access_level = EXCLUDED.access_level,
  subscription_status = EXCLUDED.subscription_status,
  updated_at = EXCLUDED.updated_at;

-- =============================================================================
-- STEP 2: USERS (Including Demo Users + Additional Users)
-- =============================================================================
INSERT INTO users (id, organization_id, username, email, password_hash, first_name, last_name, role, is_saas_owner, is_active, created_at, updated_at, department, permissions) VALUES
(2, 2, 'admin', 'admin@cura.com', '$2b$12$s3IZb5Ggq6F9oDLpd7rg1.4PUeDT76oboC4.lFrBellSvnsVPk7Y.', 'Admin', 'User', 'admin', false, true, '2025-09-01 12:27:12.365335', '2025-09-01 12:27:12.365335', NULL, NULL),
(41, 2, 'doctor', 'doctor@cura.com', '$2b$12$JddoZdKxYbq3YsuGwzfDZujWzh0XU0HC/.MiA9chTakfICv.5sswi', 'Dr. John', 'Smith', 'doctor', false, true, '2025-09-08 11:23:51.286386', '2025-09-08 11:23:51.286386', NULL, NULL),
(42, 2, 'patient', 'patient@cura.com', '$2b$12$ApdwxKu3ASf6UapUbWRUjuT.ddv0/x71w33UJxKi.SI31DrSQWPAi', 'Mary', 'Johnson', 'patient', false, true, '2025-09-08 11:23:51.286386', '2025-09-08 11:23:51.286386', NULL, NULL),
(43, 2, 'nurse', 'nurse@cura.com', '$2b$12$mC3OozOPv2b/1VL69yFAk.Vx03l.UdnTtJ8TX1PAbYlhBavogCRDK', 'Sarah', 'Williams', 'nurse', false, true, '2025-09-08 11:23:51.286386', '2025-09-08 11:23:51.286386', NULL, NULL),
(12, 2, 'contact@averoxmedical.co.uk', 'contact+1756805932227@averoxmedical.co.uk', '$2b$12$JddoZdKxYbq3YsuGwzfDZujWzh0XU0HC/.MiA9chTakfICv.5sswi', 'Sarah', 'Suleman', 'doctor', false, true, '2025-09-02 09:38:52.339023', '2025-09-02 09:38:52.339023', 'Cardialogy', '{"fields": {"labResults": true, "financialData": false, "imagingResults": true, "medicalHistory": true, "insuranceDetails": false, "billingInformation": false, "prescriptionDetails": true, "patientSensitiveInfo": true}, "modules": {"forms": {"edit": true, "view": true, "create": true, "delete": false}, "billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "messaging": {"edit": true, "view": true, "create": true, "delete": false}, "aiInsights": {"edit": true, "view": true, "create": true, "delete": false}, "automation": {"edit": false, "view": true, "create": false, "delete": false}, "labResults": {"edit": true, "view": true, "create": true, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": true}, "integrations": {"edit": false, "view": false, "create": false, "delete": false}, "mobileHealth": {"edit": false, "view": true, "create": false, "delete": false}, "telemedicine": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": true}, "medicalImaging": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}, "clinicalDecision": {"edit": true, "view": true, "create": true, "delete": false}, "populationHealth": {"edit": false, "view": true, "create": false, "delete": false}, "voiceDocumentation": {"edit": true, "view": true, "create": true, "delete": true}}}'),
(17, 2, 'usman@newdoctor.com', 'usman+1756808337701@newdoctor.com', '$2b$12$JddoZdKxYbq3YsuGwzfDZujWzh0XU0HC/.MiA9chTakfICv.5sswi', 'Usman', 'Gardezi', 'doctor', false, true, '2025-09-02 10:18:57.810718', '2025-09-02 10:18:57.810718', NULL, '{"fields": {"labResults": true, "financialData": false, "imagingResults": true, "medicalHistory": true, "insuranceDetails": false, "billingInformation": false, "prescriptionDetails": true, "patientSensitiveInfo": true}, "modules": {"forms": {"edit": true, "view": true, "create": true, "delete": false}, "billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "messaging": {"edit": true, "view": true, "create": true, "delete": false}, "aiInsights": {"edit": true, "view": true, "create": true, "delete": false}, "automation": {"edit": false, "view": true, "create": false, "delete": false}, "labResults": {"edit": true, "view": true, "create": true, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": true}, "integrations": {"edit": false, "view": false, "create": false, "delete": false}, "mobileHealth": {"edit": false, "view": true, "create": false, "delete": false}, "telemedicine": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": true}, "medicalImaging": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}, "clinicalDecision": {"edit": true, "view": true, "create": true, "delete": false}, "populationHealth": {"edit": false, "view": true, "create": false, "delete": false}, "voiceDocumentation": {"edit": true, "view": true, "create": true, "delete": true}}}'),
(40, 0, 'saas_admin', 'saas_admin@curaemr.ai', '$2b$12$r87vji5k3zV2Aoqs9vjciuV5U/9XNaIaumAg2AtMyhYGIbtN4T96.', 'SaaS', 'Administrator', 'admin', true, true, '2025-09-04 10:26:33.482969', '2025-09-04 10:26:33.482969', NULL, NULL),
(9, 2, 'patel@averoxemr.com', 'patel+1756804932776@averoxemr.com', '$2b$12$JddoZdKxYbq3YsuGwzfDZujWzh0XU0HC/.MiA9chTakfICv.5sswi', 'Ali ', 'Raza', 'doctor', false, true, '2025-09-02 09:22:12.882884', '2025-09-02 09:22:12.882884', 'Dermatology', '{"fields": {"labResults": true, "financialData": false, "imagingResults": true, "medicalHistory": true, "insuranceDetails": false, "billingInformation": false, "prescriptionDetails": true, "patientSensitiveInfo": true}, "modules": {"forms": {"edit": true, "view": true, "create": true, "delete": false}, "billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "messaging": {"edit": true, "view": true, "create": true, "delete": false}, "aiInsights": {"edit": true, "view": true, "create": true, "delete": false}, "automation": {"edit": false, "view": true, "create": false, "delete": false}, "labResults": {"edit": true, "view": true, "create": true, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": true}, "integrations": {"edit": false, "view": false, "create": false, "delete": false}, "mobileHealth": {"edit": false, "view": true, "create": false, "delete": false}, "telemedicine": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": true}, "medicalImaging": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}, "clinicalDecision": {"edit": true, "view": true, "create": true, "delete": false}, "populationHealth": {"edit": false, "view": true, "create": false, "delete": false}, "voiceDocumentation": {"edit": true, "view": true, "create": true, "delete": true}}}')
ON CONFLICT (id) DO UPDATE SET 
  organization_id = EXCLUDED.organization_id,
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_saas_owner = EXCLUDED.is_saas_owner,
  is_active = EXCLUDED.is_active,
  department = EXCLUDED.department,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- =============================================================================
-- STEP 3: PATIENTS
-- =============================================================================
INSERT INTO patients (id, organization_id, first_name, last_name, email, phone, date_of_birth, address, patient_id, nhs_number, is_active, emergency_contact, medical_history, risk_level, flags, created_at, updated_at) VALUES
(6, 2, 'Maryam', ' Khan', 'patel@averoxemr.com', '+923173335411', '2000-09-02', '{"street":"G5, 4rth Road","city":"Islamabad","state":"Pakistan","postcode":"44000","country":"United Kingdom"}', 'P000006', '989 877 767', true, '{"name":"Fatima","relationship":"","phone":"03328979744"}', '{"allergies":[],"chronicConditions":[],"medications":[],"familyHistory":{"father":[],"mother":[],"siblings":[],"grandparents":[]},"socialHistory":{"smoking":{"status":"never"},"alcohol":{"status":"never"},"drugs":{"status":"never"},"occupation":"","maritalStatus":"single","education":"","exercise":{"frequency":"none"}},"immunizations":[]}', 'low', NULL, '2025-09-02 08:44:37.924306', '2025-09-02 08:44:37.924306'),
(7, 2, 'Zahra ', 'Qureshi', 'patel@averoxemr.com', '+923328979754', '1993-02-10', '{"street":"G5, 4rth Road","city":"Islamabad","state":"Pakistan","postcode":"44000","country":"United Kingdom"}', 'P000003', '989 877 767', true, '{"name":"Fatima","relationship":"","phone":"03328979744"}', '{"allergies":[],"chronicConditions":[],"medications":[],"familyHistory":{"father":[],"mother":[],"siblings":[],"grandparents":[]},"socialHistory":{"smoking":{"status":"never"},"alcohol":{"status":"never"},"drugs":{"status":"never"},"occupation":"","maritalStatus":"single","education":"","exercise":{"frequency":"none"}},"immunizations":[]}', 'low', NULL, '2025-09-02 08:55:20.680048', '2025-09-02 08:55:20.680048'),
(8, 2, 'Qurat', 'Ul Ain', 'patel@averoxemr.com', '+923173335411', '1993-09-02', '{"street":"G5, 4rth Road","city":"Islamabad","state":"Pakistan","postcode":"44000","country":"United Kingdom"}', 'P000004', '989 877 767', true, '{"name":"Fatima","relationship":"","phone":"03328979744"}', '{"allergies":[],"chronicConditions":[],"medications":[],"familyHistory":{"father":[],"mother":[],"siblings":[],"grandparents":[]},"socialHistory":{"smoking":{"status":"never"},"alcohol":{"status":"never"},"drugs":{"status":"never"},"occupation":"","maritalStatus":"single","education":"","exercise":{"frequency":"none"}},"immunizations":[]}', 'low', NULL, '2025-09-02 08:59:38.874419', '2025-09-02 12:04:29.78'),
(4, 2, 'Rashida', 'Younus', 'contact@averoxmedical.co.uk', '+443328979744', '2000-09-02', '{"street":"G5, 4rth Road","city":"Islamabad","state":"Pakistan","postcode":"44000","country":"United Kingdom"}', 'P000004', '989 877 767', true, '{"name":"Zahra","relationship":"","phone":"03328979744"}', '{"allergies":["Peanut butter"],"chronicConditions":["non"],"medications":[],"familyHistory":{"father":["Diabetes (age 40) - shtehtdydhgf"],"mother":["Diabetes (age 50) - jynhvb"],"siblings":[],"grandparents":[]},"socialHistory":{"smoking":{"status":"never"},"alcohol":{"status":"never"},"drugs":{"status":"never"},"occupation":"","maritalStatus":"single","education":"","exercise":{"frequency":"none"}},"immunizations":[]}', 'low', '{"general:medium:ertyulio.ngbfnmh,j.kuygl","general:medium:sdhjfkguyiogh,j.ksrtdjrfyugiikljmhn","general:medium:fesrhtykuli","general:medium:dfgchj,k.lk"}', '2025-09-02 08:39:01.893946', '2025-09-02 17:49:45.613'),
(9, 2, 'Kinza', 'Mumtaz', 'zahraqureshi039@gmail.com', '+923328979744', '2000-09-08', '{"street":"G5, 4rth Road","city":"Islamabad","state":"Pakistan","postcode":"44000","country":"United Kingdom"}', 'P000005', '999760531', true, '{"name":"Fatima","relationship":"","phone":"03328979744"}', '{"allergies":[],"chronicConditions":[],"medications":[],"familyHistory":{"father":[],"mother":[],"siblings":[],"grandparents":[]},"socialHistory":{"smoking":{"status":"never"},"alcohol":{"status":"never"},"drugs":{"status":"never"},"occupation":"","maritalStatus":"single","education":"","exercise":{"frequency":"none"}},"immunizations":[]}', 'low', NULL, '2025-09-08 11:15:08.327932', '2025-09-08 11:15:08.327932')
ON CONFLICT (id) DO UPDATE SET 
  organization_id = EXCLUDED.organization_id,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  date_of_birth = EXCLUDED.date_of_birth,
  address = EXCLUDED.address,
  patient_id = EXCLUDED.patient_id,
  nhs_number = EXCLUDED.nhs_number,
  is_active = EXCLUDED.is_active,
  emergency_contact = EXCLUDED.emergency_contact,
  medical_history = EXCLUDED.medical_history,
  risk_level = EXCLUDED.risk_level,
  flags = EXCLUDED.flags,
  updated_at = EXCLUDED.updated_at;

-- =============================================================================
-- STEP 4: APPOINTMENTS
-- =============================================================================
INSERT INTO appointments (id, organization_id, patient_id, provider_id, title, description, scheduled_at, duration, status, type, location, is_virtual, created_at) VALUES
(10, 2, 7, 12, 'okn', 'sgrehtdjykuiuxgfchgjvk', '2025-09-02 09:00:00', 30, 'scheduled', 'consultation', 'Neurology Department', false, '2025-09-02 11:52:19.000116'),
(11, 2, 6, 9, 'abd', 'dsrtyuioc vbmnj,', '2025-09-03 11:20:00', 30, 'scheduled', 'consultation', 'Islamabad', false, '2025-09-02 18:21:02.507939'),
(12, 2, 8, 12, 'vpn', 'etsyrdtfylguyihuojigdhxfjtcfykgulh/jio', '2025-09-03 00:45:00', 30, 'scheduled', 'consultation', 'Islamabad', false, '2025-09-02 19:44:50.912121'),
(13, 2, 4, 17, 'plm', 'yed6idkydyrfuy', '2025-09-08 09:00:00', 30, 'scheduled', 'consultation', 'Cardiology Department', false, '2025-09-07 10:23:35.260556'),
(14, 2, 4, 12, 'plz', 'drxykcuglhkjh', '2025-09-07 09:00:00', 30, 'scheduled', 'consultation', 'Cardiology Department', false, '2025-09-07 16:11:07.558711'),
(15, 2, 4, 12, 'General Consultation - Rashida Younus', 'Appointment booked via AI Assistant. Patient: Rashida Younus. Reason: General consultation', '2025-09-08 10:00:00', 30, 'scheduled', 'consultation', 'General Consultation Room', false, '2025-09-07 16:47:31.215596'),
(16, 2, 4, 17, 'Olm', 'vdserhj5r6ktu,gjcvnm', '2025-09-07 09:00:00', 30, 'scheduled', 'consultation', 'Cardiology Department', false, '2025-09-07 17:19:17.596524')
ON CONFLICT (id) DO UPDATE SET 
  organization_id = EXCLUDED.organization_id,
  patient_id = EXCLUDED.patient_id,
  provider_id = EXCLUDED.provider_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  scheduled_at = EXCLUDED.scheduled_at,
  duration = EXCLUDED.duration,
  status = EXCLUDED.status,
  type = EXCLUDED.type,
  location = EXCLUDED.location,
  is_virtual = EXCLUDED.is_virtual,
  created_at = EXCLUDED.created_at;

-- =============================================================================
-- STEP 5: PRESCRIPTIONS
-- =============================================================================
INSERT INTO prescriptions (id, organization_id, patient_id, doctor_id, medication_name, dosage, frequency, duration, instructions, status, issued_date, created_at, updated_at, prescription_number, diagnosis, medications, pharmacy, notes, is_electronic, interactions, signature) VALUES
(10, 2, 7, 12, 'Metformin', '500mg', 'Twice daily with meals', '90 days', 'Take with breakfast and dinner', 'active', '2025-09-02 20:38:15.728255', '2025-09-02 20:38:15.728255', '2025-09-02 20:38:15.728255', 'RX-1756845495613-002', 'Type 2 Diabetes', '[{"name": "Metformin", "dosage": "500mg", "refills": 3, "duration": "90 days", "quantity": 180, "frequency": "Twice daily with meals", "instructions": "Take with breakfast and dinner", "genericAllowed": true}]', '{"name": "Local Pharmacy", "phone": "+44 20 7946 0959", "address": "456 High St, London"}', 'Monitor blood glucose levels', true, '[]', '{}'),
(9, 2, 6, 12, 'Lisinopril', '10mg', 'Once daily', '30 days', 'Take with or without food. Monitor blood pressure.', 'signed', '2025-09-02 20:38:15.728255', '2025-09-02 20:38:15.728255', '2025-09-02 20:43:18.076', 'RX-1756845495613-001', 'Hypertension', '[]', '{"name": "Halo Health", "email": "zakiafatima013@gmail.com", "phone": "+44(0)121 827 5531", "address": "Unit 2 Drayton Court, Solihull, B90 4NG"}', 'Patient tolerates ACE inhibitors well', true, '[]', '{"signedAt": "2025-09-02T20:43:18.076Z", "signedBy": " ", "signerId": 2, "doctorSignature": "data:image/png;base64,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"}')
ON CONFLICT (id) DO UPDATE SET 
  organization_id = EXCLUDED.organization_id,
  patient_id = EXCLUDED.patient_id,
  doctor_id = EXCLUDED.doctor_id,
  medication_name = EXCLUDED.medication_name,
  dosage = EXCLUDED.dosage,
  frequency = EXCLUDED.frequency,
  duration = EXCLUDED.duration,
  instructions = EXCLUDED.instructions,
  status = EXCLUDED.status,
  prescription_number = EXCLUDED.prescription_number,
  diagnosis = EXCLUDED.diagnosis,
  medications = EXCLUDED.medications,
  pharmacy = EXCLUDED.pharmacy,
  notes = EXCLUDED.notes,
  is_electronic = EXCLUDED.is_electronic,
  interactions = EXCLUDED.interactions,
  signature = EXCLUDED.signature;

-- =============================================================================
-- STEP 6: ROLES
-- =============================================================================
INSERT INTO roles (id, organization_id, name, display_name, description, permissions, is_system, created_at, updated_at) VALUES
(1, 2, 'administrator', 'Administrator', 'Full system access with all permissions', '{"fields": {"financialData": {"edit": true, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": true, "view": true, "create": true, "delete": true}, "patients": {"edit": true, "view": true, "create": true, "delete": true}, "settings": {"edit": true, "view": true, "create": true, "delete": true}, "analytics": {"edit": true, "view": true, "create": true, "delete": true}, "appointments": {"edit": true, "view": true, "create": true, "delete": true}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": true}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": true}, "userManagement": {"edit": true, "view": true, "create": true, "delete": true}}}', true, '2025-09-03 10:02:33.249018', '2025-09-03 10:02:33.249018'),
(2, 2, 'physician', 'Physician', 'Medical professional with clinical access', '{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}', true, '2025-09-03 10:02:33.249018', '2025-09-03 10:02:33.249018'),
(3, 2, 'nurse', 'Nurse', 'Nursing staff with patient care access', '{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}', true, '2025-09-03 10:02:33.249018', '2025-09-03 10:02:33.249018')
ON CONFLICT (id) DO UPDATE SET 
  organization_id = EXCLUDED.organization_id,
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = EXCLUDED.is_system,
  updated_at = EXCLUDED.updated_at;

-- =============================================================================
-- STEP 7: SUBSCRIPTIONS
-- =============================================================================
INSERT INTO subscriptions (id, organization_id, plan_name, status, created_at, updated_at, plan, user_limit, storage_limit_gb, ai_queries_limit, current_users, monthly_price, next_billing_at) VALUES
(1, 2, 'pro', 'active', '2025-09-01 12:39:24.751133', '2025-09-01 12:39:24.751133', 'pro', 50, 100, 1000, 3, 79.00, '2025-10-02 00:00:00')
ON CONFLICT (id) DO UPDATE SET 
  organization_id = EXCLUDED.organization_id,
  plan_name = EXCLUDED.plan_name,
  status = EXCLUDED.status,
  plan = EXCLUDED.plan,
  user_limit = EXCLUDED.user_limit,
  storage_limit_gb = EXCLUDED.storage_limit_gb,
  ai_queries_limit = EXCLUDED.ai_queries_limit,
  current_users = EXCLUDED.current_users,
  monthly_price = EXCLUDED.monthly_price,
  next_billing_at = EXCLUDED.next_billing_at,
  updated_at = EXCLUDED.updated_at;

-- =============================================================================
-- STEP 8: LAB RESULTS  
-- =============================================================================
INSERT INTO lab_results (id, organization_id, patient_id, test_id, test_type, ordered_by, ordered_at, status, priority, results, notes, created_at, updated_at, critical_values) VALUES
(1, 2, 4, 'LAB1756847616439DAL7V', 'Basic Metabolic Panel', 2, '2025-09-02 21:13:36.439', 'pending', 'routine', '{}', 'Test order', '2025-09-02 21:13:36.545841', '2025-09-02 21:13:36.545841', false),
(3, 2, 8, 'LAB1756892229170EKNDS', 'Comprehensive Metabolic Panel', 2, '2025-09-03 09:37:09.17', 'pending', 'routine', '{}', 'ewsgrdhtyuio;lkjhgfdgbntymu', '2025-09-03 09:37:09.284341', '2025-09-03 09:37:09.284341', false)
ON CONFLICT (id) DO UPDATE SET 
  organization_id = EXCLUDED.organization_id,
  patient_id = EXCLUDED.patient_id,
  test_id = EXCLUDED.test_id,
  test_type = EXCLUDED.test_type,
  ordered_by = EXCLUDED.ordered_by,
  ordered_at = EXCLUDED.ordered_at,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  results = EXCLUDED.results,
  notes = EXCLUDED.notes,
  critical_values = EXCLUDED.critical_values,
  updated_at = EXCLUDED.updated_at;

-- =============================================================================
-- STEP 9: VOICE NOTES
-- =============================================================================
INSERT INTO voice_notes (id, organization_id, patient_id, patient_name, provider_id, provider_name, type, status, recording_duration, transcript, confidence, medical_terms, structured_data, created_at, updated_at) VALUES
('note_1757238357270', 2, 8, 'Qurat Ul Ain', 2, 'Dr. Provider', 'procedure_note', 'completed', 8, 'patient has come to the hospital with high blood pressure headache and vomitings', 95, '[]', '{}', '2025-09-07 09:45:57.382737', '2025-09-07 09:45:57.382737'),
('note_1757238857202', 2, 6, 'Maryam  Khan', 2, 'Dr. Provider', 'clinical_note', 'completed', 13, 'Patient has come to the hospital with backache, headache and vomiting.', 95, '[]', '{}', '2025-09-07 09:54:17.31696', '2025-09-07 09:54:17.31696')
ON CONFLICT (id) DO UPDATE SET 
  organization_id = EXCLUDED.organization_id,
  patient_id = EXCLUDED.patient_id,
  patient_name = EXCLUDED.patient_name,
  provider_id = EXCLUDED.provider_id,
  provider_name = EXCLUDED.provider_name,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  recording_duration = EXCLUDED.recording_duration,
  transcript = EXCLUDED.transcript,
  confidence = EXCLUDED.confidence,
  medical_terms = EXCLUDED.medical_terms,
  structured_data = EXCLUDED.structured_data,
  updated_at = EXCLUDED.updated_at;

-- =============================================================================
-- STEP 10: UPDATE SEQUENCES TO PREVENT CONFLICTS
-- =============================================================================
SELECT setval('organizations_id_seq', GREATEST(100, (SELECT COALESCE(MAX(id), 1) FROM organizations)), true);
SELECT setval('users_id_seq', GREATEST(100, (SELECT COALESCE(MAX(id), 1) FROM users)), true);
SELECT setval('patients_id_seq', GREATEST(100, (SELECT COALESCE(MAX(id), 1) FROM patients)), true);
SELECT setval('appointments_id_seq', GREATEST(100, (SELECT COALESCE(MAX(id), 1) FROM appointments)), true);
SELECT setval('prescriptions_id_seq', GREATEST(100, (SELECT COALESCE(MAX(id), 1) FROM prescriptions)), true);
SELECT setval('roles_id_seq', GREATEST(100, (SELECT COALESCE(MAX(id), 1) FROM roles)), true);
SELECT setval('subscriptions_id_seq', GREATEST(100, (SELECT COALESCE(MAX(id), 1) FROM subscriptions)), true);
SELECT setval('lab_results_id_seq', GREATEST(100, (SELECT COALESCE(MAX(id), 1) FROM lab_results)), true);

-- =============================================================================
-- PRODUCTION SETUP COMPLETE!
-- =============================================================================
-- Demo credentials that will work:
-- admin@cura.com / admin123
-- doctor@cura.com / doctor123 (or: doctor / doctor123)
-- patient@cura.com / patient123 (or: patient / patient123)
-- nurse@cura.com / nurse123 (or: nurse / nurse123)
--
-- Additional users:
-- contact+1756805932227@averoxmedical.co.uk / doctor123 (Dr. Sarah Suleman - Cardiology)
-- usman+1756808337701@newdoctor.com / doctor123 (Dr. Usman Gardezi)
-- patel+1756804932776@averoxemr.com / doctor123 (Dr. Ali Raza - Dermatology)
--
-- SaaS Admin (organizationId: 0):
-- saas_admin@curaemr.ai / admin123
-- =============================================================================