# Cura EMR Dashboard APIs Documentation

## Overview
This document provides comprehensive documentation for all dashboard APIs available for different user roles (Admin, Doctor, Nurse, and Patient) in the Cura EMR system.

## Base URL
- **Production**: `https://app.curaemr.ai/api`
- **Local Development**: `http://localhost:1100/api`

## Authentication
All dashboard endpoints require authentication using a Bearer token obtained from the login endpoint.

### Required Headers
```json
{
  "Authorization": "Bearer <token>",
  "X-Tenant-Subdomain": "<subdomain>",
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

---

## Admin Dashboard APIs

### 1. Get Dashboard Stats
**Endpoint**: `GET /api/dashboard/stats`

**Description**: Returns organization-wide dashboard statistics including total patients, today's appointments, AI suggestions count, and total revenue.

**Headers**:
- `Authorization: Bearer <token>` (Required)
- `X-Tenant-Subdomain: <subdomain>` (Required)
- `Content-Type: application/json`
- `Accept: application/json`

**Request Body**: None

**Response**: `200 OK`
```json
{
  "totalPatients": 150,
  "todayAppointments": 12,
  "aiSuggestions": 5,
  "revenue": 50000
}
```

**Error Responses**:
- `500 Internal Server Error`
```json
{
  "error": "Failed to fetch dashboard stats"
}
```

**API Verification**:
✅ **Correct** - Endpoint exists at line 3071 in `server/routes.ts`
- Uses `storage.getDashboardStats(organizationId)` 
- Returns: `totalPatients`, `todayAppointments`, `aiSuggestions`, `revenue`
- No authentication middleware (should be added for security)

**Issues Found**:
⚠️ **Security Concern**: This endpoint does NOT have `authMiddleware` or role restrictions. It should be protected.

---

### 2. Get AI Insights
**Endpoint**: `GET /api/dashboard/ai-insights`

**Description**: Returns up to 10 AI insights for the organization.

**Headers**:
- `Authorization: Bearer <token>` (Required)
- `X-Tenant-Subdomain: <subdomain>` (Required)
- `Content-Type: application/json`
- `Accept: application/json`

**Request Body**: None

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "type": "patient_risk",
    "message": "Patient shows high risk factors",
    "confidence": "0.85",
    "patientId": 1,
    "organizationId": 1,
    "createdAt": "2025-01-28T10:00:00Z"
  }
]
```

**Error Responses**:
- `500 Internal Server Error`
```json
{
  "error": "Failed to fetch AI insights"
}
```

**API Verification**:
✅ **Correct** - Endpoint exists at line 3081 in `server/routes.ts`
- Uses `storage.getAiInsightsByOrganization(organizationId, 10)`
- Returns array of AI insights

**Issues Found**:
⚠️ **Security Concern**: This endpoint does NOT have `authMiddleware` or role restrictions. It should be protected.

---

## Doctor Dashboard APIs

### 1. Get Doctor Dashboard (Mobile - Version 1)
**Endpoint**: `GET /api/mobile/doctor/dashboard`

**Description**: Returns doctor-specific dashboard data including today's appointments count, total patients, pending prescriptions count, and upcoming appointments list.

**Headers**:
- `Authorization: Bearer <token>` (Required)
- `X-Tenant-Subdomain: <subdomain>` (Required)
- `Content-Type: application/json`
- `Accept: application/json`

**Request Body**: None

**Response**: `200 OK`
```json
{
  "todayAppointments": 5,
  "totalPatients": 150,
  "pendingPrescriptions": 3,
  "upcomingAppointments": [
    {
      "id": 1,
      "patientName": "Patient 1",
      "time": "2025-01-28T10:00:00Z",
      "type": "consultation",
      "status": "scheduled"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`
```json
{
  "error": "Unauthorized"
}
```

- `500 Internal Server Error`
```json
{
  "error": "Failed to fetch dashboard data"
}
```

**API Verification**:
✅ **Correct** - Endpoint exists at line 21596 in `server/routes.ts`
- Has `authMiddleware` protection
- Uses `req.user?.id` to get doctor's appointments
- Filters appointments for today
- Returns doctor-specific data

**Issues Found**:
⚠️ **No Role Check**: This endpoint does NOT explicitly check for "doctor" role. Any authenticated user can access it.

---

### 2. Get Doctor Dashboard (Mobile - Version 2 with Role Check)
**Endpoint**: `GET /api/mobile/doctor/dashboard`

**Description**: Alternative doctor dashboard endpoint with explicit role requirement. This is a duplicate endpoint at line 22039.

**Headers**:
- `Authorization: Bearer <token>` (Required)
- `X-Tenant-Subdomain: <subdomain>` (Required)
- `Content-Type: application/json`
- `Accept: application/json`

