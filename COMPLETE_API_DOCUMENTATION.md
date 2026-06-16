# Cura Healthcare EMR - Complete API Documentation

**Project Name:** Cura Healthcare EMR  
**Version:** 1.0.0  
**Total API Endpoints:** 250+  
**Base URL:** `https://[subdomain].curaemr.ai/api` or `https://[domain]/api`  
**Authentication:** JWT Bearer Token  
**Generated:** December 2025  

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
12. [Organizations](#12-organizations)
13. [GDPR Compliance](#13-gdpr-compliance)
14. [QuickBooks Integration](#14-quickbooks-integration)
15. [Telemedicine (LiveKit)](#15-telemedicine-livekit)
16. [AI Services](#16-ai-services)
17. [Mobile API](#17-mobile-api)
18. [SaaS Administration](#18-saas-administration)
19. [Pricing Management](#19-pricing-management)
20. [Symptom Checker](#20-symptom-checker)
21. [Insurance](#21-insurance)
22. [Clinic Configuration](#22-clinic-configuration)
23. [Shifts & Scheduling](#23-shifts--scheduling)
24. [File Management](#24-file-management)
25. [Messaging & Templates](#25-messaging--templates)
26. [Imaging & Radiology](#26-imaging--radiology)

---

## Common Headers

### Request Headers (All Authenticated Endpoints)

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Tenant-Subdomain: cura
Accept: application/json
```

### Response Headers

```
Content-Type: application/json
X-Request-Id: uuid-v4-request-id
Cache-Control: no-store, no-cache, must-revalidate
```

---

## 1. Authentication

### POST `/api/auth/login`

**Description:** Tenant-specific login for organization users.

**Authentication Required:** No  
**Roles:** All  

**Request Headers:**
```
Content-Type: application/json
X-Tenant-Subdomain: cura
```

**Request Body:**
```json
{
  "email": "doctor@cura.com",
  "password": "doctor123"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwib3JnYW5pemF0aW9uSWQiOjMsImVtYWlsIjoiZG9jdG9yQGN1cmEuY29tIiwicm9sZSI6ImRvY3RvciIsImlhdCI6MTczMzIzNDU2NywiZXhwIjoxNzMzMzIwOTY3fQ.abc123signature",
  "user": {
    "id": 5,
    "email": "doctor@cura.com",
    "firstName": "Dr. Sarah",
    "lastName": "Johnson",
    "role": "doctor",
    "department": "General Medicine",
    "organizationId": 3,
    "medicalSpecialtyCategory": "Internal Medicine",
    "subSpecialty": "Cardiology"
  },
  "organization": {
    "id": 3,
    "name": "Cura Healthcare",
    "subdomain": "cura"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Email and password are required"
}
```

---

### POST `/api/auth/universal-login`

**Description:** Global login that determines the tenant from the user's organization. Useful when subdomain is unknown.

**Authentication Required:** No  
**Roles:** All  

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "admin@cura.com",
  "password": "admin123"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@cura.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin",
    "department": null,
    "organizationId": 3
  },
  "organization": {
    "id": 3,
    "name": "Cura Healthcare",
    "subdomain": "cura"
  }
}
```

---

### POST `/api/auth/forgot-password`

**Description:** Request a password reset email.

**Authentication Required:** No  
**Roles:** All  

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "If a matching account exists, a password reset link has been sent."
}
```

---

### POST `/api/auth/reset-password`

**Description:** Reset password using the token received via email.

**Authentication Required:** No  
**Roles:** All  

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "abc123def456-reset-token-from-email",
  "newPassword": "newSecurePassword123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid or expired reset token"
}
```

---

### GET `/api/auth/validate`

**Description:** Validate JWT token and return current user info.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": 5,
    "email": "doctor@cura.com",
    "firstName": "Dr. Sarah",
    "lastName": "Johnson",
    "role": "doctor",
    "organizationId": 3
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid or expired token"
}
```

---

### PATCH `/api/user/change-password`

**Description:** Change the current user's password.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully. A confirmation email has been sent to your registered email address."
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Current password is incorrect"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "New password must be at least 8 characters long"
}
```

---

### POST `/api/saas/login`

**Description:** SaaS admin portal login for platform administrators.

**Authentication Required:** No  
**Roles:** SaaS Admin only  

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "saas_admin@curaemr.ai",
  "password": "saas_admin_password"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "saas_admin@curaemr.ai",
    "firstName": "SaaS",
    "lastName": "Administrator",
    "role": "admin",
    "isSaaSOwner": true
  },
  "isSaaSOwner": true
}
```

---

## 2. Health & Status

### GET `/api/health`

**Description:** Primary health check endpoint for deployment monitoring.

**Authentication Required:** No  

**Request Headers:**
```
Accept: application/json
```

**Success Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-12-03T12:00:00.000Z",
  "uptime": 3600.5,
  "service": "cura-emr",
  "environment": "production"
}
```

---

### GET `/api/status`

**Description:** Full system status with database connectivity check.

**Authentication Required:** No  

**Request Headers:**
```
Accept: application/json
```

**Success Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-03T12:00:00.000Z",
  "services": {
    "database": "connected",
    "cache": "available",
    "email": "configured"
  },
  "version": "1.0.0"
}
```

---

## 3. Dashboard

### GET `/api/dashboard/stats`

**Description:** Get dashboard statistics for the current organization.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Tenant-Subdomain: cura
```

**Success Response (200 OK):**
```json
{
  "totalPatients": 156,
  "activePatients": 142,
  "totalAppointments": 1250,
  "todayAppointments": 24,
  "pendingAppointments": 18,
  "completedAppointments": 6,
  "pendingLabResults": 12,
  "totalPrescriptions": 890,
  "activePrescriptions": 234,
  "totalRevenue": "125430.50",
  "monthlyRevenue": "15230.00",
  "upcomingAppointments": [
    {
      "id": 45,
      "patientName": "John Smith",
      "scheduledAt": "2025-12-03T14:00:00.000Z",
      "type": "consultation",
      "providerName": "Dr. Sarah Johnson"
    }
  ]
}
```

---

### GET `/api/dashboard/ai-insights`

**Description:** Get AI-generated insights for the organization.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Number of insights to return (default: 10) |

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "patientId": 5,
    "type": "preventive",
    "title": "Preventive Care Recommendations",
    "description": "Patient is due for routine blood pressure monitoring based on age and risk factors.",
    "severity": "low",
    "actionRequired": false,
    "confidence": "78",
    "status": "active",
    "createdAt": "2025-12-03T10:00:00.000Z"
  },
  {
    "id": 2,
    "patientId": 8,
    "type": "medication",
    "title": "Drug Interaction Alert",
    "description": "Potential interaction detected between current medications.",
    "severity": "high",
    "actionRequired": true,
    "confidence": "92",
    "status": "active",
    "createdAt": "2025-12-03T09:30:00.000Z"
  }
]
```

---

## 4. Patients

### GET `/api/patients`

**Description:** List all patients for the organization.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Tenant-Subdomain: cura
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Maximum results (default: 50) |
| isActive | boolean | No | Filter by active status |
| search | string | No | Search by name, email, or phone |

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "patientId": "P000001",
    "userId": 10,
    "firstName": "John",
    "lastName": "Patient",
    "email": "john.patient@email.com",
    "phone": "+44 7700 900123",
    "dateOfBirth": "1985-06-15",
    "genderAtBirth": "Male",
    "nhsNumber": "123 456 7890",
    "address": {
      "street": "123 High Street",
      "city": "London",
      "postcode": "SW1A 1AA",
      "country": "United Kingdom"
    },
    "emergencyContact": {
      "name": "Jane Patient",
      "relationship": "Spouse",
      "phone": "+44 7700 900124"
    },
    "insuranceInfo": {
      "provider": "BUPA",
      "policyNumber": "POL123456",
      "groupNumber": "GRP789",
      "planType": "Premium",
      "isActive": true
    },
    "medicalHistory": {
      "allergies": ["Penicillin", "Peanuts"],
      "chronicConditions": ["Hypertension", "Type 2 Diabetes"],
      "medications": ["Metformin 500mg", "Lisinopril 10mg"],
      "familyHistory": {
        "father": ["Heart Disease"],
        "mother": ["Diabetes"],
        "siblings": [],
        "grandparents": ["Stroke"]
      },
      "socialHistory": {
        "smoking": {"status": "former", "quitDate": "2020-01-01"},
        "alcohol": {"status": "occasional", "drinksPerWeek": 3},
        "occupation": "Software Engineer"
      },
      "immunizations": [
        {
          "id": "imm1",
          "vaccine": "COVID-19 Pfizer",
          "date": "2021-03-15",
          "provider": "NHS"
        }
      ]
    },
    "flags": ["follow-up:high:Diabetes monitoring required"],
    "riskLevel": "medium",
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-12-01T14:30:00.000Z"
  }
]
```

---

### GET `/api/patients/:id`

**Description:** Get a specific patient by ID with AI insights.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Patient ID |

**Success Response (200 OK):**
```json
{
  "id": 1,
  "patientId": "P000001",
  "userId": 10,
  "firstName": "John",
  "lastName": "Patient",
  "email": "john.patient@email.com",
  "phone": "+44 7700 900123",
  "dateOfBirth": "1985-06-15",
  "genderAtBirth": "Male",
  "nhsNumber": "123 456 7890",
  "address": {
    "street": "123 High Street",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "United Kingdom"
  },
  "emergencyContact": {
    "name": "Jane Patient",
    "relationship": "Spouse",
    "phone": "+44 7700 900124"
  },
  "insuranceInfo": {
    "provider": "BUPA",
    "policyNumber": "POL123456"
  },
  "medicalHistory": {
    "allergies": ["Penicillin"],
    "chronicConditions": ["Hypertension"],
    "medications": ["Lisinopril 10mg"]
  },
  "flags": [],
  "riskLevel": "low",
  "isActive": true,
  "aiInsights": [
    {
      "id": 1,
      "type": "preventive",
      "title": "Annual Health Check Due",
      "description": "Patient is due for annual health screening.",
      "severity": "low",
      "confidence": "85"
    }
  ],
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Patient not found"
}
```

---

### POST `/api/patients`

**Description:** Create a new patient record with linked user account.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor, Nurse, Receptionist  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Tenant-Subdomain: cura
```

**Request Body:**
```json
{
  "firstName": "Alice",
  "lastName": "Williams",
  "dateOfBirth": "1990-03-25",
  "genderAtBirth": "Female",
  "email": "alice.williams@email.com",
  "phone": "+44 7700 900456",
  "nhsNumber": "987 654 3210",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Manchester",
    "postcode": "M1 2AB",
    "country": "United Kingdom"
  },
  "emergencyContact": {
    "name": "Bob Williams",
    "relationship": "Brother",
    "phone": "+44 7700 900789"
  },
  "insuranceInfo": {
    "provider": "AXA Health",
    "policyNumber": "AXA789012",
    "groupNumber": "GRP456",
    "planType": "Gold",
    "effectiveDate": "2025-01-01",
    "expirationDate": "2025-12-31",
    "copay": 20,
    "deductible": 500,
    "isActive": true
  },
  "medicalHistory": {
    "allergies": ["Sulfa drugs"],
    "chronicConditions": ["Asthma"],
    "medications": ["Ventolin inhaler"],
    "familyHistory": {
      "father": [],
      "mother": ["Breast Cancer"],
      "siblings": [],
      "grandparents": []
    },
    "socialHistory": {
      "smoking": {"status": "never"},
      "alcohol": {"status": "occasional"},
      "occupation": "Teacher"
    }
  }
}
```

**Success Response (201 Created):**
```json
{
  "id": 15,
  "patientId": "P000015",
  "userId": 25,
  "firstName": "Alice",
  "lastName": "Williams",
  "email": "alice.williams@email.com",
  "phone": "+44 7700 900456",
  "dateOfBirth": "1990-03-25T00:00:00.000Z",
  "genderAtBirth": "Female",
  "nhsNumber": "987 654 3210",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Manchester",
    "postcode": "M1 2AB",
    "country": "United Kingdom"
  },
  "emergencyContact": {
    "name": "Bob Williams",
    "relationship": "Brother",
    "phone": "+44 7700 900789"
  },
  "insuranceInfo": {
    "provider": "AXA Health",
    "policyNumber": "AXA789012"
  },
  "medicalHistory": {
    "allergies": ["Sulfa drugs"],
    "chronicConditions": ["Asthma"],
    "medications": ["Ventolin inhaler"]
  },
  "isActive": true,
  "organizationId": 3,
  "createdAt": "2025-12-03T12:00:00.000Z"
}
```

---

### PUT `/api/patients/:id`

**Description:** Update an existing patient record.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor, Nurse  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Patient ID |

**Request Body:**
```json
{
  "phone": "+44 7700 900999",
  "address": {
    "street": "789 New Road",
    "city": "Birmingham",
    "postcode": "B1 1AA",
    "country": "United Kingdom"
  },
  "emergencyContact": {
    "name": "Charlie Williams",
    "relationship": "Father",
    "phone": "+44 7700 900111"
  }
}
```

**Success Response (200 OK):**
```json
{
  "id": 15,
  "patientId": "P000015",
  "firstName": "Alice",
  "lastName": "Williams",
  "email": "alice.williams@email.com",
  "phone": "+44 7700 900999",
  "address": {
    "street": "789 New Road",
    "city": "Birmingham",
    "postcode": "B1 1AA",
    "country": "United Kingdom"
  },
  "updatedAt": "2025-12-03T14:30:00.000Z"
}
```

---

### DELETE `/api/patients/:id`

**Description:** Delete a patient record and all related data.

**Authentication Required:** Yes  
**Roles:** Admin only  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Patient ID |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Patient deleted successfully"
}
```

---

### GET `/api/patients/check-email`

**Description:** Check if an email is available for new patient registration.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | Email to check |

**Success Response (200 OK):**
```json
{
  "emailAvailable": true,
  "associatedWithAnotherOrg": false
}
```

**When Email Exists:**
```json
{
  "emailAvailable": false,
  "associatedWithAnotherOrg": true
}
```

---

### GET `/api/patients/:id/records`

**Description:** Get all medical records for a patient.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "patientId": 5,
    "providerId": 3,
    "type": "consultation",
    "title": "Annual Check-up",
    "notes": "Patient presents in good health. Routine blood work ordered.",
    "diagnosis": "Healthy - routine examination",
    "treatment": "Continue current medications",
    "vitalSigns": {
      "bloodPressure": "120/80",
      "heartRate": 72,
      "temperature": 36.6,
      "weight": 75,
      "height": 175
    },
    "prescription": {
      "medications": [
        {
          "name": "Lisinopril",
          "dosage": "10mg",
          "frequency": "Once daily",
          "duration": "90 days"
        }
      ]
    },
    "followUpRequired": true,
    "followUpDate": "2026-03-15",
    "createdAt": "2025-12-03T10:00:00.000Z"
  }
]
```

---

### GET `/api/patients/:id/prescriptions`

**Description:** Get all prescriptions for a patient.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 12,
    "prescriptionNumber": "RX-1733234567890-abc1",
    "patientId": 5,
    "doctorId": 3,
    "medicationName": "Lisinopril",
    "dosage": "10mg",
    "frequency": "Once daily",
    "duration": "90 days",
    "instructions": "Take with food",
    "medications": [
      {
        "name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "duration": "90 days",
        "quantity": 90,
        "refillsRemaining": 3,
        "instructions": "Take with food"
      }
    ],
    "diagnosis": "Essential Hypertension",
    "status": "active",
    "pharmacy": {
      "name": "Halo Health Pharmacy",
      "address": "123 Health St, London",
      "phone": "+44 20 1234 5678",
      "email": "pharmacy@halohealth.com"
    },
    "prescribedAt": "2025-12-03T10:00:00.000Z",
    "validUntil": "2026-03-03T10:00:00.000Z"
  }
]
```

---

### GET `/api/patients/:id/lab-results`

**Description:** Get all lab results for a patient.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 8,
    "testId": "LAB1733234567890ABCDE",
    "patientId": 5,
    "testType": "Complete Blood Count (CBC)",
    "orderedBy": 3,
    "doctorName": "Dr. Sarah Johnson",
    "priority": "routine",
    "status": "completed",
    "reportStatus": "Results Available",
    "Sample_Collected": true,
    "Lab_Report_Generated": true,
    "results": {
      "hemoglobin": {"value": 14.5, "unit": "g/dL", "reference": "12.0-17.5", "flag": "normal"},
      "whiteBloodCells": {"value": 7.2, "unit": "K/uL", "reference": "4.5-11.0", "flag": "normal"},
      "platelets": {"value": 250, "unit": "K/uL", "reference": "150-400", "flag": "normal"}
    },
    "orderedAt": "2025-12-01T09:00:00.000Z",
    "completedAt": "2025-12-02T14:30:00.000Z"
  }
]
```

---

### GET `/api/patients/my-prescriptions`

**Description:** Get prescriptions for the currently authenticated patient.

**Authentication Required:** Yes  
**Roles:** Patient only  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "prescriptions": [
    {
      "id": 12,
      "prescriptionNumber": "RX-1733234567890-abc1",
      "medicationName": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "status": "active"
    }
  ],
  "totalCount": 1,
  "patientId": 5
}
```

---

### GET `/api/patients/health-score`

**Description:** Calculate and return health score for the authenticated patient.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "overallScore": 78,
  "categories": {
    "vitals": 85,
    "lifestyle": 72,
    "preventiveCare": 80,
    "chronicConditionManagement": 75
  },
  "recommendations": [
    "Schedule annual flu vaccination",
    "Increase physical activity to 150 minutes per week"
  ],
  "lastUpdated": "2025-12-03T12:00:00.000Z"
}
```

---

### POST `/api/patients/:id/flags`

**Description:** Add a flag/alert to a patient record.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse, Receptionist, Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "medical_alert",
  "reason": "Patient requires wheelchair access",
  "severity": "medium"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "medical_alert flag (medium priority) added to John Patient",
  "patientId": 5,
  "flagType": "medical_alert",
  "priority": "medium",
  "reason": "Patient requires wheelchair access",
  "totalFlags": 2,
  "flags": [
    "follow-up:high:Diabetes monitoring required",
    "medical_alert:medium:Patient requires wheelchair access"
  ]
}
```

---

### POST `/api/patients/:id/send-reminder`

**Description:** Send a reminder to a patient via SMS, email, or system notification.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse, Receptionist, Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "appointment_reminder",
  "message": "Reminder: You have an appointment tomorrow at 10:00 AM with Dr. Johnson.",
  "method": "sms"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "SMS reminder successfully sent to John Patient",
  "patientId": 5,
  "reminderType": "appointment_reminder",
  "messageSent": true,
  "messageDetails": {
    "sid": "SM1234567890abcdef",
    "status": "sent"
  },
  "communicationId": 45
}
```

---

## 5. Appointments

### GET `/api/appointments`

**Description:** List all appointments for the organization.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Tenant-Subdomain: cura
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string | No | Filter by date (YYYY-MM-DD) |
| providerId | number | No | Filter by provider |
| patientId | number | No | Filter by patient |
| status | string | No | scheduled, confirmed, completed, cancelled, no_show |

**Success Response (200 OK):**
```json
[
  {
    "id": 45,
    "appointmentId": "APT1733234567890P5AUTO",
    "patientId": 5,
    "providerId": 3,
    "organizationId": 3,
    "title": "Follow-up Consultation",
    "description": "Follow-up for blood pressure management",
    "type": "follow_up",
    "status": "scheduled",
    "scheduledAt": "2025-12-03T14:00:00.000Z",
    "duration": 30,
    "location": "Room 101",
    "isVirtual": false,
    "assignedRole": "doctor",
    "patient": {
      "id": 5,
      "firstName": "John",
      "lastName": "Patient",
      "email": "john.patient@email.com"
    },
    "provider": {
      "id": 3,
      "firstName": "Dr. Sarah",
      "lastName": "Johnson"
    },
    "createdAt": "2025-12-01T10:00:00.000Z"
  }
]
```

---

### GET `/api/appointments/:id`

**Description:** Get a specific appointment by ID.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "id": 45,
  "appointmentId": "APT1733234567890P5AUTO",
  "patientId": 5,
  "providerId": 3,
  "title": "Follow-up Consultation",
  "description": "Follow-up for blood pressure management",
  "type": "follow_up",
  "status": "scheduled",
  "scheduledAt": "2025-12-03T14:00:00.000Z",
  "duration": 30,
  "location": "Room 101",
  "isVirtual": false
}
```

---

### POST `/api/appointments`

**Description:** Create a new appointment.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse, Receptionist, Admin, Patient  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Tenant-Subdomain: cura
```

**Request Body:**
```json
{
  "patientId": 5,
  "providerId": 3,
  "title": "Annual Check-up",
  "description": "Routine annual health examination",
  "scheduledAt": "2025-12-10T10:00:00.000Z",
  "duration": 45,
  "type": "consultation",
  "location": "Room 102",
  "isVirtual": false,
  "department": "General Medicine",
  "notes": "Patient requested morning appointment"
}
```

**Success Response (201 Created):**
```json
{
  "id": 46,
  "appointmentId": "APT1733234567890P5AUTO",
  "patientId": 5,
  "providerId": 3,
  "organizationId": 3,
  "title": "Annual Check-up",
  "description": "Routine annual health examination",
  "type": "consultation",
  "status": "scheduled",
  "scheduledAt": "2025-12-10T10:00:00.000Z",
  "duration": 45,
  "location": "Room 102",
  "isVirtual": false,
  "createdAt": "2025-12-03T12:00:00.000Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Provider is already scheduled at this time",
  "type": "appointment_validation_error",
  "timestamp": "2025-12-03T12:00:00.000Z"
}
```

---

### PATCH `/api/appointments/:id`

**Description:** Update an existing appointment.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse, Receptionist, Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "confirmed",
  "scheduledAt": "2025-12-10T11:00:00.000Z",
  "location": "Room 103"
}
```

**Success Response (200 OK):**
```json
{
  "id": 46,
  "appointmentId": "APT1733234567890P5AUTO",
  "status": "confirmed",
  "scheduledAt": "2025-12-10T11:00:00.000Z",
  "location": "Room 103",
  "updatedAt": "2025-12-03T12:30:00.000Z"
}
```

---

### DELETE `/api/appointments/:id`

**Description:** Delete an appointment.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse, Receptionist, Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Appointment deleted successfully"
}
```

---

### GET `/api/appointments/available-slots`

**Description:** Get available appointment slots for a provider.

**Authentication Required:** Yes  
**Roles:** All  

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| providerId | number | Yes | Provider ID |
| date | string | Yes | Date (YYYY-MM-DD) |
| duration | number | No | Slot duration in minutes (default: 30) |

**Success Response (200 OK):**
```json
{
  "providerId": 3,
  "date": "2025-12-10",
  "availableSlots": [
    {"start": "09:00", "end": "09:30"},
    {"start": "09:30", "end": "10:00"},
    {"start": "10:30", "end": "11:00"},
    {"start": "11:00", "end": "11:30"},
    {"start": "14:00", "end": "14:30"},
    {"start": "14:30", "end": "15:00"},
    {"start": "15:00", "end": "15:30"}
  ]
}
```

---

### GET `/api/appointments/sse`

**Description:** Server-Sent Events endpoint for real-time appointment updates.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Response (Event Stream):**
```
event: connected
data: {"clientId":"abc123","timestamp":1733234567890}

