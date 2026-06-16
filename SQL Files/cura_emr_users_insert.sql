-- =============================================
-- CURA EMR USERS INSERT QUERIES
-- Generated: 2025-11-03T05:29:29.017Z
-- =============================================

-- ADMIN: james@curaemr.ai / 467fe887
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active
) VALUES (
    1,
    'james@curaemr.ai',
    'james',
    '$2b$10$kINAIMJ5fmZ.tOSXnvsWhugImVQN0/2JeDoaOf3vnVqAgCOoKtD4K',
    'James',
    'Admin',
    'admin',
    true
);

-- DOCTOR: paul@curaemr.ai / doctor123
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active
) VALUES (
    1,
    'paul@curaemr.ai',
    'paul',
    '$2b$10$IgtXwvvI68gLAU.8FxLwjeJksQUQquYwgzDncvn0jqjDmeQIEr1Dm',
    'Paul',
    'Doctor',
    'doctor',
    true
);

-- NURSE: emma@curaemr.ai / nurse123
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active
) VALUES (
    1,
    'emma@curaemr.ai',
    'emma',
    '$2b$10$pMQzaeEsoHhG8EU5d/sByuZQZjWUzD9G/3UVcCFMHFZZPAehGUQ5e',
    'Emma',
    'Nurse',
    'nurse',
    true
);

-- PATIENT: john@curaemr.ai / patient123
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active
) VALUES (
    1,
    'john@curaemr.ai',
    'john',
    '$2b$10$arQimJA1Tc0CrCrmPUSyjeq3ZnMi9gSRTdz6BNA/ZWL6Zyzwsv7jW',
    'John',
    'Patient',
    'patient',
    true
);

-- LAB_TECHNICIAN: amelia@curaemr.ai / lab123
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active
) VALUES (
    1,
    'amelia@curaemr.ai',
    'amelia',
    '$2b$10$yumhQLeLOuKOsyg0EzW6Se8/T/T8U/lOKRrrvc1ijUL5VWZQOLUaq',
    'Amelia',
    'Lab',
    'lab_technician',
    true
);

-- SAMPLE_TAKER: sampletaker@curaemr.ai / sample123
INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active
) VALUES (
    1,
    'sampletaker@curaemr.ai',
    'sampletaker',
    '$2b$10$ykBhxGoNtfOATb7opWaky.gd1QJG6FS252TpxT0kcm3g3SZfGeJii',
    'Sample',
    'Taker',
    'sample_taker',
    true
);


-- =============================================
-- BULK INSERT (All Users at Once)
-- =============================================

INSERT INTO public.users (
    organization_id, email, username, password_hash,
    first_name, last_name, role, is_active
) VALUES
    (1, 'james@curaemr.ai', 'james', '$2b$10$ds85BBRO2pun/tdNrZdTvOM3AV837sMQai/T/SheYddHVONfRC0Wy', 'James', 'Admin', 'admin', true),
    (1, 'paul@curaemr.ai', 'paul', '$2b$10$LaWuqRFoVEayvP5M9fYdjOtVgG8731Jg01q6cNSADzxWmCI3KqB5a', 'Paul', 'Doctor', 'doctor', true),
    (1, 'emma@curaemr.ai', 'emma', '$2b$10$iscuFSB8buzrQfS3gI2WsOeXWqsrm58wnYoLuQz3q0DUGd.mTl0VG', 'Emma', 'Nurse', 'nurse', true),
    (1, 'john@curaemr.ai', 'john', '$2b$10$rhNG4BvRWz2VWm7fi.J4kOEsTRjr0bf3Au/UBNR/8v6c3wwVLxaNO', 'John', 'Patient', 'patient', true),
    (1, 'amelia@curaemr.ai', 'amelia', '$2b$10$qMIwXqfAbcRT6/lqwaFDAONpLB60pMwpcwxLea6PO5xHvtENNkGbS', 'Amelia', 'Lab', 'lab_technician', true),
    (1, 'sampletaker@curaemr.ai', 'sampletaker', '$2b$10$MJ1bPbOihVvLeEk7hvib0.2zXITJ3Et0NkTRs4iH2IZOW1rev8QGO', 'Sample', 'Taker', 'sample_taker', true);


-- =============================================
-- LOGIN CREDENTIALS REFERENCE
-- =============================================
-- ADMIN           | james@curaemr.ai               | 467fe887
-- DOCTOR          | paul@curaemr.ai                | doctor123
-- NURSE           | emma@curaemr.ai                | nurse123
-- PATIENT         | john@curaemr.ai                | patient123
-- LAB_TECHNICIAN  | amelia@curaemr.ai              | lab123
-- SAMPLE_TAKER    | sampletaker@curaemr.ai         | sample123
