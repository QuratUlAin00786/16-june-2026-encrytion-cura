-- =====================================================
-- CURA EMR COMPLETE DATABASE EXPORT
-- Schema + Actual Data Export
-- Generated: October 16, 2025
-- Database: PostgreSQL (Neon Serverless)
-- Total Records: 3 Organizations, 36 Users, 15 Patients
-- =====================================================

-- =====================================================
-- PART 1: DATABASE SCHEMA
-- =====================================================

-- Organizations (Multi-tenant)
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subdomain VARCHAR(50) NOT NULL UNIQUE,
    email TEXT NOT NULL,
    region VARCHAR(10) NOT NULL DEFAULT 'UK',
    brand_name TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    access_level VARCHAR(50) DEFAULT 'full',
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'doctor',
    department TEXT,
    medical_specialty_category TEXT,
    sub_specialty TEXT,
    working_days JSONB DEFAULT '[]',
    working_hours JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_saas_owner BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id),
    patient_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    gender_at_birth VARCHAR(20),
    email TEXT,
    phone TEXT,
    nhs_number TEXT,
    address JSONB DEFAULT '{}',
    insurance_info JSONB DEFAULT '{}',
    emergency_contact JSONB DEFAULT '{}',
    medical_history JSONB DEFAULT '{}',
    risk_level VARCHAR(10) NOT NULL DEFAULT 'low',
    flags TEXT[] DEFAULT '{}',
    communication_preferences JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_insured BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    assigned_role VARCHAR(50),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    type VARCHAR(20) NOT NULL DEFAULT 'consultation',
    location TEXT,
    is_virtual BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    doctor_id INTEGER NOT NULL REFERENCES users(id),
    prescription_created_by INTEGER REFERENCES users(id),
    consultation_id INTEGER,
    prescription_number VARCHAR(50) NOT NULL UNIQUE,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    quantity INTEGER,
    refills INTEGER,
    instructions TEXT,
    diagnosis TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    pharmacy_name TEXT,
    pharmacy_email TEXT,
    pharmacy_phone TEXT,
    sent_to_pharmacy_at TIMESTAMP,
    dispensed_at TIMESTAMP,
    signature JSONB,
    attachments JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Lab Results