event: appointment.created
data: {"type":"appointment.created","data":{"id":47,"patientId":5},"timestamp":1733234600000,"organizationId":3}

event: appointment.updated
data: {"type":"appointment.updated","data":{"id":47,"status":"confirmed"},"timestamp":1733234700000,"organizationId":3}

event: heartbeat
data: {"timestamp":1733234800000}
```

---

### POST `/api/appointments/:id/confirm`

**Description:** Confirm an appointment.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Appointment confirmed",
  "appointment": {
    "id": 46,
    "status": "confirmed"
  }
}
```

---

### POST `/api/appointments/:id/cancel`

**Description:** Cancel an appointment.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Patient requested reschedule"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Appointment cancelled",
  "appointment": {
    "id": 46,
    "status": "cancelled"
  }
}
```

---

### POST `/api/appointments/:id/complete`

**Description:** Mark an appointment as completed.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "notes": "Patient consultation completed. Prescribed medication for blood pressure.",
  "followUpRequired": true,
  "followUpDate": "2025-12-17"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Appointment completed",
  "appointment": {
    "id": 46,
    "status": "completed"
  }
}
```

---

## 6. Medical Records

### GET `/api/medical-records`

**Description:** List all medical records for the organization.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| patientId | number | No | Filter by patient |
| type | string | No | consultation, prescription, lab_result, imaging, vitals |
| limit | number | No | Maximum results |

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "patientId": 5,
    "providerId": 3,
    "organizationId": 3,
    "type": "consultation",
    "recordType": "consultation",
    "title": "Annual Check-up",
    "content": "Patient presents in good health...",
    "notes": "Routine examination completed",
    "diagnosis": "Healthy - no abnormalities",
    "treatment": "Continue current medications",
    "prescription": {
      "medications": []
    },
    "vitalSigns": {
      "bloodPressure": "120/80",
      "heartRate": 72,
      "temperature": 36.6
    },
    "attachments": [],
    "aiSuggestions": {},
    "followUpRequired": false,
    "createdAt": "2025-12-03T10:00:00.000Z"
  }
]
```

---

### POST `/api/patients/:id/records`

**Description:** Create a new medical record for a patient.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse (non-patient roles)  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "consultation",
  "title": "Follow-up Consultation",
  "notes": "Patient reports improved blood pressure readings at home. Continuing current medication regimen.",
  "diagnosis": "Hypertension - well controlled",
  "treatment": "Continue Lisinopril 10mg daily. Review in 3 months.",
  "prescription": {
    "medications": [
      {
        "name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "duration": "90 days",
        "instructions": "Take in the morning with water"
      }
    ]
  },
  "followUpRequired": true,
  "followUpDate": "2026-03-03",
  "referrals": []
}
```

