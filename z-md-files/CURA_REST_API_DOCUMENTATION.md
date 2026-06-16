# 📘 Cura EMR - Complete REST API Documentation

## Table of Contents
1. [API Overview](#api-overview)
2. [Authentication APIs](#authentication-apis)
3. [User Management APIs](#user-management-apis)
4. [Patient Management APIs](#patient-management-apis)
5. [Appointment APIs](#appointment-apis)
6. [Medical Records APIs](#medical-records-apis)
7. [Prescription APIs](#prescription-apis)
8. [Billing & Financial APIs](#billing--financial-apis)
9. [Messaging APIs](#messaging-apis)
10. [AI & Clinical Decision Support APIs](#ai--clinical-decision-support-apis)
11. [GDPR Compliance APIs](#gdpr-compliance-apis)
12. [Testing Examples](#testing-examples)

---

## API Overview

### Base URL
```
Production: https://your-domain.com
Development: http://localhost:5000
```

### Standard HTTP Methods
| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| **GET** | Retrieve resources | ✅ Yes | ✅ Yes |
| **POST** | Create new resources | ❌ No | ❌ No |
| **PUT** | Replace entire resource | ✅ Yes | ❌ No |
| **PATCH** | Update partial resource | ❌ No | ❌ No |
| **DELETE** | Remove resource | ✅ Yes | ❌ No |

### Standard HTTP Status Codes
| Code | Meaning | When Used |
|------|---------|-----------|
| **200** | OK | Successful GET, PUT, PATCH, DELETE |
| **201** | Created | Successful POST (resource created) |
| **204** | No Content | Successful DELETE (no response body) |
| **400** | Bad Request | Invalid request payload or parameters |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | Authenticated but lacks permission |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource already exists (duplicate) |
| **422** | Unprocessable Entity | Validation errors |
| **500** | Internal Server Error | Server-side errors |

### Standard Request Headers
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: <organization_subdomain>
```

### Standard Response Format
**Success Response:**
```json
{
  "data": { ... },
  "message": "Success message",
  "timestamp": "2025-10-20T12:34:56Z"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-10-20T12:34:56Z"
}
```

---

## Authentication APIs

### 1. Login (Standard)
**Endpoint:** `POST /api/auth/login`

**Purpose:** Authenticate user and receive JWT token

**Request Headers:**
```http
Content-Type: application/json
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "doctor@example.com",
    "name": "Dr. John Smith",
    "role": "doctor",
    "organizationId": 1
  },
  "organizationSubdomain": "demo"
}
```

**Error Responses:**
```json
// 401 - Invalid credentials
{
  "error": "Invalid email or password"
}

// 404 - User not found
{
  "error": "User not found"
}
```

**Testing Example (cURL):**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Subdomain: demo" \
  -d '{
    "email": "doctor@example.com",
    "password": "securePassword123"
  }'
```

**Testing Example (JavaScript/Fetch):**
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Subdomain': 'demo'
  },
  body: JSON.stringify({
    email: 'doctor@example.com',
    password: 'securePassword123'
  })
});

const data = await response.json();
console.log('Token:', data.token);
localStorage.setItem('auth_token', data.token);
```

**Testing Example (Python):**
```python
import requests

url = "http://localhost:5000/api/auth/login"
headers = {
    "Content-Type": "application/json",
    "X-Tenant-Subdomain": "demo"
}
payload = {
    "email": "doctor@example.com",
    "password": "securePassword123"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print(f"Token: {data['token']}")
```

---

### 2. Validate Token
**Endpoint:** `GET /api/auth/validate`

**Purpose:** Verify if JWT token is still valid

**Request Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "doctor@example.com",
    "name": "Dr. John Smith",
    "role": "doctor"
  }
}
```

**Testing Example (cURL):**
```bash
curl -X GET http://localhost:5000/api/auth/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 3. Universal Login (Multi-Organization)
**Endpoint:** `POST /api/auth/universal-login`

**Purpose:** Login without specifying organization (finds user across all organizations)

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "doctor@example.com",
    "name": "Dr. John Smith",
    "role": "doctor",
    "organizationId": 1
  },
  "organization": {
    "id": 1,
    "name": "Metro Health Center",
    "subdomain": "metro44"
  }
}
```

---

## User Management APIs

### 1. Get All Users
**Endpoint:** `GET /api/users`

**Purpose:** Retrieve all users in the organization

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | string | No | Filter by role (admin, doctor, nurse, patient, etc.) |
| `search` | string | No | Search by name or email |
| `limit` | number | No | Number of results (default: 100) |
| `offset` | number | No | Pagination offset (default: 0) |

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "email": "doctor@example.com",
    "name": "Dr. John Smith",
    "role": "doctor",
    "organizationId": 1,
    "phoneNumber": "+447123456789",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "email": "nurse@example.com",
    "name": "Jane Doe",
    "role": "nurse",
    "organizationId": 1,
    "phoneNumber": "+447987654321",
    "createdAt": "2025-02-20T14:45:00Z"
  }
]
```

**Testing Example (cURL with Query Params):**
```bash
curl -X GET "http://localhost:5000/api/users?role=doctor&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 2. Create User
**Endpoint:** `POST /api/users`

**Purpose:** Create a new user in the system

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
  "password": "SecurePassword123!",
  "name": "Dr. Sarah Williams",
  "role": "doctor",
  "phoneNumber": "+447111222333",
  "specialization": "Cardiology",
  "licenseNumber": "GMC123456"
}
```

**Response (201 Created):**
```json
{
  "id": 10,
  "email": "newdoctor@example.com",
  "name": "Dr. Sarah Williams",
  "role": "doctor",
  "organizationId": 1,
  "phoneNumber": "+447111222333",
  "createdAt": "2025-10-20T12:00:00Z"
}
```

**Error Responses:**
```json
// 409 - User already exists
{
  "error": "User with this email already exists"
}

// 400 - Validation error
{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

**Testing Example (cURL):**
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo" \
  -d '{
    "email": "newdoctor@example.com",
    "password": "SecurePassword123!",
    "name": "Dr. Sarah Williams",
    "role": "doctor"
  }'
```

---

### 3. Update User
**Endpoint:** `PATCH /api/users/:id`

**Purpose:** Update specific user fields

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | User ID to update |

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body (Partial Update):**
```json
{
  "name": "Dr. Sarah Williams-Johnson",
  "phoneNumber": "+447999888777"
}
```

**Response (200 OK):**
```json
{
  "id": 10,
  "email": "newdoctor@example.com",
  "name": "Dr. Sarah Williams-Johnson",
  "role": "doctor",
  "phoneNumber": "+447999888777",
  "updatedAt": "2025-10-20T13:15:00Z"
}
```

**Testing Example (cURL):**
```bash
curl -X PATCH http://localhost:5000/api/users/10 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo" \
  -d '{
    "name": "Dr. Sarah Williams-Johnson"
  }'
```

---

### 4. Delete User
**Endpoint:** `DELETE /api/users/:id`

**Purpose:** Remove user from the system

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | User ID to delete |

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "message": "User deleted successfully",
  "deletedId": 10
}
```

**Error Responses:**
```json
// 404 - User not found
{
  "error": "User not found"
}

// 403 - Cannot delete yourself
{
  "error": "Cannot delete your own account"
}
```

**Testing Example (cURL):**
```bash
curl -X DELETE http://localhost:5000/api/users/10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

## Patient Management APIs

### 1. Get All Patients
**Endpoint:** `GET /api/patients`

**Purpose:** Retrieve all patients with optional filtering

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by name, email, phone, or patient ID |
| `gender` | string | No | Filter by gender (male, female, other) |
| `minAge` | number | No | Minimum age filter |
| `maxAge` | number | No | Maximum age filter |
| `limit` | number | No | Results per page (default: 50) |
| `offset` | number | No | Pagination offset (default: 0) |

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "patientId": "PAT-001234",
    "firstName": "Alice",
    "lastName": "Johnson",
    "email": "alice.johnson@example.com",
    "phoneNumber": "+447123456789",
    "dateOfBirth": "1985-05-15",
    "gender": "female",
    "address": {
      "street": "123 Main Street",
      "city": "London",
      "postcode": "SW1A 1AA",
      "country": "United Kingdom"
    },
    "emergencyContact": {
      "name": "Robert Johnson",
      "relationship": "Spouse",
      "phoneNumber": "+447987654321"
    },
    "medicalHistory": {
      "allergies": ["Penicillin", "Peanuts"],
      "chronicConditions": ["Type 2 Diabetes", "Hypertension"],
      "medications": ["Metformin 500mg", "Lisinopril 10mg"]
    },
    "organizationId": 1,
    "createdAt": "2025-01-10T09:00:00Z"
  }
]
```

**Testing Example (cURL with Search):**
```bash
curl -X GET "http://localhost:5000/api/patients?search=Alice&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 2. Get Patient by ID
**Endpoint:** `GET /api/patients/:id`

**Purpose:** Retrieve detailed information about a specific patient

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Patient database ID |

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "id": 1,
  "patientId": "PAT-001234",
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.johnson@example.com",
  "phoneNumber": "+447123456789",
  "dateOfBirth": "1985-05-15",
  "gender": "female",
  "bloodType": "O+",
  "address": {
    "street": "123 Main Street",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "United Kingdom"
  },
  "emergencyContact": {
    "name": "Robert Johnson",
    "relationship": "Spouse",
    "phoneNumber": "+447987654321"
  },
  "medicalHistory": {
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
        "status": "former",
        "packsPerDay": 0,
        "quitDate": "2015-03-01"
      },
      "alcohol": {
        "status": "social",
        "drinksPerWeek": 3
      },
      "exercise": {
        "frequency": "weekly",
        "type": "Walking"
      }
    }
  },
  "insurance": {
    "provider": "Bupa",
    "policyNumber": "BUP123456789",
    "groupNumber": "GRP001",
    "validUntil": "2026-12-31"
  },
  "organizationId": 1,
  "createdAt": "2025-01-10T09:00:00Z",
  "updatedAt": "2025-10-15T14:30:00Z"
}
```

**Error Responses:**
```json
// 404 - Patient not found
{
  "error": "Patient not found"
}

// 403 - No permission to view patient
{
  "error": "You don't have permission to view this patient"
}
```

**Testing Example (cURL):**
```bash
curl -X GET http://localhost:5000/api/patients/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 3. Create Patient
**Endpoint:** `POST /api/patients`

**Purpose:** Register a new patient in the system

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
  "phoneNumber": "+447555666777",
  "dateOfBirth": "1990-08-22",
  "gender": "male",
  "bloodType": "A+",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Manchester",
    "postcode": "M1 1AA",
    "country": "United Kingdom"
  },
  "emergencyContact": {
    "name": "Emma Brown",
    "relationship": "Wife",
    "phoneNumber": "+447444333222"
  },
  "medicalHistory": {
    "allergies": ["Aspirin"],
    "chronicConditions": [],
    "medications": []
  }
}
```

**Response (201 Created):**
```json
{
  "id": 50,
  "patientId": "PAT-001250",
  "firstName": "Michael",
  "lastName": "Brown",
  "email": "michael.brown@example.com",
  "phoneNumber": "+447555666777",
  "dateOfBirth": "1990-08-22",
  "organizationId": 1,
  "createdAt": "2025-10-20T15:00:00Z"
}
```

**Testing Example (JavaScript):**
```javascript
const createPatient = async () => {
  const response = await fetch('http://localhost:5000/api/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      'X-Tenant-Subdomain': 'demo'
    },
    body: JSON.stringify({
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael.brown@example.com',
      phoneNumber: '+447555666777',
      dateOfBirth: '1990-08-22',
      gender: 'male'
    })
  });
  
  const data = await response.json();
  console.log('New patient created:', data);
};
```

---

### 4. Update Patient
**Endpoint:** `PATCH /api/patients/:id`

**Purpose:** Update patient information

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Patient database ID |

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body (Partial Update):**
```json
{
  "phoneNumber": "+447111999888",
  "email": "michael.brown.new@example.com",
  "medicalHistory": {
    "allergies": ["Aspirin", "Latex"],
    "medications": ["Atorvastatin 20mg"]
  }
}
```

**Response (200 OK):**
```json
{
  "id": 50,
  "patientId": "PAT-001250",
  "firstName": "Michael",
  "lastName": "Brown",
  "phoneNumber": "+447111999888",
  "email": "michael.brown.new@example.com",
  "updatedAt": "2025-10-20T16:30:00Z"
}
```

---

### 5. Delete Patient
**Endpoint:** `DELETE /api/patients/:id`

**Purpose:** Remove patient from the system (Admin only)

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Patient database ID |

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "message": "Patient deleted successfully",
  "deletedId": 50
}
```

---

### 6. Get Patient Medical Records
**Endpoint:** `GET /api/patients/:id/records`

**Purpose:** Retrieve all medical records for a patient

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Patient database ID |

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
    "visitType": "Follow-up",
    "chiefComplaint": "Diabetes check-up",
    "notes": "Patient reports good glucose control. BP: 125/80, HR: 72, SpO2: 98%",
    "diagnosis": ["Type 2 Diabetes - controlled", "Hypertension - stable"],
    "prescriptions": [
      {
        "medication": "Metformin 500mg",
        "dosage": "500mg",
        "frequency": "Twice daily",
        "duration": "90 days"
      }
    ],
    "vitalSigns": {
      "bloodPressure": "125/80",
      "heartRate": 72,
      "temperature": 36.8,
      "spo2": 98,
      "weight": 78.5,
      "height": 175
    },
    "createdAt": "2025-10-15T10:30:00Z"
  }
]
```

---

### 7. Get Patient Health Score
**Endpoint:** `GET /api/patients/health-score`

**Purpose:** Calculate patient's overall health score based on vitals and medical history

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | number | Yes | Patient database ID |

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
  "lastUpdated": "2025-10-20T12:00:00Z"
}
```

**Testing Example (cURL):**
```bash
curl -X GET "http://localhost:5000/api/patients/health-score?patientId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

## Appointment APIs

### 1. Get All Appointments
**Endpoint:** `GET /api/appointments`

**Purpose:** Retrieve appointments with optional filtering

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `providerId` | number | No | Filter by doctor ID |
| `patientId` | number | No | Filter by patient ID |
| `status` | string | No | Filter by status (scheduled, completed, cancelled) |
| `startDate` | string | No | Filter from date (ISO 8601: YYYY-MM-DD) |
| `endDate` | string | No | Filter to date (ISO 8601: YYYY-MM-DD) |
| `limit` | number | No | Results per page (default: 100) |

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
  },
  {
    "id": 151,
    "patientId": 2,
    "patientName": "Bob Smith",
    "providerId": 5,
    "providerName": "Dr. John Smith",
    "scheduledAt": "2025-10-25T15:00:00Z",
    "duration": 45,
    "appointmentType": "New Patient",
    "status": "scheduled",
    "reason": "Initial consultation",
    "createdAt": "2025-10-19T11:30:00Z"
  }
]
```

**Testing Example (cURL with Filters):**
```bash
curl -X GET "http://localhost:5000/api/appointments?providerId=5&startDate=2025-10-25&status=scheduled" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Subdomain: demo"
```

---

### 2. Create Appointment
**Endpoint:** `POST /api/appointments`

**Purpose:** Schedule a new appointment

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

**Error Responses:**
```json
// 409 - Time slot already booked
{
  "error": "This time slot is already booked"
}

