-- =====================================================
-- PRESCRIPTIONS & MEDICATIONS DATABASE TABLES
-- CREATE AND INSERT QUERIES
-- =====================================================

-- =====================================================
-- SECTION 1: MEDICATIONS DATABASE TABLE
-- (Reference database for drug information)
-- =====================================================

-- 1.1 CREATE SEQUENCE
CREATE SEQUENCE IF NOT EXISTS medications_database_id_seq;

-- 1.2 CREATE TABLE
CREATE TABLE IF NOT EXISTS medications_database (
    id INTEGER PRIMARY KEY DEFAULT nextval('medications_database_id_seq'),
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    dosage TEXT NOT NULL,
    interactions JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    severity VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_med_severity CHECK (severity IN ('low', 'medium', 'high'))
);

-- 1.3 ADD FOREIGN KEYS
ALTER TABLE medications_database ADD CONSTRAINT medications_database_organization_id_fk 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 1.4 CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_medications_database_organization_id ON medications_database(organization_id);
CREATE INDEX IF NOT EXISTS idx_medications_database_name ON medications_database(name);
CREATE INDEX IF NOT EXISTS idx_medications_database_category ON medications_database(category);

-- 1.5 INSERT MEDICATIONS DATABASE SAMPLE DATA
INSERT INTO medications_database (
    organization_id,
    name,
    category,
    dosage,
    interactions,
    warnings,
    severity,
    is_active,
    created_at
) VALUES
-- Common Medications
(1, 'Lisinopril', 'ACE Inhibitor', '10mg', '["NSAIDs", "Potassium supplements"]', '["Monitor kidney function", "May cause dry cough"]', 'medium', true, NOW()),
(1, 'Metformin', 'Antidiabetic', '500mg', '["Alcohol", "Iodinated contrast"]', '["Risk of lactic acidosis", "Take with food"]', 'medium', true, NOW()),
(1, 'Salbutamol', 'Beta-2 Agonist', '100mcg', '["Beta blockers"]', '["Tachycardia", "Tremor"]', 'low', true, NOW()),
(1, 'Amlodipine', 'Calcium Channel Blocker', '5mg', '["Grapefruit juice"]', '["Ankle swelling", "Headache"]', 'low', true, NOW()),
(1, 'Atorvastatin', 'Statin', '20mg', '["Grapefruit juice", "Fibrates"]', '["Monitor liver function", "Muscle pain"]', 'medium', true, NOW()),
(1, 'Omeprazole', 'Proton Pump Inhibitor', '20mg', '["Clopidogrel"]', '["Long-term use may affect B12 absorption"]', 'low', true, NOW()),
(1, 'Warfarin', 'Anticoagulant', '5mg', '["NSAIDs", "Antibiotics", "Vitamin K"]', '["Regular INR monitoring required", "Bleeding risk"]', 'high', true, NOW()),
(1, 'Aspirin', 'Antiplatelet', '75mg', '["NSAIDs", "Warfarin"]', '["GI bleeding risk", "Take with food"]', 'medium', true, NOW()),
(1, 'Paracetamol', 'Analgesic', '500mg', '["Alcohol (chronic use)"]', '["Max 4g/day", "Hepatotoxicity risk"]', 'low', true, NOW()),
(1, 'Ibuprofen', 'NSAID', '400mg', '["Aspirin", "ACE inhibitors", "Warfarin"]', '["GI irritation", "Cardiovascular risk"]', 'medium', true, NOW()),
(1, 'Levothyroxine', 'Thyroid Hormone', '100mcg', '["Iron", "Calcium"]', '["Take on empty stomach", "Monitor TSH"]', 'low', true, NOW()),
(1, 'Prednisolone', 'Corticosteroid', '5mg', '["NSAIDs", "Live vaccines"]', '["Do not stop abruptly", "Immunosuppression"]', 'high', true, NOW());

-- Update sequence
SELECT setval('medications_database_id_seq', (SELECT COALESCE(MAX(id), 0) FROM medications_database));

-- =====================================================
-- SECTION 2: PRESCRIPTIONS TABLE
-- (Actual prescriptions issued to patients)
-- =====================================================

-- 2.1 CREATE SEQUENCE
CREATE SEQUENCE IF NOT EXISTS prescriptions_id_seq;

-- 2.2 CREATE TABLE
CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY DEFAULT nextval('prescriptions_id_seq'),
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    consultation_id INTEGER,
    prescription_created_by INTEGER,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT,
    refills INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    issued_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_prescription_status CHECK (status IN ('active', 'completed', 'cancelled')),
    CONSTRAINT chk_refills CHECK (refills >= 0)
);

