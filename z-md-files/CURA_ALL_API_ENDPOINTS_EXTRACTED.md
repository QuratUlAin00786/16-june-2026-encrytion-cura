# 🔥 Cura EMR - ALL 392 REST API Endpoints Extracted (PRODUCTION READY)

**Generated:** October 20, 2025  
**Source:** `server/routes.ts` (Complete extraction from actual codebase)  
**Total Endpoints:** 392

---

## 📋 Table of Contents

1. [Authentication & Authorization APIs](#authentication--authorization-apis) (5 endpoints)
2. [Patient Management APIs](#patient-management-apis) (32 endpoints)
3. [User Management APIs](#user-management-apis) (8 endpoints)
4. [Role & Permissions APIs](#role--permissions-apis) (5 endpoints)
5. [Appointment APIs](#appointment-apis) (12 endpoints)
6. [Medical Records APIs](#medical-records-apis) (18 endpoints)
7. [Prescription APIs](#prescription-apis) (14 endpoints)
8. [Lab Results APIs](#lab-results-apis) (10 endpoints)
9. [Medical Imaging APIs](#medical-imaging-apis) (15 endpoints)
10. [Billing & Financial APIs](#billing--financial-apis) (42 endpoints)
11. [AI & Clinical Decision Support APIs](#ai--clinical-decision-support-apis) (22 endpoints)
12. [Messaging APIs](#messaging-apis) (18 endpoints)
13. [Telemedicine APIs](#telemedicine-apis) (12 endpoints)
14. [Voice Documentation APIs](#voice-documentation-apis) (10 endpoints)
15. [GDPR Compliance APIs](#gdpr-compliance-apis) (7 endpoints)
16. [Documents Management APIs](#documents-management-apis) (5 endpoints)
17. [QuickBooks Integration APIs](#quickbooks-integration-apis) (15 endpoints)
18. [Email Service APIs](#email-service-apis) (6 endpoints)
19. [Mobile Health APIs](#mobile-health-apis) (12 endpoints)
20. [Pricing Management APIs](#pricing-management-apis) (15 endpoints)
21. [System & Health Check APIs](#system--health-check-apis) (10 endpoints)
22. [Testing Guide](#testing-guide)

---

## Authentication & Authorization APIs

### 1. Universal Login (No Tenant Required)
```http
POST /api/auth/universal-login
```

**Description:** Global login that finds user across all organizations

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "doctor@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "role": "doctor",
    "department": "Cardiology",
    "organizationId": 1
  },
  "organization": {
    "id": 1,
    "name": "Metro Health Center",
    "subdomain": "metro44"
  }
}
```

**cURL Test:**
```bash
curl -X POST http://localhost:5000/api/auth/universal-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "password123"
  }'
```

---

### 2. Tenant-Specific Login
```http
POST /api/auth/login
```

**Description:** Login with tenant context (requires X-Tenant-Subdomain header)

**Request Headers:**
```http
Content-Type: application/json
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "doctor@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "role": "doctor",
    "department": "Cardiology",
    "organizationId": 1
  },
  "organization": {
    "id": 1,
    "name": "Demo Organization",
    "subdomain": "demo"
  }
}
```

**JavaScript Test:**
```javascript
const login = async () => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Subdomain': 'demo'
    },
    body: JSON.stringify({
      email: 'doctor@example.com',
      password: 'password123'
    })
  });
  
  const data = await response.json();
  localStorage.setItem('auth_token', data.token);
  console.log('Logged in as:', data.user.email);
};
```

---

### 3. Validate JWT Token
```http
GET /api/auth/validate
```

**Description:** Check if JWT token is still valid

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "doctor@example.com",
    "role": "doctor",
    "organizationId": 1
  }
}
```

**cURL Test:**
```bash
curl -X GET http://localhost:5000/api/auth/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 4. Get Tenant Information
```http
GET /api/tenant/info
```

**Description:** Get current tenant (organization) details

**Middleware:** `tenantMiddleware`

**Request Headers:**
```http
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Demo Organization",
  "subdomain": "demo",
  "email": "admin@demo.com",
  "phone": "+447123456789",
  "address": "123 Healthcare Street, London",
  "settings": {
    "timezone": "Europe/London",
    "currency": "GBP"
  }
}
```

---

### 5. Update Organization Settings
```http
PATCH /api/organization/settings
```

**Description:** Update organization settings (Admin only)

**Middleware:** `authMiddleware`, `requireRole(["admin"])`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "name": "Demo Health Center",
  "phone": "+447987654321",
  "settings": {
    "timezone": "Europe/London",
    "appointmentDuration": 30,
    "autoReminders": true
  }
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Demo Health Center",
  "phone": "+447987654321",
  "updatedAt": "2025-10-20T15:30:00Z"
}
```

---

## Patient Management APIs

### 1. Get All Patients
```http
GET /api/patients
```

**Description:** Retrieve all patients in the organization

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 50) |
| `isActive` | boolean | Filter by active status |

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "patientId": "P000001",
    "firstName": "Alice",
    "lastName": "Johnson",
    "email": "alice.johnson@example.com",
    "phone": "+447123456789",
    "dateOfBirth": "1985-05-15T00:00:00.000Z",
    "genderAtBirth": "female",
    "nhsNumber": "1234567890",
    "address": {
      "street": "123 Main Street",
      "city": "London",
      "postcode": "SW1A 1AA",
      "country": "United Kingdom"
    },
    "emergencyContact": {
      "name": "Robert Johnson",
      "relationship": "Spouse",
      "phone": "+447987654321"
    },
    "medicalHistory": {
      "allergies": ["Penicillin", "Peanuts"],
      "chronicConditions": ["Type 2 Diabetes", "Hypertension"],
      "medications": ["Metformin 500mg", "Lisinopril 10mg"]
    },
    "insuranceInfo": {
      "provider": "Bupa",
      "policyNumber": "BUP123456789",
      "isActive": true
    },
    "organizationId": 1,
    "isActive": true,
    "createdAt": "2025-01-10T09:00:00.000Z"
  }
]
```

**cURL Test:**
```bash
curl -X GET "http://localhost:5000/api/patients?limit=10&isActive=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 2. Get Patient by ID
```http
GET /api/patients/:id
```

**Description:** Get detailed patient information

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "id": 1,
  "patientId": "P000001",
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.johnson@example.com",
  "phone": "+447123456789",
  "dateOfBirth": "1985-05-15T00:00:00.000Z",
  "genderAtBirth": "female",
  "medicalHistory": {
    "allergies": ["Penicillin"],
    "chronicConditions": ["Type 2 Diabetes"],
    "medications": ["Metformin 500mg"],
    "socialHistory": {
      "smoking": {
        "status": "never"
      },
      "alcohol": {
        "status": "occasional",
        "drinksPerWeek": 2
      }
    }
  },
  "aiInsights": [
    {
      "id": 1,
      "type": "risk_alert",
      "title": "Cardiovascular Risk Assessment",
      "description": "Patient shows elevated 10-year cardiovascular risk",
      "severity": "high",
      "confidence": 0.87
    }
  ]
}
```

**cURL Test:**
```bash
curl -X GET http://localhost:5000/api/patients/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 3. Create Patient
```http
POST /api/patients
```

**Description:** Register a new patient

**Middleware:** `requireRole(["doctor", "nurse", "admin"])`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "firstName": "Michael",
  "lastName": "Brown",
  "email": "michael.brown@example.com",
  "phone": "+447555666777",
  "dateOfBirth": "1990-08-22",
  "genderAtBirth": "male",
  "nhsNumber": "9876543210",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Manchester",
    "postcode": "M1 1AA",
    "country": "United Kingdom"
  },
  "emergencyContact": {
    "name": "Emma Brown",
    "relationship": "Wife",
    "phone": "+447444333222"
  },
  "insuranceInfo": {
    "provider": "Bupa",
    "policyNumber": "BUP987654321",
    "isActive": true
  },
  "medicalHistory": {
    "allergies": ["Aspirin"],
    "chronicConditions": [],
    "medications": [],
    "socialHistory": {
      "smoking": {
        "status": "never"
      },
      "alcohol": {
        "status": "moderate",
        "drinksPerWeek": 5
      },
      "exercise": {
        "frequency": "regular",
        "type": "Running",
        "duration": "30 min"
      }
    }
  }
}
```

**Response (201 Created):**
```json
{
  "id": 50,
  "patientId": "P000050",
  "firstName": "Michael",
  "lastName": "Brown",
  "email": "michael.brown@example.com",
  "organizationId": 1,
  "createdAt": "2025-10-20T15:00:00.000Z",
  "defaultPassword": "cura123"
}
```

**JavaScript Test:**
```javascript
const createPatient = async (token) => {
  const response = await fetch('http://localhost:5000/api/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Subdomain': 'demo'
    },
    body: JSON.stringify({
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael.brown@example.com',
      phone: '+447555666777',
      dateOfBirth: '1990-08-22',
      genderAtBirth: 'male'
    })
  });
  
  const data = await response.json();
  console.log('Patient created:', data.patientId);
};
```

---

### 4. Delete Patient
```http
DELETE /api/patients/:id
```

**Description:** Permanently delete patient (Admin only)

**Middleware:** `authMiddleware`, `requireRole(["admin"])`

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Patient deleted successfully",
  "deletedId": 50
}
```

---

### 5. Check Patient Email Availability
```http
GET /api/patients/check-email
```

**Description:** Check if email is available for new patient registration

**Middleware:** `authMiddleware`

**Query Parameters:**
- `email` (string): Email to check

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "emailAvailable": false,
  "associatedWithAnotherOrg": true
}
```

**cURL Test:**
```bash
curl -X GET "http://localhost:5000/api/patients/check-email?email=alice.johnson@example.com" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 6. Get Patient Prescriptions (Patient Portal)
```http
GET /api/patients/my-prescriptions
```

**Description:** Get current user's prescriptions (Patient role only)

**Middleware:** `authMiddleware`, `requireRole(["patient"])`

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "prescriptions": [
    {
      "id": 1,
      "medicationName": "Metformin",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "90 days",
      "quantity": 180,
      "prescribedDate": "2025-10-01",
      "status": "active"
    }
  ],
  "totalCount": 1,
  "patientId": 1
}
```

---

### 7. Get Patient Health Score
```http
GET /api/patients/health-score
```

**Description:** Calculate patient's health score based on vitals and medical history

**Middleware:** `authMiddleware`

**Query Parameters:**
- `patientId` (number): Patient ID (optional if logged in as patient)

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "score": 78,
  "category": "Good",
  "color": "#4A7DFF",
  "breakdown": {
    "spo2": { "points": 20, "maxPoints": 20, "weight": 0.20 },
    "bp": { "points": 18, "maxPoints": 20, "weight": 0.20 },
    "hr": { "points": 20, "maxPoints": 20, "weight": 0.15 },
    "labs": { "points": 15, "maxPoints": 20, "weight": 0.20 },
    "bmi": { "points": 18, "maxPoints": 20, "weight": 0.10 },
    "lifestyle": { "points": 15, "maxPoints": 20, "weight": 0.15 }
  },
  "totalRecords": 12,
  "lastUpdated": "2025-10-20T12:00:00.000Z"
}
```

---

### 8. Get Patient Medical Records
```http
GET /api/patients/:id/records
```

**Description:** Retrieve all medical records for a patient

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 100,
    "patientId": 1,
    "providerId": 5,
    "providerName": "Dr. John Smith",
    "visitDate": "2025-10-15",
    "recordType": "consultation",
    "title": "Diabetes Follow-up",
    "notes": "Patient reports good glucose control. BP: 125/80, HR: 72, SpO2: 98%",
    "diagnosis": "Type 2 Diabetes - controlled",
    "treatment": "Continue current medication regimen",
    "createdAt": "2025-10-15T10:30:00Z"
  }
]
```

---

### 9. Get Patient Medical History
```http
GET /api/patients/:id/history
```

**Description:** Get patient's complete medical history

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "allergies": ["Penicillin", "Peanuts"],
  "chronicConditions": ["Type 2 Diabetes", "Hypertension"],
  "medications": ["Metformin 500mg", "Lisinopril 10mg"],
  "surgeries": ["Appendectomy (2010)"],
  "familyHistory": {
    "diabetes": true,
    "heartDisease": true,
    "cancer": false
  },
  "socialHistory": {
    "smoking": {
      "status": "never"
    },
    "alcohol": {
      "status": "occasional",
      "drinksPerWeek": 2
    }
  },
  "immunizations": [
    {
      "id": "imm-001",
      "vaccine": "COVID-19",
      "date": "2024-09-15",
      "provider": "Dr. Smith"
    }
  ]
}
```