// 400 - Invalid date/time
{
  "error": "Appointment time must be in the future"
}
```

**Testing Example (JavaScript):**
```javascript
const bookAppointment = async () => {
  const response = await fetch('http://localhost:5000/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
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
  
  if (response.ok) {
    const data = await response.json();
    console.log('Appointment booked:', data);
  } else {
    const error = await response.json();
    console.error('Booking failed:', error);
  }
};
```

---

### 3. Update Appointment
**Endpoint:** `PATCH /api/appointments/:id`

**Purpose:** Update appointment details or status

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Appointment ID |

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
  "notes": "Patient completed follow-up. All vitals normal.",
  "updatedAt": "2025-10-30T11:00:00Z"
}
```

---

### 4. Cancel Appointment
**Endpoint:** `DELETE /api/appointments/:id`

**Purpose:** Cancel/delete an appointment

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Appointment ID |

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Response (200 OK):**
```json
{
  "message": "Appointment cancelled successfully",
  "cancelledId": 200
}
```

---

## Medical Records APIs

### 1. Get Medical Records
**Endpoint:** `GET /api/medical-records`

**Purpose:** Retrieve medical records with filtering

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | number | No | Filter by patient ID |
| `providerId` | number | No | Filter by provider ID |
| `startDate` | string | No | Records from date (YYYY-MM-DD) |
| `endDate` | string | No | Records to date (YYYY-MM-DD) |
| `limit` | number | No | Results per page (default: 50) |

**Response (200 OK):**
```json
[
  {
    "id": 500,
    "patientId": 1,
    "patientName": "Alice Johnson",
    "providerId": 5,
    "providerName": "Dr. John Smith",
    "visitDate": "2025-10-20",
    "visitType": "Follow-up",
    "chiefComplaint": "Diabetes management",
    "notes": "BP: 130/85, HR: 75, SpO2: 97%, Temp: 36.9°C. HbA1c: 7.2%. Patient adhering to medication.",
    "diagnosis": ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
    "prescriptions": [
      {
        "medication": "Metformin",
        "dosage": "500mg",
        "frequency": "Twice daily",
        "duration": "90 days"
      }
    ],
    "vitalSigns": {
      "bloodPressure": "130/85",
      "heartRate": 75,
      "temperature": 36.9,
      "spo2": 97
    },
    "createdAt": "2025-10-20T14:00:00Z"
  }
]
```

---

### 2. Create Medical Record
**Endpoint:** `POST /api/medical-records`

**Purpose:** Create a new medical record after patient visit

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
  "visitDate": "2025-10-20",
  "visitType": "Follow-up",
  "chiefComplaint": "Follow-up diabetes check",
  "notes": "Patient reports improved glucose control. BP: 125/80, HR: 72, SpO2: 98%. HbA1c trending downward.",
  "diagnosis": ["Type 2 Diabetes - improved control"],
  "prescriptions": [
    {
      "medication": "Metformin",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "90 days"
    }
  ],
  "vitalSigns": {
    "bloodPressure": "125/80",
    "heartRate": 72,
    "temperature": 36.8,
    "spo2": 98,
    "weight": 77.5,
    "height": 175
  }
}
```

**Response (201 Created):**
```json
{
  "id": 501,
  "patientId": 1,
  "providerId": 5,
  "visitDate": "2025-10-20",
  "createdAt": "2025-10-20T15:30:00Z"
}
```

---

## Prescription APIs

### 1. Get Prescriptions
**Endpoint:** `GET /api/prescriptions`

**Purpose:** Retrieve prescriptions for patients

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | number | No | Filter by patient ID |
| `status` | string | No | Filter by status (active, expired, cancelled) |

**Response (200 OK):**
```json
[
  {
    "id": 300,
    "patientId": 1,
    "patientName": "Alice Johnson",
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
    "prescribedDate": "2025-10-20",
    "expiryDate": "2026-01-20",
    "createdAt": "2025-10-20T14:00:00Z"
  }
]
```

---

### 2. Create Prescription
**Endpoint:** `POST /api/prescriptions`

**Purpose:** Create a new prescription

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
  "medicationName": "Lisinopril",
  "dosage": "10mg",
  "frequency": "Once daily",
  "duration": "90 days",
  "quantity": 90,
  "refills": 3,
  "instructions": "Take in the morning"
}
```