CREATE TABLE IF NOT EXISTS lab_results (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    ordered_by INTEGER NOT NULL REFERENCES users(id),
    lab_number VARCHAR(50) NOT NULL UNIQUE,
    test_type TEXT NOT NULL,
    test_date TIMESTAMP NOT NULL,
    results JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    normal_range TEXT,
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Medical Images
CREATE TABLE IF NOT EXISTS medical_images (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    imaging_type VARCHAR(50) NOT NULL,
    study_date TIMESTAMP NOT NULL,
    body_part TEXT,
    modality VARCHAR(20),
    finding TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    thumbnail_path TEXT,
    dicom_metadata JSONB,
    ai_analysis JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    nhs_number VARCHAR(10),
    date_of_service TIMESTAMP NOT NULL,
    invoice_date TIMESTAMP NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    invoice_type VARCHAR(50) NOT NULL DEFAULT 'payment',
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL,
    insurance JSONB,
    payments JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Roles (Custom role definitions)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    permissions JSONB NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- AI Insights
CREATE TABLE IF NOT EXISTS ai_insights (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER,
    type VARCHAR(30) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'medium',
    action_required BOOLEAN NOT NULL DEFAULT false,
    confidence VARCHAR(10),
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    ai_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Medical Records
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    diagnosis TEXT,
    treatment TEXT,
    prescription JSONB DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    ai_suggestions JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(50) PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    participants JSONB NOT NULL,
    last_message JSONB,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_patient_conversation BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- GDPR Consents
CREATE TABLE IF NOT EXISTS gdpr_consents (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    consent_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    granted_at TIMESTAMP,
    withdrawn_at TIMESTAMP,
    expires_at TIMESTAMP,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    data_categories JSONB DEFAULT '[]',
    retention_period INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    consent_method VARCHAR(30) NOT NULL DEFAULT 'digital',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 2: ACTUAL DATA FROM DATABASE
-- =====================================================

-- =====================================================
-- ORGANIZATIONS DATA (3 records)
-- =====================================================

INSERT INTO organizations (id, name, subdomain, email, region, subscription_status, created_at)
VALUES 
    (1, 'Averox Healthcare', 'demo', 'admin@averox-healthcare.com', 'UK', 'active', '2025-10-12 06:03:45.020757'),
    (2, 'medicure', 'medicure', 'quratulain888@yahoo.com', 'UK', 'trial', '2025-10-12 09:28:29.252799'),
    (3, 'AAA', 'aaa', '001quratulain@gmail.com', 'UK', 'trial', '2025-10-16 06:15:13.160856');

-- Update sequence
SELECT setval('organizations_id_seq', (SELECT MAX(id) FROM organizations));

-- =====================================================
-- USERS DATA (Sample - 10 of 36 records)
-- =====================================================

INSERT INTO users (id, organization_id, email, first_name, last_name, role, department, is_active, is_saas_owner, created_at)
VALUES 
    -- SaaS Owner (organization_id = 0 for system-wide)
    (11, 0, 'saas_admin@curaemr.ai', 'SaaS', 'Administrator', 'admin', NULL, true, true, '2025-10-12 06:03:53.843674'),
    
    -- Organization 1 (Averox Healthcare) Users
    (1, 1, 'admin@cura.com', 'John', 'Administrator', 'admin', 'Administration', true, false, '2025-10-12 06:03:48.084257'),
    (2, 1, 'doctor@cura.com', 'Sarah', 'Smith', 'doctor', 'Cardiology', true, false, '2025-10-12 06:03:48.084257'),
    (3, 1, 'nurse@cura.com', 'Emily', 'Johnson', 'nurse', 'General Medicine', true, false, '2025-10-12 06:03:48.084257'),
    (4, 1, 'patient@cura.com', 'Michael', 'Patient', 'patient', NULL, true, false, '2025-10-12 06:03:48.084257'),
    (5, 1, 'labtech@cura.com', 'Maria', 'Rodriguez', 'lab_technician', 'Laboratory', true, false, '2025-10-12 06:03:48.084257'),
    (6, 1, 'doctor2@cura.com', 'Michael', 'Johnson', 'doctor', 'Neurology', true, false, '2025-10-12 06:03:48.084257'),
    (7, 1, 'doctor3@cura.com', 'David', 'Wilson', 'doctor', 'Orthopedics', true, false, '2025-10-12 06:03:48.084257'),
    (8, 1, 'doctor4@cura.com', 'Lisa', 'Anderson', 'doctor', 'Pediatrics', true, false, '2025-10-12 06:03:48.084257'),
    (9, 1, 'doctor5@cura.com', 'Robert', 'Brown', 'doctor', 'Dermatology', true, false, '2025-10-12 06:03:48.084257');

-- Note: Password hashes omitted for security
-- Update sequence
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- =====================================================
-- PATIENTS DATA (Sample - 10 of 15 records)
-- =====================================================

INSERT INTO patients (id, organization_id, patient_id, first_name, last_name, email, phone, nhs_number, is_active, created_at)
VALUES 
    (1, 1, 'P001', 'Alice', 'Williams', 'alice.williams@email.com', '+44 7700 900123', '123 456 7890', true, '2025-10-12 06:03:48.757961'),
    (2, 1, 'P002', 'Robert', 'Davis', 'robert.davis@email.com', '+44 7700 900125', '234 567 8901', true, '2025-10-12 06:03:48.757961'),
    (3, 1, 'P003', 'Michael', 'Patient', 'patient@cura.com', '+44 7700 900125', NULL, true, '2025-10-12 08:52:22.745309'),
    (4, 1, 'P000004', 'ANN', 'ANN', 'p89689@cura.com', NULL, NULL, true, '2025-10-12 09:24:15.427759'),
    (6, 1, 'P000005', 'ere', 'rerrr', 'quratulain009911@outlook.com', '+923115459791', NULL, true, '2025-10-13 10:38:42.448183'),
    (7, 1, 'P000006', 'ANN-doc', 'ANN', 'quratulain009910981@outlook.com', '+1 3115459791', NULL, true, '2025-10-15 04:09:30.333853'),
    (8, 1, 'P000007', 'weff', 'weff', 'quratulain88x228@yahoo.com', '+971 3115459791', '4234234234', true, '2025-10-15 04:28:51.190933'),
    (9, 1, 'P000008', 'Jhon', 'Doe', 'anonymous.helper.80412@gmail.com', '+44 5678998998', '9434765919', true, '2025-10-15 13:55:43.721877'),
    (10, 1, 'P000009', 'abdullah', 'khan', 'abdullahaverox@gmail.com', '+1 5678909874', NULL, true, '2025-10-15 14:01:36.923867'),
    (11, 1, 'P000010', 'armughan', 'ali', 'abdullahaverox1234@gmail.com', '+44 3155848744', NULL, true, '2025-10-15 14:08:02.787394');

-- Update sequence
SELECT setval('patients_id_seq', (SELECT MAX(id) FROM patients));

-- =====================================================
-- DATABASE STATISTICS
-- =====================================================

/*
CURRENT DATABASE STATISTICS:
- Total Organizations: 3
- Total Users: 36
- Total Patients: 15
- Multi-tenant: Yes (all data scoped by organization_id)
- SaaS Owners: 1 (organization_id = 0)

ORGANIZATION BREAKDOWN:
1. Averox Healthcare (demo) - Active subscription
2. Medicure (medicure) - Trial subscription
3. AAA (aaa) - Trial subscription

USER ROLES DISTRIBUTION:
- Admin users
- Doctor users (multiple specialties)
- Nurse users
- Lab technician users
- Patient users
- SaaS administrator (system-wide)
*/

-- =====================================================
-- RELATIONSHIPS & CONSTRAINTS
-- =====================================================

-- Foreign Key Constraints
ALTER TABLE users ADD CONSTRAINT fk_users_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id);

ALTER TABLE patients ADD CONSTRAINT fk_patients_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id);

ALTER TABLE patients ADD CONSTRAINT fk_patients_user 
    FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE patients ADD CONSTRAINT fk_patients_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE appointments ADD CONSTRAINT fk_appointments_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id);

ALTER TABLE prescriptions ADD CONSTRAINT fk_prescriptions_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id);