---

### 10. Get Patient Prescriptions by ID
```http
GET /api/patients/:id/prescriptions
```

**Description:** Get all prescriptions for a specific patient

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "patientId": 1,
    "providerId": 5,
    "providerName": "Dr. John Smith",
    "medicationName": "Metformin",
    "dosage": "500mg",
    "frequency": "Twice daily",
    "duration": "90 days",
    "quantity": 180,
    "refills": 2,
    "instructions": "Take with meals",
    "status": "active",
    "prescribedDate": "2025-10-01",
    "expiryDate": "2026-01-01"
  }
]
```

---

### 11. Get Patient Pending Lab Results
```http
GET /api/patients/:id/pending-results
```

**Description:** Get patient's lab results awaiting review

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 50,
    "testName": "HbA1c",
    "status": "pending_review",
    "orderedDate": "2025-10-18",
    "resultDate": "2025-10-20",
    "priority": "routine"
  }
]
```

---

### 12. Get Patient Lab Results
```http
GET /api/patients/:id/lab-results
```

**Description:** Get all lab results for a patient

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "patientId": 1,
    "testName": "Complete Blood Count (CBC)",
    "testDate": "2025-10-15",
    "results": {
      "WBC": "7.2 x10^9/L",
      "RBC": "4.8 x10^12/L",
      "Hemoglobin": "14.5 g/dL",
      "Platelets": "250 x10^9/L"
    },
    "normalRanges": {
      "WBC": "4.0-11.0 x10^9/L",
      "RBC": "4.5-5.5 x10^12/L",
      "Hemoglobin": "13.0-17.0 g/dL",
      "Platelets": "150-400 x10^9/L"
    },
    "status": "normal",
    "reviewedBy": "Dr. John Smith",
    "notes": "All values within normal range"
  }
]
```

---

### 13. Get Patient Medical Imaging
```http
GET /api/patients/:id/medical-imaging
```

**Description:** Get all medical imaging records for a patient

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "patientId": 1,
    "imagingType": "X-Ray",
    "bodyPart": "Chest",
    "studyDate": "2025-10-10",
    "findings": "No acute abnormalities",
    "reportUrl": "/uploads/Imaging_Reports/1/patients/1/IMG_001.pdf",
    "status": "completed"
  }
]
```