**Response (201 Created):**
```json
{
  "id": 301,
  "patientId": 1,
  "medicationName": "Lisinopril",
  "status": "active",
  "createdAt": "2025-10-20T16:00:00Z"
}
```

---

## Billing & Financial APIs

### 1. Get Invoices
**Endpoint:** `GET /api/financial/invoices`

**Purpose:** Retrieve invoices for billing

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | number | No | Filter by patient ID |
| `status` | string | No | Filter by status (paid, pending, overdue) |
| `startDate` | string | No | From date (YYYY-MM-DD) |
| `endDate` | string | No | To date (YYYY-MM-DD) |

**Response (200 OK):**
```json
[
  {
    "id": 700,
    "invoiceNumber": "INV-2025-001234",
    "patientId": 1,
    "patientName": "Alice Johnson",
    "issueDate": "2025-10-20",
    "dueDate": "2025-11-04",
    "totalAmount": 250.00,
    "paidAmount": 0.00,
    "balanceDue": 250.00,
    "status": "pending",
    "items": [
      {
        "description": "Consultation - Dr. John Smith",
        "quantity": 1,
        "unitPrice": 150.00,
        "totalPrice": 150.00
      },
      {
        "description": "Blood Test - HbA1c",
        "quantity": 1,
        "unitPrice": 100.00,
        "totalPrice": 100.00
      }
    ],
    "createdAt": "2025-10-20T17:00:00Z"
  }
]
```

