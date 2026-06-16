# Cura EMR Database Schema Documentation

**Generated:** October 17, 2025  
**Database Type:** PostgreSQL (Neon Serverless)  
**ORM:** Drizzle ORM  
**Architecture:** Multi-tenant with organizational isolation

---

## Table of Contents

1. [SaaS Platform Tables](#saas-platform-tables)
2. [Core Organization Tables](#core-organization-tables)
3. [User Management Tables](#user-management-tables)
4. [Patient Management Tables](#patient-management-tables)
5. [Clinical Data Tables](#clinical-data-tables)
6. [Financial & Billing Tables](#financial--billing-tables)
7. [Inventory Management Tables](#inventory-management-tables)
8. [Communication & Messaging Tables](#communication--messaging-tables)
9. [AI & Analytics Tables](#ai--analytics-tables)
10. [GDPR Compliance Tables](#gdpr-compliance-tables)
11. [Chatbot Tables](#chatbot-tables)
12. [Relationships Diagram](#relationships-diagram)

---

## SaaS Platform Tables

### `saas_owners`
**Purpose:** Platform administrators who manage the SaaS system

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| username | varchar(50) | NOT NULL, UNIQUE | Unique username |
| password | text | NOT NULL | Hashed password |
| email | text | NOT NULL, UNIQUE | Email address |
| firstName | text | NOT NULL | First name |
| lastName | text | NOT NULL | Last name |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| lastLoginAt | timestamp | | Last login timestamp |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `saas_packages`
**Purpose:** Available subscription packages for customers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Package ID |
| name | text | NOT NULL | Package name |
| description | text | | Package description |
| price | decimal(10,2) | NOT NULL | Price |
| billingCycle | varchar(20) | NOT NULL, DEFAULT 'monthly' | Billing cycle (monthly, yearly) |
| features | jsonb | DEFAULT {} | Package features |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| showOnWebsite | boolean | NOT NULL, DEFAULT false | Display on website |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

**Features JSON Structure:**
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

### `saas_subscriptions`
**Purpose:** Customer subscriptions to packages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Subscription ID |
| organizationId | integer | NOT NULL | Organization ID |
| packageId | integer | NOT NULL | Package ID |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Status (active, cancelled, suspended, past_due) |
| currentPeriodStart | timestamp | NOT NULL | Period start |
| currentPeriodEnd | timestamp | NOT NULL | Period end |
| cancelAtPeriodEnd | boolean | NOT NULL, DEFAULT false | Cancel at end flag |
| trialEnd | timestamp | | Trial end date |
| metadata | jsonb | DEFAULT {} | Additional metadata |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `saas_payments`
**Purpose:** Track all SaaS subscription payments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Payment ID |
| organizationId | integer | NOT NULL | Organization ID |
| subscriptionId | integer | | Subscription ID |
| invoiceNumber | varchar(50) | NOT NULL, UNIQUE | Invoice number |
| amount | decimal(10,2) | NOT NULL | Payment amount |
| currency | varchar(3) | NOT NULL, DEFAULT 'GBP' | Currency code |
| paymentMethod | varchar(20) | NOT NULL | Payment method (cash, stripe, paypal, bank_transfer) |
| paymentStatus | varchar(20) | NOT NULL, DEFAULT 'pending' | Status (pending, completed, failed, refunded) |
| paymentDate | timestamp | | Payment date |
| dueDate | timestamp | NOT NULL | Due date |
| periodStart | timestamp | NOT NULL | Billing period start |
| periodEnd | timestamp | NOT NULL | Billing period end |
| paymentProvider | varchar(50) | | Payment provider |
| providerTransactionId | text | | External transaction ID |
| description | text | | Payment description |
| metadata | jsonb | DEFAULT {} | Additional payment data |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `saas_invoices`
**Purpose:** Billing invoices for subscriptions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Invoice ID |
| organizationId | integer | NOT NULL | Organization ID |
| subscriptionId | integer | NOT NULL | Subscription ID |
| invoiceNumber | varchar(50) | NOT NULL, UNIQUE | Invoice number |
| amount | decimal(10,2) | NOT NULL | Invoice amount |
| currency | varchar(3) | NOT NULL, DEFAULT 'GBP' | Currency code |
| status | varchar(20) | NOT NULL, DEFAULT 'draft' | Status (draft, sent, paid, overdue, cancelled) |
| issueDate | timestamp | NOT NULL | Issue date |
| dueDate | timestamp | NOT NULL | Due date |
| paidDate | timestamp | | Payment date |
| periodStart | timestamp | NOT NULL | Period start |
| periodEnd | timestamp | NOT NULL | Period end |
| lineItems | jsonb | DEFAULT [] | Invoice line items |
| notes | text | | Additional notes |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `saas_settings`
**Purpose:** Global system settings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Setting ID |
| key | varchar(100) | NOT NULL, UNIQUE | Setting key |
| value | jsonb | | Setting value |
| description | text | | Setting description |
| category | varchar(50) | NOT NULL, DEFAULT 'system' | Setting category |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

## Core Organization Tables

### `organizations`
**Purpose:** Multi-tenant organizations (customers)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Organization ID |
| name | text | NOT NULL | Organization name |
| subdomain | varchar(50) | NOT NULL, UNIQUE | Unique subdomain |
| email | text | NOT NULL | Contact email |
| region | varchar(10) | NOT NULL, DEFAULT 'UK' | Data region (UK, EU, ME, SA, US) |
| brandName | text | NOT NULL | Brand name |
| settings | jsonb | DEFAULT {} | Organization settings |
| features | jsonb | DEFAULT {} | Enabled features |
| accessLevel | varchar(50) | DEFAULT 'full' | Access level |
| subscriptionStatus | varchar(20) | NOT NULL, DEFAULT 'trial' | Subscription status (trial, active, suspended, cancelled) |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

**Settings JSON Structure:**
```json
{
  "theme": {
    "primaryColor": "string",
    "logoUrl": "string"
  },
  "compliance": {
    "gdprEnabled": boolean,
    "dataResidency": "string"
  },
  "features": {
    "aiEnabled": boolean,
    "billingEnabled": boolean
  }
}
```

---

## User Management Tables

### `users`
**Purpose:** System users with role-based access control

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | User ID |
| organizationId | integer | NOT NULL | Organization ID (0 for SaaS owners) |
| email | text | NOT NULL | Email address |
| username | text | NOT NULL | Username |
| passwordHash | text | NOT NULL | Hashed password |
| firstName | text | NOT NULL | First name |
| lastName | text | NOT NULL | Last name |
| role | varchar(20) | NOT NULL, DEFAULT 'doctor' | User role |
| department | text | | Department |
| medicalSpecialtyCategory | text | | Medical specialty |
| subSpecialty | text | | Sub-specialty |
| workingDays | jsonb | DEFAULT [] | Working days array |
| workingHours | jsonb | DEFAULT {} | Working hours |
| permissions | jsonb | DEFAULT {} | Granular permissions |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| isSaaSOwner | boolean | NOT NULL, DEFAULT false | SaaS owner flag |
| lastLoginAt | timestamp | | Last login timestamp |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

**Roles:**
- admin
- doctor
- nurse
- receptionist
- patient
- sample_taker
- lab_technician
- pharmacist
- dentist
- dental_nurse
- phlebotomist
- aesthetician
- optician
- paramedic
- physiotherapist
- other

**Permissions JSON Structure:**
```json
{
  "modules": {
    "patients": { "view": boolean, "create": boolean, "edit": boolean, "delete": boolean },
    "appointments": { "view": boolean, "create": boolean, "edit": boolean, "delete": boolean },
    "medicalRecords": { "view": boolean, "create": boolean, "edit": boolean, "delete": boolean },
    "prescriptions": { "view": boolean, "create": boolean, "edit": boolean, "delete": boolean },
    "billing": { "view": boolean, "create": boolean, "edit": boolean, "delete": boolean }
  },
  "fields": {
    "patientSensitiveInfo": boolean,
    "financialData": boolean,
    "medicalHistory": boolean
  }
}
```

---

### `roles`
**Purpose:** Custom organizational roles with permissions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Role ID |
| organizationId | integer | NOT NULL | Organization ID |
| name | varchar(50) | NOT NULL | Role name |
| displayName | text | NOT NULL | Display name |
| description | text | NOT NULL | Role description |
| permissions | jsonb | NOT NULL | Role permissions |
| isSystem | boolean | NOT NULL, DEFAULT false | System role flag |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

### `user_document_preferences`
**Purpose:** User preferences for documents and forms

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Preference ID |
| organizationId | integer | NOT NULL | Organization ID |
| userId | integer | NOT NULL | User ID |
| clinicInfo | jsonb | DEFAULT {} | Clinic information |
| headerPreferences | jsonb | DEFAULT {} | Header preferences |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

**Unique Index:** `(userId, organizationId)`

---

### `staff_shifts`
**Purpose:** Staff shift scheduling and availability

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Shift ID |
| organizationId | integer | NOT NULL | Organization ID |
| staffId | integer | NOT NULL | Staff user ID |
| date | timestamp | NOT NULL | Shift date |
| shiftType | varchar(20) | NOT NULL, DEFAULT 'regular' | Shift type (regular, overtime, on_call, absent) |
| startTime | varchar(5) | NOT NULL | Start time (HH:MM) |
| endTime | varchar(5) | NOT NULL | End time (HH:MM) |
| status | varchar(20) | NOT NULL, DEFAULT 'scheduled' | Status (scheduled, completed, cancelled, absent) |
| notes | text | | Shift notes |
| isAvailable | boolean | NOT NULL, DEFAULT true | Availability flag |
| createdBy | integer | FOREIGN KEY → users.id | Creator user ID |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

### `doctor_default_shifts`
**Purpose:** Default working hours for staff members

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Default shift ID |
| organizationId | integer | NOT NULL | Organization ID |
| userId | integer | NOT NULL | User ID |
| startTime | varchar(5) | NOT NULL, DEFAULT '09:00' | Default start time |
| endTime | varchar(5) | NOT NULL, DEFAULT '17:00' | Default end time |
| workingDays | text[] | NOT NULL, DEFAULT ['Monday'...] | Working days array |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

## Patient Management Tables

### `patients`
**Purpose:** Patient demographic and medical information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Patient ID |
| organizationId | integer | NOT NULL | Organization ID |
| userId | integer | FOREIGN KEY → users.id | Linked user account |
| patientId | text | NOT NULL | Custom patient identifier |
| firstName | text | NOT NULL | First name |
| lastName | text | NOT NULL | Last name |
| dateOfBirth | date | | Date of birth |
| genderAtBirth | varchar(20) | | Gender at birth |
| email | text | | Email address |
| phone | text | | Phone number |
| nhsNumber | text | | NHS number (UK) |
| address | jsonb | DEFAULT {} | Address information |
| insuranceInfo | jsonb | DEFAULT {} | Insurance details |
| emergencyContact | jsonb | DEFAULT {} | Emergency contact |
| medicalHistory | jsonb | DEFAULT {} | Medical history |
| riskLevel | varchar(10) | NOT NULL, DEFAULT 'low' | Risk level (low, medium, high) |
| flags | text[] | DEFAULT [] | Patient flags |
| communicationPreferences | jsonb | DEFAULT {} | Communication preferences |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| isInsured | boolean | NOT NULL, DEFAULT false | Insurance status |
| createdBy | integer | FOREIGN KEY → users.id | Creator user ID |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Address JSON Structure:**
```json
{
  "street": "string",
  "city": "string",
  "state": "string",
  "postcode": "string",
  "country": "string"
}
```

**Insurance Info JSON Structure:**
```json
{
  "provider": "string",
  "policyNumber": "string",
  "groupNumber": "string",
  "memberNumber": "string",
  "planType": "string",
  "effectiveDate": "string",
  "expirationDate": "string",
  "copay": number,
  "deductible": number,
  "isActive": boolean
}
```

---

## Clinical Data Tables

### `medical_records`
**Purpose:** Patient medical records and consultations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Record ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL | Patient ID |
| providerId | integer | NOT NULL | Provider user ID |
| type | varchar(20) | NOT NULL | Record type (consultation, prescription, lab_result, imaging) |
| title | text | NOT NULL | Record title |
| notes | text | | Clinical notes |
| diagnosis | text | | Diagnosis |
| treatment | text | | Treatment plan |
| prescription | jsonb | DEFAULT {} | Prescription details |
| attachments | jsonb | DEFAULT [] | File attachments |
| aiSuggestions | jsonb | DEFAULT {} | AI-generated suggestions |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `appointments`
**Purpose:** Patient appointments and scheduling

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Appointment ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL | Patient ID |
| providerId | integer | NOT NULL | Provider user ID |
| assignedRole | varchar(50) | | Assigned role |
| title | text | NOT NULL | Appointment title |
| description | text | | Description |
| scheduledAt | timestamp | NOT NULL | Scheduled time |
| duration | integer | NOT NULL, DEFAULT 30 | Duration in minutes |
| status | varchar(20) | NOT NULL, DEFAULT 'scheduled' | Status (scheduled, completed, cancelled, no_show, rescheduled) |
| type | varchar(20) | NOT NULL, DEFAULT 'consultation' | Type (consultation, follow_up, procedure, emergency, routine_checkup) |
| location | text | | Location |
| isVirtual | boolean | NOT NULL, DEFAULT false | Virtual appointment flag |
| createdBy | integer | | Creator user ID |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `prescriptions`
**Purpose:** Patient prescriptions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Prescription ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL | Patient ID |
| prescribedBy | integer | NOT NULL | Prescriber user ID |
| medications | jsonb | NOT NULL | Medication list |
| diagnosis | text | | Diagnosis |
| notes | text | | Additional notes |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Status (active, completed, cancelled) |
| issuedAt | timestamp | NOT NULL, DEFAULT now() | Issue date |
| expiresAt | timestamp | | Expiration date |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `medical_images`
**Purpose:** Medical imaging studies (X-ray, CT, MRI, etc.)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Image ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL | Patient ID |
| imageId | text | NOT NULL | Unique image identifier |
| fileName | text | NOT NULL | File name |
| imagingType | varchar(50) | NOT NULL | Imaging type (X-ray, CT, MRI, Ultrasound) |
| bodyPart | text | | Body part imaged |
| orderedBy | integer | | Ordering provider ID |
| orderedAt | timestamp | DEFAULT now() | Order timestamp |
| performedAt | timestamp | | Performance timestamp |
| findings | text | | Radiologist findings |
| impression | text | | Clinical impression |
| radiologist | text | | Radiologist name |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Status (pending, in_progress, completed, reported) |
| priority | varchar(20) | DEFAULT 'routine' | Priority (routine, urgent, stat) |
| reportFileName | text | | Report PDF filename |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `lab_results`
**Purpose:** Laboratory test results

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Result ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL | Patient ID |
| testName | text | NOT NULL | Test name |
| testType | varchar(50) | NOT NULL | Test type |
| orderedBy | integer | | Ordering provider ID |
| performedBy | integer | | Lab technician ID |
| specimenType | text | | Specimen type |
| results | jsonb | NOT NULL | Test results |
| normalRange | text | | Normal reference range |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Status (pending, in_progress, completed, reviewed) |
| flags | text[] | DEFAULT [] | Result flags (abnormal, critical) |
| notes | text | | Additional notes |
| orderedAt | timestamp | DEFAULT now() | Order timestamp |
| collectedAt | timestamp | | Collection timestamp |
| reportedAt | timestamp | | Report timestamp |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `clinical_photos`
**Purpose:** Clinical photography for aesthetic/dental procedures

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Photo ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL | Patient ID |
| photoId | text | NOT NULL | Unique photo identifier |
| fileName | text | NOT NULL | File name |
| photoType | varchar(50) | | Photo type (before, after, progress) |
| bodyPart | text | | Body part photographed |
| viewAngle | text | | View angle |
| notes | text | | Photo notes |
| takenBy | integer | | Photographer user ID |
| takenAt | timestamp | DEFAULT now() | Photo timestamp |
| musclePositions | jsonb | DEFAULT [] | Muscle position data |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `muscles_position`
**Purpose:** Facial muscle analysis data (32 positions)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Position ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL | Patient ID |
| consultationId | integer | | Consultation ID |
| position | integer | NOT NULL | Muscle position (1-32) |
| value | text | NOT NULL | Muscle name |
| coordinates | jsonb | | X/Y coordinates |
| isDetected | boolean | NOT NULL, DEFAULT false | Detection flag |
| detectedAt | timestamp | | Detection timestamp |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

## Financial & Billing Tables

### `invoices`
**Purpose:** Patient invoices for medical services

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Invoice ID |
| organizationId | integer | NOT NULL | Organization ID |
| invoiceNumber | varchar(50) | NOT NULL, UNIQUE | Invoice number |
| patientId | text | NOT NULL | Patient ID (custom) |
| patientName | text | NOT NULL | Patient name |
| nhsNumber | varchar(10) | | NHS number |
| dateOfService | timestamp | NOT NULL | Service date |
| invoiceDate | timestamp | NOT NULL | Invoice date |
| dueDate | timestamp | NOT NULL | Due date |
| status | varchar(20) | NOT NULL, DEFAULT 'draft' | Status (draft, sent, paid, overdue, cancelled) |
| invoiceType | varchar(50) | NOT NULL, DEFAULT 'payment' | Type (payment, insurance_claim) |
| subtotal | decimal(10,2) | NOT NULL | Subtotal amount |
| tax | decimal(10,2) | NOT NULL, DEFAULT 0 | Tax amount |
| discount | decimal(10,2) | NOT NULL, DEFAULT 0 | Discount amount |
| totalAmount | decimal(10,2) | NOT NULL | Total amount |
| paidAmount | decimal(10,2) | NOT NULL, DEFAULT 0 | Paid amount |
| items | jsonb | NOT NULL | Invoice items |
| insurance | jsonb | | Insurance claim data |
| payments | jsonb | NOT NULL, DEFAULT [] | Payment records |
| notes | text | | Additional notes |
| createdBy | integer | | Creator user ID |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `payments`
**Purpose:** Payment transactions for invoices

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Payment ID |
| organizationId | integer | NOT NULL | Organization ID |
| invoiceId | integer | NOT NULL | Invoice ID |
| patientId | text | NOT NULL | Patient ID |
| transactionId | text | NOT NULL, UNIQUE | Transaction ID |
| amount | decimal(10,2) | NOT NULL | Payment amount |
| currency | varchar(3) | NOT NULL, DEFAULT 'GBP' | Currency code |
| paymentMethod | varchar(20) | NOT NULL | Payment method (online, cash, card, bank_transfer) |
| paymentProvider | varchar(50) | | Payment provider (stripe, paypal) |
| paymentStatus | varchar(20) | NOT NULL, DEFAULT 'completed' | Status (completed, pending, failed, refunded) |
| paymentDate | timestamp | NOT NULL, DEFAULT now() | Payment date |
| metadata | jsonb | DEFAULT {} | Payment metadata |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `pricing_imaging`
**Purpose:** Pricing for imaging services

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Pricing ID |
| organizationId | integer | NOT NULL | Organization ID |
| imagingType | varchar(50) | NOT NULL | Imaging type |
| description | text | | Service description |
| price | decimal(10,2) | NOT NULL | Service price |
| currency | varchar(3) | NOT NULL, DEFAULT 'GBP' | Currency code |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `claims`
**Purpose:** Insurance claims

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Claim ID |
| organizationId | integer | NOT NULL | Organization ID |
| claimNumber | varchar(50) | NOT NULL, UNIQUE | Claim number |
| patientId | integer | NOT NULL | Patient ID |
| invoiceId | integer | | Related invoice ID |
| insuranceProvider | text | NOT NULL | Insurance provider |
| claimAmount | decimal(10,2) | NOT NULL | Claim amount |
| approvedAmount | decimal(10,2) | | Approved amount |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Status (pending, approved, denied, partially_paid) |
| submittedAt | timestamp | DEFAULT now() | Submission date |
| processedAt | timestamp | | Processing date |
| notes | text | | Claim notes |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `revenue_records`
**Purpose:** Monthly revenue tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Record ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| month | varchar(7) | NOT NULL | Month (YYYY-MM) |
| revenue | decimal(12,2) | NOT NULL | Total revenue |
| expenses | decimal(12,2) | NOT NULL | Total expenses |
| profit | decimal(12,2) | NOT NULL | Net profit |
| collections | decimal(12,2) | NOT NULL | Collections |
| target | decimal(12,2) | NOT NULL | Revenue target |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `insurance_verifications`
**Purpose:** Insurance verification records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Verification ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| patientId | integer | NOT NULL, FOREIGN KEY → patients.id | Patient ID |
| patientName | text | NOT NULL | Patient name |
| provider | text | NOT NULL | Insurance provider |
| policyNumber | text | NOT NULL | Policy number |
| groupNumber | text | | Group number |
| memberNumber | text | | Member number |
| nhsNumber | text | | NHS number |
| planType | text | | Plan type |
| coverageType | varchar(20) | NOT NULL, DEFAULT 'primary' | Coverage type (primary, secondary) |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Status (active, inactive, pending, expired) |
| eligibilityStatus | varchar(20) | NOT NULL, DEFAULT 'pending' | Eligibility (verified, pending, invalid) |
| effectiveDate | date | | Effective date |
| expirationDate | date | | Expiration date |
| lastVerified | date | | Last verification date |
| benefits | jsonb | DEFAULT {} | Benefit details |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

## Inventory Management Tables

### `inventory_categories`
**Purpose:** Inventory item categories

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Category ID |
| organizationId | integer | NOT NULL | Organization ID |
| name | text | NOT NULL | Category name |
| description | text | | Description |
| parentCategoryId | integer | | Parent category ID |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

### `inventory_items`
**Purpose:** Inventory items (medications, supplies, etc.)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Item ID |
| organizationId | integer | NOT NULL | Organization ID |
| categoryId | integer | NOT NULL | Category ID |
| name | text | NOT NULL | Item name |
| description | text | | Description |
| sku | varchar(100) | NOT NULL | Stock Keeping Unit |
| barcode | varchar(100) | | Barcode |
| genericName | text | | Generic name |
| brandName | text | | Brand name |
| manufacturer | text | | Manufacturer |
| unitOfMeasurement | varchar(20) | NOT NULL, DEFAULT 'pieces' | Unit (pieces, ml, mg, grams) |
| packSize | integer | NOT NULL, DEFAULT 1 | Pack size |
| purchasePrice | decimal(10,2) | NOT NULL | Purchase price |
| salePrice | decimal(10,2) | NOT NULL | Sale price |
| mrp | decimal(10,2) | | Maximum Retail Price |
| taxRate | decimal(5,2) | NOT NULL, DEFAULT 0 | Tax rate percentage |
| currentStock | integer | NOT NULL, DEFAULT 0 | Current stock level |
| minimumStock | integer | NOT NULL, DEFAULT 10 | Minimum stock level |
| maximumStock | integer | NOT NULL, DEFAULT 1000 | Maximum stock level |
| reorderPoint | integer | NOT NULL, DEFAULT 20 | Reorder point |
| expiryTracking | boolean | NOT NULL, DEFAULT false | Expiry tracking flag |
| batchTracking | boolean | NOT NULL, DEFAULT false | Batch tracking flag |
| prescriptionRequired | boolean | NOT NULL, DEFAULT false | Prescription required flag |
| storageConditions | text | | Storage conditions |
| sideEffects | text | | Side effects |
| contraindications | text | | Contraindications |
| dosageInstructions | text | | Dosage instructions |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| isDiscontinued | boolean | NOT NULL, DEFAULT false | Discontinued flag |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

### `inventory_suppliers`
**Purpose:** Inventory suppliers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Supplier ID |
| organizationId | integer | NOT NULL | Organization ID |
| name | text | NOT NULL | Supplier name |
| contactPerson | text | | Contact person |
| email | text | | Email address |
| phone | varchar(20) | | Phone number |
| address | text | | Address |
| city | text | | City |
| country | text | NOT NULL, DEFAULT 'UK' | Country |
| taxId | varchar(50) | | Tax ID |
| paymentTerms | varchar(100) | DEFAULT 'Net 30' | Payment terms |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

### `inventory_purchase_orders`
**Purpose:** Purchase orders for inventory

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Purchase order ID |
| organizationId | integer | NOT NULL | Organization ID |
| poNumber | varchar(100) | NOT NULL, UNIQUE | PO number |
| supplierId | integer | NOT NULL | Supplier ID |
| orderDate | timestamp | NOT NULL, DEFAULT now() | Order date |
| expectedDeliveryDate | timestamp | | Expected delivery |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Status (pending, sent, received, cancelled) |
| totalAmount | decimal(12,2) | NOT NULL | Total amount |
| taxAmount | decimal(10,2) | NOT NULL, DEFAULT 0 | Tax amount |
| discountAmount | decimal(10,2) | NOT NULL, DEFAULT 0 | Discount amount |
| notes | text | | Notes |
| createdBy | integer | NOT NULL | Creator user ID |
| approvedBy | integer | | Approver user ID |
| approvedAt | timestamp | | Approval timestamp |
| emailSent | boolean | NOT NULL, DEFAULT false | Email sent flag |
| emailSentAt | timestamp | | Email sent timestamp |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

### `inventory_purchase_order_items`
**Purpose:** Line items for purchase orders

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Item ID |
| organizationId | integer | NOT NULL | Organization ID |
| purchaseOrderId | integer | NOT NULL | Purchase order ID |
| itemId | integer | NOT NULL | Inventory item ID |
| quantity | integer | NOT NULL | Order quantity |
| unitPrice | decimal(10,2) | NOT NULL | Unit price |
| totalPrice | decimal(12,2) | NOT NULL | Total price |
| receivedQuantity | integer | NOT NULL, DEFAULT 0 | Received quantity |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `inventory_batches`
**Purpose:** Inventory batches with expiry tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Batch ID |
| organizationId | integer | NOT NULL | Organization ID |
| itemId | integer | NOT NULL | Item ID |
| batchNumber | varchar(100) | NOT NULL | Batch number |
| expiryDate | timestamp | | Expiry date |
| manufactureDate | timestamp | | Manufacture date |
| quantity | integer | NOT NULL | Initial quantity |
| remainingQuantity | integer | NOT NULL, DEFAULT 0 | Remaining quantity |
| purchasePrice | decimal(10,2) | NOT NULL | Purchase price |
| supplierId | integer | | Supplier ID |
| receivedDate | timestamp | NOT NULL, DEFAULT now() | Received date |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Status |
| isExpired | boolean | NOT NULL, DEFAULT false | Expired flag |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `inventory_sales`
**Purpose:** Inventory sales transactions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Sale ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | | Patient ID |
| saleNumber | varchar(100) | NOT NULL, UNIQUE | Sale number |
| saleDate | timestamp | NOT NULL, DEFAULT now() | Sale date |
| totalAmount | decimal(12,2) | NOT NULL | Total amount |
| taxAmount | decimal(10,2) | NOT NULL, DEFAULT 0 | Tax amount |
| discountAmount | decimal(10,2) | NOT NULL, DEFAULT 0 | Discount amount |
| paymentMethod | varchar(50) | NOT NULL, DEFAULT 'cash' | Payment method (cash, card, insurance) |
| paymentStatus | varchar(20) | NOT NULL, DEFAULT 'paid' | Payment status (paid, pending, partial) |
| prescriptionId | integer | | Prescription ID |
| soldBy | integer | NOT NULL | Seller user ID |
| notes | text | | Notes |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `inventory_sale_items`
**Purpose:** Line items for sales

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Item ID |
| organizationId | integer | NOT NULL | Organization ID |
| saleId | integer | NOT NULL | Sale ID |
| itemId | integer | NOT NULL | Item ID |
| batchId | integer | | Batch ID |
| quantity | integer | NOT NULL | Quantity sold |
| unitPrice | decimal(10,2) | NOT NULL | Unit price |
| totalPrice | decimal(12,2) | NOT NULL | Total price |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `inventory_stock_movements`
**Purpose:** Stock movement tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Movement ID |
| organizationId | integer | NOT NULL | Organization ID |
| itemId | integer | NOT NULL | Item ID |
| batchId | integer | | Batch ID |
| movementType | varchar(20) | NOT NULL | Type (purchase, sale, adjustment, transfer, expired) |
| quantity | integer | NOT NULL | Quantity (+ for in, - for out) |
| previousStock | integer | NOT NULL | Stock before |
| newStock | integer | NOT NULL | Stock after |
| unitCost | decimal(10,2) | | Unit cost |
| referenceType | varchar(50) | | Reference type |
| referenceId | integer | | Reference ID |
| notes | text | | Notes |
| createdBy | integer | NOT NULL | Creator user ID |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `inventory_stock_alerts`
**Purpose:** Stock level alerts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Alert ID |
| organizationId | integer | NOT NULL | Organization ID |
| itemId | integer | NOT NULL | Item ID |
| alertType | varchar(20) | NOT NULL | Type (low_stock, expired, expiring_soon) |
| thresholdValue | integer | NOT NULL | Threshold value |
| currentValue | integer | NOT NULL | Current value |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Status (active, resolved) |
| message | text | | Alert message |
| isRead | boolean | NOT NULL, DEFAULT false | Read flag |
| isResolved | boolean | NOT NULL, DEFAULT false | Resolved flag |
| resolvedBy | integer | | Resolver user ID |
| resolvedAt | timestamp | | Resolution timestamp |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

## Communication & Messaging Tables

### `conversations`
**Purpose:** Message conversations between users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | varchar(50) | PRIMARY KEY | Conversation ID |
| organizationId | integer | NOT NULL | Organization ID |
| participants | jsonb | NOT NULL | Participant list |
| lastMessage | jsonb | | Last message data |
| unreadCount | integer | NOT NULL, DEFAULT 0 | Unread count |
| isPatientConversation | boolean | NOT NULL, DEFAULT false | Patient conversation flag |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `messages`
**Purpose:** Individual messages in conversations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | varchar(50) | PRIMARY KEY | Message ID |
| organizationId | integer | NOT NULL | Organization ID |
| conversationId | varchar(50) | NOT NULL | Conversation ID |
| senderId | integer | NOT NULL | Sender user ID |
| senderName | text | NOT NULL | Sender name |
| senderRole | varchar(20) | NOT NULL | Sender role |
| recipientId | text | | Recipient ID |
| recipientName | text | | Recipient name |
| subject | text | NOT NULL | Message subject |
| content | text | NOT NULL | Message content |
| timestamp | timestamp | NOT NULL, DEFAULT now() | Message timestamp |
| isRead | boolean | NOT NULL, DEFAULT false | Read flag |
| priority | varchar(10) | NOT NULL, DEFAULT 'normal' | Priority (low, normal, high, urgent) |
| type | varchar(20) | NOT NULL, DEFAULT 'internal' | Type (internal, patient, broadcast) |
| isStarred | boolean | NOT NULL, DEFAULT false | Starred flag |
| phoneNumber | varchar(20) | | Phone number for SMS |
| messageType | varchar(10) | | Message type (sms, email, internal) |
| deliveryStatus | varchar(20) | NOT NULL, DEFAULT 'pending' | Status (pending, sent, delivered, failed) |
| externalMessageId | text | | External message ID (Twilio) |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `patient_communications`
**Purpose:** Patient communication records (SMS/WhatsApp)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Communication ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL, FOREIGN KEY → patients.id | Patient ID |
| sentBy | integer | NOT NULL, FOREIGN KEY → users.id | Sender user ID |
| type | varchar(20) | NOT NULL | Type (sms, whatsapp, email) |
| phoneNumber | text | NOT NULL | Phone number |
| message | text | NOT NULL | Message content |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Status (pending, sent, delivered, failed) |
| externalMessageId | text | | External message ID |
| deliveredAt | timestamp | | Delivery timestamp |
| errorMessage | text | | Error message |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `notifications`
**Purpose:** System notifications for users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Notification ID |
| organizationId | integer | NOT NULL | Organization ID |
| userId | integer | NOT NULL | User ID |
| title | text | NOT NULL | Notification title |
| message | text | NOT NULL | Notification message |
| type | varchar(20) | NOT NULL | Type (info, warning, error, success) |
| isRead | boolean | NOT NULL, DEFAULT false | Read flag |
| relatedEntity | jsonb | | Related entity data |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

## AI & Analytics Tables

### `ai_insights`
**Purpose:** AI-generated clinical insights

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Insight ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | | Patient ID |
| type | varchar(30) | NOT NULL | Type (risk_alert, drug_interaction, treatment_suggestion, preventive_care) |
| title | text | NOT NULL | Insight title |
| description | text | NOT NULL | Insight description |
| severity | varchar(10) | NOT NULL, DEFAULT 'medium' | Severity (low, medium, high, critical) |
| actionRequired | boolean | NOT NULL, DEFAULT false | Action required flag |
| confidence | varchar(10) | | Confidence score |
| metadata | jsonb | DEFAULT {} | Additional metadata |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Status (active, dismissed, resolved) |
| aiStatus | varchar(20) | DEFAULT 'pending' | AI status (pending, reviewed, implemented, dismissed) |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `financial_forecasts`
**Purpose:** Financial forecasting data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Forecast ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| category | text | NOT NULL | Forecast category |
| forecastPeriod | varchar(7) | NOT NULL | Period (YYYY-MM) |
| generatedAt | timestamp | NOT NULL, DEFAULT now() | Generation timestamp |
| currentValue | decimal(12,2) | NOT NULL | Current value |
| projectedValue | decimal(12,2) | NOT NULL | Projected value |
| variance | decimal(12,2) | NOT NULL | Variance |
| trend | varchar(10) | NOT NULL | Trend (up, down, stable) |
| confidence | integer | NOT NULL | Confidence (0-100) |
| methodology | varchar(30) | NOT NULL, DEFAULT 'historical_trend' | Methodology |
| keyFactors | jsonb | DEFAULT [] | Key factors |
| modelId | integer | FOREIGN KEY → forecast_models.id | Model ID |
| metadata | jsonb | DEFAULT {} | Additional metadata |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `forecast_models`
**Purpose:** Financial forecasting models

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Model ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| name | text | NOT NULL | Model name |
| type | varchar(30) | NOT NULL | Type (revenue, expenses, collections, claims) |
| algorithm | varchar(20) | NOT NULL, DEFAULT 'linear' | Algorithm (linear, seasonal, exponential) |
| parameters | jsonb | DEFAULT {} | Model parameters |
| accuracy | decimal(5,2) | | Accuracy percentage |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `clinical_procedures`
**Purpose:** Clinical procedure protocols

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Procedure ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| name | text | NOT NULL | Procedure name |
| category | varchar(50) | NOT NULL | Category |
| duration | text | NOT NULL | Duration |
| complexity | varchar(20) | NOT NULL | Complexity (low, medium, high) |
| prerequisites | jsonb | DEFAULT [] | Prerequisites |
| steps | jsonb | DEFAULT [] | Procedure steps |
| complications | jsonb | DEFAULT [] | Potential complications |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `emergency_protocols`
**Purpose:** Emergency response protocols

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Protocol ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| title | text | NOT NULL | Protocol title |
| priority | varchar(20) | NOT NULL | Priority (low, medium, high, critical) |
| steps | jsonb | DEFAULT [] | Protocol steps |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `medications_database`
**Purpose:** Medication reference database

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Medication ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| name | text | NOT NULL | Medication name |
| category | text | NOT NULL | Category |
| dosage | text | NOT NULL | Dosage |
| interactions | jsonb | DEFAULT [] | Drug interactions |
| warnings | jsonb | DEFAULT [] | Warnings |
| severity | varchar(20) | NOT NULL | Severity (low, medium, high) |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `patient_drug_interactions`
**Purpose:** Patient-specific drug interaction alerts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Interaction ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| patientId | integer | NOT NULL, FOREIGN KEY → patients.id | Patient ID |
| medication1Name | text | NOT NULL | First medication |
| medication1Dosage | text | NOT NULL | First med dosage |
| medication1Frequency | text | | First med frequency |
| medication2Name | text | NOT NULL | Second medication |
| medication2Dosage | text | NOT NULL | Second med dosage |
| medication2Frequency | text | | Second med frequency |
| interactionType | varchar(50) | | Type (drug-drug, drug-food, drug-condition) |
| severity | varchar(20) | NOT NULL, DEFAULT 'medium' | Severity (low, medium, high) |
| description | text | | Description |
| warnings | jsonb | DEFAULT [] | Warnings |
| recommendations | jsonb | DEFAULT [] | Recommendations |
| reportedBy | integer | FOREIGN KEY → users.id | Reporter user ID |
| reportedAt | timestamp | NOT NULL, DEFAULT now() | Report timestamp |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Status (active, resolved, dismissed) |
| notes | text | | Notes |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

## GDPR Compliance Tables

### `gdpr_consents`
**Purpose:** GDPR consent records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Consent ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL | Patient ID |
| consentType | varchar(50) | NOT NULL | Consent type |
| consentGiven | boolean | NOT NULL | Consent status |
| consentDate | timestamp | NOT NULL, DEFAULT now() | Consent date |
| withdrawnDate | timestamp | | Withdrawal date |
| purpose | text | NOT NULL | Purpose |
| dataCategories | jsonb | DEFAULT [] | Data categories |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `gdpr_data_requests`
**Purpose:** GDPR data subject requests (access, erasure, etc.)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Request ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL | Patient ID |
| requestType | varchar(50) | NOT NULL | Type (access, erasure, portability, rectification) |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | Status (pending, in_progress, completed, rejected) |
| requestDate | timestamp | NOT NULL, DEFAULT now() | Request date |
| completionDate | timestamp | | Completion date |
| notes | text | | Notes |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `gdpr_audit_trail`
**Purpose:** GDPR audit trail for data access

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Audit ID |
| organizationId | integer | NOT NULL | Organization ID |
| userId | integer | NOT NULL | User ID |
| patientId | integer | | Patient ID |
| action | varchar(50) | NOT NULL | Action performed |
| dataCategory | varchar(50) | NOT NULL | Data category |
| details | jsonb | DEFAULT {} | Action details |
| ipAddress | text | | IP address |
| timestamp | timestamp | NOT NULL, DEFAULT now() | Action timestamp |

---

### `gdpr_processing_activities`
**Purpose:** GDPR processing activity records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Activity ID |
| organizationId | integer | NOT NULL | Organization ID |
| activityName | text | NOT NULL | Activity name |
| purpose | text | NOT NULL | Processing purpose |
| legalBasis | varchar(50) | NOT NULL | Legal basis |
| dataCategories | jsonb | DEFAULT [] | Data categories |
| recipients | jsonb | DEFAULT [] | Data recipients |
| retentionPeriod | text | NOT NULL | Retention period |
| securityMeasures | text | NOT NULL | Security measures |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

## Chatbot Tables

### `chatbot_configs`
**Purpose:** Chatbot configurations per organization

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Config ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| name | text | NOT NULL, DEFAULT 'Healthcare Assistant' | Chatbot name |
| description | text | DEFAULT 'AI-powered healthcare assistant' | Description |
| isActive | boolean | NOT NULL, DEFAULT true | Active status |
| primaryColor | text | DEFAULT '#4A7DFF' | Primary color |
| welcomeMessage | text | DEFAULT 'Hello! I can help...' | Welcome message |
| appointmentBookingEnabled | boolean | NOT NULL, DEFAULT true | Appointment booking flag |
| prescriptionRequestsEnabled | boolean | NOT NULL, DEFAULT true | Prescription requests flag |
| apiKey | text | NOT NULL | API key |
| embedCode | text | | Embed code |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

### `chatbot_sessions`
**Purpose:** Individual chatbot sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Session ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| configId | integer | NOT NULL, FOREIGN KEY → chatbot_configs.id | Config ID |
| sessionId | text | NOT NULL, UNIQUE | Session identifier |
| visitorId | text | | Visitor ID |
| patientId | integer | FOREIGN KEY → patients.id | Patient ID |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Session status |
| currentIntent | text | | Current intent |
| extractedPatientName | text | | Extracted patient name |
| extractedPhone | text | | Extracted phone |
| extractedEmail | text | | Extracted email |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

### `chatbot_messages`
**Purpose:** Chatbot conversation messages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Message ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| sessionId | integer | NOT NULL, FOREIGN KEY → chatbot_sessions.id | Session ID |
| messageId | text | NOT NULL, UNIQUE | Message identifier |
| sender | varchar(10) | NOT NULL | Sender (user, bot) |
| messageType | varchar(20) | NOT NULL, DEFAULT 'text' | Message type |
| content | text | NOT NULL | Message content |
| intent | text | | Detected intent |
| confidence | real | | Confidence score |
| aiProcessed | boolean | NOT NULL, DEFAULT false | AI processed flag |
| isRead | boolean | NOT NULL, DEFAULT false | Read flag |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `chatbot_analytics`
**Purpose:** Chatbot performance analytics

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Analytics ID |
| organizationId | integer | NOT NULL, FOREIGN KEY → organizations.id | Organization ID |
| configId | integer | NOT NULL, FOREIGN KEY → chatbot_configs.id | Config ID |
| date | timestamp | NOT NULL | Date |
| totalSessions | integer | DEFAULT 0 | Total sessions |
| completedSessions | integer | DEFAULT 0 | Completed sessions |
| totalMessages | integer | DEFAULT 0 | Total messages |
| appointmentsBooked | integer | DEFAULT 0 | Appointments booked |
| prescriptionRequests | integer | DEFAULT 0 | Prescription requests |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

## Additional Tables

### `documents`
**Purpose:** Document storage (forms, letters, reports)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Document ID |
| organizationId | integer | NOT NULL | Organization ID |
| userId | integer | NOT NULL | User ID |
| name | text | NOT NULL | Document name |
| type | varchar(50) | NOT NULL, DEFAULT 'medical_form' | Document type |
| content | text | NOT NULL | HTML content |
| metadata | jsonb | DEFAULT {} | Document metadata |
| isTemplate | boolean | NOT NULL, DEFAULT false | Template flag |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `subscriptions`
**Purpose:** Organization subscription management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Subscription ID |
| organizationId | integer | NOT NULL | Organization ID |
| tier | varchar(20) | NOT NULL | Tier (basic, standard, premium) |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | Status (active, cancelled, expired) |
| billingCycle | varchar(20) | NOT NULL, DEFAULT 'monthly' | Billing cycle |
| price | decimal(10,2) | NOT NULL | Price |
| features | jsonb | DEFAULT {} | Enabled features |
| usageLimits | jsonb | DEFAULT {} | Usage limits |
| currentPeriodStart | timestamp | NOT NULL | Period start |
| currentPeriodEnd | timestamp | NOT NULL | Period end |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `consultations`
**Purpose:** Consultation records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Consultation ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | NOT NULL | Patient ID |
| providerId | integer | NOT NULL | Provider ID |
| type | varchar(50) | NOT NULL | Consultation type |
| chiefComplaint | text | | Chief complaint |
| history | text | | History |
| examination | text | | Examination findings |
| diagnosis | text | | Diagnosis |
| plan | text | | Treatment plan |
| notes | text | | Additional notes |
| status | varchar(20) | NOT NULL, DEFAULT 'draft' | Status (draft, completed) |
| consultationDate | timestamp | NOT NULL, DEFAULT now() | Consultation date |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `symptom_checks`
**Purpose:** AI symptom checker results

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Check ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | integer | | Patient ID |
| symptoms | jsonb | NOT NULL | Symptom list |
| possibleConditions | jsonb | DEFAULT [] | Possible conditions |
| recommendedActions | jsonb | DEFAULT [] | Recommended actions |
| urgencyLevel | varchar(20) | NOT NULL | Urgency (low, medium, high, emergency) |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

---

### `voice_notes`
**Purpose:** Voice documentation records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | varchar | PRIMARY KEY | Note ID |
| organizationId | integer | NOT NULL | Organization ID |
| patientId | varchar | NOT NULL | Patient ID |
| patientName | text | NOT NULL | Patient name |
| providerId | varchar | NOT NULL | Provider ID |
| providerName | text | NOT NULL | Provider name |
| type | varchar(50) | NOT NULL | Type (consultation, procedure_note, clinical_note) |
| status | varchar(20) | NOT NULL, DEFAULT 'completed' | Status |
| recordingDuration | integer | | Duration in seconds |
| transcript | text | | Transcription |
| confidence | real | | Confidence (0-100) |
| medicalTerms | jsonb | DEFAULT [] | Medical terms |
| structuredData | jsonb | DEFAULT {} | Structured data |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | DEFAULT now() | Last update timestamp |

---

### `letter_drafts`
**Purpose:** Draft letters when email sending fails

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Draft ID |
| organizationId | integer | NOT NULL | Organization ID |
| userId | integer | NOT NULL | User ID |
| subject | text | NOT NULL | Letter subject |
| recipient | text | NOT NULL | Recipient |
| doctorEmail | text | | Doctor email |
| location | text | | Location |
| copiedRecipients | text | | CC recipients |
| header | text | | Letter header |
| documentContent | text | NOT NULL | Letter content |
| createdAt | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

---

## Relationships Diagram

### Primary Relationships

```
organizations (1) ----< (*) users
organizations (1) ----< (*) patients
organizations (1) ----< (*) roles
organizations (1) ----< (*) saas_subscriptions
organizations (1) ----< (*) saas_payments
organizations (1) ----< (*) saas_invoices

users (1) ----< (*) medical_records
users (1) ----< (*) appointments
users (1) ----< (*) staff_shifts
users (1) ----< (*) user_document_preferences

patients (1) ----< (*) medical_records
patients (1) ----< (*) appointments
patients (1) ----< (*) prescriptions
patients (1) ----< (*) medical_images
patients (1) ----< (*) clinical_photos
patients (1) ----< (*) lab_results
patients (1) ----< (*) patient_communications
patients (1) ----< (*) muscles_position
patients (1) ----< (*) ai_insights

saas_subscriptions (1) ----< (*) saas_payments
saas_subscriptions (1) ----< (*) saas_invoices
saas_packages (1) ----< (*) saas_subscriptions

invoices (1) ----< (*) payments
invoices (1) ----< (*) claims

inventory_categories (1) ----< (*) inventory_items
inventory_items (1) ----< (*) inventory_batches
inventory_items (1) ----< (*) inventory_stock_movements
inventory_suppliers (1) ----< (*) inventory_purchase_orders
inventory_purchase_orders (1) ----< (*) inventory_purchase_order_items
inventory_sales (1) ----< (*) inventory_sale_items

chatbot_configs (1) ----< (*) chatbot_sessions
chatbot_configs (1) ----< (*) chatbot_analytics
chatbot_sessions (1) ----< (*) chatbot_messages

conversations (1) ----< (*) messages
```

---

## Indexes and Constraints

### Unique Constraints

- `organizations.subdomain` - UNIQUE
- `users.email` per organization
- `saas_owners.username` - UNIQUE
- `saas_owners.email` - UNIQUE
- `saas_packages` - none
- `saas_payments.invoiceNumber` - UNIQUE
- `saas_invoices.invoiceNumber` - UNIQUE
- `invoices.invoiceNumber` - UNIQUE
- `payments.transactionId` - UNIQUE
- `inventory_purchase_orders.poNumber` - UNIQUE
- `inventory_sales.saleNumber` - UNIQUE
- `chatbot_sessions.sessionId` - UNIQUE
- `chatbot_messages.messageId` - UNIQUE
- `user_document_preferences`: UNIQUE INDEX on (userId, organizationId)

### Foreign Key Constraints

All `organizationId` columns reference `organizations.id`  
All `patientId` columns reference `patients.id` (where applicable)  
All `userId` columns reference `users.id` (where applicable)  
All `createdBy` columns reference `users.id`  
Inventory relationships properly linked via foreign keys  
Chatbot tables linked via foreign keys to organizations and configs

---

## Multi-Tenancy Architecture

### Tenant Isolation

**All tables contain `organizationId`** for data isolation  
**Row-Level Security (RLS):** Enforced via Drizzle ORM queries  
**Tenant Middleware:** Automatic organizationId injection  
**Subdomain Routing:** Each organization accessible via unique subdomain

### Special Cases

- **SaaS Owners:** `users` table with `organizationId = 0` and `isSaaSOwner = true`
- **Cross-Tenant Operations:** Blocked by validation middleware
- **Audit Trail:** All sensitive operations logged to `gdpr_audit_trail`

---

## Data Types Summary

| Type | Usage |
|------|-------|
| `serial` | Auto-incrementing primary keys |
| `integer` | Foreign keys, counts, quantities |
| `varchar(n)` | Fixed-length strings (status, types) |
| `text` | Variable-length strings (notes, content) |
| `boolean` | Flags (isActive, isRead, etc.) |
| `timestamp` | Dates and times |
| `date` | Date only (dateOfBirth, etc.) |
| `decimal(p,s)` | Financial amounts (prices, payments) |
| `real` | Floating point (confidence scores) |
| `jsonb` | Structured JSON data (settings, metadata) |
| `text[]` | Arrays of text (flags, working days) |

---

## Schema Statistics

- **Total Tables:** 75+
- **Multi-Tenant Tables:** All (except `saas_owners`)
- **JSONB Columns:** 100+ (flexible data storage)
- **Foreign Key Relationships:** 150+
- **Unique Constraints:** 20+
- **Database Size (Typical):** Scales with data volume

---

## Migrations and Updates

**Migration Tool:** Drizzle Kit  
**Push Command:** `npm run db:push`  
**Force Push:** `npm run db:push --force` (when data loss warnings)  
**Schema File:** `shared/schema.ts`  
**Config File:** `drizzle.config.ts`

---

**End of Database Schema Documentation**