**Request Body**: None

**Response**: `200 OK`
```json
{
  "todayAppointments": 5,
  "totalPatients": 150,
  "pendingPrescriptions": 3,
  "upcomingAppointments": [
    {
      "id": 1,
      "patientName": "Patient Name",
      "time": "2025-01-28T10:00:00Z",
      "type": "consultation",
      "status": "scheduled"
    }
  ]
}
```

**API Verification**:
✅ **Correct** - Endpoint exists at line 22039 in `server/routes.ts`
- Has `authMiddleware` protection
- Has `requireRole(["doctor"])` - **Properly secured**
- Uses organization-wide data (not doctor-specific)
- Returns similar structure

**Issues Found**:
⚠️ **Duplicate Endpoint**: There are TWO endpoints with the same path `/api/mobile/doctor/dashboard`:
  1. Line 21596: No role check, uses `req.user?.id` (doctor-specific)
  2. Line 22039: Has role check, uses organization-wide data

**Recommendation**: Remove one of these duplicate endpoints or merge them.

---

## Nurse Dashboard APIs

### 1. Get Dashboard Stats (Nurse)
**Endpoint**: `GET /api/dashboard/stats`

**Description**: Nurse can access the same dashboard stats endpoint as admin. Returns organization-wide statistics.

**Headers**:
- `Authorization: Bearer <token>` (Required)
- `X-Tenant-Subdomain: <subdomain>` (Required)
- `Content-Type: application/json`
- `Accept: application/json`

**Request Body**: None

**Response**: Same as Admin Dashboard Stats

**API Verification**:
✅ **Correct** - Nurse can access `/api/dashboard/stats` (same endpoint as admin)
- No role restrictions on this endpoint
- Returns organization-wide stats

**Issues Found**:
⚠️ **Security Concern**: No role-based access control. Any authenticated user can access this.

---

### 2. Get AI Insights (Nurse)
**Endpoint**: `GET /api/dashboard/ai-insights`

**Description**: Nurse can access AI insights. Returns organization-wide AI insights.

**Headers**:
- `Authorization: Bearer <token>` (Required)
- `X-Tenant-Subdomain: <subdomain>` (Required)
- `Content-Type: application/json`
- `Accept: application/json`

**Request Body**: None

**Response**: Same as Admin AI Insights

**API Verification**:
✅ **Correct** - Nurse can access `/api/dashboard/ai-insights` (same endpoint as admin)

---

### 3. Get Clinical Insights (Nurse)
**Endpoint**: `GET /api/clinical/insights`

**Description**: Get clinical insights. Requires doctor, nurse, or admin role. Returns up to 50 AI insights with transformed confidence values.

**Headers**:
- `Authorization: Bearer <token>` (Required)
- `X-Tenant-Subdomain: <subdomain>` (Required)
- `Content-Type: application/json`
- `Accept: application/json`