---

### 2. Create Invoice
**Endpoint:** `POST /api/financial/invoices`

**Purpose:** Generate a new invoice

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
  "items": [
    {
      "description": "Follow-up Consultation",
      "quantity": 1,
      "unitPrice": 120.00
    },
    {
      "description": "Blood Pressure Monitoring",
      "quantity": 1,
      "unitPrice": 50.00
    }
  ],
  "dueDate": "2025-11-15",
  "notes": "Payment due within 15 days"
}
```

**Response (201 Created):**
```json
{
  "id": 701,
  "invoiceNumber": "INV-2025-001235",
  "totalAmount": 170.00,
  "status": "pending",
  "createdAt": "2025-10-20T18:00:00Z"
}
```

---

### 3. Record Payment
**Endpoint:** `POST /api/financial/payments`

**Purpose:** Record a payment against an invoice

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "invoiceId": 700,
  "amount": 250.00,
  "paymentMethod": "credit_card",
  "transactionId": "TXN123456789",
  "paymentDate": "2025-10-21"
}
```

**Response (201 Created):**
```json
{
  "id": 850,
  "invoiceId": 700,
  "amount": 250.00,
  "paymentMethod": "credit_card",
  "status": "completed",
  "createdAt": "2025-10-21T10:00:00Z"
}
```