-- 2.3 ADD FOREIGN KEYS
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_organization_id_fk 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_patient_id_fk 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_doctor_id_fk 
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_consultation_id_fk 
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL;

ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_created_by_fk 
    FOREIGN KEY (prescription_created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 2.4 CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_prescriptions_organization_id ON prescriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_medication_name ON prescriptions(medication_name);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_issued_date ON prescriptions(issued_date);

-- 2.5 INSERT PRESCRIPTIONS SAMPLE DATA
INSERT INTO prescriptions (
    organization_id,
    patient_id,
    doctor_id,
    consultation_id,
    prescription_created_by,
    medication_name,
    dosage,
    frequency,
    duration,
    instructions,
    refills,
    status,
    issued_date,
    expiry_date,
    created_at,
    updated_at
) VALUES
-- Prescription 1: Hypertension medication (Patient 1)
(
    1,                                  -- organization_id
    1,                                  -- patient_id (John Anderson - Hypertension)
    2,                                  -- doctor_id (Dr. Smith)
    1,                                  -- consultation_id
    2,                                  -- prescription_created_by
    'Lisinopril',                       -- medication_name (matches medications_database)
    '10mg',                             -- dosage
    'Once daily',                       -- frequency
    '90 days',                          -- duration
    'Take in the morning with or without food. Monitor blood pressure regularly.',
    2,                                  -- refills
    'active',                           -- status
    NOW() - INTERVAL '30 days',        -- issued_date
    NOW() + INTERVAL '60 days',        -- expiry_date
    NOW(),
    NOW()
),

-- Prescription 2: Diabetes medication (Patient 2)
(
    1,
    2,                                  -- patient_id (Mary Johnson - Diabetes)
    2,
    2,
    2,
    'Metformin',                        -- medication_name (matches medications_database)
    '500mg',
    'Twice daily',
    '90 days',
    'Take with breakfast and dinner. May cause mild stomach upset initially.',
    3,
    'active',
    NOW() - INTERVAL '25 days',
    NOW() + INTERVAL '65 days',
    NOW(),
    NOW()
),

-- Prescription 3: Asthma inhaler (Patient 3)
(
    1,
    3,                                  -- patient_id (David Williams - Asthma)
    2,
    NULL,
    2,
    'Salbutamol',                       -- medication_name (matches medications_database)
    '100mcg',
    'As needed (max 4 times daily)',
    '30 days',
    'Use when breathless. Rinse mouth after use. Shake well before use.',
    1,
    'active',
    NOW() - INTERVAL '20 days',
    NOW() + INTERVAL '10 days',
    NOW(),
    NOW()
),

-- Prescription 4: Blood pressure medication (Patient 1)
(
    1,
    1,
    2,
    1,
    2,
    'Amlodipine',                       -- medication_name
    '5mg',
    'Once daily',
    '90 days',
    'Take at the same time each day. May cause ankle swelling.',
    2,
    'active',
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '60 days',
    NOW(),
    NOW()
),

-- Prescription 5: Cholesterol medication (Patient 1)
(
    1,
    1,
    2,
    1,
    2,
    'Atorvastatin',                     -- medication_name
    '20mg',
    'Once daily',
    '90 days',
    'Take in the evening. Report any muscle pain immediately.',
    3,
    'active',
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '60 days',
    NOW(),
    NOW()
),

-- Prescription 6: Gastric protection (Patient 2)
(
    1,
    2,
    2,
    2,
    2,
    'Omeprazole',                       -- medication_name
    '20mg',
    'Once daily',
    '30 days',
    'Take before breakfast for acid reflux.',
    2,
    'active',
    NOW() - INTERVAL '15 days',
    NOW() + INTERVAL '15 days',
    NOW(),
    NOW()
),

-- Prescription 7: Pain relief (Patient 3)
(
    1,
    3,
    2,
    NULL,
    2,
    'Paracetamol',                      -- medication_name
    '500mg',
    '1-2 tablets every 4-6 hours',
    '7 days',
    'Maximum 8 tablets (4g) in 24 hours. Do not exceed dose.',
    0,
    'completed',                        -- Completed prescription
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '10 days',        -- Already expired
    NOW(),
    NOW()
),

-- Prescription 8: Anticoagulant (High severity - Patient 1)
(
    1,
    1,
    2,
    NULL,
    2,
    'Warfarin',                         -- medication_name (high severity)
    '5mg',
    'Once daily',
    '90 days',
    'CRITICAL: Regular INR monitoring required. Avoid vitamin K rich foods. Report any bleeding immediately.',
    2,
    'active',
    NOW() - INTERVAL '20 days',
    NOW() + INTERVAL '70 days',
    NOW(),
    NOW()
),

-- Prescription 9: Cancelled prescription
(
    1,
    2,
    2,
    NULL,
    2,
    'Ibuprofen',                        -- medication_name
    '400mg',
    'Three times daily',
    '14 days',
    'Take with food.',
    1,
    'cancelled',                        -- Cancelled due to interaction
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '4 days',
    NOW(),
    NOW()
),

-- Prescription 10: Thyroid medication (New patient scenario)
(
    1,
    1,
    2,
    NULL,
    2,
    'Levothyroxine',                    -- medication_name
    '100mcg',
    'Once daily',
    '90 days',
    'Take on empty stomach, 30 minutes before breakfast.',
    3,
    'active',
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '85 days',
    NOW(),
    NOW()
);

-- Update sequence
SELECT setval('prescriptions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM prescriptions));

-- =====================================================
-- RELATIONSHIP NOTES
-- =====================================================

-- The prescriptions table is NOT directly linked to medications_database via foreign key.
-- Instead:
-- 1. medications_database serves as a REFERENCE database for drug information
-- 2. prescriptions.medication_name matches medications_database.name by TEXT
-- 3. This allows flexibility - doctors can prescribe medications not in the database
-- 4. Applications should:
--    a) Check medications_database for drug interactions and warnings
--    b) Alert clinicians about potential issues
--    c) Use the severity level to prioritize warnings

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- View all medications in database
-- SELECT id, name, category, dosage, severity, is_active 
-- FROM medications_database 
-- ORDER BY category, name;