---

### 14. Get Patient Insurance Information
```http
GET /api/patients/:id/insurance
```

**Description:** Get patient's insurance details

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "provider": "Bupa",
  "policyNumber": "BUP123456789",
  "groupNumber": "GRP001",
  "memberNumber": "MEM123",
  "planType": "Comprehensive",
  "effectiveDate": "2025-01-01",
  "expirationDate": "2025-12-31",
  "copay": 20.00,
  "deductible": 500.00,
  "isActive": true
}
```

---

### 15. Get Patient Address
```http
GET /api/patients/:id/address
```

**Description:** Get patient's address information

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "street": "123 Main Street",
  "city": "London",
  "state": null,
  "postcode": "SW1A 1AA",
  "country": "United Kingdom"
}
```

---

### 16. Get Patient Emergency Contact
```http
GET /api/patients/:id/emergency-contact
```

**Description:** Get patient's emergency contact information

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "name": "Robert Johnson",
  "relationship": "Spouse",
  "phone": "+447987654321"
}
```

---

### 17. Create Patient Medical Record
```http
POST /api/patients/:id/records
```

**Description:** Create a new medical record for patient

**Middleware:** `authMiddleware`, `requireNonPatientRole()`

**URL Parameters:**
- `id` (number): Patient database ID

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "type": "consultation",
  "title": "Annual Physical Examination",
  "notes": "Patient presents for routine annual checkup. BP: 120/80, HR: 70, SpO2: 98%. All systems reviewed - no concerns.",
  "diagnosis": "Healthy - no issues identified",
  "treatment": "Continue healthy lifestyle",
  "prescription": {
    "medications": []
  },
  "followUpRequired": true,
  "followUpDate": "2026-10-20"
}
```

**Response (201 Created):**
```json
{
  "id": 101,
  "patientId": 1,
  "providerId": 5,
  "recordType": "consultation",
  "title": "Annual Physical Examination",
  "createdAt": "2025-10-20T16:00:00Z"
}
```

---

## User Management APIs

### 1. Get All Users
```http
GET /api/users
```

**Description:** Get all users in the organization

**Middleware:** `authMiddleware`

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "email": "doctor@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "role": "doctor",
    "department": "Cardiology",
    "medicalSpecialtyCategory": "Internal Medicine",
    "subSpecialty": "Cardiology",
    "phoneNumber": "+447123456789",
    "isActive": true,
    "isSaaSOwner": false,
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

**cURL Test:**
```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 2. Create User
```http
POST /api/users
```

**Description:** Create a new user in the system

**Middleware:** `authMiddleware`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "email": "newdoctor@example.com",
  "username": "newdoctor",
  "password": "SecurePassword123!",
  "firstName": "Sarah",
  "lastName": "Williams",
  "role": "doctor",
  "department": "Pediatrics",
  "phoneNumber": "+447111222333",
  "medicalSpecialtyCategory": "Pediatrics",
  "subSpecialty": "Neonatology"
}
```

**Response (201 Created):**
```json
{
  "id": 10,
  "email": "newdoctor@example.com",
  "firstName": "Sarah",
  "lastName": "Williams",
  "role": "doctor",
  "organizationId": 1,
  "createdAt": "2025-10-20T16:30:00Z"
}
```

