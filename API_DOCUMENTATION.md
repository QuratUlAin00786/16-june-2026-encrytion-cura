# Cura Healthcare EMR - Complete API Documentation

**Project Name:** Cura Healthcare EMR  
**Version:** 1.0.0  
**Total API Endpoints:** 250+  
**Base URL:** `https://[domain]/api`  
**Authentication:** JWT Bearer Token  

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Health & Status](#2-health--status)
3. [Dashboard](#3-dashboard)
4. [Patients](#4-patients)
5. [Appointments](#5-appointments)
6. [Medical Records](#6-medical-records)
7. [Prescriptions](#7-prescriptions)
8. [Lab Results](#8-lab-results)
9. [Invoices & Billing](#9-invoices--billing)
10. [Notifications](#10-notifications)
11. [Users](#11-users)
12. [Roles & Permissions](#12-roles--permissions)
13. [Organizations](#13-organizations)
14. [GDPR Compliance](#14-gdpr-compliance)
15. [QuickBooks Integration](#15-quickbooks-integration)
16. [Telemedicine (LiveKit)](#16-telemedicine-livekit)
17. [AI Services](#17-ai-services)
18. [Mobile API](#18-mobile-api)
19. [SaaS Administration](#19-saas-administration)
20. [Pricing Management](#20-pricing-management)
21. [Inventory](#21-inventory)
22. [Messaging & Templates](#22-messaging--templates)
23. [Imaging & Radiology](#23-imaging--radiology)
24. [Insurance](#24-insurance)
25. [Symptom Checker](#25-symptom-checker)
26. [Clinic Configuration](#26-clinic-configuration)
27. [Shifts & Scheduling](#27-shifts--scheduling)
28. [File Management](#28-file-management)

---

## Authentication Headers

All authenticated endpoints require:

```
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: <organization_subdomain>
Content-Type: application/json
```

---

## 1. Authentication

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/auth/login` | Tenant-specific login | No | All |
| POST | `/api/auth/universal-login` | Global login (determines tenant) | No | All |
| POST | `/api/auth/forgot-password` | Request password reset | No | All |
| POST | `/api/auth/reset-password` | Reset password with token | No | All |
| GET | `/api/auth/validate` | Validate JWT token | Yes | All |
| PATCH | `/api/user/change-password` | Change current user password | Yes | All |
| POST | `/api/saas/login` | SaaS admin portal login | No | SaaS Admin |

### POST `/api/auth/login`
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "doctor",
    "department": "Cardiology",
    "organizationId": 1
  },
  "organization": {
    "id": 1,
    "name": "Cura Healthcare",
    "subdomain": "cura"
  }
}
```

### POST `/api/auth/universal-login`
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:** Same as `/api/auth/login`

### POST `/api/auth/forgot-password`
**Request Body:**
```json
{
  "email": "user@example.com"
}
```
**Response:**
```json
{
  "success": true,
  "message": "If a matching account exists, a password reset link has been sent."
}
```

### POST `/api/auth/reset-password`
**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

---

## 2. Health & Status

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/health` | Health check | No |
| GET | `/health` | Health check (alt) | No |
| GET | `/healthz` | Kubernetes health | No |
| GET | `/api/status` | Full system status | No |

### GET `/api/health`
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-03T12:00:00.000Z",
  "uptime": 3600,
  "service": "cura-emr",
  "environment": "production"
}
```

---

## 3. Dashboard

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/dashboard/stats` | Get dashboard statistics | Yes | All |
| GET | `/api/dashboard/ai-insights` | Get AI insights | Yes | All |

### GET `/api/dashboard/stats`
**Response:**
```json
{
  "totalPatients": 150,
  "totalAppointments": 45,
  "todayAppointments": 12,
  "pendingLabResults": 8,
  "upcomingAppointments": [...]
}
```

---

## 4. Patients

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/patients` | List all patients | Yes | All |
| GET | `/api/patients/:id` | Get patient by ID | Yes | All |
| POST | `/api/patients` | Create patient | Yes | Admin, Doctor, Nurse, Receptionist |
| PUT | `/api/patients/:id` | Update patient | Yes | Admin, Doctor, Nurse |
| DELETE | `/api/patients/:id` | Delete patient | Yes | Admin |
| GET | `/api/patients/check-email` | Check email availability | Yes | All |
| GET | `/api/patients/:id/records` | Get patient records | Yes | All |
| GET | `/api/patients/:id/prescriptions` | Get patient prescriptions | Yes | All |
| GET | `/api/patients/:id/appointments` | Get patient appointments | Yes | All |
| GET | `/api/patients/:id/lab-results` | Get patient lab results | Yes | All |
| GET | `/api/patients/my-prescriptions` | Get current patient's prescriptions | Yes | Patient |
| GET | `/api/patients/health-score` | Get patient health score | Yes | All |

### GET `/api/patients`
**Query Parameters:**
- `search` (optional): Search by name, email, or phone
- `status` (optional): Filter by status (active/inactive)

**Response:**
```json
[
  {
    "id": 1,
    "patientId": "P001",
    "firstName": "John",
    "lastName": "Patient",
    "email": "john@example.com",
    "phone": "+44 7700 900123",
    "dateOfBirth": "1990-01-15",
    "nhsNumber": "123 456 7890",
    "address": {...},
    "medicalHistory": {...},
    "riskLevel": "low",
    "isActive": true
  }
]
```

### POST `/api/patients`
**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Patient",
  "email": "john@example.com",
  "phone": "+44 7700 900123",
  "dateOfBirth": "1990-01-15",
  "nhsNumber": "123 456 7890",
  "genderAtBirth": "Male",
  "address": {
    "street": "123 Main St",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "UK"
  },
  "emergencyContact": {
    "name": "Jane Patient",
    "relationship": "Spouse",
    "phone": "+44 7700 900124"
  }
}
```

---

## 5. Appointments

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/appointments` | List appointments | Yes | All |
| GET | `/api/appointments/:id` | Get appointment by ID | Yes | All |
| POST | `/api/appointments` | Create appointment | Yes | All |
| PUT | `/api/appointments/:id` | Update appointment | Yes | All |
| PATCH | `/api/appointments/:id` | Partial update | Yes | All |
| DELETE | `/api/appointments/:id` | Delete appointment | Yes | Admin |
| GET | `/api/appointments/available-slots` | Get available slots | Yes | All |
| GET | `/api/appointments/sse` | Real-time updates (SSE) | Yes | All |
| POST | `/api/appointments/:id/confirm` | Confirm appointment | Yes | All |
| POST | `/api/appointments/:id/cancel` | Cancel appointment | Yes | All |
| POST | `/api/appointments/:id/complete` | Complete appointment | Yes | Doctor, Nurse |

### GET `/api/appointments`
**Query Parameters:**
- `date` (optional): Filter by date (YYYY-MM-DD)
- `providerId` (optional): Filter by provider
- `patientId` (optional): Filter by patient
- `status` (optional): scheduled, confirmed, completed, cancelled

**Response:**
```json
[
  {
    "id": 1,
    "appointmentId": "APT1234567890",
    "patientId": 1,
    "providerId": 5,
    "title": "Follow-up Consultation",
    "scheduledAt": "2025-12-03T10:00:00.000Z",
    "duration": 30,
    "status": "scheduled",
    "type": "consultation",
    "isVirtual": false,
    "location": "Room 101"
  }
]
```

### POST `/api/appointments`
**Request Body:**
```json
{
  "patientId": 1,
  "providerId": 5,
  "title": "Follow-up Consultation",
  "scheduledAt": "2025-12-03T10:00:00.000Z",
  "duration": 30,
  "type": "consultation",
  "isVirtual": false,
  "location": "Room 101",
  "description": "Follow-up for previous treatment"
}
```

---

## 6. Medical Records

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/medical-records` | List medical records | Yes | All |
| GET | `/api/medical-records/:id` | Get record by ID | Yes | All |
| POST | `/api/medical-records` | Create record | Yes | Doctor, Nurse |
| PUT | `/api/medical-records/:id` | Update record | Yes | Doctor, Nurse |
| DELETE | `/api/medical-records/:id` | Delete record | Yes | Admin |
| POST | `/api/medical-records/:id/e-sign` | E-sign record | Yes | Doctor |

### POST `/api/medical-records`
**Request Body:**
```json
{
  "patientId": 1,
  "type": "consultation",
  "diagnosis": "Hypertension",
  "notes": "Patient presented with elevated blood pressure...",
  "treatment": "Lifestyle modifications and medication",
  "vitalSigns": {
    "bloodPressure": "140/90",
    "heartRate": 72,
    "temperature": 36.6,
    "weight": 75
  }
}
```

---

## 7. Prescriptions

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/prescriptions` | List prescriptions | Yes | All |
| GET | `/api/prescriptions/:id` | Get prescription by ID | Yes | All |
| GET | `/api/prescriptions/patient/:patientId` | Get patient prescriptions | Yes | All |
| POST | `/api/prescriptions` | Create prescription | Yes | Doctor |
| PATCH | `/api/prescriptions/:id` | Update prescription | Yes | Doctor, Nurse |
| DELETE | `/api/prescriptions/:id` | Delete prescription | Yes | Doctor, Admin |
| POST | `/api/prescriptions/:id/send-to-pharmacy` | Send to pharmacy | Yes | Doctor, Nurse |
| POST | `/api/prescriptions/:id/e-sign` | E-sign prescription | Yes | Doctor |

### POST `/api/prescriptions`
**Request Body:**
```json
{
  "patientId": 1,
  "medications": [
    {
      "name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "quantity": 30,
      "instructions": "Take with food"
    }
  ],
  "notes": "Start medication and monitor BP"
}
```

---

## 8. Lab Results

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/lab-results` | List lab results | Yes | All |
| GET | `/api/lab-results/:id` | Get lab result by ID | Yes | All |
| POST | `/api/lab-results` | Create lab order | Yes | Doctor, Nurse |
| PUT | `/api/lab-results/:id` | Update lab result | Yes | Lab Tech |
| DELETE | `/api/lab-results/:id` | Delete lab result | Yes | Admin |
| PATCH | `/api/lab-results/:id/toggle-sample-collected` | Toggle sample status | Yes | Sample Taker, Lab Tech |
| POST | `/api/lab-results/:id/collect-sample` | Mark sample collected | Yes | Sample Taker, Lab Tech |
| POST | `/api/lab-results/:id/generate-pdf` | Generate PDF report | Yes | All (except Patient) |
| POST | `/api/lab-results/:id/e-sign` | E-sign results | Yes | Doctor |
| GET | `/api/lab-results/with-invoices` | Lab results with invoices | Yes | All |
| GET | `/api/lab-technician/tests` | Tests for lab technician | Yes | Lab Tech, Admin |

### POST `/api/lab-results`
**Request Body:**
```json
{
  "patientId": 1,
  "testType": "Blood Panel",
  "orderedBy": 5,
  "urgency": "routine",
  "notes": "Fasting required"
}
```

---

## 9. Invoices & Billing

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/invoices` | List invoices | Yes | All |
| GET | `/api/invoices/:id` | Get invoice by ID | Yes | All |
| POST | `/api/invoices` | Create invoice | Yes | Admin, Receptionist |
| PATCH | `/api/invoices/:id` | Update invoice | Yes | Admin |
| DELETE | `/api/invoices/:id` | Delete invoice | Yes | Admin |
| GET | `/api/invoices/with-services` | Invoices with services | Yes | All |
| GET | `/api/invoices/by-service` | Invoices grouped by service | Yes | All |
| GET | `/api/invoices/paid-lab-results` | Paid lab invoices | Yes | All |
| POST | `/api/invoices/:id/send` | Send invoice to patient | Yes | Admin |
| POST | `/api/invoices/:id/pay` | Mark invoice paid | Yes | Admin |
| POST | `/api/create-payment-intent` | Stripe payment intent | Yes | All |
| GET | `/api/billing-history` | Get billing history | Yes | Admin |
| GET | `/api/billing-history/:paymentId/invoice` | Download invoice PDF | Yes | Admin |
| GET | `/api/billing/search-suggestions` | Billing search suggestions | Yes | All |

### POST `/api/invoices`
**Request Body:**
```json
{
  "patientId": 1,
  "items": [
    {
      "description": "Consultation",
      "quantity": 1,
      "unitPrice": 50.00,
      "total": 50.00
    }
  ],
  "subtotal": 50.00,
  "vat": 10.00,
  "total": 60.00,
  "dueDate": "2025-12-31"
}
```

---

## 10. Notifications

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/notifications` | List notifications | Yes | All |
| GET | `/api/notifications/unread-count` | Get unread count | Yes | All |
| PATCH | `/api/notifications/:id/read` | Mark as read | Yes | All |
| PATCH | `/api/notifications/mark-all-read` | Mark all as read | Yes | All |
| DELETE | `/api/notifications/:id` | Delete notification | Yes | All |
| POST | `/api/notifications/test-sms` | Test SMS notification | Yes | Admin |
| POST | `/api/notifications/test-email` | Test email notification | Yes | Admin |

---

## 11. Users

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/users` | List users | Yes | All |
| GET | `/api/users/:id` | Get user by ID | Yes | Admin |
| POST | `/api/users` | Create user | Yes | Admin |
| PUT | `/api/users/:id` | Update user | Yes | Admin |
| PATCH | `/api/users/:id` | Partial update | Yes | Admin |
| DELETE | `/api/users/:id` | Delete user | Yes | Admin |
| GET | `/api/users/current` | Get current user | Yes | All |
| GET | `/api/users/doctors` | List doctors | Yes | All |
| GET | `/api/users/nurses` | List nurses | Yes | All |
| GET | `/api/users/by-role/:role` | Users by role | Yes | All |

### POST `/api/users`
**Request Body:**
```json
{
  "email": "doctor@example.com",
  "username": "drsmith",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Smith",
  "role": "doctor",
  "department": "Cardiology",
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "workingHours": {
    "start": "09:00",
    "end": "17:00"
  }
}
```

---

## 12. Roles & Permissions

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/roles` | List all roles | Yes | All |
| GET | `/api/roles/:id` | Get role by ID | Yes | Admin |
| POST | `/api/roles` | Create role | Yes | Admin |
| PUT | `/api/roles/:id` | Update role | Yes | Admin |
| DELETE | `/api/roles/:id` | Delete role | Yes | Admin |

---

## 13. Organizations

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/tenant/info` | Get current organization | Yes | All |
| PATCH | `/api/organization/settings` | Update org settings | Yes | Admin |

---

## 14. GDPR Compliance

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/gdpr/consent` | Record consent | Yes | Admin, Patient |
| PATCH | `/api/gdpr/consent/:id/withdraw` | Withdraw consent | Yes | Admin, Patient |
| POST | `/api/gdpr/data-request` | Submit data request | Yes | Admin, Patient |
| GET | `/api/gdpr/patient/:patientId/data-export` | Export patient data | Yes | Admin, Doctor |
| POST | `/api/gdpr/patient/:patientId/erasure` | Request data erasure | Yes | Admin |
| GET | `/api/gdpr/patient/:patientId/consent-status` | Check consent status | Yes | Admin, Doctor, Patient |
| GET | `/api/gdpr/compliance-report` | Generate compliance report | Yes | Admin |

---

## 15. QuickBooks Integration

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/quickbooks/auth/callback` | OAuth callback | No | - |
| GET | `/api/quickbooks/status` | Check connection status | Yes | All (non-patient) |
| POST | `/api/quickbooks/connect` | Initiate connection | Yes | Admin |
| POST | `/api/quickbooks/disconnect` | Disconnect QuickBooks | Yes | Admin |
| GET | `/api/quickbooks/data/company-info` | Get company info | Yes | All (non-patient) |
| GET | `/api/quickbooks/data/invoices` | Get QB invoices | Yes | All (non-patient) |
| GET | `/api/quickbooks/data/profit-loss` | Get P&L report | Yes | All (non-patient) |
| GET | `/api/quickbooks/data/expenses` | Get expenses | Yes | All (non-patient) |
| GET | `/api/quickbooks/data/accounts` | Get chart of accounts | Yes | All (non-patient) |
| GET | `/api/quickbooks/data/customers` | Get customers | Yes | All (non-patient) |

---

## 16. Telemedicine (LiveKit)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/livekit/token` | Get LiveKit access token | Yes | All |
| POST | `/api/livekit/room` | Create LiveKit room | Yes | Doctor, Nurse |
| GET | `/api/livekit/rooms` | List active rooms | Yes | All |
| DELETE | `/api/livekit/room/:roomName` | Close room | Yes | Doctor, Nurse |
| POST | `/api/telemedicine/start-call` | Start video call | Yes | Doctor, Nurse |
| POST | `/api/telemedicine/end-call` | End video call | Yes | Doctor, Nurse |
| POST | `/api/appointments/:id/start-video` | Start appointment video | Yes | All |
| GET | `/api/appointments/:id/video-token` | Get video token | Yes | All |

---

## 17. AI Services

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/ai/generate-treatment-plan` | Generate treatment plan | Yes | Admin, Doctor |
| POST | `/api/ai/generate-insights` | Generate AI insights | Yes | Admin, Doctor |
| POST | `/api/ai/transcribe` | Transcribe audio | Yes | Doctor, Nurse |
| POST | `/api/ai/chat` | AI chat assistant | Yes | All |
| POST | `/api/ai/summarize-record` | Summarize medical record | Yes | Doctor |

---

## 18. Mobile API

### Doctor Mobile Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/mobile/doctor/dashboard` | Doctor dashboard | Yes | Doctor |
| GET | `/api/mobile/doctor/patients` | Doctor's patients | Yes | Doctor, Nurse |
| GET | `/api/mobile/doctor/appointments` | Doctor's appointments | Yes | Doctor, Nurse |
| POST | `/api/mobile/doctor/appointments/:id/accept` | Accept appointment | Yes | Doctor |
| POST | `/api/mobile/doctor/appointments/:id/reject` | Reject appointment | Yes | Doctor |
| GET | `/api/mobile/doctor/prescriptions` | Doctor's prescriptions | Yes | Doctor, Nurse |
| POST | `/api/mobile/doctor/prescriptions` | Create prescription | Yes | Doctor |

### Patient Mobile Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/mobile/patient/dashboard` | Patient dashboard | Yes | Patient |
| GET | `/api/mobile/patient/appointments` | Patient appointments | Yes | Patient |
| POST | `/api/mobile/patient/appointments` | Book appointment | Yes | Patient |
| DELETE | `/api/mobile/patient/appointments/:id` | Cancel appointment | Yes | Patient |
| GET | `/api/mobile/patient/prescriptions` | Patient prescriptions | Yes | Patient |
| GET | `/api/mobile/patient/medical-records` | Patient records | Yes | Patient |
| GET | `/api/mobile/patient/profile` | Patient profile | Yes | Patient |
| GET | `/api/mobile/doctors` | Available doctors | Yes | Patient |
| POST | `/api/mobile/video/start-consultation` | Start video consult | Yes | Patient |

---

## 19. SaaS Administration

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/saas/login` | SaaS admin login | No | SaaS Admin |
| GET | `/api/saas/debug` | Debug information | No | - |
| GET | `/api/saas/dashboard` | SaaS dashboard stats | Yes | SaaS Admin |
| GET | `/api/saas/organizations` | List organizations | Yes | SaaS Admin |
| POST | `/api/saas/organizations` | Create organization | Yes | SaaS Admin |
| PUT | `/api/saas/organizations/:id` | Update organization | Yes | SaaS Admin |
| DELETE | `/api/saas/organizations/:id` | Delete organization | Yes | SaaS Admin |
| GET | `/api/saas/subscriptions` | List subscriptions | Yes | SaaS Admin |
| POST | `/api/saas/subscriptions` | Create subscription | Yes | SaaS Admin |
| PATCH | `/api/saas/subscriptions/:id` | Update subscription | Yes | SaaS Admin |
| GET | `/api/saas/packages` | List packages | Yes | SaaS Admin |
| POST | `/api/saas/packages` | Create package | Yes | SaaS Admin |
| PUT | `/api/saas/packages/:id` | Update package | Yes | SaaS Admin |
| DELETE | `/api/saas/packages/:id` | Delete package | Yes | SaaS Admin |
| GET | `/api/saas/payments` | List payments | Yes | SaaS Admin |
| POST | `/api/saas/payments` | Record payment | Yes | SaaS Admin |
| GET | `/api/saas/audit-logs` | Audit logs | Yes | SaaS Admin |
| GET | `/api/website/packages` | Public packages list | No | - |

---

## 20. Pricing Management

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/pricing/doctors-fees` | List doctor fees | Yes | Admin |
| GET | `/api/pricing/doctors-fees/:id` | Get fee by ID | Yes | Admin |
| POST | `/api/pricing/doctors-fees` | Create fee | Yes | Admin |
| PATCH | `/api/pricing/doctors-fees/:id` | Update fee | Yes | Admin |
| DELETE | `/api/pricing/doctors-fees/:id` | Delete fee | Yes | Admin |
| GET | `/api/pricing/lab-tests` | List lab test prices | Yes | Admin, Doctor |
| GET | `/api/pricing/lab-tests/:id` | Get test price by ID | Yes | Admin, Doctor |
| POST | `/api/pricing/lab-tests` | Create test price | Yes | Admin |
| PATCH | `/api/pricing/lab-tests/:id` | Update test price | Yes | Admin |
| DELETE | `/api/pricing/lab-tests/:id` | Delete test price | Yes | Admin |
| GET | `/api/pricing/imaging` | List imaging prices | Yes | All |
| GET | `/api/pricing/imaging/:id` | Get imaging price | Yes | All |
| POST | `/api/pricing/imaging` | Create imaging price | Yes | Admin |
| PATCH | `/api/pricing/imaging/:id` | Update imaging price | Yes | Admin |
| DELETE | `/api/pricing/imaging/:id` | Delete imaging price | Yes | Admin |

---

## 21. Inventory

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/inventory` | List inventory items | Yes | Admin, Pharmacist |
| GET | `/api/inventory/:id` | Get item by ID | Yes | Admin, Pharmacist |
| POST | `/api/inventory` | Add inventory item | Yes | Admin, Pharmacist |
| PUT | `/api/inventory/:id` | Update item | Yes | Admin, Pharmacist |
| DELETE | `/api/inventory/:id` | Delete item | Yes | Admin |
| GET | `/api/inventory/low-stock` | Low stock alerts | Yes | Admin, Pharmacist |
| POST | `/api/inventory/:id/restock` | Restock item | Yes | Admin, Pharmacist |

---

## 22. Messaging & Templates

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/message-templates` | List templates | Yes | All |
| GET | `/api/message-templates/:id` | Get template by ID | Yes | All |
| POST | `/api/message-templates` | Create template | Yes | Admin |
| PUT | `/api/message-templates/:id` | Update template | Yes | Admin |
| DELETE | `/api/message-templates/:id` | Delete template | Yes | Admin |
| POST | `/api/messages/send` | Send message | Yes | All |
| POST | `/api/messages/send-bulk` | Send bulk messages | Yes | Admin |

---

## 23. Imaging & Radiology

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/medical-images` | List imaging orders | Yes | All |
| GET | `/api/medical-images/:id` | Get imaging order | Yes | All |
| POST | `/api/medical-images` | Create imaging order | Yes | Doctor |
| PUT | `/api/medical-images/:id` | Update order | Yes | Doctor, Radiologist |
| DELETE | `/api/medical-images/:id` | Delete order | Yes | Admin |
| POST | `/api/medical-images/:id/upload` | Upload image file | Yes | Radiologist |
| POST | `/api/medical-images/:id/report` | Add report | Yes | Radiologist |
| POST | `/api/medical-images/:id/e-sign` | E-sign report | Yes | Radiologist |

---

## 24. Insurance

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/insurance/submit-claim` | Submit insurance claim | Yes | All |
| POST | `/api/insurance/record-payment` | Record insurance payment | Yes | All |
| GET | `/api/insurance/payments/:invoiceId` | Get payments by invoice | Yes | All |
| GET | `/api/insurance/verification/:patientId` | Verify insurance | Yes | All |

---

## 25. Symptom Checker

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/symptom-checker/analyze` | Analyze symptoms (AI) | Yes | All |
| GET | `/api/symptom-checker/history` | Get analysis history | Yes | All |

### POST `/api/symptom-checker/analyze`
**Request Body:**
```json
{
  "symptoms": ["headache", "fever", "fatigue"],
  "duration": "3 days",
  "severity": "moderate",
  "additionalNotes": "Started after travel"
}
```
**Response:**
```json
{
  "analysis": {
    "possibleConditions": [...],
    "recommendedActions": [...],
    "urgencyLevel": "moderate",
    "disclaimer": "This is not a diagnosis..."
  }
}
```

---

## 26. Clinic Configuration

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/clinic-headers` | Get clinic headers | Yes | All |
| POST | `/api/clinic-headers` | Create/update headers | Yes | Admin |
| GET | `/api/clinic-footers` | Get clinic footers | Yes | All |
| POST | `/api/clinic-footers` | Create/update footers | Yes | Admin |

---

## 27. Shifts & Scheduling

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/shifts` | List all shifts | Yes | Admin |
| GET | `/api/shifts/staff/:staffId` | Shifts by staff | Yes | Admin |
| GET | `/api/default-shifts` | List default shifts | Yes | All |
| GET | `/api/default-shifts/:userId` | User's default shifts | Yes | All |
| PATCH | `/api/default-shifts/:userId` | Update default shifts | Yes | Admin |
| POST | `/api/default-shifts/initialize` | Initialize shifts | Yes | Admin |
| DELETE | `/api/default-shifts/all` | Delete all shifts | Yes | Admin |
| DELETE | `/api/default-shifts/:userId` | Delete user shifts | Yes | Admin |

---

## 28. File Management

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/upload` | Upload file | Yes | All |
| GET | `/api/files/:id` | Get file | Yes | All |
| GET | `/api/files/:id/exists` | Check file exists | Yes | All |
| DELETE | `/api/files/:id` | Delete file | Yes | Admin |
| GET | `/uploads/*` | Serve static files | No | - |

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description",
  "details": "Additional details (development only)"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

## WebSocket Endpoints

### Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client → Server | Establish connection |
| `add-user` | Client → Server | Register user presence |
| `remove-user` | Client → Server | Unregister user |
| `online-users` | Server → Client | Online users list |
| `incoming-call` | Server → Client | Incoming video call |
| `call-accepted` | Server → Client | Call was accepted |
| `call-rejected` | Server → Client | Call was rejected |
| `call-ended` | Server → Client | Call ended |
| `notification` | Server → Client | New notification |
| `appointment-update` | Server → Client | Appointment changed |

---

## Rate Limiting

- **Authentication endpoints:** 5 requests per minute
- **General API:** 100 requests per minute
- **File uploads:** 10 requests per minute

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `SAAS_JWT_SECRET` | SaaS portal JWT secret | Yes |
| `SESSION_SECRET` | Session encryption secret | Yes |
| `STRIPE_SECRET_KEY` | Stripe API secret key | No |
| `OPENAI_API_KEY` | OpenAI API key | No |
| `LIVEKIT_API_KEY` | LiveKit API key | No |
| `LIVEKIT_API_SECRET` | LiveKit API secret | No |
| `QUICKBOOKS_CLIENT_ID` | QuickBooks OAuth client ID | No |
| `QUICKBOOKS_CLIENT_SECRET` | QuickBooks OAuth secret | No |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | No |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | No |
| `SENDGRID_API_KEY` | SendGrid API key | No |

---

*Generated: December 3, 2025*  
*Cura Healthcare EMR - API Documentation v1.0*