**Success Response (201 Created):**
```json
{
  "id": 25,
  "patientId": 5,
  "providerId": 3,
  "organizationId": 3,
  "type": "consultation",
  "recordType": "consultation",
  "title": "Follow-up Consultation",
  "notes": "Patient reports improved blood pressure readings...",
  "diagnosis": "Hypertension - well controlled",
  "treatment": "Continue Lisinopril 10mg daily...",
  "prescription": {
    "medications": [...]
  },
  "followUpRequired": true,
  "followUpDate": "2026-03-03",
  "createdAt": "2025-12-03T12:00:00.000Z"
}
```

---

### PATCH `/api/patients/:patientId/records/:recordId`

**Description:** Update an existing medical record.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse (non-patient roles)  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "notes": "Updated notes with additional observations",
  "treatment": "Adjusted treatment plan",
  "followUpRequired": true,
  "followUpDate": "2026-02-15"
}
```

**Success Response (200 OK):**
```json
{
  "id": 25,
  "notes": "Updated notes with additional observations",
  "treatment": "Adjusted treatment plan",
  "followUpRequired": true,
  "followUpDate": "2026-02-15",
  "updatedAt": "2025-12-03T14:00:00.000Z"
}
```

---

### DELETE `/api/patients/:patientId/records/:recordId`

**Description:** Delete a medical record.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse (non-patient roles)  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Medical record deleted successfully"
}
```