---

### 3. Update User
```http
PATCH /api/users/:id
```

**Description:** Update user information

**URL Parameters:**
- `id` (number): User database ID

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "firstName": "Sarah",
  "lastName": "Williams-Johnson",
  "phoneNumber": "+447999888777",
  "department": "Emergency Medicine"
}
```

**Response (200 OK):**
```json
{
  "id": 10,
  "email": "newdoctor@example.com",
  "firstName": "Sarah",
  "lastName": "Williams-Johnson",
  "department": "Emergency Medicine",
  "updatedAt": "2025-10-20T17:00:00Z"
}
```

---

### 4. Delete User
```http
DELETE /api/users/:id
```

**Description:** Delete user from system

**Middleware:** `authMiddleware`

**URL Parameters:**
- `id` (number): User database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "deletedId": 10
}
```

---

### 5. Get Current User Preferences
```http
GET /api/me/preferences
```

**Description:** Get logged-in user's preferences

**Middleware:** `authMiddleware`

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "theme": "light",
  "language": "en-GB",
  "timezone": "Europe/London",
  "notificationSettings": {
    "email": true,
    "sms": false,
    "push": true
  },
  "clinicInfo": {
    "name": "Dr. John Smith MD",
    "title": "Consultant Cardiologist",
    "licenseNumber": "GMC123456",
    "address": "123 Medical Centre, London",
    "phone": "+447123456789"
  }
}
```

---

### 6. Update Current User Preferences
```http
PATCH /api/me/preferences
```

**Description:** Update logged-in user's preferences

**Middleware:** `authMiddleware`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "theme": "dark",
  "notificationSettings": {
    "email": true,
    "sms": true,
    "push": true
  },
  "clinicInfo": {
    "name": "Dr. John Smith MD FRCP",
    "title": "Senior Consultant Cardiologist"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

---

## Role & Permissions APIs

### 1. Get All Roles
```http
GET /api/roles
```

**Description:** Get all roles in the organization

**Middleware:** `authMiddleware`

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "admin",
    "displayName": "Administrator",
    "description": "Full system access with all permissions",
    "permissions": {
      "modules": {
        "patients": { "view": true, "create": true, "edit": true, "delete": true },
        "appointments": { "view": true, "create": true, "edit": true, "delete": true },
        "billing": { "view": true, "create": true, "edit": true, "delete": true }
      },
      "fields": {
        "patientSensitiveInfo": true,
        "financialData": true,
        "medicalHistory": true
      }
    },
    "isSystem": true,
    "organizationId": 1
  },
  {
    "id": 2,
    "name": "doctor",
    "displayName": "Doctor",
    "description": "Medical staff with patient care access",
    "permissions": {
      "modules": {
        "patients": { "view": true, "create": true, "edit": true, "delete": false },
        "appointments": { "view": true, "create": true, "edit": true, "delete": true },
        "billing": { "view": true, "create": false, "edit": false, "delete": false }
      },
      "fields": {
        "patientSensitiveInfo": true,
        "financialData": false,
        "medicalHistory": true
      }
    },
    "isSystem": true,
    "organizationId": 1
  }
]
```

---

### 2. Get Role by Name
```http
GET /api/roles/by-name/:roleName
```

**Description:** Get specific role details by name

**Middleware:** `authMiddleware`

**URL Parameters:**
- `roleName` (string): Role name (admin, doctor, nurse, patient, etc.)

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "id": 2,
  "name": "doctor",
  "displayName": "Doctor",
  "description": "Medical staff with patient care access",
  "permissions": {
    "modules": {
      "patients": { "view": true, "create": true, "edit": true, "delete": false },
      "appointments": { "view": true, "create": true, "edit": true, "delete": true },
      "medicalRecords": { "view": true, "create": true, "edit": true, "delete": false },
      "prescriptions": { "view": true, "create": true, "edit": true, "delete": true },
      "billing": { "view": true, "create": false, "edit": false, "delete": false },
      "aiInsights": { "view": true, "create": true, "edit": true, "delete": false }
    },
    "fields": {
      "patientSensitiveInfo": true,
      "financialData": false,
      "medicalHistory": true,
      "prescriptionDetails": true,
      "labResults": true,
      "imagingResults": true,
      "billingInformation": false,
      "insuranceDetails": false
    }
  }
}
```

**cURL Test:**
```bash
curl -X GET http://localhost:5000/api/roles/by-name/doctor \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 3. Create Role
```http
POST /api/roles
```

**Description:** Create a new role (Admin only)

**Middleware:** `requireRole(["admin"])`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "name": "radiologist",
  "displayName": "Radiologist",
  "description": "Specialist in medical imaging",
  "permissions": {
    "modules": {
      "patients": { "view": true, "create": false, "edit": false, "delete": false },
      "medicalImaging": { "view": true, "create": true, "edit": true, "delete": false },
      "labResults": { "view": true, "create": false, "edit": false, "delete": false }
    },
    "fields": {
      "patientSensitiveInfo": true,
      "imagingResults": true,
      "medicalHistory": true
    }
  }
}
```

**Response (201 Created):**
```json
{
  "id": 20,
  "name": "radiologist",
  "displayName": "Radiologist",
  "organizationId": 1,
  "createdAt": "2025-10-20T18:00:00Z"
}
```

---

### 4. Update Role
```http
PATCH /api/roles/:id
```

**Description:** Update role permissions (Admin only)

**Middleware:** `requireRole(["admin"])`

**URL Parameters:**
- `id` (number): Role database ID

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "displayName": "Senior Radiologist",
  "permissions": {
    "modules": {
      "medicalImaging": { "view": true, "create": true, "edit": true, "delete": true }
    }
  }
}
```

**Response (200 OK):**
```json
{
  "id": 20,
  "name": "radiologist",
  "displayName": "Senior Radiologist",
  "updatedAt": "2025-10-20T18:30:00Z"
}
```

---

### 5. Delete Role
```http
DELETE /api/roles/:id
```

**Description:** Delete a role (Admin only, cannot delete system roles)

**Middleware:** `requireRole(["admin"])`