---

## Messaging APIs

### 1. Get Messages
**Endpoint:** `GET /api/messages`

**Purpose:** Retrieve messages for a conversation

**Request Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string | No | Filter by conversation ID |
| `userId` | number | No | Filter by user ID |
| `limit` | number | No | Results per page (default: 50) |

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
  },
  {
    "id": 1001,
    "conversationId": "CONV-123",
    "senderId": 1,
    "senderName": "Alice Johnson",
    "recipientId": 5,
    "recipientName": "Dr. John Smith",
    "content": "Thank you, doctor. When can we discuss them?",
    "messageType": "text",
    "isRead": true,
    "sentAt": "2025-10-20T09:20:00Z",
    "readAt": "2025-10-20T09:21:00Z"
  }
]
```

---

### 2. Send Message
**Endpoint:** `POST /api/messages`

**Purpose:** Send a new message

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

## AI & Clinical Decision Support APIs

### 1. Generate AI Insights
**Endpoint:** `POST /api/ai/generate-insights`

**Purpose:** Generate AI-powered clinical insights for a patient

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
  "analysisType": "risk_assessment"
}
```

**Response (200 OK):**
```json
{
  "patientId": 1,
  "insights": [
    {
      "type": "risk_alert",
      "title": "Elevated Cardiovascular Risk",
      "description": "Patient shows 45% 10-year cardiovascular risk based on age, diabetes, and hypertension",
      "severity": "high",
      "confidence": 0.87,
      "recommendations": [
        "Consider starting statin therapy",
        "Aggressive blood pressure control",
        "Cardiology referral recommended"
      ]
    }
  ],
  "generatedAt": "2025-10-20T11:00:00Z"
}
```