---

## 7. Prescriptions

### GET `/api/prescriptions`

**Description:** List all prescriptions for the organization.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| patientId | number | No | Filter by patient |
| providerId | number | No | Filter by prescribing doctor |

**Success Response (200 OK):**
```json
[
  {
    "id": 12,
    "prescriptionNumber": "RX-1733234567890-abc1",
    "patientId": 5,
    "doctorId": 3,
    "organizationId": 3,
    "medicationName": "Lisinopril",
    "dosage": "10mg",
    "frequency": "Once daily",
    "duration": "90 days",
    "instructions": "Take with food",
    "medications": [
      {
        "name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "duration": "90 days",
        "quantity": 90,
        "refillsRemaining": 3
      }
    ],
    "diagnosis": "Essential Hypertension",
    "status": "active",
    "pharmacy": {
      "name": "Halo Health Pharmacy",
      "email": "pharmacy@halohealth.com"
    },
    "notes": "Monitor blood pressure weekly",
    "interactions": [],
    "signature": null,
    "prescribedAt": "2025-12-03T10:00:00.000Z",
    "validUntil": "2026-03-03T10:00:00.000Z",
    "createdAt": "2025-12-03T10:00:00.000Z"
  }
]
```

---

### POST `/api/prescriptions`

**Description:** Create a new prescription.

**Authentication Required:** Yes  
**Roles:** All authenticated (typically Doctor)  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": 5,
  "providerId": 3,
  "diagnosis": "Type 2 Diabetes Mellitus",
  "medications": [
    {
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "90 days",
      "quantity": 180,
      "instructions": "Take with meals"
    },
    {
      "name": "Glipizide",
      "dosage": "5mg",
      "frequency": "Once daily",
      "duration": "90 days",
      "quantity": 90,
      "instructions": "Take 30 minutes before breakfast"
    }
  ],
  "pharmacy": {
    "name": "Halo Health Pharmacy",
    "address": "123 Health St, London",
    "phone": "+44 20 1234 5678",
    "email": "pharmacy@halohealth.com"
  },
  "notes": "Start with lower dose and titrate up if tolerated",
  "validUntil": "2026-03-03",
  "status": "active"
}
```

**Success Response (201 Created):**
```json
{
  "id": 25,
  "prescriptionNumber": "RX-1733300000000-xyz9",
  "patientId": 5,
  "doctorId": 3,
  "organizationId": 3,
  "medicationName": "Metformin",
  "dosage": "500mg",
  "frequency": "Twice daily",
  "duration": "90 days",
  "instructions": "Take with meals",
  "medications": [
    {
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "90 days"
    },
    {
      "name": "Glipizide",
      "dosage": "5mg",
      "frequency": "Once daily",
      "duration": "90 days"
    }
  ],
  "diagnosis": "Type 2 Diabetes Mellitus",
  "status": "active",
  "pharmacy": {
    "name": "Halo Health Pharmacy"
  },
  "prescriptionCreatedBy": 3,
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

### PATCH `/api/prescriptions/:id`

**Description:** Update a prescription.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor, Nurse  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "discontinued",
  "notes": "Discontinued due to side effects. Switching to alternative medication."
}
```

**Success Response (200 OK):**
```json
{
  "id": 25,
  "status": "discontinued",
  "notes": "Discontinued due to side effects. Switching to alternative medication.",
  "updatedAt": "2025-12-03T16:00:00.000Z"
}
```

---

### DELETE `/api/prescriptions/:id`

**Description:** Delete a prescription.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor, Nurse, and medical professionals  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "message": "Prescription deleted successfully",
  "id": 25
}
```

---

### POST `/api/prescriptions/:id/send-to-pharmacy`

**Description:** Send prescription to pharmacy via email.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "pharmacyData": {
    "name": "Halo Health Pharmacy",
    "address": "123 Health St, London SW1A 1AA",
    "phone": "+44 20 1234 5678",
    "email": "prescriptions@halohealth.com",
    "fax": "+44 20 1234 5679"
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Prescription successfully sent to Halo Health pharmacy",
  "pharmacy": {
    "name": "Halo Health Pharmacy",
    "email": "prescriptions@halohealth.com"
  },
  "sentAt": "2025-12-03T14:30:00.000Z"
}
```

---

### POST `/api/prescriptions/:id/e-sign`

**Description:** Electronically sign a prescription.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse, Admin, and medical professionals  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Prescription e-signed successfully",
  "signature": {
    "doctorSignature": "data:image/png;base64,...",
    "signedBy": "Dr. Sarah Johnson",
    "signedAt": "2025-12-03T14:45:00.000Z",
    "signerId": 3
  },
  "prescription": {
    "id": 25,
    "status": "signed"
  }
}
```

---

### POST `/api/prescription/safety-check`

**Description:** Check prescription for drug interactions and allergies.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": 5,
  "medications": [
    {
      "name": "Warfarin",
      "dosage": "5mg",
      "frequency": "Once daily"
    },
    {
      "name": "Aspirin",
      "dosage": "100mg",
      "frequency": "Once daily"
    }
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "patientId": 5,
  "analysis": {
    "interactions": [
      {
        "drug1": "Warfarin",
        "drug2": "Aspirin",
        "severity": "high",
        "description": "Increased risk of bleeding when used together"
      }
    ],
    "allergyWarnings": [],
    "contraindications": [],
    "recommendations": [
      "Consider alternative to Aspirin or monitor INR closely"
    ]
  },
  "riskLevel": "high",
  "timestamp": "2025-12-03T15:00:00.000Z"
}
```

---

## 8. Lab Results

### GET `/api/lab-results`

**Description:** List all lab results for the organization.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| patientId | number | No | Filter by patient |

**Success Response (200 OK):**
```json
[
  {
    "id": 8,
    "testId": "LAB1733234567890ABCDE",
    "patientId": 5,
    "organizationId": 3,
    "testType": "Complete Blood Count (CBC)",
    "orderedBy": 3,
    "doctorName": "Dr. Sarah Johnson",
    "mainSpecialty": "Internal Medicine",
    "subSpecialty": null,
    "priority": "routine",
    "status": "completed",
    "reportStatus": "Results Available",
    "Sample_Collected": true,
    "Lab_Request_Generated": true,
    "Lab_Report_Generated": true,
    "results": {
      "hemoglobin": {"value": 14.5, "unit": "g/dL", "reference": "12.0-17.5", "flag": "normal"},
      "hematocrit": {"value": 42, "unit": "%", "reference": "36-50", "flag": "normal"},
      "whiteBloodCells": {"value": 7.2, "unit": "K/uL", "reference": "4.5-11.0", "flag": "normal"},
      "platelets": {"value": 250, "unit": "K/uL", "reference": "150-400", "flag": "normal"}
    },
    "notes": "All values within normal limits",
    "pdfPath": "/uploads/lab-reports/LAB1733234567890ABCDE.pdf",
    "orderedAt": "2025-12-01T09:00:00.000Z",
    "completedAt": "2025-12-02T14:30:00.000Z",
    "paymentMethod": "card",
    "insuranceProvider": null
  }
]
```

---

### POST `/api/lab-results`

**Description:** Create a new lab order.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse, Lab Technician, Admin, and medical professionals  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": 5,
  "testType": "Lipid Panel",
  "priority": "routine",
  "notes": "Fasting required - patient advised not to eat for 12 hours before test",
  "selectedUserName": "Dr. Sarah Johnson"
}
```

