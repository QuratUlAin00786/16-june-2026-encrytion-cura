-- Quick Production User Creation Script
-- Run this in your production database to fix login issues

-- Step 1: Ensure Demo Healthcare Clinic organization exists
INSERT INTO organizations (id, name, subdomain, email, created_at, region, brand_name, settings, features, access_level, subscription_status, updated_at) 
VALUES (2, 'Demo Healthcare Clinic', 'demo', 'demo@healthcare.com', NOW(), 'UK', 'Demo Clinic', '{}', '{}', 'full', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create the 4 essential demo users with working password hashes
INSERT INTO users (id, organization_id, username, email, password_hash, first_name, last_name, role, is_saas_owner, is_active, created_at, updated_at) VALUES
(2, 2, 'admin', 'admin@cura.com', '$2b$12$/7dzA5Tmf1lur8UO7WiLo.V6phguB8hly6GCWu6U0m5BOG4zTTJom', 'Admin', 'User', 'admin', false, true, NOW(), NOW()),
(41, 2, 'doctor', 'doctor@cura.com', '$2b$12$UsLIUtO6.cyMAyCe89m4y.wSDbsYcI8R4Eu7d91zykQ/KvnNbZn1W', 'Dr. John', 'Smith', 'doctor', false, true, NOW(), NOW()),
(42, 2, 'patient', 'patient@cura.com', '$2b$12$IIVB9wImJ.tSXrgdlDouHOhKO4BeRhe5TrB.LCRXblW/mA68kwbdm', 'Mary', 'Johnson', 'patient', false, true, NOW(), NOW()),
(43, 2, 'nurse', 'nurse@cura.com', '$2b$12$tnVMGGM7U8rSrbLoSg5WBu3cOvaM.V8vrMwmeQOf7ju/Sp/ytAVca', 'Sarah', 'Williams', 'nurse', false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Step 3: Update user ID sequence to prevent conflicts
SELECT setval('users_id_seq', GREATEST(50, (SELECT COALESCE(MAX(id), 1) FROM users)), true);

-- DONE! These login credentials will now work:
-- admin@cura.com / admin123
-- doctor@cura.com / doctor123 (or: doctor / doctor123)
-- patient@cura.com / patient123 (or: patient / patient123)  
-- nurse@cura.com / nurse123 (or: nurse / nurse123)