---

### 2. Analyze Prescription Safety
**Endpoint:** `POST /api/ai/prescription-safety`

**Purpose:** Check drug interactions and safety for new prescriptions

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
  "newMedications": [
    {
      "name": "Aspirin",
      "dosage": "100mg",
      "frequency": "Once daily"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "isApproved": false,
  "riskLevel": "moderate",
  "warnings": [
    {
      "type": "interaction",
      "severity": "moderate",
      "description": "Aspirin may interact with current Warfarin therapy",
      "drugs": ["Aspirin", "Warfarin"],
      "management": "Monitor INR closely. Consider alternative antiplatelet."
    }
  ],
  "recommendations": [
    "Consider alternative antiplatelet therapy",
    "Monitor for bleeding signs"
  ],
  "requiredMonitoring": ["INR", "CBC"],
  "pharmacistReview": true
}
```

---

### 3. AI Chatbot Conversation
**Endpoint:** `POST /api/ai/chat`

**Purpose:** Interact with AI chatbot for appointments and general queries

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Tenant-Subdomain: demo
```

**Request Body:**
```json
{
  "message": "I need to book an appointment for next Tuesday at 2pm",
  "sessionHistory": [
    {
      "sender": "user",
      "content": "Hello"
    },
    {
      "sender": "assistant",
      "content": "Hi! How can I help you today?"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "response": "I can help you book an appointment for Tuesday at 2pm. May I have your name and phone number?",
  "intent": {
    "intent": "appointment_booking",
    "confidence": 0.92,
    "extractedData": {
      "appointmentDate": "next Tuesday",
      "appointmentTime": "2pm"
    }
  },
  "requiresFollowUp": true,
  "nextAction": "collect_patient_info"
}
```

---

## GDPR Compliance APIs

### 1. Record GDPR Consent
**Endpoint:** `POST /api/gdpr/consent`

**Purpose:** Record patient's GDPR data processing consent

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
  "userAgent": "Mozilla/5.0..."
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

### 2. Request Data Export
**Endpoint:** `POST /api/gdpr/data-request`

**Purpose:** Request patient data export (GDPR Article 15)

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

### 3. Get Patient Data Export
**Endpoint:** `GET /api/gdpr/patient/:patientId/data-export`

**Purpose:** Download complete patient data package

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `patientId` | number | Patient database ID |

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
    "name": "Alice Johnson",
    "email": "alice.johnson@example.com",
    "phone": "+447123456789"
  },
  "medicalRecords": [...],
  "prescriptions": [...],
  "appointments": [...],
  "labResults": [...],
  "imagingReports": [...],
  "invoices": [...],
  "exportDate": "2025-10-20T14:00:00Z"
}
```

---

### 4. Request Data Erasure
**Endpoint:** `POST /api/gdpr/patient/:patientId/erasure`

**Purpose:** Request patient data deletion (GDPR Article 17 - Right to be Forgotten)

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `patientId` | number | Patient database ID |

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

## Testing Examples

### Complete End-to-End Testing Flow

#### 1. Login and Store Token
```bash
# Step 1: Login
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Subdomain: demo" \
  -d '{
    "email": "doctor@example.com",
    "password": "password123"
  }' | jq -r '.token')

echo "Token: $TOKEN"
```

#### 2. Create a Patient
```bash
# Step 2: Create Patient
PATIENT_ID=$(curl -X POST http://localhost:5000/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Subdomain: demo" \
  -d '{
    "firstName": "Test",
    "lastName": "Patient",
    "email": "test.patient@example.com",
    "phoneNumber": "+447000000000",
    "dateOfBirth": "1980-01-01",
    "gender": "male"
  }' | jq -r '.id')

