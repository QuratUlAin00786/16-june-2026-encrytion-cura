# Cura EMR Database Schema Documentation
**Generated:** October 16, 2025  
**Database:** PostgreSQL (Neon Serverless)  
**Total Tables:** 68

---

## Table of Contents
1. [SaaS Management Tables](#saas-management-tables)
2. [Core System Tables](#core-system-tables)
3. [Patient Management](#patient-management)
4. [Clinical Operations](#clinical-operations)
5. [Billing & Financial](#billing--financial)
6. [Communication & Messaging](#communication--messaging)
7. [AI & Analytics](#ai--analytics)
8. [Inventory Management](#inventory-management)
9. [GDPR Compliance](#gdpr-compliance)
10. [Integrations](#integrations)
11. [Relationships & Foreign Keys](#relationships--foreign-keys)

---

## SaaS Management Tables

### saas_owners
**Purpose:** Platform administrators who manage the entire SaaS system  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| username | varchar(50) | NOT NULL, UNIQUE | Username for login |
| password | text | NOT NULL | Hashed password |
| email | text | NOT NULL, UNIQUE | Email address |
| first_name | text | NOT NULL | First name |
| last_name | text | NOT NULL | Last name |
| is_active | boolean | NOT NULL, DEFAULT true | Account active status |
| last_login_at | timestamp | NULL | Last login timestamp |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

---

### saas_packages
**Purpose:** Subscription packages offered to organizations  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| name | text | NOT NULL | Package name |
| description | text | NULL | Package description |
| price | decimal(10,2) | NOT NULL | Package price |
| billing_cycle | varchar(20) | NOT NULL, DEFAULT 'monthly' | Billing frequency (monthly, yearly) |
| features | jsonb | DEFAULT '{}' | Package features (maxUsers, aiEnabled, etc.) |
| is_active | boolean | NOT NULL, DEFAULT true | Package availability |
| show_on_website | boolean | NOT NULL, DEFAULT false | Display on public website |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

**Features Schema (JSONB):**
```json
{
  "maxUsers": number,
  "maxPatients": number,
  "aiEnabled": boolean,
  "telemedicineEnabled": boolean,
  "billingEnabled": boolean,
  "analyticsEnabled": boolean,
  "customBranding": boolean,
  "prioritySupport": boolean,
  "storageGB": number,
  "apiCallsPerMonth": number
}
```

---

### saas_subscriptions
**Purpose:** Track organization subscriptions to packages  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| package_id | integer | NOT NULL | Reference to saas_packages |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Subscription status |
| current_period_start | timestamp | NOT NULL | Billing period start |
| current_period_end | timestamp | NOT NULL | Billing period end |
| cancel_at_period_end | boolean | NOT NULL, DEFAULT false | Cancel flag |
| trial_end | timestamp | NULL | Trial expiration |
| metadata | jsonb | DEFAULT '{}' | Additional subscription metadata |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

**Status Values:** `active`, `cancelled`, `suspended`, `past_due`

---

### saas_payments
**Purpose:** Track all SaaS billing payments  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| subscription_id | integer | NULL | Reference to saas_subscriptions |
| invoice_number | varchar(50) | NOT NULL, UNIQUE | Unique invoice number |
| amount | decimal(10,2) | NOT NULL | Payment amount |
| currency | varchar(3) | NOT NULL, DEFAULT 'GBP' | Currency code |
| payment_method | varchar(20) | NOT NULL | Payment method |
| payment_status | varchar(20) | NOT NULL, DEFAULT 'pending' | Payment status |
| payment_date | timestamp | NULL | Actual payment date |
| due_date | timestamp | NOT NULL | Payment due date |
| period_start | timestamp | NOT NULL | Service period start |
| period_end | timestamp | NOT NULL | Service period end |
| payment_provider | varchar(50) | NULL | Provider name |
| provider_transaction_id | text | NULL | External transaction ID |
| description | text | NULL | Payment description |
| metadata | jsonb | DEFAULT '{}' | Payment metadata |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

**Payment Methods:** `cash`, `stripe`, `paypal`, `bank_transfer`  
**Payment Status:** `pending`, `completed`, `failed`, `refunded`

---

### saas_settings
**Purpose:** Global system configuration settings  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| key | varchar(100) | NOT NULL, UNIQUE | Setting key |
| value | jsonb | NULL | Setting value |
| description | text | NULL | Setting description |
| category | varchar(50) | NOT NULL, DEFAULT 'system' | Setting category |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

---

### saas_invoices
**Purpose:** SaaS billing invoices  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| subscription_id | integer | NOT NULL | Reference to saas_subscriptions |
| invoice_number | varchar(50) | NOT NULL, UNIQUE | Unique invoice number |
| amount | decimal(10,2) | NOT NULL | Invoice amount |
| currency | varchar(3) | NOT NULL, DEFAULT 'GBP' | Currency code |
| status | varchar(20) | NOT NULL, DEFAULT 'draft' | Invoice status |
| issue_date | timestamp | NOT NULL | Issue date |
| due_date | timestamp | NOT NULL | Payment due date |
| paid_date | timestamp | NULL | Actual payment date |
| period_start | timestamp | NOT NULL | Service period start |
| period_end | timestamp | NOT NULL | Service period end |
| line_items | jsonb | DEFAULT '[]' | Invoice line items |
| notes | text | NULL | Invoice notes |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

**Status Values:** `draft`, `sent`, `paid`, `overdue`, `cancelled`

---

## Core System Tables

### organizations
**Purpose:** Multi-tenant organizations (clinics, hospitals, practices)  
**Primary Key:** `id` (serial)  
**Unique Constraints:** `subdomain` (unique)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| name | text | NOT NULL | Organization name |
| subdomain | varchar(50) | NOT NULL, UNIQUE | Unique subdomain for routing |
| email | text | NOT NULL | Organization email |
| region | varchar(10) | NOT NULL, DEFAULT 'UK' | Geographic region |
| brand_name | text | NOT NULL | Brand display name |
| settings | jsonb | DEFAULT '{}' | Organization settings |
| features | jsonb | DEFAULT '{}' | Enabled features |
| access_level | varchar(50) | DEFAULT 'full' | Access level |
| subscription_status | varchar(20) | NOT NULL, DEFAULT 'trial' | Subscription status |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

**Regions:** `UK`, `EU`, `ME`, `SA`, `US`  
**Subscription Status:** `trial`, `active`, `suspended`, `cancelled`

---

### users
**Purpose:** All system users (staff, patients, admins)  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations (0 for SaaS owners) |
| email | text | NOT NULL | User email |
| username | text | NOT NULL | Username |
| password_hash | text | NOT NULL | Hashed password |
| first_name | text | NOT NULL | First name |
| last_name | text | NOT NULL | Last name |
| role | varchar(20) | NOT NULL, DEFAULT 'doctor' | User role |
| department | text | NULL | Department |
| medical_specialty_category | text | NULL | Medical specialty |
| sub_specialty | text | NULL | Sub-specialty |
| working_days | jsonb | DEFAULT '[]' | Working days array |
| working_hours | jsonb | DEFAULT '{}' | Working hours object |
| permissions | jsonb | DEFAULT '{}' | Granular permissions |
| is_active | boolean | NOT NULL, DEFAULT true | Account active status |
| is_saas_owner | boolean | NOT NULL, DEFAULT false | SaaS owner flag |
| last_login_at | timestamp | NULL | Last login timestamp |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |

**Roles:** `admin`, `doctor`, `nurse`, `receptionist`, `patient`, `sample_taker`, and 10+ specialized roles

---

### roles
**Purpose:** Custom role definitions with granular permissions  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| name | varchar(50) | NOT NULL | Role internal name |
| display_name | text | NOT NULL | Display name |
| description | text | NOT NULL | Role description |
| permissions | jsonb | NOT NULL | Permissions object |
| is_system | boolean | NOT NULL, DEFAULT false | System-defined role flag |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Permissions Schema (JSONB):**
```json
{
  "modules": {
    "patients": { "view": true, "create": true, "edit": true, "delete": false },
    "appointments": { "view": true, "create": true, "edit": true, "delete": false },
    "billing": { "view": true, "create": false, "edit": false, "delete": false }
  },
  "fields": {
    "patientSensitiveInfo": { "view": true, "edit": false },
    "financialData": { "view": false, "edit": false }
  }
}
```

---

## Patient Management

### patients
**Purpose:** Patient records with demographics and medical history  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| user_id | integer | NULL, FK to users | Link to user account |
| patient_id | text | NOT NULL | Custom patient ID |
| first_name | text | NOT NULL | First name |
| last_name | text | NOT NULL | Last name |
| date_of_birth | date | NULL | Date of birth |
| gender_at_birth | varchar(20) | NULL | Gender at birth |
| email | text | NULL | Email address |
| phone | text | NULL | Phone number |
| nhs_number | text | NULL | NHS number (UK) |
| address | jsonb | DEFAULT '{}' | Address object |
| insurance_info | jsonb | DEFAULT '{}' | Insurance information |
| emergency_contact | jsonb | DEFAULT '{}' | Emergency contact details |
| medical_history | jsonb | DEFAULT '{}' | Comprehensive medical history |
| risk_level | varchar(10) | NOT NULL, DEFAULT 'low' | Risk assessment |
| flags | text[] | DEFAULT '[]' | Medical flags array |
| communication_preferences | jsonb | DEFAULT '{}' | Communication preferences |
| is_active | boolean | NOT NULL, DEFAULT true | Active status |
| is_insured | boolean | NOT NULL, DEFAULT false | Insurance status |
| created_by | integer | NULL, FK to users | User who created record |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Risk Levels:** `low`, `medium`, `high`

---

### medical_records
**Purpose:** Comprehensive medical record entries  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| patient_id | integer | NOT NULL | Reference to patients |
| provider_id | integer | NOT NULL | Reference to users (provider) |
| type | varchar(20) | NOT NULL | Record type |
| title | text | NOT NULL | Record title |
| notes | text | NULL | Medical notes |
| diagnosis | text | NULL | Diagnosis |
| treatment | text | NULL | Treatment plan |
| prescription | jsonb | DEFAULT '{}' | Prescription details |
| attachments | jsonb | DEFAULT '[]' | File attachments array |
| ai_suggestions | jsonb | DEFAULT '{}' | AI-generated suggestions |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |

**Record Types:** `consultation`, `prescription`, `lab_result`, `imaging`

---

## Clinical Operations

### appointments
**Purpose:** Appointment scheduling and management  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| patient_id | integer | NOT NULL | Reference to patients |
| provider_id | integer | NOT NULL | Reference to users (provider) |
| assigned_role | varchar(50) | NULL | Role selected during booking |
| title | text | NOT NULL | Appointment title |
| description | text | NULL | Description |
| scheduled_at | timestamp | NOT NULL | Scheduled date/time |
| duration | integer | NOT NULL, DEFAULT 30 | Duration in minutes |
| status | varchar(20) | NOT NULL, DEFAULT 'scheduled' | Appointment status |
| type | varchar(20) | NOT NULL, DEFAULT 'consultation' | Appointment type |
| location | text | NULL | Location |
| is_virtual | boolean | NOT NULL, DEFAULT false | Virtual appointment flag |
| created_by | integer | NULL | User ID who created |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |

**Status Values:** `scheduled`, `completed`, `cancelled`, `no_show`, `rescheduled`  
**Types:** `consultation`, `follow_up`, `procedure`, `emergency`, `routine_checkup`

---

### consultations
**Purpose:** Detailed consultation records  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| appointment_id | integer | NULL | Reference to appointments |
| patient_id | integer | NOT NULL | Reference to patients |
| provider_id | integer | NOT NULL | Reference to users (provider) |
| consultation_type | varchar(20) | NOT NULL | Type of consultation |
| chief_complaint | text | NULL | Chief complaint |
| history_of_present_illness | text | NULL | HPI |
| vitals | jsonb | DEFAULT '{}' | Vital signs |
| physical_exam | text | NULL | Physical examination notes |
| assessment | text | NULL | Clinical assessment |
| diagnosis | text[] | NULL | Diagnosis codes/descriptions |
| treatment_plan | text | NULL | Treatment plan |
| prescriptions | text[] | NULL | Prescription references |
| follow_up_instructions | text | NULL | Follow-up instructions |
| consultation_notes | text | NULL | Additional notes |
| status | varchar(20) | NOT NULL, DEFAULT 'in_progress' | Consultation status |
| start_time | timestamp | NOT NULL | Start time |
| end_time | timestamp | NULL | End time |
| duration | integer | NULL | Duration in minutes |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

### prescriptions
**Purpose:** Electronic prescription management  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| patient_id | integer | NOT NULL | Reference to patients |
| doctor_id | integer | NOT NULL, FK to users | Prescribing doctor |
| prescription_created_by | integer | NULL, FK to users | Creator user ID |
| consultation_id | integer | NULL, FK to consultations | Related consultation |
| prescription_number | varchar(50) | NOT NULL, UNIQUE | Unique prescription number |
| medication_name | text | NOT NULL | Medication name |
| dosage | text | NOT NULL | Dosage |
| frequency | text | NOT NULL | Frequency |
| duration | text | NOT NULL | Duration |
| quantity | integer | NULL | Quantity |
| refills | integer | NULL | Number of refills |
| instructions | text | NULL | Patient instructions |
| diagnosis | text | NULL | Related diagnosis |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Prescription status |
| pharmacy_name | text | NULL | Pharmacy name |
| pharmacy_email | text | NULL | Pharmacy email |
| pharmacy_phone | text | NULL | Pharmacy phone |
| sent_to_pharmacy_at | timestamp | NULL | Email sent timestamp |
| dispensed_at | timestamp | NULL | Dispensing timestamp |
| signature | jsonb | NULL | E-signature data |
| attachments | jsonb | DEFAULT '[]' | File attachments |
| notes | text | NULL | Additional notes |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Status Values:** `active`, `completed`, `cancelled`, `expired`

---

### lab_results
**Purpose:** Laboratory test results  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| patient_id | integer | NOT NULL, FK to patients | Patient reference |
| ordered_by | integer | NOT NULL, FK to users | Ordering provider |
| lab_number | varchar(50) | NOT NULL, UNIQUE | Unique lab number |
| test_type | text | NOT NULL | Type of test |
| test_date | timestamp | NOT NULL | Test date |
| results | jsonb | NOT NULL | Test results |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Result status |
| normal_range | text | NULL | Normal range reference |
| notes | text | NULL | Additional notes |
| attachments | jsonb | DEFAULT '[]' | File attachments |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Status Values:** `pending`, `completed`, `reviewed`, `abnormal`

---

### medical_images
**Purpose:** Medical imaging records (X-rays, MRIs, etc.)  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| patient_id | integer | NOT NULL, FK to patients | Patient reference |
| uploaded_by | integer | NOT NULL, FK to users | Uploader user ID |
| imaging_type | varchar(50) | NOT NULL | Type of imaging |
| study_date | timestamp | NOT NULL | Study date |
| body_part | text | NULL | Body part imaged |
| modality | varchar(20) | NULL | Imaging modality |
| finding | text | NULL | Clinical findings |
| file_name | text | NOT NULL | File name |
| file_path | text | NOT NULL | Storage path |
| file_size | integer | NOT NULL | File size in bytes |
| mime_type | varchar(100) | NOT NULL | MIME type |
| thumbnail_path | text | NULL | Thumbnail path |
| dicom_metadata | jsonb | NULL | DICOM metadata |
| ai_analysis | jsonb | NULL | AI analysis results |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Image status |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Imaging Types:** `x-ray`, `mri`, `ct-scan`, `ultrasound`, `mammogram`, `pet-scan`  
**Modalities:** `CR`, `CT`, `MR`, `US`, `DX`, `MG`

---

## Billing & Financial

### invoices
**Purpose:** Medical service invoices  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| invoice_number | varchar(50) | NOT NULL, UNIQUE | Unique invoice number |
| patient_id | text | NOT NULL | Patient ID reference |
| patient_name | text | NOT NULL | Patient name |
| nhs_number | varchar(10) | NULL | NHS number |
| date_of_service | timestamp | NOT NULL | Service date |
| invoice_date | timestamp | NOT NULL | Invoice date |
| due_date | timestamp | NOT NULL | Payment due date |
| status | varchar(20) | NOT NULL, DEFAULT 'draft' | Invoice status |
| invoice_type | varchar(50) | NOT NULL, DEFAULT 'payment' | Invoice type |
| subtotal | decimal(10,2) | NOT NULL | Subtotal amount |
| tax | decimal(10,2) | NOT NULL, DEFAULT 0 | Tax amount |
| discount | decimal(10,2) | NOT NULL, DEFAULT 0 | Discount amount |
| total_amount | decimal(10,2) | NOT NULL | Total amount |
| paid_amount | decimal(10,2) | NOT NULL, DEFAULT 0 | Paid amount |
| items | jsonb | NOT NULL | Line items array |
| insurance | jsonb | NULL | Insurance information |
| payments | jsonb | NOT NULL, DEFAULT '[]' | Payment records |
| notes | text | NULL | Invoice notes |
| created_by | integer | NULL | Creator user ID |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

**Status Values:** `draft`, `sent`, `paid`, `overdue`, `cancelled`  
**Types:** `payment`, `insurance_claim`

---

### payments
**Purpose:** Payment transaction records  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| invoice_id | integer | NOT NULL | Reference to invoices |
| patient_id | text | NOT NULL | Patient ID reference |
| transaction_id | text | NOT NULL, UNIQUE | Unique transaction ID |
| amount | decimal(10,2) | NOT NULL | Payment amount |
| currency | varchar(3) | NOT NULL, DEFAULT 'GBP' | Currency code |
| payment_method | varchar(20) | NOT NULL | Payment method |
| payment_provider | varchar(50) | NULL | Payment provider |
| payment_status | varchar(20) | NOT NULL, DEFAULT 'completed' | Payment status |
| payment_date | timestamp | NOT NULL, DEFAULT now() | Payment date |
| metadata | jsonb | DEFAULT '{}' | Payment metadata |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

**Payment Methods:** `online`, `cash`, `card`, `bank_transfer`  
**Payment Status:** `completed`, `pending`, `failed`, `refunded`

---

### claims
**Purpose:** Insurance claims management  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| patient_id | integer | NOT NULL, FK to patients | Patient reference |
| claim_number | varchar(50) | NOT NULL | Unique claim number |
| service_date | timestamp | NOT NULL | Service date |
| submission_date | timestamp | NOT NULL | Submission date |
| amount | numeric | NOT NULL | Claim amount |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Claim status |
| payment_amount | numeric | NULL | Payment received |
| payment_date | timestamp | NULL | Payment date |
| denial_reason | text | NULL | Denial reason |
| insurance_provider | text | NOT NULL | Insurance provider |
| procedures | jsonb | DEFAULT '[]' | Procedure codes |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |

**Status Values:** `pending`, `submitted`, `approved`, `denied`, `partially_paid`, `paid`

---

### revenue_records
**Purpose:** Revenue tracking and financial analytics  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| date | date | NOT NULL | Revenue date |
| category | varchar(50) | NOT NULL | Revenue category |
| amount | numeric | NOT NULL | Revenue amount |
| payment_method | varchar(20) | NULL | Payment method |
| source | varchar(30) | NOT NULL, DEFAULT 'appointment' | Revenue source |
| notes | text | NULL | Additional notes |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |

**Categories:** `consultation`, `procedure`, `medication`, `lab`, `imaging`, `other`  
**Sources:** `appointment`, `walk_in`, `insurance`, `other`

---

## Communication & Messaging

### messages
**Purpose:** Internal messaging system  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| conversation_id | varchar(50) | NOT NULL | Conversation reference |
| sender_id | integer | NOT NULL | Sender user ID |
| sender_type | varchar(20) | NOT NULL | Sender type |
| content | text | NOT NULL | Message content |
| is_read | boolean | NOT NULL, DEFAULT false | Read status |
| attachments | jsonb | DEFAULT '[]' | File attachments |
| created_at | timestamp | NOT NULL, DEFAULT now() | Message timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

---

### conversations
**Purpose:** Conversation threads  
**Primary Key:** `id` (varchar)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | varchar(50) | PRIMARY KEY | Conversation ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| participants | jsonb | NOT NULL | Participant user IDs |
| last_message | jsonb | NULL | Last message preview |
| unread_count | integer | NOT NULL, DEFAULT 0 | Unread message count |
| is_patient_conversation | boolean | NOT NULL, DEFAULT false | Patient conversation flag |
| created_at | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last message timestamp |

---

### notifications
**Purpose:** System notifications  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| user_id | integer | NOT NULL, FK to users | User reference |
| type | varchar(30) | NOT NULL | Notification type |
| title | text | NOT NULL | Notification title |
| message | text | NOT NULL | Notification message |
| link | text | NULL | Related link |
| is_read | boolean | NOT NULL, DEFAULT false | Read status |
| metadata | jsonb | DEFAULT '{}' | Additional metadata |
| created_at | timestamp | NOT NULL, DEFAULT now() | Notification timestamp |

**Types:** `appointment`, `prescription`, `lab_result`, `message`, `system`, `billing`, `alert`

---

### patient_communications
**Purpose:** Patient communication tracking (SMS, Email, WhatsApp)  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| patient_id | integer | NOT NULL, FK to patients | Patient reference |
| sent_by | integer | NOT NULL, FK to users | Sender user ID |
| communication_type | varchar(20) | NOT NULL | Communication type |
| method | varchar(20) | NOT NULL | Delivery method |
| subject | text | NULL | Message subject |
| message | text | NOT NULL | Message content |
| recipient | text | NOT NULL | Recipient address |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Delivery status |
| delivery_status | varchar(20) | NULL | Delivery provider status |
| sent_at | timestamp | NULL | Send timestamp |
| delivered_at | timestamp | NULL | Delivery timestamp |
| provider_message_id | text | NULL | Provider message ID |
| metadata | jsonb | DEFAULT '{}' | Additional metadata |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |

**Communication Types:** `reminder`, `alert`, `notification`, `general`, `emergency`  
**Methods:** `sms`, `email`, `whatsapp`, `voice`  
**Status Values:** `pending`, `sent`, `delivered`, `failed`, `read`

---

## AI & Analytics

### ai_insights
**Purpose:** AI-generated clinical insights and recommendations  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| patient_id | integer | NULL | Patient reference |
| type | varchar(30) | NOT NULL | Insight type |
| title | text | NOT NULL | Insight title |
| description | text | NOT NULL | Insight description |
| severity | varchar(10) | NOT NULL, DEFAULT 'medium' | Severity level |
| action_required | boolean | NOT NULL, DEFAULT false | Action required flag |
| confidence | varchar(10) | NULL | AI confidence score |
| metadata | jsonb | DEFAULT '{}' | Additional metadata |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Insight status |
| ai_status | varchar(20) | DEFAULT 'pending' | AI processing status |
| created_at | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

**Types:** `risk_alert`, `drug_interaction`, `treatment_suggestion`, `preventive_care`  
**Severity:** `low`, `medium`, `high`, `critical`  
**AI Status:** `pending`, `reviewed`, `implemented`, `dismissed`

---

### symptom_checks
**Purpose:** AI-powered symptom checker results  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| user_id | integer | NULL, FK to users | User reference |
| patient_id | integer | NULL, FK to patients | Patient reference |
| appointment_id | integer | NULL, FK to appointments | Related appointment |
| symptoms | jsonb | NOT NULL | Symptoms array |
| age | integer | NULL | Patient age |
| gender | varchar(10) | NULL | Patient gender |
| conditions | jsonb | NULL | Possible conditions |
| severity | varchar(20) | NULL | Severity assessment |
| recommendation | text | NULL | AI recommendation |
| metadata | jsonb | DEFAULT '{}' | Additional metadata |
| created_at | timestamp | NOT NULL, DEFAULT now() | Check timestamp |

---

### patient_drug_interactions
**Purpose:** Track drug interaction alerts  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| patient_id | integer | NOT NULL, FK to patients | Patient reference |
| reported_by | integer | NOT NULL, FK to users | Reporting user |
| drug1 | text | NOT NULL | First drug |
| drug2 | text | NOT NULL | Second drug |
| interaction_type | varchar(20) | NOT NULL | Interaction type |
| severity | varchar(20) | NOT NULL | Severity level |
| description | text | NOT NULL | Interaction description |
| recommendation | text | NULL | Clinical recommendation |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Alert status |
| ai_confidence | real | NULL | AI confidence score |
| metadata | jsonb | DEFAULT '{}' | Additional metadata |
| created_at | timestamp | NOT NULL, DEFAULT now() | Detection timestamp |

**Interaction Types:** `major`, `moderate`, `minor`  
**Severity:** `critical`, `high`, `medium`, `low`  
**Status:** `active`, `reviewed`, `resolved`, `dismissed`

---

### financial_forecasts
**Purpose:** AI-powered financial forecasting  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| category | text | NOT NULL | Forecast category |
| forecast_period | varchar(7) | NOT NULL | Period (YYYY-MM) |
| generated_at | timestamp | NOT NULL, DEFAULT now() | Generation timestamp |
| current_value | numeric | NOT NULL | Current value |
| projected_value | numeric | NOT NULL | Projected value |
| variance | numeric | NOT NULL | Variance amount |
| trend | varchar(10) | NOT NULL | Trend direction |
| confidence | integer | NOT NULL | Confidence percentage |
| methodology | varchar(30) | NOT NULL, DEFAULT 'historical_trend' | Forecast method |
| key_factors | jsonb | DEFAULT '[]' | Key factors array |
| model_id | integer | NULL, FK to forecast_models | Model reference |
| metadata | jsonb | DEFAULT '{}' | Additional metadata |
| is_active | boolean | NOT NULL, DEFAULT true | Active status |
| created_at | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

**Trends:** `up`, `down`, `stable`  
**Methodologies:** `historical_trend`, `linear_regression`, `arima`, `ml_model`

---

### chatbot_sessions
**Purpose:** Chatbot conversation sessions  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| config_id | integer | NOT NULL, FK to chatbot_configs | Config reference |
| session_id | text | NOT NULL | Unique session ID |
| visitor_id | text | NULL | Visitor identifier |
| patient_id | integer | NULL, FK to patients | Patient reference |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Session status |
| current_intent | text | NULL | Current intent |
| extracted_patient_name | text | NULL | Extracted name |
| extracted_phone | text | NULL | Extracted phone |
| extracted_email | text | NULL | Extracted email |
| created_at | timestamp | NOT NULL, DEFAULT now() | Session start |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last activity |

**Status Values:** `active`, `completed`, `abandoned`

---

## Inventory Management

### inventory_items
**Purpose:** Inventory item catalog  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| category_id | integer | NULL | Category reference |
| item_code | varchar(50) | NOT NULL, UNIQUE | Unique item code |
| name | text | NOT NULL | Item name |
| description | text | NULL | Item description |
| unit_of_measurement | varchar(20) | NOT NULL | Unit (box, bottle, unit, etc.) |
| reorder_level | integer | NOT NULL, DEFAULT 10 | Reorder threshold |
| current_stock | integer | NOT NULL, DEFAULT 0 | Current stock level |
| unit_cost | numeric | NOT NULL | Unit cost |
| selling_price | numeric | NULL | Selling price |
| supplier_id | integer | NULL | Primary supplier |
| storage_location | text | NULL | Storage location |
| expiry_tracking | boolean | NOT NULL, DEFAULT false | Track expiry dates |
| batch_tracking | boolean | NOT NULL, DEFAULT false | Track batches |
| is_active | boolean | NOT NULL, DEFAULT true | Active status |
| metadata | jsonb | DEFAULT '{}' | Additional metadata |
| created_at | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

### inventory_stock_movements
**Purpose:** Track all stock movements (in/out)  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| item_id | integer | NOT NULL | Inventory item reference |
| batch_id | integer | NULL | Batch reference |
| movement_type | varchar(20) | NOT NULL | Movement type |
| quantity | integer | NOT NULL | Quantity moved |
| unit_cost | numeric | NULL | Unit cost |
| reference_type | varchar(30) | NULL | Reference type |
| reference_id | integer | NULL | Reference ID |
| notes | text | NULL | Movement notes |
| created_by | integer | NOT NULL | User who recorded movement |
| movement_date | timestamp | NOT NULL, DEFAULT now() | Movement date |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation |

**Movement Types:** `purchase`, `sale`, `adjustment`, `return`, `transfer`, `expired`, `damaged`  
**Reference Types:** `purchase_order`, `sale`, `invoice`, `prescription`

---

## GDPR Compliance

### gdpr_consents
**Purpose:** Patient consent management for GDPR compliance  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| patient_id | integer | NOT NULL, FK to patients | Patient reference |
| consent_type | varchar(50) | NOT NULL | Consent type |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Consent status |
| granted_at | timestamp | NULL | Grant timestamp |
| withdrawn_at | timestamp | NULL | Withdrawal timestamp |
| expires_at | timestamp | NULL | Expiration timestamp |
| purpose | text | NOT NULL | Consent purpose |
| legal_basis | varchar(50) | NOT NULL | Legal basis |
| data_categories | jsonb | DEFAULT '[]' | Data categories |
| retention_period | integer | NULL | Retention period (days) |
| ip_address | varchar(45) | NULL | IP address |
| user_agent | text | NULL | User agent |
| consent_method | varchar(30) | NOT NULL, DEFAULT 'digital' | Consent method |
| metadata | jsonb | DEFAULT '{}' | Additional metadata |
| created_at | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Consent Types:** `data_processing`, `marketing`, `research`, `data_sharing`, `profiling`  
**Status:** `pending`, `granted`, `withdrawn`, `expired`  
**Legal Basis:** `consent`, `contract`, `legal_obligation`, `vital_interests`, `public_task`, `legitimate_interests`

---

### gdpr_data_requests
**Purpose:** Handle patient data access/erasure requests  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| patient_id | integer | NOT NULL, FK to patients | Patient reference |
| request_type | varchar(30) | NOT NULL | Request type |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Request status |
| request_reason | text | NULL | Request reason |
| identity_verified | boolean | NOT NULL, DEFAULT false | Identity verification |
| processed_by | integer | NULL, FK to users | Processing user |
| requested_at | timestamp | NOT NULL, DEFAULT now() | Request timestamp |
| completed_at | timestamp | NULL | Completion timestamp |
| due_date | timestamp | NOT NULL | Due date (30 days) |
| response_data | jsonb | DEFAULT '{}' | Response data |
| rejection_reason | text | NULL | Rejection reason |
| communication_log | jsonb | DEFAULT '[]' | Communication log |
| metadata | jsonb | DEFAULT '{}' | Additional metadata |
| created_at | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Request Types:** `access`, `rectification`, `erasure`, `restriction`, `portability`, `objection`  
**Status:** `pending`, `in_progress`, `completed`, `rejected`, `cancelled`

---

### gdpr_audit_trail
**Purpose:** Comprehensive audit trail for GDPR compliance  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL, FK to organizations | Organization reference |
| user_id | integer | NULL, FK to users | Acting user |
| patient_id | integer | NULL, FK to patients | Affected patient |
| action | varchar(50) | NOT NULL | Action performed |
| resource_type | varchar(30) | NOT NULL | Resource type |
| resource_id | integer | NULL | Resource ID |
| data_categories | jsonb | DEFAULT '[]' | Data categories |
| legal_basis | varchar(50) | NULL | Legal basis |
| purpose | text | NULL | Action purpose |
| changes | jsonb | DEFAULT '[]' | Change details |
| ip_address | varchar(45) | NULL | IP address |
| user_agent | text | NULL | User agent |
| session_id | varchar(100) | NULL | Session ID |
| timestamp | timestamp | NOT NULL, DEFAULT now() | Action timestamp |
| metadata | jsonb | DEFAULT '{}' | Additional metadata |

**Actions:** `create`, `read`, `update`, `delete`, `export`, `share`, `consent_granted`, `consent_withdrawn`  
**Resource Types:** `patient`, `medical_record`, `prescription`, `lab_result`, `imaging`, `invoice`

---

## Integrations

### quickbooks_connections
**Purpose:** QuickBooks Online integration connections  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| realm_id | text | NOT NULL, UNIQUE | QuickBooks company ID |
| access_token | text | NULL | OAuth access token |
| refresh_token | text | NULL | OAuth refresh token |
| token_expiry | timestamp | NULL | Token expiration |
| company_name | text | NULL | QuickBooks company name |
| country | varchar(2) | NULL | Company country |
| is_active | boolean | NOT NULL, DEFAULT true | Connection active |
| last_sync_at | timestamp | NULL | Last sync timestamp |
| created_at | timestamp | NOT NULL, DEFAULT now() | Connection created |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update |

---

### quickbooks_sync_configs
**Purpose:** QuickBooks sync configuration  
**Primary Key:** `id` (serial)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| organization_id | integer | NOT NULL | Reference to organizations |
| sync_invoices | boolean | NOT NULL, DEFAULT true | Sync invoices |
| sync_payments | boolean | NOT NULL, DEFAULT true | Sync payments |
| sync_customers | boolean | NOT NULL, DEFAULT true | Sync customers |
| sync_items | boolean | NOT NULL, DEFAULT false | Sync items |
| auto_sync | boolean | NOT NULL, DEFAULT false | Auto sync enabled |
| sync_frequency | varchar(20) | DEFAULT 'manual' | Sync frequency |
| last_invoice_sync | timestamp | NULL | Last invoice sync |
| last_payment_sync | timestamp | NULL | Last payment sync |
| last_customer_sync | timestamp | NULL | Last customer sync |
| created_at | timestamp | NOT NULL, DEFAULT now() | Config created |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update |

**Sync Frequency:** `manual`, `hourly`, `daily`, `weekly`

---

## Relationships & Foreign Keys

### Foreign Key Constraints

```sql
-- Organization-scoped relationships
patients.organization_id → organizations.id
users.organization_id → organizations.id
appointments.organization_id → organizations.id
prescriptions.organization_id → organizations.id
invoices.organization_id → organizations.id

-- User relationships
patients.user_id → users.id
patients.created_by → users.id
prescriptions.doctor_id → users.id
prescriptions.prescription_created_by → users.id
lab_results.ordered_by → users.id
medical_images.uploaded_by → users.id

-- Patient relationships
appointments.patient_id → patients.id
medical_records.patient_id → patients.id
prescriptions.patient_id → patients.id
consultations.patient_id → patients.id
lab_results.patient_id → patients.id

-- Clinical relationships
prescriptions.consultation_id → consultations.id
consultations.appointment_id → appointments.id

-- Chatbot relationships
chatbot_sessions.config_id → chatbot_configs.id
chatbot_sessions.organization_id → organizations.id
chatbot_messages.session_id → chatbot_sessions.id

-- GDPR relationships
gdpr_consents.patient_id → patients.id
gdpr_data_requests.patient_id → patients.id
gdpr_data_requests.processed_by → users.id
gdpr_audit_trail.user_id → users.id
gdpr_audit_trail.patient_id → patients.id

-- Financial relationships
financial_forecasts.model_id → forecast_models.id
claims.patient_id → patients.id
```

---

## Database Statistics

- **Total Tables:** 68
- **Multi-tenant:** All tables have `organization_id` for data isolation
- **GDPR Compliant:** Comprehensive audit trails and consent management
- **AI-Enabled:** Multiple AI/ML integration points
- **Payment Integration:** Stripe, PayPal support
- **UK Healthcare:** NHS number support, UK compliance

---

## Indexes & Performance

### Unique Indexes
- `organizations.subdomain` (unique)
- `saas_owners.username` (unique)
- `saas_owners.email` (unique)
- `prescriptions.prescription_number` (unique)
- `invoices.invoice_number` (unique)
- `lab_results.lab_number` (unique)
- `payments.transaction_id` (unique)

### Common Query Patterns
```sql
-- Get all patients for an organization
SELECT * FROM patients WHERE organization_id = ? AND is_active = true;

-- Get user appointments
SELECT * FROM appointments 
WHERE organization_id = ? AND provider_id = ? 
ORDER BY scheduled_at DESC;

-- Get patient prescriptions
SELECT * FROM prescriptions 
WHERE organization_id = ? AND patient_id = ? 
ORDER BY created_at DESC;

-- Get unread notifications
SELECT * FROM notifications 
WHERE organization_id = ? AND user_id = ? AND is_read = false;
```

---

*End of Database Schema Documentation*