**Request Body**: None

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "type": "patient_risk",
    "message": "Patient shows high risk factors",
    "confidence": 0.85,
    "patientId": 1,
    "organizationId": 1,
    "createdAt": "2025-01-28T10:00:00Z"
  }
]
```

**API Verification**:
✅ **Correct** - Endpoint exists at line 8889 in `server/routes.ts`
- Has `requireRole(["doctor", "nurse", "admin"])` - **Properly secured**
- Returns up to 50 insights
- Transforms confidence from string to number

---

## Patient Dashboard APIs

### 1. Get Patient Dashboard (Mobile - Version 1)
**Endpoint**: `GET /api/mobile/patient/dashboard`

**Description**: Returns patient-specific dashboard data including patient info, upcoming appointments count, active prescriptions count, total records, and recent appointments.

**Headers**:
- `Authorization: Bearer <token>` (Required)
- `X-Tenant-Subdomain: <subdomain>` (Required)
- `Content-Type: application/json`
- `Accept: application/json`

**Request Body**: None

**Response**: `200 OK`
```json
{
  "patientInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "patientId": "P001"
  },
  "upcomingAppointments": 2,
  "activePrescriptions": 1,
  "totalRecords": 5,
  "recentAppointments": [
    {
      "id": 1,
      "title": "Follow-up Consultation",
      "date": "2025-01-28T10:00:00Z",
      "status": "scheduled"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`
```json
{
  "error": "Unauthorized"
}
```

- `404 Not Found`
```json
{
  "error": "Patient not found"
}
```

**API Verification**:
✅ **Correct** - Endpoint exists at line 21789 in `server/routes.ts`
- Has `authMiddleware` protection
- Uses `req.user?.id` to find patient by userId
- Returns patient-specific data

**Issues Found**:
⚠️ **No Role Check**: This endpoint does NOT explicitly check for "patient" role.

---

### 2. Get Patient Dashboard (Mobile - Version 2 with Role Check)
**Endpoint**: `GET /api/mobile/patient/dashboard`

**Description**: Alternative patient dashboard endpoint with explicit role requirement. This is a duplicate endpoint at line 22168.

**Headers**:
- `Authorization: Bearer <token>` (Required)
- `X-Tenant-Subdomain: <subdomain>` (Required)
- `Content-Type: application/json`
- `Accept: application/json`

**Request Body**: None

**Response**: `200 OK`
```json
{
  "upcomingAppointments": 2,
  "activePrescriptions": 1,
  "medicalRecords": 5,
  "nextAppointment": {
    "id": 1,
    "patientId": 1,
    "providerId": 1,
    "scheduledAt": "2025-01-28T10:00:00Z",
    "type": "consultation",
    "status": "scheduled"
  }
}
```

**API Verification**:
✅ **Correct** - Endpoint exists at line 22168 in `server/routes.ts`
- Has `authMiddleware` protection
- Has `requireRole(["patient"])` - **Properly secured**
- Uses `req.user!.id` as patientId
- Returns different structure than Version 1

**Issues Found**:
⚠️ **Duplicate Endpoint**: There are TWO endpoints with the same path `/api/mobile/patient/dashboard`:
  1. Line 21789: No role check, returns patientInfo and recentAppointments
  2. Line 22168: Has role check, returns nextAppointment instead

**Recommendation**: Remove one of these duplicate endpoints or merge them.

---

## Summary of Issues Found

### Critical Issues:
1. **Missing Authentication**: 
   - `/api/dashboard/stats` - No auth middleware
   - `/api/dashboard/ai-insights` - No auth middleware

2. **Duplicate Endpoints**:
   - `/api/mobile/doctor/dashboard` - Defined twice (lines 21596 and 22039)
   - `/api/mobile/patient/dashboard` - Defined twice (lines 21789 and 22168)

3. **Missing Role Checks**:
   - `/api/dashboard/stats` - No role restriction
   - `/api/dashboard/ai-insights` - No role restriction
   - `/api/mobile/doctor/dashboard` (Version 1) - No role check
   - `/api/mobile/patient/dashboard` (Version 1) - No role check

### Recommendations:
1. Add `authMiddleware` to all dashboard endpoints
2. Add appropriate `requireRole()` checks based on endpoint purpose
3. Remove duplicate endpoints or merge their functionality
4. Standardize response structures for consistency

---

## Testing in Postman

### Step 1: Import Collection
1. Open Postman
2. Click "Import" button
3. Select `Cura_EMR_Dashboard_APIs_Postman_Collection.json`
4. Collection will be imported with all endpoints

### Step 2: Set Environment Variables
1. Create a new environment in Postman
2. Set the following variables:
   - `base_url`: `https://app.curaemr.ai/api` (or `http://localhost:1100/api` for local)
   - `tenant_subdomain`: Your organization's subdomain (e.g., "demo")
   - `auth_token`: Leave empty (will be set automatically after login)

### Step 3: Login
1. Run the "Universal Login" request in the Authentication folder
2. Update the email and password in the request body
3. The token will be automatically saved to `auth_token` variable

### Step 4: Test Dashboard APIs
1. Navigate to the appropriate role folder (Admin, Doctor, Nurse, or Patient)
2. Run the dashboard endpoints
3. Verify responses match expected structure

### Step 5: Test Different Roles
1. Login with different user roles (admin, doctor, nurse, patient)
2. Test each role's dashboard endpoints
3. Verify role-based access control (if implemented)

---

## Postman Collection Features

The Postman collection includes:
- ✅ Pre-configured headers for all requests
- ✅ Environment variables for easy switching between environments
- ✅ Automatic token extraction from login response
- ✅ Example success and error responses
- ✅ Detailed descriptions for each endpoint
- ✅ Organized by role (Admin, Doctor, Nurse, Patient)

---

## API Response Codes

- `200 OK` - Request successful
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User doesn't have required role/permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Notes

1. **Tenant Subdomain**: The `X-Tenant-Subdomain` header is required for multi-tenant functionality. It identifies which organization's data to access.

2. **Token Expiration**: Authentication tokens may expire. Re-login if you receive 401 errors.

3. **Local Development**: For local testing, change `base_url` to `http://localhost:1100/api`.

4. **Role-Based Access**: Some endpoints may have role restrictions. Ensure you're logged in with the correct role.

5. **Duplicate Endpoints**: Be aware that some endpoints are defined multiple times in the codebase. The Postman collection includes both versions for testing purposes.

---

**Last Updated**: January 28, 2025
**API Version**: 1.0
**Collection Version**: 1.0