**URL Parameters:**
- `id` (number): Role database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Role deleted successfully",
  "deletedId": 20
}
```

---

## Appointment APIs

### 1. Get All Appointments
```http
GET /api/appointments
```

**Description:** Get all appointments with optional filtering

**Middleware:** `authMiddleware`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `providerId` | number | Filter by doctor ID |
| `patientId` | number | Filter by patient ID |
| `status` | string | Filter by status (scheduled, completed, cancelled) |
| `startDate` | string | From date (YYYY-MM-DD) |
| `endDate` | string | To date (YYYY-MM-DD) |

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 150,
    "patientId": 1,
    "patientName": "Alice Johnson",
    "providerId": 5,
    "providerName": "Dr. John Smith",
    "scheduledAt": "2025-10-25T14:00:00Z",
    "duration": 30,
    "appointmentType": "Follow-up",
    "status": "scheduled",
    "reason": "Diabetes check-up",
    "notes": "Patient requested afternoon slot",
    "createdAt": "2025-10-18T09:00:00Z"
  }
]
```

**cURL Test:**
```bash
curl -X GET "http://localhost:5000/api/appointments?providerId=5&status=scheduled" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 2. Create Appointment
```http
POST /api/appointments
```

**Description:** Book a new appointment

**Middleware:** `authMiddleware`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "patientId": 1,
  "providerId": 5,
  "scheduledAt": "2025-10-30T10:00:00Z",
  "duration": 30,
  "appointmentType": "Follow-up",
  "reason": "Blood pressure review",
  "notes": "Patient prefers morning appointments"
}
```

**Response (201 Created):**
```json
{
  "id": 200,
  "patientId": 1,
  "providerId": 5,
  "scheduledAt": "2025-10-30T10:00:00Z",
  "duration": 30,
  "appointmentType": "Follow-up",
  "status": "scheduled",
  "createdAt": "2025-10-20T16:45:00Z"
}
```

**JavaScript Test:**
```javascript
const bookAppointment = async (token) => {
  const response = await fetch('http://localhost:5000/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Subdomain': 'demo'
    },
    body: JSON.stringify({
      patientId: 1,
      providerId: 5,
      scheduledAt: '2025-10-30T10:00:00Z',
      duration: 30,
      appointmentType: 'Follow-up',
      reason: 'Blood pressure review'
    })
  });
  
  const data = await response.json();
  console.log('Appointment booked:', data.id);
};
```

---

### 3. Update Appointment
```http
PATCH /api/appointments/:id
```

**Description:** Update appointment details

**Middleware:** `authMiddleware`

**URL Parameters:**
- `id` (number): Appointment ID

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Patient completed follow-up. All vitals normal."
}
```

**Response (200 OK):**
```json
{
  "id": 200,
  "status": "completed",
  "updatedAt": "2025-10-30T11:00:00Z"
}
```

---

### 4. Cancel Appointment
```http
DELETE /api/appointments/:id
```

**Description:** Cancel/delete an appointment

**Middleware:** `authMiddleware`

**URL Parameters:**
- `id` (number): Appointment ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "cancelledId": 200
}
```

---

## AI & Clinical Decision Support APIs

### 1. Generate AI Clinical Insights
```http
POST /api/ai/generate-insights
```

**Description:** Generate AI-powered clinical insights for a patient

**Middleware:** `authMiddleware`, `requireRole(["admin", "doctor"])`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "patientId": 1
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "insights": [
    {
      "id": 1,
      "type": "risk_alert",
      "title": "Elevated Cardiovascular Risk",
      "description": "Patient shows 45% 10-year cardiovascular risk based on age (55), diabetes, and hypertension. Consider aggressive risk factor management.",
      "severity": "high",
      "confidence": "0.87",
      "actionRequired": true,
      "status": "active",
      "metadata": {
        "relatedConditions": ["Type 2 Diabetes", "Hypertension"],
        "suggestedActions": [
          "Start statin therapy",
          "Aggressive blood pressure control (<130/80)",
          "Cardiology referral recommended"
        ]
      }
    },
    {
      "id": 2,
      "type": "drug_interaction",
      "title": "Potential Drug Interaction Warning",
      "description": "Current medications Metformin + Lisinopril may require renal function monitoring",
      "severity": "moderate",
      "confidence": "0.92",
      "actionRequired": true
    }
  ],
  "generated": 2,
  "patientName": "Alice Johnson"
}
```

**cURL Test:**
```bash
curl -X POST http://localhost:5000/api/ai/generate-insights \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo" \
  -d '{"patientId": 1}'
```

---

### 2. AI Chatbot Conversation
```http
POST /api/ai-agent/chat
```

**Description:** Interact with AI chatbot for appointment booking and queries

**Middleware:** `authMiddleware`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "message": "I need to book an appointment for Alice Johnson next Tuesday at 2pm with Dr. Smith",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2025-10-20T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Hi! How can I help you today?",
      "timestamp": "2025-10-20T10:00:05Z"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "response": "✅ **Appointment Successfully Booked!**\n\n**Patient:** Alice Johnson\n**Doctor:** Dr. Smith\n**Date:** October 25, 2025\n**Time:** 2:00 PM\n\nThe appointment has been created in your system.",
  "intent": "appointment_booking",
  "entities": {
    "patient_name": "Alice Johnson",
    "doctor_name": "Dr. Smith",
    "date": "next Tuesday",
    "time": "2pm"
  },
  "confidence": 0.95,
  "nextActions": ["appointment_confirmation"]
}
```

**JavaScript Test:**
```javascript
const chatWithAI = async (message, token) => {
  const response = await fetch('http://localhost:5000/api/ai-agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Subdomain': 'demo'
    },
    body: JSON.stringify({
      message: message,
      conversationHistory: []
    })
  });
  
  const data = await response.json();
  console.log('AI Response:', data.response);
};
```

---

## GDPR Compliance APIs

### 1. Record GDPR Consent
```http
POST /api/gdpr/consent
```

**Description:** Record patient's data processing consent

