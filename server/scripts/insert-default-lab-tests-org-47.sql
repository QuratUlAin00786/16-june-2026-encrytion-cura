-- Insert 36 default lab tests for organization_id 47
-- Table: lab_test_pricing
--
-- Prerequisite: At least one user must exist with organization_id = 47 (created_by uses that user).
-- To use a specific user id instead, replace (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)
-- with the numeric user id, e.g. 123.
--
-- Run in your PostgreSQL client, e.g. psql -f insert-default-lab-tests-org-47.sql

INSERT INTO lab_test_pricing (organization_id, test_name, test_code, category, base_price, currency, version, is_active, created_by)
VALUES
  (47, 'Complete Blood Count (CBC)', 'CBC001', 'Hematology', 55.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Basic Metabolic Panel (BMP) / Chem-7', 'BMP001', 'Chemistry', 5.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Comprehensive Metabolic Panel (CMP)', 'CMP001', 'Chemistry', 5.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Lipid Profile (Cholesterol, LDL, HDL, Triglycerides)', 'LP001', 'Chemistry', 5.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Thyroid Function Tests (TSH, Free T4, Free T3)', 'TFT001', 'Endocrinology', 5.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Liver Function Tests (AST, ALT, ALP, Bilirubin)', 'LFT001', 'Chemistry', 5.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Kidney Function Tests (Creatinine, BUN, eGFR)', 'KFT001', 'Chemistry', 342.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Electrolytes (Sodium, Potassium, Chloride, Bicarbonate)', 'E001', 'Chemistry', 223.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Blood Glucose (Fasting / Random / Postprandial)', 'BG001', 'Chemistry', 23234.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Hemoglobin A1C (HbA1c)', 'HA001', 'Chemistry', 44223.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'C-Reactive Protein (CRP)', 'CRP001', 'Immunology', 4234.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Erythrocyte Sedimentation Rate (ESR)', 'ESR001', 'Hematology', 234.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Coagulation Tests (PT, PTT, INR)', 'CT001', 'Hematology', 44.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Urinalysis (UA)', 'UA001', 'Urinalysis', 3.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Albumin / Total Protein', 'ATP001', 'Chemistry', 4.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Iron Studies (Serum Iron, TIBC, Ferritin)', 'IS001', 'Hematology', 32.03, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Vitamin D', 'VD001', 'Chemistry', 3.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Vitamin B12 / Folate', 'VBF001', 'Chemistry', 3.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Hormone Panels (e.g., LH, FSH, Testosterone, Estrogen)', 'HP001', 'Endocrinology', 4.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Prostate-Specific Antigen (PSA)', 'PSA001', 'Oncology', 4.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Thyroid Antibodies (e.g. Anti-TPO, Anti-TG)', 'TA001', 'Immunology', 55.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Creatine Kinase (CK)', 'CK001', 'Chemistry', 155.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Cardiac Biomarkers (Troponin, CK-MB, BNP)', 'CB001', 'Cardiology', 1.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Electrolyte Panel', 'EP001', 'Chemistry', 55.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Uric Acid', 'UA002', 'Chemistry', 55.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Lipase / Amylase (Pancreatic enzymes)', 'LA001', 'Chemistry', 66.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Hepatitis B / C Serologies', 'HBC001', 'Serology', 77.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'HIV Antibody / Viral Load', 'HIV001', 'Serology', 88.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'HCG (Pregnancy / Quantitative)', 'HCG001', 'Endocrinology', 99.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Autoimmune Panels (ANA, ENA, Rheumatoid Factor)', 'AP001', 'Immunology', 54.50, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Tumor Markers (e.g. CA-125, CEA, AFP)', 'TM001', 'Oncology', 24.95, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Blood Culture & Sensitivity', 'BCS001', 'Microbiology', 2.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Stool Culture / Ova & Parasites', 'SCOP001', 'Microbiology', 2.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Sputum Culture', 'SC001', 'Microbiology', 2.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Viral Panels / PCR Tests (e.g. COVID-19, Influenza)', 'VP001', 'Microbiology', 2.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1)),
  (47, 'Hormonal tests (Cortisol, ACTH)', 'HT001', 'Endocrinology', 20.00, 'GBP', 1, true, (SELECT id FROM users WHERE organization_id = 47 LIMIT 1));