echo "Patient ID: $PATIENT_ID"
```

#### 3. Book an Appointment
```bash
# Step 3: Book Appointment
curl -X POST http://localhost:5000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Subdomain: demo" \
  -d "{
    \"patientId\": $PATIENT_ID,
    \"providerId\": 1,
    \"scheduledAt\": \"2025-10-30T10:00:00Z\",
    \"duration\": 30,
    \"appointmentType\": \"Initial Consultation\",
    \"reason\": \"General health check\"
  }"
```

#### 4. Create Medical Record
```bash
# Step 4: Create Medical Record
curl -X POST http://localhost:5000/api/medical-records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Subdomain: demo" \
  -d "{
    \"patientId\": $PATIENT_ID,
    \"providerId\": 1,
    \"visitDate\": \"2025-10-30\",
    \"visitType\": \"Initial Consultation\",
    \"chiefComplaint\": \"Annual checkup\",
    \"notes\": \"BP: 120/80, HR: 70, SpO2: 98%. Patient is healthy.\",
    \"diagnosis\": [\"Healthy\"],
    \"vitalSigns\": {
      \"bloodPressure\": \"120/80\",
      \"heartRate\": 70,
      \"spo2\": 98
    }
  }"
```

---

### Testing with Postman

**Collection Setup:**

1. **Environment Variables:**
```json
{
  "base_url": "http://localhost:5000",
  "tenant_subdomain": "demo",
  "auth_token": ""
}
```

2. **Pre-request Script (for authenticated requests):**
```javascript
// Store token from login response
if (pm.response.json().token) {
  pm.environment.set("auth_token", pm.response.json().token);
}
```

3. **Headers Template:**
```
Content-Type: application/json
Authorization: Bearer {{auth_token}}
X-Tenant-Subdomain: {{tenant_subdomain}}
```

---

### Testing with Python (requests library)

```python
import requests
import json

# Configuration
BASE_URL = "http://localhost:5000"
SUBDOMAIN = "demo"

class CuraAPIClient:
    def __init__(self, base_url, subdomain):
        self.base_url = base_url
        self.subdomain = subdomain
        self.token = None
    
    def login(self, email, password):
        """Login and store token"""
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            headers={
                "Content-Type": "application/json",
                "X-Tenant-Subdomain": self.subdomain
            },
            json={
                "email": email,
                "password": password
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['token']
            print(f"✅ Login successful. Token: {self.token[:20]}...")
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
    
    def get_patients(self, search=None):
        """Get all patients"""
        params = {}
        if search:
            params['search'] = search
        
        response = requests.get(
            f"{self.base_url}/api/patients",
            headers=self.get_headers(),
            params=params
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
            print(f"✅ Patient created: ID {patient['id']}")
            return patient
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
            appointment = response.json()
            print(f"✅ Appointment booked: ID {appointment['id']}")
            return appointment
        else:
            print(f"❌ Error: {response.json()}")
            return None

# Usage Example
if __name__ == "__main__":
    # Initialize client
    client = CuraAPIClient(BASE_URL, SUBDOMAIN)
    
    # Login
    client.login("doctor@example.com", "password123")
    
    # Get all patients
    patients = client.get_patients(search="Alice")
    
    # Create a new patient
    new_patient = client.create_patient({
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phoneNumber": "+447111222333",
        "dateOfBirth": "1990-05-15",
        "gender": "male"
    })
    
    # Book appointment
    if new_patient:
        appointment = client.book_appointment({
            "patientId": new_patient['id'],
            "providerId": 1,
            "scheduledAt": "2025-10-30T14:00:00Z",
            "duration": 30,
            "appointmentType": "Initial Consultation",
            "reason": "Annual checkup"
        })
```

---

### Testing with JavaScript (Node.js)

```javascript
const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:5000';
const SUBDOMAIN = 'demo';

class CuraAPIClient {
  constructor(baseUrl, subdomain) {
    this.baseUrl = baseUrl;
    this.subdomain = subdomain;
    this.token = null;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': this.subdomain
      },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      this.token = data.token;
      console.log('✅ Login successful');
      return data;
    } else {
      const error = await response.json();
      console.error('❌ Login failed:', error);
      throw new Error(error.error);
    }
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'X-Tenant-Subdomain': this.subdomain
    };
  }

  async getPatients(search = null) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response = await fetch(
      `${this.baseUrl}/api/patients?${params}`,
      { headers: this.getHeaders() }
    );

    if (response.ok) {
      const patients = await response.json();
      console.log(`✅ Found ${patients.length} patients`);
      return patients;
    } else {
      const error = await response.json();
      console.error('❌ Error:', error);
      throw new Error(error.error);
    }
  }

  async createPatient(patientData) {
    const response = await fetch(`${this.baseUrl}/api/patients`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(patientData)
    });

    if (response.ok) {
      const patient = await response.json();
      console.log(`✅ Patient created: ID ${patient.id}`);
      return patient;
    } else {
      const error = await response.json();
      console.error('❌ Error:', error);
      throw new Error(error.error);
    }
  }
}