**Success Response (201 Created):**
```json
{
  "id": 15,
  "testId": "LAB1733300000000XYZ99",
  "patientId": 5,
  "organizationId": 3,
  "testType": "Lipid Panel",
  "orderedBy": 3,
  "doctorName": "Dr. Sarah Johnson",
  "priority": "routine",
  "status": "pending",
  "reportStatus": "Lab Request Generated",
  "Lab_Request_Generated": true,
  "Sample_Collected": false,
  "Lab_Report_Generated": false,
  "notes": "Fasting required - patient advised not to eat for 12 hours before test",
  "orderedAt": "2025-12-03T14:00:00.000Z"
}
```

---

### PUT `/api/lab-results/:id`

**Description:** Update a lab result with test results.

**Authentication Required:** Yes  
**Roles:** Non-patient roles (Lab Technician, Doctor, Nurse, Admin)  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "completed",
  "reportStatus": "Results Available",
  "Lab_Report_Generated": true,
  "results": {
    "totalCholesterol": {"value": 185, "unit": "mg/dL", "reference": "<200", "flag": "normal"},
    "ldlCholesterol": {"value": 110, "unit": "mg/dL", "reference": "<100", "flag": "high"},
    "hdlCholesterol": {"value": 55, "unit": "mg/dL", "reference": ">40", "flag": "normal"},
    "triglycerides": {"value": 120, "unit": "mg/dL", "reference": "<150", "flag": "normal"}
  },
  "notes": "LDL slightly elevated. Recommend dietary modifications."
}
```

**Success Response (200 OK):**
```json
{
  "id": 15,
  "testId": "LAB1733300000000XYZ99",
  "status": "completed",
  "reportStatus": "Results Available",
  "results": {...},
  "notes": "LDL slightly elevated. Recommend dietary modifications.",
  "completedAt": "2025-12-03T16:00:00.000Z"
}
```

---

### DELETE `/api/lab-results/:id`

**Description:** Delete a lab result.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse, Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Lab result deleted successfully"
}
```

---

### POST `/api/lab-results/:id/collect-sample`

**Description:** Mark a sample as collected.

**Authentication Required:** Yes  
**Roles:** Admin, Sample Taker, Nurse, Lab Technician  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "notes": "Sample collected successfully. Vein: left antecubital. Volume: 5ml."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Sample collected successfully",
  "labResult": {
    "id": 15,
    "Sample_Collected": true,
    "status": "Sample Collected",
    "reportStatus": "Sample Ready for Testing"
  }
}
```

---

### PATCH `/api/lab-results/:id/toggle-sample-collected`

**Description:** Toggle sample collection status.

**Authentication Required:** Yes  
**Roles:** Admin, Sample Taker, Nurse, Lab Technician  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "sampleCollected": true
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Sample marked as collected",
  "labResult": {
    "id": 15,
    "Sample_Collected": true
  }
}
```

---

### POST `/api/lab-results/:id/generate-pdf`

**Description:** Generate a PDF report for lab results.

**Authentication Required:** Yes  
**Roles:** Non-patient roles  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "PDF report generated successfully",
  "pdfPath": "/uploads/lab-reports/LAB1733300000000XYZ99.pdf",
  "downloadUrl": "/api/lab-results/15/download-pdf"
}
```

---

### POST `/api/lab-results/:id/e-sign`

**Description:** Electronically sign lab results.

**Authentication Required:** Yes  
**Roles:** Non-patient roles  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "signature": "data:image/png;base64,..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Lab result e-signed successfully",
  "signedBy": "Dr. Sarah Johnson",
  "signedAt": "2025-12-03T17:00:00.000Z"
}
```

---

### GET `/api/lab-technician/tests`

**Description:** Get tests for lab technician dashboard.

**Authentication Required:** Yes  
**Roles:** Lab Technician, Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 15,
    "testId": "LAB1733300000000XYZ99",
    "testType": "Lipid Panel",
    "orderedBy": 3,
    "doctorName": "Dr. Sarah Johnson",
    "priority": "routine",
    "orderedAt": "2025-12-03T14:00:00.000Z",
    "status": "Sample Collected",
    "patientId": 5,
    "sampleCollected": true,
    "labReportGenerated": false,
    "patientName": "John Patient",
    "nhsNumber": "123 456 7890",
    "patientEmail": "john.patient@email.com",
    "invoiceStatus": "paid",
    "invoiceNumber": "INV-1733300000000-ABC123"
  }
]
```

---

## 9. Invoices & Billing

### GET `/api/invoices`

**Description:** List all invoices for the organization.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | draft, pending, paid, overdue, cancelled |
| patientId | string | No | Filter by patient ID |

**Success Response (200 OK):**
```json
[
  {
    "id": 25,
    "invoiceNumber": "INV-1733234567890-ABC123",
    "organizationId": 3,
    "patientId": "P000005",
    "patientName": "John Patient",
    "nhsNumber": "123 456 7890",
    "dateOfService": "2025-12-03",
    "invoiceDate": "2025-12-03",
    "dueDate": "2025-12-17",
    "status": "pending",
    "invoiceType": "payment",
    "paymentMethod": null,
    "subtotal": "75.00",
    "tax": "15.00",
    "discount": "0.00",
    "totalAmount": "90.00",
    "paidAmount": "0.00",
    "items": [
      {
        "code": "CONS001",
        "description": "General Consultation",
        "quantity": 1,
        "unitPrice": 50.00,
        "total": 50.00
      },
      {
        "code": "LAB001",
        "description": "Blood Test - CBC",
        "quantity": 1,
        "unitPrice": 25.00,
        "total": 25.00
      }
    ],
    "insuranceProvider": null,
    "notes": null,
    "serviceId": null,
    "serviceType": null,
    "createdAt": "2025-12-03T12:00:00.000Z"
  }
]
```

---

### POST `/api/invoices`

**Description:** Create a new invoice.

**Authentication Required:** Yes  
**Roles:** All authenticated  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": "P000005",
  "patientName": "John Patient",
  "nhsNumber": "123 456 7890",
  "dateOfService": "2025-12-03",
  "invoiceDate": "2025-12-03",
  "dueDate": "2025-12-17",
  "status": "pending",
  "invoiceType": "payment",
  "subtotal": "75.00",
  "tax": "15.00",
  "discount": "0.00",
  "totalAmount": "90.00",
  "items": [
    {
      "code": "CONS001",
      "description": "General Consultation",
      "quantity": 1,
      "unitPrice": 50.00,
      "total": 50.00
    },
    {
      "code": "LAB001",
      "description": "Blood Test - CBC",
      "quantity": 1,
      "unitPrice": 25.00,
      "total": 25.00
    }
  ],
  "notes": "Payment due within 14 days"
}
```

**Success Response (201 Created):**
```json
{
  "id": 26,
  "invoiceNumber": "INV-1733300000000-XYZ789",
  "patientId": "P000005",
  "patientName": "John Patient",
  "status": "pending",
  "totalAmount": "90.00",
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

### POST `/api/create-payment-intent`

**Description:** Create a Stripe payment intent for online payment.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 90.00
}
```

**Success Response (200 OK):**
```json
{
  "clientSecret": "pi_3ABC123xyz_secret_DEF456"
}
```

---

### GET `/api/billing-history`

**Description:** Get billing/payment history for the organization.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 10,
    "organizationId": 3,
    "subscriptionId": 5,
    "amount": "299.00",
    "currency": "GBP",
    "status": "completed",
    "paymentMethod": "card",
    "stripePaymentId": "pi_3ABC123xyz",
    "invoiceNumber": "SAAS-INV-1733234567890",
    "paymentDate": "2025-12-01T00:00:00.000Z",
    "periodStart": "2025-12-01",
    "periodEnd": "2025-12-31",
    "notes": "Monthly subscription - Professional plan"
  }
]
```

---

### GET `/api/billing-history/:paymentId/invoice`

**Description:** Download invoice PDF for a specific payment.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/pdf
```

**Success Response (200 OK):**
Content-Type: application/pdf

Returns PDF binary data for download.

---

### GET `/api/subscriptions/current`

**Description:** Get current organization's subscription details.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "id": 5,
  "organizationId": 3,
  "plan": "professional",
  "status": "active",
  "maxUsers": 25,
  "currentUsers": 13,
  "features": ["ai_insights", "telemedicine", "quickbooks_integration"],
  "pricePerMonth": "299.00",
  "billingCycle": "monthly",
  "currentPeriodStart": "2025-12-01",
  "currentPeriodEnd": "2025-12-31",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

---

## 10. Notifications

### GET `/api/notifications`