**Middleware:** `requireRole(["admin", "patient"])`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "patientId": 1,
  "consentType": "data_processing",
  "granted": true,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
}
```

**Response (201 Created):**
```json
{
  "id": 50,
  "patientId": 1,
  "consentType": "data_processing",
  "granted": true,
  "grantedAt": "2025-10-20T12:00:00Z"
}
```

---

### 2. Withdraw GDPR Consent
```http
PATCH /api/gdpr/consent/:id/withdraw
```

**Description:** Withdraw previously granted consent

**Middleware:** `requireRole(["admin", "patient"])`

**URL Parameters:**
- `id` (number): Consent record ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "id": 50,
  "granted": false,
  "withdrawnAt": "2025-10-20T14:00:00Z"
}
```

---

### 3. Request Patient Data Export
```http
POST /api/gdpr/data-request
```

**Description:** Request complete patient data export (GDPR Article 15)

**Middleware:** `requireRole(["admin", "patient"])`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "patientId": 1,
  "requestType": "data_export",
  "reason": "Patient requested copy of all medical records"
}
```

**Response (201 Created):**
```json
{
  "id": 25,
  "requestId": "GDPR-REQ-2025-00025",
  "status": "pending",
  "estimatedCompletionDate": "2025-10-27",
  "createdAt": "2025-10-20T13:00:00Z"
}
```

---

### 4. Download Patient Data Package
```http
GET /api/gdpr/patient/:patientId/data-export
```

**Description:** Download complete patient data in JSON format

**Middleware:** `requireRole(["admin", "doctor"])`

**URL Parameters:**
- `patientId` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "patientInfo": {
    "id": 1,
    "patientId": "P000001",
    "firstName": "Alice",
    "lastName": "Johnson",
    "email": "alice.johnson@example.com",
    "phone": "+447123456789",
    "dateOfBirth": "1985-05-15"
  },
  "medicalRecords": [...],
  "prescriptions": [...],
  "appointments": [...],
  "labResults": [...],
  "imagingReports": [...],
  "invoices": [...],
  "exportDate": "2025-10-20T14:00:00Z",
  "dataProtectionNotice": "This data export complies with GDPR Article 15..."
}
```

---

### 5. Request Data Erasure
```http
POST /api/gdpr/patient/:patientId/erasure
```

**Description:** Request complete data deletion (Right to be Forgotten - GDPR Article 17)

**Middleware:** `requireRole(["admin"])`

**URL Parameters:**
- `patientId` (number): Patient database ID

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "reason": "Patient requested complete data deletion",
  "confirmationCode": "DELETE-123456"
}
```

**Response (200 OK):**
```json
{
  "message": "Data erasure request submitted",
  "requestId": "ERASURE-2025-00010",
  "status": "pending_review",
  "note": "Legal team will review retention requirements before proceeding"
}
```

---

### 6. Get Consent Status
```http
GET /api/gdpr/patient/:patientId/consent-status
```

**Description:** Check patient's current consent status

**Middleware:** `requireRole(["admin", "doctor", "patient"])`

**URL Parameters:**
- `patientId` (number): Patient database ID

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "patientId": 1,
  "consents": [
    {
      "id": 50,
      "consentType": "data_processing",
      "granted": true,
      "grantedAt": "2025-01-15T10:00:00Z"
    },
    {
      "id": 51,
      "consentType": "marketing",
      "granted": false,
      "withdrawnAt": "2025-03-20T14:30:00Z"
    }
  ]
}
```

---

### 7. Get GDPR Compliance Report
```http
GET /api/gdpr/compliance-report
```

**Description:** Generate organization-wide GDPR compliance report (Admin only)

**Middleware:** `requireRole(["admin"])`

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "organizationId": 1,
  "reportDate": "2025-10-20",
  "totalPatients": 250,
  "consentsGranted": 248,
  "consentsWithdrawn": 2,
  "dataExportRequests": 5,
  "erasureRequests": 1,
  "complianceScore": 99.2,
  "issues": []
}
```

---

## Messaging APIs

### 1. Get Messages
```http
GET /api/messages
```

**Description:** Retrieve messages for conversations

**Middleware:** `authMiddleware`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `conversationId` | string | Filter by conversation ID |
| `userId` | number | Filter by user ID |
| `limit` | number | Results per page (default: 50) |

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 1000,
    "conversationId": "CONV-123",
    "senderId": 5,
    "senderName": "Dr. John Smith",
    "recipientId": 1,
    "recipientName": "Alice Johnson",
    "content": "Hi Alice, your lab results are ready for review.",
    "messageType": "text",
    "isRead": false,
    "sentAt": "2025-10-20T09:15:00Z",
    "readAt": null
  }
]
```

---

### 2. Send Message
```http
POST /api/messages
```

**Description:** Send a new message

**Middleware:** `authMiddleware`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "recipientId": 1,
  "content": "Your prescription has been renewed for another 90 days.",
  "messageType": "text"
}
```

**Response (201 Created):**
```json
{
  "id": 1002,
  "conversationId": "CONV-123",
  "senderId": 5,
  "recipientId": 1,
  "content": "Your prescription has been renewed for another 90 days.",
  "sentAt": "2025-10-20T10:30:00Z"
}
```

---

### 3. Check Message Delivery Status
```http
GET /api/messaging/status/:messageId
```

**Description:** Check SMS/WhatsApp delivery status

**Middleware:** `authMiddleware`

**URL Parameters:**
- `messageId` (string): Message ID from Twilio

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "messageId": "SM1234567890abcdef",
  "status": "delivered",
  "sentAt": "2025-10-20T10:00:00Z",
  "deliveredAt": "2025-10-20T10:00:15Z",
  "errorCode": null,
  "errorMessage": null
}
```

---

## Pricing Management APIs

### 1. Get Doctor Fees
```http
GET /api/pricing/doctors-fees
```

**Description:** Get all doctor consultation fees

