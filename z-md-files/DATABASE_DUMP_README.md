# 🗄️ Complete PostgreSQL Database Dump

**File:** `COMPLETE_DATABASE_DUMP.sql`  
**Generated:** October 17, 2025  
**Database:** Cura EMR System  
**PostgreSQL Version:** 16.9  
**File Size:** 500 KB  
**Total Lines:** 6,618

---

## 📋 Contents Summary

### ✅ **What's Included:**

| Component | Count | Description |
|-----------|-------|-------------|
| **Tables** | 71 | All database tables with complete structure |
| **Data Rows** | 710 | INSERT statements for all existing data |
| **Foreign Keys** | 100+ | All foreign key constraints and relationships |
| **Primary Keys** | 71 | Primary key constraints for all tables |
| **Sequences** | 71 | Auto-increment sequences for serial IDs |
| **Indexes** | Multiple | Database indexes for performance |
| **Default Values** | All | Column defaults (NOW(), '{}', true, etc.) |
| **NOT NULL Constraints** | All | Field-level NOT NULL constraints |

### 📊 **Database Structure:**

#### Core Tables (71 Total):
```
✅ ai_insights
✅ appointments
✅ chatbot_analytics
✅ chatbot_configs
✅ chatbot_messages
✅ chatbot_sessions
✅ claims
✅ clinical_photos
✅ clinical_procedures
✅ consultations
✅ conversations
✅ doctor_default_shifts
✅ doctors_fee
✅ documents
✅ emergency_protocols
✅ financial_forecasts
✅ forecast_models
✅ gdpr_audit_trail
✅ gdpr_consents
✅ gdpr_data_requests
✅ gdpr_processing_activities
✅ imaging_pricing
✅ insurance_verifications
✅ inventory_batches
✅ inventory_categories
✅ inventory_items
✅ inventory_purchase_order_items
✅ inventory_purchase_orders
✅ inventory_sale_items
✅ inventory_sales
✅ inventory_stock_alerts
✅ inventory_stock_movements
✅ inventory_suppliers
✅ invoices
✅ lab_results
✅ lab_test_pricing
✅ letter_drafts
✅ medical_images
✅ medical_records
✅ medications_database
✅ messages
✅ muscles_position
✅ notifications
✅ organizations
✅ patient_communications
✅ patient_drug_interactions
✅ patients
✅ payments
✅ prescriptions
✅ quickbooks_account_mappings
✅ quickbooks_connections
✅ quickbooks_customer_mappings
✅ quickbooks_invoice_mappings
✅ quickbooks_item_mappings
✅ quickbooks_payment_mappings
✅ quickbooks_sync_configs
✅ quickbooks_sync_logs
✅ revenue_records
✅ roles
✅ saas_invoices
✅ saas_owners
✅ saas_packages
✅ saas_payments
✅ saas_settings
✅ saas_subscriptions
✅ staff_shifts
✅ subscriptions
✅ symptom_checks
✅ user_document_preferences
✅ users
✅ voice_notes
```

---

## 🚀 How to Use This Dump

### 1. **Restore to New Database**

```bash
# Create a new database
createdb cura_emr_new

# Restore the dump
psql cura_emr_new < COMPLETE_DATABASE_DUMP.sql
```

### 2. **Restore to Existing Database (Careful!)**

```bash
# This will DROP existing tables and recreate them
psql $DATABASE_URL < COMPLETE_DATABASE_DUMP.sql
```

### 3. **Restore to Remote Database**

```bash
# Using connection string
psql "postgresql://user:password@host:port/database" < COMPLETE_DATABASE_DUMP.sql

# Or using environment variable
export DATABASE_URL="postgresql://user:password@host:port/database"
psql $DATABASE_URL < COMPLETE_DATABASE_DUMP.sql
```

### 4. **Restore with Specific Options**

```bash
# Restore only schema (no data)
grep -v "^INSERT INTO" COMPLETE_DATABASE_DUMP.sql | psql $DATABASE_URL

# Restore only data (assuming tables exist)
grep "^INSERT INTO" COMPLETE_DATABASE_DUMP.sql | psql $DATABASE_URL

# Restore with verbose output
psql $DATABASE_URL < COMPLETE_DATABASE_DUMP.sql -v ON_ERROR_STOP=1
```

---

## 🔍 Dump File Structure

### **1. Header Section**
- PostgreSQL version information
- Session configuration settings
- Character encoding (UTF8)
- Schema search path

### **2. Table Definitions**
```sql
-- Example structure:
CREATE TABLE public.organizations (
    id integer NOT NULL,
    name text NOT NULL,
    subdomain character varying(50) NOT NULL,
    email text NOT NULL,
    -- ... more columns
);
```

### **3. Sequences**
```sql
-- Auto-increment sequences
CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1;
```

### **4. Primary Keys**
```sql
ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);
```

### **5. Foreign Keys**
```sql
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_organizations_id_fk 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
```

### **6. Data Inserts**
```sql
INSERT INTO public.organizations (id, name, subdomain, email, ...) 
VALUES (1, 'Averox Healthcare', 'demo', 'admin@averox-healthcare.com', ...);
```

### **7. Indexes**
```sql
CREATE INDEX idx_users_organization ON public.users USING btree (organization_id);
CREATE INDEX idx_patients_organization ON public.patients USING btree (organization_id);
```

---

## 📦 Data Included

### **Organizations (Sample Data):**
- Averox Healthcare (demo)
- City Medical Center (citymed)
- London Health Clinic (londonhealth)
- Manchester Family Practice (manchesterfp)
- Metro Health Center (metro44)
- Birmingham Dental Care (birminghamdental)