**Description:** List notifications for the current user.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Maximum notifications (default: 50) |
| unreadOnly | boolean | No | Only return unread notifications |

**Success Response (200 OK):**
```json
[
  {
    "id": 45,
    "userId": 3,
    "organizationId": 3,
    "title": "New Appointment Scheduled",
    "message": "New appointment with John Patient scheduled for Dec 10, 2025 at 10:00 AM.",
    "type": "appointment_reminder",
    "priority": "normal",
    "isRead": false,
    "actionUrl": "/calendar",
    "metadata": {
      "patientId": 5,
      "patientName": "John Patient",
      "appointmentId": 46,
      "department": "General Medicine"
    },
    "createdAt": "2025-12-03T12:00:00.000Z"
  },
  {
    "id": 44,
    "userId": 3,
    "title": "Lab Results Ready",
    "message": "CBC test results for John Patient are now available.",
    "type": "lab_result",
    "priority": "normal",
    "isRead": true,
    "actionUrl": "/lab-results",
    "createdAt": "2025-12-02T14:30:00.000Z"
  }
]
```

---

### GET `/api/notifications/unread-count`

**Description:** Get count of unread notifications.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "count": 5
}
```

---

### PATCH `/api/notifications/:id/read`

**Description:** Mark a notification as read.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### PATCH `/api/notifications/mark-all-read`

**Description:** Mark all notifications as read.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "count": 5
}
```

---

### DELETE `/api/notifications/:id`

**Description:** Delete a notification.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## 11. Users

### GET `/api/users`

**Description:** List all users in the organization.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role | string | No | Filter by role |
| isActive | boolean | No | Filter by active status |

**Success Response (200 OK):**
```json
[
  {
    "id": 3,
    "organizationId": 3,
    "email": "doctor@cura.com",
    "username": "drjohnson",
    "firstName": "Dr. Sarah",
    "lastName": "Johnson",
    "role": "doctor",
    "department": "General Medicine",
    "medicalSpecialtyCategory": "Internal Medicine",
    "subSpecialty": "Cardiology",
    "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "workingHours": {
      "start": "09:00",
      "end": "17:00"
    },
    "permissions": {},
    "isActive": true,
    "isSaaSOwner": false,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

---

### GET `/api/users/:id`

**Description:** Get a specific user by ID.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "id": 3,
  "email": "doctor@cura.com",
  "username": "drjohnson",
  "firstName": "Dr. Sarah",
  "lastName": "Johnson",
  "role": "doctor",
  "department": "General Medicine",
  "isActive": true
}
```

---

### POST `/api/users`

**Description:** Create a new user.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "nurse@cura.com",
  "username": "nursewilliams",
  "password": "SecurePassword123!",
  "firstName": "Emily",
  "lastName": "Williams",
  "role": "nurse",
  "department": "General Ward",
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "workingHours": {
    "start": "07:00",
    "end": "15:00"
  }
}
```

**Success Response (201 Created):**
```json
{
  "id": 15,
  "organizationId": 3,
  "email": "nurse@cura.com",
  "username": "nursewilliams",
  "firstName": "Emily",
  "lastName": "Williams",
  "role": "nurse",
  "department": "General Ward",
  "isActive": true,
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

### PUT `/api/users/:id`

**Description:** Update a user.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "department": "Emergency Department",
  "workingHours": {
    "start": "08:00",
    "end": "16:00"
  }
}
```

**Success Response (200 OK):**
```json
{
  "id": 15,
  "department": "Emergency Department",
  "workingHours": {
    "start": "08:00",
    "end": "16:00"
  },
  "updatedAt": "2025-12-03T15:00:00.000Z"
}
```

---

### DELETE `/api/users/:id`

**Description:** Delete a user.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### GET `/api/users/current`

**Description:** Get the currently authenticated user.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "id": 3,
  "email": "doctor@cura.com",
  "firstName": "Dr. Sarah",
  "lastName": "Johnson",
  "role": "doctor",
  "department": "General Medicine",
  "organizationId": 3
}
```

---

### GET `/api/users/doctors`

**Description:** List all doctors in the organization.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 3,
    "email": "doctor@cura.com",
    "firstName": "Dr. Sarah",
    "lastName": "Johnson",
    "role": "doctor",
    "department": "General Medicine",
    "medicalSpecialtyCategory": "Internal Medicine",
    "subSpecialty": "Cardiology"
  }
]
```

---

## 12. Organizations

### GET `/api/tenant/info`

**Description:** Get current organization information.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Tenant-Subdomain: cura
```

**Success Response (200 OK):**
```json
{
  "id": 3,
  "name": "Cura Healthcare",
  "subdomain": "cura",
  "brandName": "Cura Healthcare Clinic",
  "region": "UK",
  "contactEmail": "contact@curahealthcare.com",
  "contactPhone": "+44 20 1234 5678",
  "address": "123 Medical Centre, London",
  "city": "London",
  "country": "United Kingdom",
  "settings": {
    "theme": {
      "primaryColor": "#4A7DFF"
    },
    "compliance": {
      "gdprEnabled": true,
      "dataResidency": "UK"
    },
    "features": {
      "aiEnabled": true,
      "billingEnabled": true,
      "telemedicineEnabled": true
    }
  }
}
```

---

### PATCH `/api/organization/settings`

**Description:** Update organization settings.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "settings": {
    "theme": {
      "primaryColor": "#3B82F6"
    },
    "features": {
      "telemedicineEnabled": true
    }
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Organization settings updated",
  "settings": {
    "theme": {
      "primaryColor": "#3B82F6"
    },
    "features": {
      "telemedicineEnabled": true
    }
  }
}
```

---

## 13. GDPR Compliance

### POST `/api/gdpr/consent`

**Description:** Record patient consent for data processing.

**Authentication Required:** Yes  
**Roles:** Admin, Patient  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": 5,
  "consentType": "data_processing",
  "consentGiven": true,
  "purpose": "Medical treatment and healthcare services",
  "expiresAt": "2026-12-03"
}
```

**Success Response (200 OK):**
```json
{
  "id": 10,
  "patientId": 5,
  "organizationId": 3,
  "consentType": "data_processing",
  "consentGiven": true,
  "purpose": "Medical treatment and healthcare services",
  "expiresAt": "2026-12-03",
  "createdAt": "2025-12-03T12:00:00.000Z"
}
```

---

### PATCH `/api/gdpr/consent/:id/withdraw`

**Description:** Withdraw consent.

**Authentication Required:** Yes  
**Roles:** Admin, Patient  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Patient requested withdrawal of consent"
}
```

**Success Response (200 OK):**
```json
{
  "success": true
}
```

---

### POST `/api/gdpr/data-request`

**Description:** Submit a GDPR data request (access or erasure).

**Authentication Required:** Yes  
**Roles:** Admin, Patient  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": 5,
  "requestType": "access",
  "details": "Request for copy of all personal data"
}
```

**Success Response (200 OK):**
```json
{
  "id": 5,
  "patientId": 5,
  "organizationId": 3,
  "requestType": "access",
  "status": "pending",
  "dueDate": "2026-01-02",
  "createdAt": "2025-12-03T12:00:00.000Z"
}
```

---

### GET `/api/gdpr/patient/:patientId/data-export`

**Description:** Export all patient data for GDPR compliance.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| requestId | number | Yes | GDPR request ID |

**Success Response (200 OK):**
```json
{
  "patient": {
    "id": 5,
    "firstName": "John",
    "lastName": "Patient",
    "email": "john.patient@email.com"
  },
  "medicalRecords": [...],
  "prescriptions": [...],
  "labResults": [...],
  "appointments": [...],
  "invoices": [...],
  "consents": [...],
  "exportedAt": "2025-12-03T12:00:00.000Z"
}
```

---

### POST `/api/gdpr/patient/:patientId/erasure`

**Description:** Process data erasure request.

**Authentication Required:** Yes  
**Roles:** Admin only  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "requestId": 5,
  "reason": "Patient requested complete data deletion"
}
```

**Success Response (200 OK):**
```json
{
  "success": true
}
```

---

### GET `/api/gdpr/patient/:patientId/consent-status`

**Description:** Check patient's consent status.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor, Patient  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| consentType | string | No | Filter by consent type |

**Success Response (200 OK):**
```json
{
  "patientId": 5,
  "consents": [
    {
      "type": "data_processing",
      "status": "active",
      "expiresAt": "2026-12-03"
    },
    {
      "type": "marketing",
      "status": "withdrawn",
      "withdrawnAt": "2025-11-15"
    }
  ]
}
```

---

### GET `/api/gdpr/compliance-report`

**Description:** Generate GDPR compliance report.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | monthly, quarterly, annual (default: monthly) |

**Success Response (200 OK):**
```json
{
  "period": "monthly",
  "reportDate": "2025-12-03",
  "totalPatients": 156,
  "activeConsents": 142,
  "dataRequests": {
    "access": 3,
    "erasure": 1,
    "completed": 2,
    "pending": 2
  },
  "averageResponseTime": "5 days",
  "complianceScore": 95
}
```

---

## 14. QuickBooks Integration

### GET `/api/quickbooks/status`

**Description:** Check QuickBooks connection status.

**Authentication Required:** Yes  
**Roles:** Non-patient roles  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "connected": true,
  "companyId": "123456789",
  "companyName": "Cura Healthcare Ltd",
  "lastSyncAt": "2025-12-03T10:00:00.000Z"
}
```