ALTER TABLE prescriptions ADD CONSTRAINT fk_prescriptions_doctor 
    FOREIGN KEY (doctor_id) REFERENCES users(id);

ALTER TABLE lab_results ADD CONSTRAINT fk_lab_results_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id);

ALTER TABLE lab_results ADD CONSTRAINT fk_lab_results_ordered_by 
    FOREIGN KEY (ordered_by) REFERENCES users(id);

ALTER TABLE medical_images ADD CONSTRAINT fk_medical_images_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id);

ALTER TABLE medical_images ADD CONSTRAINT fk_medical_images_uploaded_by 
    FOREIGN KEY (uploaded_by) REFERENCES users(id);

ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user 
    FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE gdpr_consents ADD CONSTRAINT fk_gdpr_consents_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id);

-- =====================================================
-- INDEXES
-- =====================================================

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_organization_id ON patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_organization_id ON appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_organization_id ON prescriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);

-- Patient relationship indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_images_patient_id ON medical_images(patient_id);

-- Status and date indexes
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- GDPR indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_patient_id ON gdpr_consents(patient_id);

-- =====================================================
-- QUERY EXAMPLES
-- =====================================================

-- Get all organizations with their user counts
/*
SELECT 
    o.id,
    o.name,
    o.subdomain,
    o.subscription_status,
    COUNT(u.id) as user_count
FROM organizations o
LEFT JOIN users u ON o.id = u.organization_id
GROUP BY o.id, o.name, o.subdomain, o.subscription_status
ORDER BY o.id;
*/

-- Get all patients for an organization
/*
SELECT 
    p.patient_id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.nhs_number,
    p.is_active
FROM patients p
WHERE p.organization_id = 1
ORDER BY p.created_at DESC;
*/

-- Get user appointments with patient details
/*
SELECT 
    a.id,
    a.title,
    a.scheduled_at,
    a.status,
    p.first_name || ' ' || p.last_name as patient_name,
    u.first_name || ' ' || u.last_name as provider_name
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN users u ON a.provider_id = u.id
WHERE a.organization_id = 1
ORDER BY a.scheduled_at DESC;
*/

-- =====================================================
-- DEPLOYMENT NOTES
-- =====================================================

/*
PRODUCTION DEPLOYMENT:
1. This export includes schema + sample data
2. For production, use Replit's automatic database provisioning
3. Schema will be synced via drizzle-kit push
4. Data will be fresh in production (no seed data copied)
5. SaaS admin will be auto-created via /api/production-setup endpoint

BACKUP & RESTORE:
- Use this file to restore database structure
- Update INSERT statements with actual data for full restore
- Sequences are updated to match max IDs

MULTI-TENANT ISOLATION:
- All queries filtered by organization_id
- SaaS owner has organization_id = 0 (system-wide)
- Foreign keys enforce referential integrity
*/

-- =====================================================
-- END OF DATABASE EXPORT
-- =====================================================