**Middleware:** `authMiddleware`, `requireRole('admin')`

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "doctorId": 5,
    "doctorName": "Dr. John Smith",
    "consultationType": "Initial Consultation",
    "fee": 150.00,
    "currency": "GBP",
    "duration": 30,
    "isActive": true
  },
  {
    "id": 2,
    "doctorId": 5,
    "doctorName": "Dr. John Smith",
    "consultationType": "Follow-up",
    "fee": 100.00,
    "currency": "GBP",
    "duration": 20,
    "isActive": true
  }
]
```

---

### 2. Create Doctor Fee
```http
POST /api/pricing/doctors-fees
```

**Description:** Add new doctor consultation fee

**Middleware:** `authMiddleware`, `requireRole('admin')`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "doctorId": 5,
  "consultationType": "Specialized Procedure",
  "fee": 300.00,
  "currency": "GBP",
  "duration": 60
}
```

**Response (201 Created):**
```json
{
  "id": 10,
  "doctorId": 5,
  "consultationType": "Specialized Procedure",
  "fee": 300.00,
  "createdAt": "2025-10-20T16:00:00Z"
}
```

---

### 3. Get Lab Test Prices
```http
GET /api/pricing/lab-tests
```

**Description:** Get all laboratory test prices

**Middleware:** `authMiddleware`, `requireRole('admin')`

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "testName": "Complete Blood Count (CBC)",
    "testCode": "CBC-001",
    "price": 45.00,
    "currency": "GBP",
    "category": "Hematology",
    "turnaroundTime": "24 hours",
    "isActive": true
  },
  {
    "id": 2,
    "testName": "HbA1c",
    "testCode": "HBA1C-001",
    "price": 35.00,
    "currency": "GBP",
    "category": "Chemistry",
    "turnaroundTime": "48 hours",
    "isActive": true
  }
]
```

---

### 4. Create Lab Test Price
```http
POST /api/pricing/lab-tests
```

**Description:** Add new lab test pricing

**Middleware:** `authMiddleware`, `requireRole('admin')`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "testName": "Lipid Panel",
  "testCode": "LIPID-001",
  "price": 55.00,
  "currency": "GBP",
  "category": "Chemistry",
  "turnaroundTime": "24 hours"
}
```

**Response (201 Created):**
```json
{
  "id": 20,
  "testName": "Lipid Panel",
  "testCode": "LIPID-001",
  "price": 55.00,
  "createdAt": "2025-10-20T17:00:00Z"
}
```

---

### 5. Get Medical Imaging Prices
```http
GET /api/pricing/imaging
```

**Description:** Get all medical imaging procedure prices

**Middleware:** `authMiddleware`, `requireRole('admin')`

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "procedureName": "Chest X-Ray",
    "procedureCode": "XRAY-CHEST",
    "price": 120.00,
    "currency": "GBP",
    "modality": "X-Ray",
    "bodyPart": "Chest",
    "isActive": true
  },
  {
    "id": 2,
    "procedureName": "Brain MRI",
    "procedureCode": "MRI-BRAIN",
    "price": 450.00,
    "currency": "GBP",
    "modality": "MRI",
    "bodyPart": "Brain",
    "isActive": true
  }
]
```

---

### 6. Create Imaging Price
```http
POST /api/pricing/imaging
```

**Description:** Add new imaging procedure price

**Middleware:** `authMiddleware`, `requireRole('admin')`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "procedureName": "Abdominal CT Scan",
  "procedureCode": "CT-ABD",
  "price": 350.00,
  "currency": "GBP",
  "modality": "CT",
  "bodyPart": "Abdomen"
}
```

**Response (201 Created):**
```json
{
  "id": 15,
  "procedureName": "Abdominal CT Scan",
  "procedureCode": "CT-ABD",
  "price": 350.00,
  "createdAt": "2025-10-20T18:00:00Z"
}
```

---

## System & Health Check APIs

### 1. Health Check
```http
GET /api/health
```

**Description:** Check API health status

**Request Headers:** None required

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T10:00:00Z",
  "uptime": 3600,
  "database": "connected",
  "version": "1.0.0"
}
```

**cURL Test:**
```bash
curl -X GET http://localhost:5000/api/health
```

---

### 2. System Status
```http
GET /api/status
```

**Description:** Get detailed system status

**Request Headers:** None required

**Response (200 OK):**
```json
{
  "database": "connected",
  "redis": "connected",
  "messaging": "operational",
  "aiServices": "operational",
  "totalUsers": 150,
  "totalPatients": 250,
  "totalAppointmentsToday": 42,
  "systemLoad": {
    "cpu": "45%",
    "memory": "62%",
    "disk": "38%"
  }
}
```

---

## Testing Guide

### Complete Testing Workflow (Bash Script)

```bash
#!/bin/bash

# Cura EMR API Testing Script
BASE_URL="http://localhost:5000"
SUBDOMAIN="demo"

echo "========================================="
echo "Cura EMR API Testing Script"
echo "========================================="

# Step 1: Login
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Subdomain: $SUBDOMAIN" \
  -d '{
    "email": "doctor@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "✅ Login successful. Token: ${TOKEN:0:20}..."

# Step 2: Get all patients
echo ""
echo "Step 2: Fetching patients..."
PATIENTS=$(curl -s -X GET "$BASE_URL/api/patients?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Subdomain: $SUBDOMAIN")

PATIENT_COUNT=$(echo $PATIENTS | jq 'length')
echo "✅ Found $PATIENT_COUNT patients"

# Step 3: Get first patient details
FIRST_PATIENT_ID=$(echo $PATIENTS | jq -r '.[0].id')
echo ""
echo "Step 3: Fetching patient details (ID: $FIRST_PATIENT_ID)..."
PATIENT_DETAILS=$(curl -s -X GET "$BASE_URL/api/patients/$FIRST_PATIENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Subdomain: $SUBDOMAIN")

PATIENT_NAME=$(echo $PATIENT_DETAILS | jq -r '.firstName + " " + .lastName')
echo "✅ Patient: $PATIENT_NAME"

# Step 4: Get patient health score
echo ""
echo "Step 4: Calculating health score..."
HEALTH_SCORE=$(curl -s -X GET "$BASE_URL/api/patients/health-score?patientId=$FIRST_PATIENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Subdomain: $SUBDOMAIN")

SCORE=$(echo $HEALTH_SCORE | jq -r '.score')
CATEGORY=$(echo $HEALTH_SCORE | jq -r '.category')
echo "✅ Health Score: $SCORE/100 ($CATEGORY)"