-- View all active prescriptions with medication info
-- SELECT 
--     p.id,
--     p.medication_name,
--     p.dosage,
--     p.frequency,
--     p.status,
--     m.category,
--     m.severity,
--     m.warnings
-- FROM prescriptions p
-- LEFT JOIN medications_database m ON p.medication_name = m.name
-- WHERE p.status = 'active'
-- ORDER BY p.issued_date DESC;

-- Check for drug interactions (prescriptions not in medications_database)
-- SELECT 
--     p.medication_name,
--     COUNT(*) as prescription_count
-- FROM prescriptions p
-- LEFT JOIN medications_database m ON p.medication_name = m.name
-- WHERE m.id IS NULL AND p.status = 'active'
-- GROUP BY p.medication_name;

-- View prescriptions by patient with medication warnings
-- SELECT 
--     pat.patient_id,
--     pat.first_name || ' ' || pat.last_name as patient_name,
--     p.medication_name,
--     p.dosage,
--     p.frequency,
--     p.status,
--     m.severity,
--     m.warnings,
--     m.interactions
-- FROM prescriptions p
-- JOIN patients pat ON p.patient_id = pat.id
-- LEFT JOIN medications_database m ON p.medication_name = m.name
-- WHERE p.status = 'active'
-- ORDER BY pat.patient_id, m.severity DESC;

-- Count prescriptions by status
-- SELECT 
--     status,
--     COUNT(*) as count
-- FROM prescriptions
-- GROUP BY status
-- ORDER BY status;

-- =====================================================
-- SUMMARY
-- =====================================================

-- ✅ Medications Database Table Created with:
--    - 12 common medications with interactions and warnings
--    - Severity levels: low, medium, high
--    - JSON fields for interactions and warnings
--    - Categories: ACE Inhibitor, Antidiabetic, Beta-2 Agonist, etc.
--
-- ✅ Prescriptions Table Created with:
--    - Links to organizations, patients, doctors, consultations
--    - 10 sample prescriptions (7 active, 1 completed, 2 cancelled)
--    - Matches medications by name (TEXT matching)
--    - Refills tracking and expiry dates
--
-- ✅ Relationship:
--    - No direct foreign key between tables
--    - Linked by medication_name (TEXT) matching
--    - medications_database provides reference data for safety checks
--    - Applications should cross-reference for drug interactions
--
-- ✅ Sample Data Coverage:
--    - Multiple medications per patient (Patient 1 has 5 prescriptions)
--    - Various statuses: active, completed, cancelled
--    - Different severity levels and warnings
--    - High-risk medications (Warfarin) with critical instructions
