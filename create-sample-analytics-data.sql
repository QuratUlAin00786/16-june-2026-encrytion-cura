-- Sample SQL script to create analytics subject with sample appointment data
-- Adjust organization_id, patient_id, provider_id as needed for your database

-- Step 1: Create treatments in treatments_info table
-- (Adjust organization_id and created_by to match your setup)
INSERT INTO treatments_info (organization_id, name, color_code, created_by)
VALUES
  (20, 'Halo Laser', '#2563eb', 1),
  (20, 'Halo Facial', '#2563eb', 1),
  (20, 'Halo Follow-up Sessions', '#2563eb', 1)
ON CONFLICT DO NOTHING;

-- Step 2: Get the treatment IDs (adjust organization_id)
SELECT id, name 
FROM treatments_info 
WHERE organization_id = 20 
  AND name IN ('Halo Laser', 'Halo Facial', 'Halo Follow-up Sessions')
ORDER BY name;

-- Step 3: Create analytics subject
-- (Adjust organization_id)
INSERT INTO analytics_subjects (organization_id, subject_title)
VALUES (20, 'Halo Treatments')
ON CONFLICT DO NOTHING
RETURNING id;

-- Step 4: Link treatments to subject
-- Replace <SUBJECT_ID>, <TREATMENT_ID_1>, <TREATMENT_ID_2>, <TREATMENT_ID_3> with actual IDs from steps above
-- Example: If subject ID is 1 and treatment IDs are 101, 102, 103:
/*
INSERT INTO analytics_subject_treatments (subject_id, treatment_id)
VALUES
  (1, 101),  -- Halo Laser
  (1, 102),  -- Halo Facial
  (1, 103)   -- Halo Follow-up Sessions
ON CONFLICT DO NOTHING;
*/

-- Step 5: Create sample appointments with these treatments
-- IMPORTANT: Replace <PATIENT_ID>, <PROVIDER_ID> with actual IDs from your database
-- Replace <TREATMENT_ID_1>, <TREATMENT_ID_2>, <TREATMENT_ID_3> with actual treatment IDs
-- Example:
/*
INSERT INTO appointments (
  organization_id,
  patient_id,
  provider_id,
  treatment_id,
  scheduled_at,
  status,
  created_at,
  updated_at
)
VALUES
  -- Halo Laser appointments
  (20, <PATIENT_ID>, <PROVIDER_ID>, <TREATMENT_ID_1>, '2024-01-15 10:00:00', 'completed', NOW(), NOW()),
  (20, <PATIENT_ID>, <PROVIDER_ID>, <TREATMENT_ID_1>, '2024-02-10 14:00:00', 'completed', NOW(), NOW()),
  (20, <PATIENT_ID>, <PROVIDER_ID>, <TREATMENT_ID_1>, '2024-03-05 11:00:00', 'completed', NOW(), NOW()),
  
  -- Halo Facial appointments
  (20, <PATIENT_ID>, <PROVIDER_ID>, <TREATMENT_ID_2>, '2024-01-20 15:00:00', 'completed', NOW(), NOW()),
  (20, <PATIENT_ID>, <PROVIDER_ID>, <TREATMENT_ID_2>, '2024-02-15 10:00:00', 'completed', NOW(), NOW()),
  
  -- Halo Follow-up Sessions
  (20, <PATIENT_ID>, <PROVIDER_ID>, <TREATMENT_ID_3>, '2024-01-25 16:00:00', 'completed', NOW(), NOW()),
  (20, <PATIENT_ID>, <PROVIDER_ID>, <TREATMENT_ID_3>, '2024-02-20 11:00:00', 'completed', NOW(), NOW()),
  (20, <PATIENT_ID>, <PROVIDER_ID>, <TREATMENT_ID_3>, '2024-03-10 14:00:00', 'completed', NOW(), NOW());
*/

-- Step 6: Create sample invoices for the appointments (optional, for revenue data)
-- Replace <APPOINTMENT_ID> with actual appointment IDs from step 5
/*
INSERT INTO invoices (
  organization_id,
  service_id,
  service_type,
  total_amount,
  status,
  created_at,
  updated_at
)
SELECT 
  20,
  a.appointment_id::text,
  'appointments',
  150.00,  -- Sample price
  'paid',
  NOW(),
  NOW()
FROM appointments a
WHERE a.organization_id = 20
  AND a.treatment_id IN (<TREATMENT_ID_1>, <TREATMENT_ID_2>, <TREATMENT_ID_3>)
  AND NOT EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.service_id = a.appointment_id::text 
      AND i.service_type = 'appointments'
  );
*/

-- Step 7: Verify the setup
-- Check if subject exists
SELECT id, subject_title, organization_id 
FROM analytics_subjects 
WHERE organization_id = 20 AND subject_title = 'Halo Treatments';

-- Check linked treatments
SELECT 
  ast.subject_id,
  asub.subject_title,
  ast.treatment_id,
  ti.name as treatment_name
FROM analytics_subject_treatments ast
JOIN analytics_subjects asub ON asub.id = ast.subject_id
LEFT JOIN treatments_info ti ON ti.id = ast.treatment_id
WHERE asub.organization_id = 20
  AND asub.subject_title = 'Halo Treatments';

-- Check appointments for these treatments
SELECT 
  a.id,
  a.appointment_id,
  a.treatment_id,
  ti.name as treatment_name,
  a.scheduled_at,
  a.status,
  COUNT(*) OVER (PARTITION BY a.treatment_id) as treatment_count
FROM appointments a
LEFT JOIN treatments_info ti ON ti.id = a.treatment_id
WHERE a.organization_id = 20
  AND a.treatment_id IN (
    SELECT treatment_id 
    FROM analytics_subject_treatments ast
    JOIN analytics_subjects asub ON asub.id = ast.subject_id
    WHERE asub.organization_id = 20 
      AND asub.subject_title = 'Halo Treatments'
  )
ORDER BY a.scheduled_at DESC;