// Usage
(async () => {
  const client = new CuraAPIClient(BASE_URL, SUBDOMAIN);

  try {
    // Login
    await client.login('doctor@example.com', 'password123');

    // Get patients
    const patients = await client.getPatients('Alice');

    // Create patient
    const newPatient = await client.createPatient({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phoneNumber: '+447222333444',
      dateOfBirth: '1985-08-20',
      gender: 'female'
    });

  } catch (error) {
    console.error('Test failed:', error.message);
  }
})();
```

---

## API Rate Limiting & Best Practices

### Rate Limits
| Endpoint Type | Rate Limit | Window |
|--------------|------------|--------|
| Authentication | 10 requests | 1 minute |
| Patient Data | 100 requests | 1 minute |
| AI Services | 20 requests | 1 minute |
| General APIs | 200 requests | 1 minute |

### Best Practices

1. **Always include tenant subdomain header**
   ```http
   X-Tenant-Subdomain: demo
   ```

2. **Store JWT token securely**
   ```javascript
   // ✅ Good
   localStorage.setItem('auth_token', token);
   
   // ❌ Bad - Don't store in cookies without httpOnly flag
   document.cookie = `token=${token}`;
   ```

3. **Handle errors gracefully**
   ```javascript
   try {
     const response = await fetch('/api/patients');
     if (!response.ok) {
       const error = await response.json();
       // Handle specific error codes
       if (response.status === 401) {
         // Redirect to login
       } else if (response.status === 403) {
         // Show permission denied message
       }
     }
   } catch (error) {
     console.error('Network error:', error);
   }
   ```

4. **Use pagination for large datasets**
   ```http
   GET /api/patients?limit=50&offset=0
   ```

5. **Validate input before sending**
   ```javascript
   // Validate email format
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(email)) {
     console.error('Invalid email format');
     return;
   }
   ```

---

## Quick Reference: Common Endpoints

| Category | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| **Auth** | POST | `/api/auth/login` | User login |
| **Auth** | GET | `/api/auth/validate` | Validate token |
| **Users** | GET | `/api/users` | List all users |
| **Users** | POST | `/api/users` | Create user |
| **Users** | PATCH | `/api/users/:id` | Update user |
| **Users** | DELETE | `/api/users/:id` | Delete user |
| **Patients** | GET | `/api/patients` | List patients |
| **Patients** | POST | `/api/patients` | Create patient |
| **Patients** | GET | `/api/patients/:id` | Get patient details |
| **Patients** | PATCH | `/api/patients/:id` | Update patient |
| **Patients** | DELETE | `/api/patients/:id` | Delete patient |
| **Appointments** | GET | `/api/appointments` | List appointments |
| **Appointments** | POST | `/api/appointments` | Book appointment |
| **Appointments** | PATCH | `/api/appointments/:id` | Update appointment |
| **Appointments** | DELETE | `/api/appointments/:id` | Cancel appointment |
| **Medical Records** | GET | `/api/medical-records` | List records |
| **Medical Records** | POST | `/api/medical-records` | Create record |
| **Prescriptions** | GET | `/api/prescriptions` | List prescriptions |
| **Prescriptions** | POST | `/api/prescriptions` | Create prescription |
| **Billing** | GET | `/api/financial/invoices` | List invoices |
| **Billing** | POST | `/api/financial/invoices` | Create invoice |
| **Billing** | POST | `/api/financial/payments` | Record payment |
| **Messages** | GET | `/api/messages` | List messages |
| **Messages** | POST | `/api/messages` | Send message |
| **AI** | POST | `/api/ai/generate-insights` | Generate insights |
| **AI** | POST | `/api/ai/prescription-safety` | Check drug safety |
| **AI** | POST | `/api/ai/chat` | Chatbot conversation |
| **GDPR** | POST | `/api/gdpr/consent` | Record consent |
| **GDPR** | POST | `/api/gdpr/data-request` | Request data export |
| **GDPR** | GET | `/api/gdpr/patient/:id/data-export` | Download patient data |

---

**End of Documentation**

For additional support or API questions, please contact: support@curaemr.ai