### **Users (Sample Data):**
- Admins, Doctors, Nurses
- Lab Technicians, Receptionists
- Patients, Pharmacists
- Dentists, Physiotherapists
- Aestheticians, Opticians
- SaaS Platform Administrators

### **Complete Data Coverage:**
- Patient records and medical history
- Appointments and consultations
- Prescriptions and medications
- Medical imaging and lab results
- Invoices and payments
- Inventory items and stock movements
- Clinical procedures and protocols
- GDPR compliance records
- AI insights and analytics
- Messaging and notifications
- QuickBooks integration mappings
- Chatbot configurations and sessions

---

## ⚠️ Important Notes

### **1. Multi-Tenant Isolation**
All data is organization-scoped using `organization_id`:
- `organizationId = 0` → SaaS platform administrators
- `organizationId > 0` → Organization-specific data

### **2. Password Security**
- User passwords are bcrypt hashed
- Sample password: `password123`
- **⚠️ Change passwords in production!**

### **3. Data Integrity**
- All foreign key constraints are enforced
- Referential integrity is maintained
- Cascade rules are applied where necessary

### **4. JSONB Columns**
The dump includes JSONB data for:
- Organization settings and features
- User permissions and working hours
- Patient medical history
- Prescription details
- Chatbot analytics

### **5. Timestamps**
- All timestamps use `timestamp without time zone`
- Default timezone: UTC
- Created/Updated timestamps included

---

## 🔧 Verification Commands

After restoring, verify the database:

```bash
# Count all tables
psql $DATABASE_URL -c "\dt" | wc -l

# Count organizations
psql $DATABASE_URL -c "SELECT COUNT(*) FROM organizations;"

# Count users per organization
psql $DATABASE_URL -c "SELECT organization_id, COUNT(*) as user_count 
FROM users GROUP BY organization_id ORDER BY organization_id;"

# Verify foreign keys
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY';"

# Check data integrity
psql $DATABASE_URL -c "SELECT tablename, n_live_tup as row_count 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC 
LIMIT 10;"
```

---

## 📝 Backup Best Practices

### **1. Regular Backups**
```bash
# Daily backup with timestamp
pg_dump $DATABASE_URL --inserts > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump $DATABASE_URL --inserts | gzip > backup_$(date +%Y%m%d).sql.gz
```

### **2. Backup Schedule**
- **Daily:** Automated backups with retention policy
- **Weekly:** Full backup with extended retention
- **Monthly:** Archive backup for compliance
- **Pre-deployment:** Backup before major changes

### **3. Backup Storage**
- Store backups in multiple locations
- Use cloud storage (S3, Google Cloud Storage, etc.)
- Encrypt sensitive backups
- Test restore procedures regularly

### **4. Backup Types**

#### Schema Only:
```bash
pg_dump $DATABASE_URL --schema-only > schema_only.sql
```

#### Data Only:
```bash
pg_dump $DATABASE_URL --data-only --inserts > data_only.sql
```

#### Specific Tables:
```bash
pg_dump $DATABASE_URL --table=organizations --table=users --inserts > partial_backup.sql
```

#### Custom Format (Compressed):
```bash
pg_dump $DATABASE_URL --format=custom --file=backup.dump
pg_restore --dbname=new_database backup.dump
```

---

## 🔄 Migration Scenarios

### **Scenario 1: Development to Staging**
```bash
# Dump from development
pg_dump $DEV_DATABASE_URL --inserts > dev_dump.sql

# Restore to staging
psql $STAGING_DATABASE_URL < dev_dump.sql
```

### **Scenario 2: Clone Database**
```bash
# Create clone
createdb cura_emr_clone
psql cura_emr_clone < COMPLETE_DATABASE_DUMP.sql
```

### **Scenario 3: Disaster Recovery**
```bash
# Restore from backup
psql $DATABASE_URL < COMPLETE_DATABASE_DUMP.sql

# Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM organizations;"
```

### **Scenario 4: Upgrade PostgreSQL Version**
```bash
# Dump from old version
pg_dump --inserts > old_version_dump.sql

# Install new PostgreSQL version
# Restore to new version
psql new_database < old_version_dump.sql
```

---

## 🛡️ Security Considerations

1. **Sensitive Data:** This dump contains all production data including:
   - User credentials (hashed passwords)
   - Patient medical records
   - Financial information
   - Personal identifiable information (PII)

2. **Access Control:**
   - Store dump files securely
   - Encrypt at rest and in transit
   - Limit access to authorized personnel only
   - Use secure transfer protocols (SCP, SFTP)

3. **Compliance:**
   - GDPR compliance maintained
   - UK data residency enforced
   - Audit trail included
   - Data retention policies applied

4. **Production Use:**
   - Never share dump files publicly
   - Sanitize data for non-production environments
   - Remove or anonymize sensitive data for testing
   - Use separate credentials for each environment

---

## 📞 Support

For questions about this database dump:
- **Email:** support@curaemr.ai
- **Documentation:** See DATABASE_SCHEMA.md
- **SQL Export:** See CURA_DATABASE_EXPORT.sql
- **Insert Queries:** See DATABASE_INSERT_QUERIES.sql

---

## 📊 File Statistics

```
Total Lines:        6,618
File Size:          500 KB
Tables:             71
INSERT Statements:  710
Foreign Keys:       100+
Primary Keys:       71
Sequences:          71
Constraints:        200+
Indexes:            Multiple
```

---

**Last Updated:** October 17, 2025  
**Database Version:** PostgreSQL 16.9  
**Format:** Plain SQL with INSERT statements  
**Status:** ✅ Complete and Ready for Restore