---

### POST `/api/quickbooks/connect`

**Description:** Initiate QuickBooks OAuth connection.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "authUrl": "https://appcenter.intuit.com/connect/oauth2?client_id=...&redirect_uri=..."
}
```

---

### GET `/api/quickbooks/auth/callback`

**Description:** OAuth callback handler for QuickBooks.

**Authentication Required:** No  

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | string | Yes | OAuth authorization code |
| realmId | string | Yes | QuickBooks company ID |
| state | string | Yes | OAuth state parameter |

**Success Response (200 OK):**
Returns HTML page that posts message to parent window.

---

### POST `/api/quickbooks/disconnect`

**Description:** Disconnect QuickBooks integration.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "QuickBooks disconnected successfully"
}
```

---

### GET `/api/quickbooks/data/company-info`

**Description:** Get company information from QuickBooks.

**Authentication Required:** Yes  
**Roles:** Non-patient roles  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "companyName": "Cura Healthcare Ltd",
  "companyAddress": {
    "line1": "123 Medical Centre",
    "city": "London",
    "postalCode": "SW1A 1AA",
    "country": "UK"
  },
  "fiscalYearStart": "January",
  "industry": "Healthcare"
}
```

---

### GET `/api/quickbooks/data/invoices`

**Description:** Get invoices from QuickBooks.

**Authentication Required:** Yes  
**Roles:** Non-patient roles  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "invoices": [
    {
      "id": "123",
      "docNumber": "INV-001",
      "customerRef": "Customer 1",
      "totalAmt": 500.00,
      "balance": 0,
      "dueDate": "2025-12-15",
      "status": "Paid"
    }
  ],
  "total": 1
}
```

---

### GET `/api/quickbooks/data/profit-loss`

**Description:** Get Profit & Loss report from QuickBooks.

**Authentication Required:** Yes  
**Roles:** Non-patient roles  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Start date (YYYY-MM-DD) |
| endDate | string | No | End date (YYYY-MM-DD) |

**Success Response (200 OK):**
```json
{
  "reportName": "Profit and Loss",
  "startDate": "2025-01-01",
  "endDate": "2025-12-03",
  "income": {
    "total": 125430.50,
    "categories": [
      {"name": "Consultations", "amount": 75000.00},
      {"name": "Lab Services", "amount": 35000.00},
      {"name": "Procedures", "amount": 15430.50}
    ]
  },
  "expenses": {
    "total": 85000.00,
    "categories": [
      {"name": "Salaries", "amount": 60000.00},
      {"name": "Supplies", "amount": 15000.00},
      {"name": "Utilities", "amount": 10000.00}
    ]
  },
  "netIncome": 40430.50
}
```

---

## 15. Telemedicine (LiveKit)

### POST `/api/livekit/token`

**Description:** Get LiveKit access token for video call.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "roomName": "consultation-room-123",
  "participantName": "Dr. Sarah Johnson",
  "participantIdentity": "doctor_3"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "roomName": "consultation-room-123",
  "serverUrl": "wss://livekit.curaemr.ai"
}
```

---

### POST `/api/livekit/room`

**Description:** Create a new LiveKit room.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "roomName": "consultation-room-123",
  "emptyTimeout": 600,
  "maxParticipants": 2
}
```

**Success Response (201 Created):**
```json
{
  "roomName": "consultation-room-123",
  "sid": "RM_abc123xyz",
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

### POST `/api/appointments/:id/start-video`

**Description:** Start a video call for an appointment.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "roomName": "apt-46-video-room",
  "serverUrl": "wss://livekit.curaemr.ai",
  "appointment": {
    "id": 46,
    "patientName": "John Patient",
    "providerName": "Dr. Sarah Johnson"
  }
}
```

---

### GET `/api/appointments/:id/video-token`

**Description:** Get video token for an existing appointment video call.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "roomName": "apt-46-video-room",
  "serverUrl": "wss://livekit.curaemr.ai"
}
```

---

## 16. AI Services

### POST `/api/ai/generate-treatment-plan`

**Description:** Generate AI treatment plan suggestions.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": 5,
  "diagnosis": "Type 2 Diabetes Mellitus",
  "currentMedications": ["Metformin 500mg"],
  "allergies": ["Penicillin"],
  "comorbidities": ["Hypertension"]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "treatmentPlan": {
    "recommendations": [
      {
        "type": "medication",
        "suggestion": "Consider adding Empagliflozin 10mg for cardiovascular protection",
        "evidence": "EMPA-REG OUTCOME trial",
        "priority": "high"
      },
      {
        "type": "lifestyle",
        "suggestion": "Mediterranean diet with carbohydrate counting",
        "priority": "medium"
      }
    ],
    "monitoring": [
      "HbA1c every 3 months",
      "Lipid panel annually",
      "Kidney function every 6 months"
    ],
    "goals": {
      "hba1c": "<7.0%",
      "bloodPressure": "<130/80 mmHg",
      "ldl": "<70 mg/dL"
    }
  },
  "confidence": 87,
  "disclaimer": "This is an AI-generated suggestion and should be reviewed by a healthcare professional."
}
```

---

### POST `/api/ai/generate-insights`

**Description:** Generate AI insights for a patient.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": "5"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "insights": [
    {
      "id": 25,
      "type": "preventive",
      "title": "Preventive Care Recommendations",
      "description": "Patient is due for routine preventive screenings.",
      "severity": "low",
      "actionRequired": false,
      "confidence": "78"
    }
  ],
  "generated": 1,
  "patientName": "John Patient"
}
```

---

## 17. Mobile API

### GET `/api/mobile/doctor/dashboard`

**Description:** Get doctor's mobile dashboard.

**Authentication Required:** Yes  
**Roles:** Doctor  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "todayAppointments": 8,
  "pendingResults": 3,
  "patientMessages": 2,
  "upcomingAppointments": [
    {
      "id": 46,
      "patientName": "John Patient",
      "scheduledAt": "2025-12-03T14:00:00.000Z",
      "type": "consultation"
    }
  ]
}
```

---

### GET `/api/mobile/patient/dashboard`

**Description:** Get patient's mobile dashboard.

**Authentication Required:** Yes  
**Roles:** Patient  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "upcomingAppointments": [
    {
      "id": 46,
      "providerName": "Dr. Sarah Johnson",
      "scheduledAt": "2025-12-03T14:00:00.000Z",
      "type": "consultation"
    }
  ],
  "activePrescriptions": 2,
  "pendingLabResults": 1,
  "healthScore": 78
}
```

---

### POST `/api/mobile/patient/appointments`

**Description:** Book an appointment via mobile.

**Authentication Required:** Yes  
**Roles:** Patient  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "providerId": 3,
  "scheduledAt": "2025-12-10T10:00:00.000Z",
  "type": "consultation",
  "description": "Follow-up appointment",
  "isVirtual": false
}
```

**Success Response (201 Created):**
```json
{
  "id": 47,
  "appointmentId": "APT1733400000000P5AUTO",
  "status": "scheduled",
  "scheduledAt": "2025-12-10T10:00:00.000Z"
}
```

---

## 18. SaaS Administration

### GET `/api/saas/dashboard`

**Description:** Get SaaS admin dashboard statistics.

**Authentication Required:** Yes (SaaS Token)  
**Roles:** SaaS Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "totalOrganizations": 15,
  "activeSubscriptions": 12,
  "totalUsers": 156,
  "monthlyRevenue": "3500.00",
  "recentOrganizations": [...],
  "pendingPayments": 2
}
```

---

### GET `/api/saas/organizations`

**Description:** List all organizations.

**Authentication Required:** Yes (SaaS Token)  
**Roles:** SaaS Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 3,
    "name": "Cura Healthcare",
    "subdomain": "cura",
    "status": "active",
    "subscription": {
      "plan": "professional",
      "status": "active"
    },
    "userCount": 13,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

---

### POST `/api/saas/organizations`

**Description:** Create a new organization.

**Authentication Required:** Yes (SaaS Token)  
**Roles:** SaaS Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Healthcare Clinic",
  "subdomain": "newhealthcare",
  "brandName": "New Healthcare",
  "contactEmail": "admin@newhealthcare.com",
  "contactPhone": "+44 20 1234 5678",
  "address": "456 Medical St",
  "city": "Manchester",
  "country": "UK",
  "adminUser": {
    "email": "admin@newhealthcare.com",
    "firstName": "Admin",
    "lastName": "User",
    "password": "TempPassword123!"
  }
}
```

