# Demo Credentials SQL

This file contains demo user credentials for testing and development.

## Quick Start

### Option 1: Use Existing Hashes (Password: `password123`)

The SQL file currently uses working bcrypt hashes that work with the password **`password123`**.

Simply run:
```bash
psql -d your_database -f migrations/0010_demo_credentials.sql
```

Then login with:
- Email: `admin@demo.com`
- Username: `admin`
- Password: `password123`

### Option 2: Generate New Hashes for Custom Password

If you want to use a different password (e.g., `demo123`):

1. **Generate bcrypt hashes:**
   ```bash
   node scripts/generate-demo-password-hashes.js
   ```

2. **Copy the generated hashes** and replace all instances in `0010_demo_credentials.sql`

3. **Run the SQL file:**
   ```bash
   psql -d your_database -f migrations/0010_demo_credentials.sql
   ```

## Demo Users Created

| Role | Email | Username | Password |
|------|-------|----------|----------|
| Admin | admin@demo.com | admin | password123 |
| Doctor 1 | doctor@demo.com | doctor | password123 |
| Doctor 2 | doctor2@demo.com | doctor2 | password123 |
| Doctor 3 | doctor3@demo.com | doctor3 | password123 |
| Nurse 1 | nurse@demo.com | nurse | password123 |
| Nurse 2 | nurse2@demo.com | nurse2 | password123 |
| Receptionist | receptionist@demo.com | receptionist | password123 |
| Patient 1 | patient@demo.com | patient | password123 |
| Patient 2 | patient2@demo.com | patient2 | password123 |
| Lab Technician | labtech@demo.com | labtech | password123 |
| Sample Taker | sampletaker@demo.com | sampletaker | password123 |

## Organization

- **Name:** Demo Healthcare Clinic
- **Subdomain:** demo
- **Email:** admin@demo-clinic.com
- **Status:** active

## Notes

- All users belong to organization_id = 1
- All users are active (`is_active = true`)
- Working days and hours are configured for each role
- The SQL uses `ON CONFLICT DO NOTHING` to prevent errors if users already exist
- Make sure organization with id=1 exists before running this script

## Troubleshooting

**Error: organization_id does not exist**
- Create the demo organization first or adjust the organization_id in the SQL

**Password doesn't work**
- Verify you're using the correct password (`password123` by default)
- If you generated new hashes, make sure you replaced ALL instances in the SQL file
- Check that bcrypt is using the same salt rounds (10-12)

**Users already exist**
- The SQL uses `ON CONFLICT DO NOTHING` so it won't create duplicates
- To recreate users, delete them first or modify the SQL to use `ON CONFLICT UPDATE`