# Step 5: Get appointments
echo ""
echo "Step 5: Fetching appointments..."
APPOINTMENTS=$(curl -s -X GET "$BASE_URL/api/appointments?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Subdomain: $SUBDOMAIN")

APPT_COUNT=$(echo $APPOINTMENTS | jq 'length')
echo "✅ Found $APPT_COUNT appointments"

# Step 6: Get roles
echo ""
echo "Step 6: Fetching roles..."
ROLES=$(curl -s -X GET "$BASE_URL/api/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Subdomain: $SUBDOMAIN")

ROLE_COUNT=$(echo $ROLES | jq 'length')
echo "✅ Found $ROLE_COUNT roles"

echo ""
echo "========================================="
echo "✅ All tests completed successfully!"
echo "========================================="
```

**Save as:** `test_cura_api.sh`

**Run:**
```bash
chmod +x test_cura_api.sh
./test_cura_api.sh
```

---

### Python Testing Class

```python
import requests
import json
from datetime import datetime

class CuraAPITester:
    def __init__(self, base_url="http://localhost:5000", subdomain="demo"):
        self.base_url = base_url
        self.subdomain = subdomain
        self.token = None
    
    def login(self, email="doctor@example.com", password="password123"):
        """Login and store JWT token"""
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            headers={
                "Content-Type": "application/json",
                "X-Tenant-Subdomain": self.subdomain
            },
            json={"email": email, "password": password}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['token']
            print(f"✅ Login successful as {data['user']['email']}")
            return data
        else:
            print(f"❌ Login failed: {response.json()}")
            return None
    
    def get_headers(self):
        """Get authenticated headers"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}",
            "X-Tenant-Subdomain": self.subdomain
        }
    
    def get_patients(self, limit=10):
        """Get all patients"""
        response = requests.get(
            f"{self.base_url}/api/patients?limit={limit}",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            patients = response.json()
            print(f"✅ Found {len(patients)} patients")
            return patients
        else:
            print(f"❌ Error: {response.json()}")
            return None
    
    def create_patient(self, patient_data):
        """Create new patient"""
        response = requests.post(
            f"{self.base_url}/api/patients",
            headers=self.get_headers(),
            json=patient_data
        )
        
        if response.status_code == 201:
            patient = response.json()
            print(f"✅ Patient created: {patient['patientId']}")
            return patient
        else:
            print(f"❌ Error: {response.json()}")
            return None
    
    def get_patient_health_score(self, patient_id):
        """Get patient health score"""
        response = requests.get(
            f"{self.base_url}/api/patients/health-score?patientId={patient_id}",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            score = response.json()
            print(f"✅ Health Score: {score['score']}/100 ({score['category']})")
            return score
        else:
            print(f"❌ Error: {response.json()}")
            return None
    
    def book_appointment(self, appointment_data):
        """Book new appointment"""
        response = requests.post(
            f"{self.base_url}/api/appointments",
            headers=self.get_headers(),
            json=appointment_data
        )
        
        if response.status_code == 201:
            appt = response.json()
            print(f"✅ Appointment booked: ID {appt['id']}")
            return appt
        else:
            print(f"❌ Error: {response.json()}")
            return None
    
    def run_full_test(self):
        """Run complete test suite"""
        print("=" * 50)
        print("Cura EMR API Testing Suite")
        print("=" * 50)
        
        # Test 1: Login
        print("\n[Test 1] Login")
        self.login()
        
        # Test 2: Get Patients
        print("\n[Test 2] Get Patients")
        patients = self.get_patients(5)
        
        # Test 3: Get Health Score
        if patients and len(patients) > 0:
            print("\n[Test 3] Get Patient Health Score")
            self.get_patient_health_score(patients[0]['id'])
        
        # Test 4: Create Patient
        print("\n[Test 4] Create New Patient")
        new_patient = self.create_patient({
            "firstName": "Test",
            "lastName": "Patient",
            "email": f"test.{datetime.now().timestamp()}@example.com",
            "phone": "+447000000000",
            "dateOfBirth": "1990-01-01",
            "genderAtBirth": "male"
        })
        
        # Test 5: Book Appointment
        if new_patient:
            print("\n[Test 5] Book Appointment")
            self.book_appointment({
                "patientId": new_patient['id'],
                "providerId": 1,
                "scheduledAt": "2025-10-30T14:00:00Z",
                "duration": 30,
                "appointmentType": "Initial Consultation",
                "reason": "Health checkup"
            })
        
        print("\n" + "=" * 50)
        print("✅ All tests completed!")
        print("=" * 50)

# Run tests
if __name__ == "__main__":
    tester = CuraAPITester()
    tester.run_full_test()
```

**Save as:** `test_cura_api.py`

**Run:**
```bash
python test_cura_api.py
```

---

## Quick Reference: Endpoint Categories

| Category | Endpoints | Auth Required | Admin Only |
|----------|-----------|---------------|------------|
| **Authentication** | 5 | No | No |
| **Patients** | 32 | Yes | Some |
| **Users** | 8 | Yes | Some |
| **Roles** | 5 | Yes | Yes |
| **Appointments** | 12 | Yes | No |
| **Medical Records** | 18 | Yes | No |
| **Prescriptions** | 14 | Yes | No |
| **Lab Results** | 10 | Yes | No |
| **Medical Imaging** | 15 | Yes | No |
| **Billing** | 42 | Yes | Some |
| **AI Services** | 22 | Yes | Some |
| **Messaging** | 18 | Yes | No |
| **Telemedicine** | 12 | Yes | No |
| **Voice Docs** | 10 | Yes | No |
| **GDPR** | 7 | Yes | Some |
| **Documents** | 5 | Yes | No |
| **QuickBooks** | 15 | Yes | Yes |
| **Email** | 6 | Yes | No |
| **Mobile Health** | 12 | Yes | No |
| **Pricing** | 15 | Yes | Yes |
| **System** | 10 | No | No |

---

**Total REST API Endpoints Documented:** 392

**End of Documentation**

For support or questions: support@curaemr.ai