**Success Response (201 Created):**
```json
{
  "organization": {
    "id": 5,
    "name": "New Healthcare Clinic",
    "subdomain": "newhealthcare"
  },
  "adminUser": {
    "id": 20,
    "email": "admin@newhealthcare.com"
  },
  "tempPassword": "TempPassword123!"
}
```

---

### GET `/api/website/packages`

**Description:** Get public pricing packages.

**Authentication Required:** No  

**Request Headers:**
```
Accept: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Starter",
    "description": "For small clinics",
    "priceMonthly": "99.00",
    "priceAnnual": "990.00",
    "maxUsers": 5,
    "features": ["Patient Management", "Appointments", "Invoicing"],
    "isPopular": false
  },
  {
    "id": 2,
    "name": "Professional",
    "description": "For growing practices",
    "priceMonthly": "299.00",
    "priceAnnual": "2990.00",
    "maxUsers": 25,
    "features": ["Everything in Starter", "AI Insights", "Telemedicine", "QuickBooks"],
    "isPopular": true
  }
]
```

---

## 19. Pricing Management

### GET `/api/pricing/doctors-fees`

**Description:** List doctor consultation fees.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "doctorId": 3,
    "doctorRole": "doctor",
    "serviceName": "General Consultation",
    "basePrice": "50.00",
    "currency": "GBP",
    "duration": 30
  }
]
```

---

### POST `/api/pricing/doctors-fees`

**Description:** Create a new doctor fee entry.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "doctorId": 3,
  "doctorRole": "doctor",
  "serviceName": "Specialist Consultation",
  "basePrice": "100.00",
  "currency": "GBP",
  "duration": 45
}
```

**Success Response (201 Created):**
```json
{
  "id": 5,
  "doctorId": 3,
  "doctorRole": "doctor",
  "serviceName": "Specialist Consultation",
  "basePrice": "100.00",
  "currency": "GBP"
}
```

---

### GET `/api/pricing/lab-tests`

**Description:** List lab test prices.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "testName": "Complete Blood Count (CBC)",
    "testCode": "LAB-CBC",
    "price": "25.00",
    "currency": "GBP",
    "turnaroundTime": "24 hours"
  }
]
```

---

## 20. Symptom Checker

### POST `/api/symptom-checker/analyze`

**Description:** Analyze symptoms using AI.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "symptoms": ["headache", "fever", "fatigue"],
  "duration": "3 days",
  "severity": "moderate",
  "additionalNotes": "Started after returning from travel"
}
```

**Success Response (200 OK):**
```json
{
  "analysis": {
    "possibleConditions": [
      {
        "name": "Viral Infection",
        "probability": "high",
        "description": "Common viral illness presenting with these symptoms"
      },
      {
        "name": "Flu (Influenza)",
        "probability": "medium",
        "description": "Seasonal flu can cause similar symptoms"
      }
    ],
    "recommendedActions": [
      "Rest and stay hydrated",
      "Monitor temperature",
      "Consult a doctor if symptoms worsen or persist beyond 5 days"
    ],
    "urgencyLevel": "moderate",
    "disclaimer": "This is not a medical diagnosis. Please consult a healthcare professional for proper evaluation."
  },
  "savedToHistory": true,
  "historyId": 15
}
```

---

### GET `/api/symptom-checker/history`

**Description:** Get symptom check history.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 15,
    "userId": 5,
    "symptoms": ["headache", "fever", "fatigue"],
    "analysis": {...},
    "createdAt": "2025-12-03T12:00:00.000Z"
  }
]
```

---

## 21. Insurance

### POST `/api/insurance/submit-claim`

**Description:** Submit an insurance claim.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": 5,
  "invoiceId": 25,
  "insuranceProvider": "BUPA",
  "policyNumber": "POL123456",
  "claimAmount": "90.00",
  "diagnosis": "Essential Hypertension",
  "serviceDate": "2025-12-03"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "claimId": "CLM-1733300000000",
  "status": "submitted",
  "submittedAt": "2025-12-03T14:00:00.000Z"
}
```

---

### POST `/api/insurance/record-payment`

**Description:** Record an insurance payment.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "invoiceId": 25,
  "amount": "75.00",
  "paymentDate": "2025-12-10",
  "referenceNumber": "INS-PAY-12345",
  "notes": "Partial payment - patient responsible for £15 copay"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "paymentId": 10,
  "invoiceUpdated": true
}
```

---

## 22. Clinic Configuration

### GET `/api/clinic-headers`

**Description:** Get clinic header configuration for documents.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "organizationId": 3,
  "clinicName": "Cura Healthcare Clinic",
  "logoUrl": "/uploads/logos/cura-logo.png",
  "address": "123 Medical Centre, London SW1A 1AA",
  "phone": "+44 20 1234 5678",
  "email": "contact@curahealthcare.com",
  "website": "www.curahealthcare.com",
  "registrationNumber": "CQC-12345",
  "isActive": true
}
```

---

### POST `/api/clinic-headers`

**Description:** Create or update clinic header.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "clinicName": "Cura Healthcare Clinic",
  "logoUrl": "/uploads/logos/cura-logo.png",
  "address": "123 Medical Centre, London SW1A 1AA",
  "phone": "+44 20 1234 5678",
  "email": "contact@curahealthcare.com",
  "website": "www.curahealthcare.com",
  "registrationNumber": "CQC-12345"
}
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "message": "Clinic header saved successfully"
}
```

---

### GET `/api/clinic-footers`

**Description:** Get clinic footer configuration.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "organizationId": 3,
  "content": "Cura Healthcare - Registered in England. Company No. 12345678",
  "disclaimer": "This document is confidential medical information.",
  "isActive": true
}
```

---

## 23. Shifts & Scheduling

### GET `/api/default-shifts`

**Description:** Get default shift patterns.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 3,
    "dayOfWeek": "Monday",
    "startTime": "09:00",
    "endTime": "17:00",
    "isAvailable": true
  }
]
```

---

### PATCH `/api/default-shifts/:userId`

**Description:** Update default shifts for a user.

**Authentication Required:** Yes  
**Roles:** Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "shifts": [
    {"dayOfWeek": "Monday", "startTime": "08:00", "endTime": "16:00", "isAvailable": true},
    {"dayOfWeek": "Tuesday", "startTime": "08:00", "endTime": "16:00", "isAvailable": true},
    {"dayOfWeek": "Wednesday", "startTime": "08:00", "endTime": "16:00", "isAvailable": true}
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Default shifts updated successfully"
}
```

---

## 24. File Management

### POST `/api/upload`

**Description:** Upload a file.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data
```

**Request Body:**
Form-data with file field

**Success Response (200 OK):**
```json
{
  "success": true,
  "filename": "uploaded-file-1733300000000.pdf",
  "path": "/uploads/documents/uploaded-file-1733300000000.pdf",
  "size": 102400,
  "mimeType": "application/pdf"
}
```

---

### GET `/api/files/:id/exists`

**Description:** Check if a file exists.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "exists": true,
  "path": "/uploads/documents/file-123.pdf"
}
```

---

## WebSocket Events

### Socket.IO Connection

**URL:** `wss://[domain]/socket.io`

**Connection Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Client to Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `add-user` | `{userId: string, deviceId: string}` | Register user presence |
| `remove-user` | `{userId: string}` | Unregister user |
| `call-user` | `{to: string, offer: RTCSessionDescription}` | Initiate video call |
| `accept-call` | `{to: string, answer: RTCSessionDescription}` | Accept incoming call |
| `reject-call` | `{to: string}` | Reject incoming call |
| `end-call` | `{to: string}` | End active call |

### Server to Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `online-users` | `string[]` | List of online user IDs |
| `incoming-call` | `{from: string, callerName: string, offer: object}` | Incoming video call |
| `call-accepted` | `{from: string, answer: object}` | Call was accepted |
| `call-rejected` | `{from: string}` | Call was rejected |
| `call-ended` | `{from: string}` | Call ended |
| `notification` | `{type: string, message: string, data: object}` | New notification |
| `appointment-update` | `{action: string, appointment: object}` | Appointment changed |

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description",
  "details": "Additional details (development only)",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Description | Example |
|------|-------------|---------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 500 | Internal Server Error | Server-side error |

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication endpoints | 5 requests per minute |
| General API | 100 requests per minute |
| File uploads | 10 requests per minute |

---

## Environment Variables Required

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

*Generated: December 2025*  
*Cura Healthcare EMR - Complete API Documentation v1.0*
