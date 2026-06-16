# API cURL Catalog for Postman Testing

Base domain: `https://{your-domain}.com` (replace with your deployment)
Base path: inherent in each endpoint.

Headers to include in every authenticated request:
- `Authorization: Bearer <JWT_TOKEN>`
- `X-Tenant-Subdomain: <tenant_subdomain>`
- `Content-Type: application/json` (if the request has a body)

Replace placeholder values before executing the requests below.

## Authentication

### POST `/api/auth/login`

- **Description:** Tenant-specific login
- **Authentication Required:** No
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/auth/login" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Tenant-specific login\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Tenant-specific login",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/auth/login"
}
}
```

### POST `/api/auth/universal-login`

- **Description:** Global login
- **Authentication Required:** No
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/auth/universal-login" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Global login\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Global login",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/auth/universal-login"
}
}
```

### POST `/api/auth/forgot-password`

- **Description:** Request password reset
- **Authentication Required:** No
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/auth/forgot-password" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Request password reset\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Request password reset",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/auth/forgot-password"
}
}
```

### POST `/api/auth/reset-password`

- **Description:** Reset password with token
- **Authentication Required:** No
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/auth/reset-password" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Reset password with token\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Reset password with token",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/auth/reset-password"
}
}
```

### GET `/api/auth/validate`

- **Description:** Validate JWT token
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/auth/validate" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/auth/validate"
}
}
```

### PATCH `/api/user/change-password`

- **Description:** Change password
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/user/change-password" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Change password\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Change password",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/user/change-password"
}
}
```

### POST `/api/saas/login`

- **Description:** SaaS admin login
- **Authentication Required:** No
- **Roles:** saas_admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/saas/login" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for SaaS admin login\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for SaaS admin login",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/login"
}
}
```

## Health & Status

### GET `/api/health`

- **Description:** Health check
- **Authentication Required:** No
- **Roles:** N/A

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/health" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/health"
}
}
```

### GET `/health`

- **Description:** Health check (alt)
- **Authentication Required:** No
- **Roles:** N/A

**cURL**
```bash
curl -X GET "https://{your-domain}.com/health" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /health"
}
}
```

### GET `/healthz`

- **Description:** Kubernetes health
- **Authentication Required:** No
- **Roles:** N/A

**cURL**
```bash
curl -X GET "https://{your-domain}.com/healthz" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /healthz"
}
}
```

### GET `/api/status`

- **Description:** Full system status
- **Authentication Required:** No
- **Roles:** N/A

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/status" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/status"
}
}
```

## Dashboard

### GET `/api/dashboard/stats`

- **Description:** Dashboard statistics
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/dashboard/stats" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/dashboard/stats"
}
}
```

### GET `/api/dashboard/ai-insights`

- **Description:** AI insights
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/dashboard/ai-insights" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/dashboard/ai-insights"
  }
]
}
```

## Patients

### GET `/api/patients`

- **Description:** List patients
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/patients" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients"
  }
]
}
```

### GET `/api/patients/:id`

- **Description:** Get patient by ID
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/patients/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients/:id"
  }
]
}
```

### POST `/api/patients`

- **Description:** Create patient
- **Authentication Required:** Yes
- **Roles:** admin, doctor, nurse, receptionist

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/patients" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create patient\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create patient",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients"
  }
]
}
```

### PUT `/api/patients/:id`

- **Description:** Update patient
- **Authentication Required:** Yes
- **Roles:** admin, doctor, nurse

**cURL**
```bash
curl -X PUT "https://{your-domain}.com/api/patients/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update patient\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update patient",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients/:id"
  }
]
}
```

### DELETE `/api/patients/:id`

- **Description:** Delete patient
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/patients/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients/:id"
  }
]
}
```

### GET `/api/patients/check-email`

- **Description:** Check email availability
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/patients/check-email" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients/check-email"
  }
]
}
```

### GET `/api/patients/:id/records`

- **Description:** Get patient records
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/patients/{id}/records" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients/:id/records"
  }
]
}
```

### GET `/api/patients/:id/prescriptions`

- **Description:** Get patient prescriptions
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/patients/{id}/prescriptions" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients/:id/prescriptions"
  }
]
}
```

### GET `/api/patients/:id/appointments`

- **Description:** Get patient appointments
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/patients/{id}/appointments" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients/:id/appointments"
  }
]
}
```

### GET `/api/patients/:id/lab-results`

- **Description:** Get patient lab results
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/patients/{id}/lab-results" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients/:id/lab-results"
  }
]
}
```

### GET `/api/patients/my-prescriptions`

- **Description:** Get current patient prescriptions
- **Authentication Required:** Yes
- **Roles:** patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/patients/my-prescriptions" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients/my-prescriptions"
  }
]
}
```

### GET `/api/patients/health-score`

- **Description:** Get patient health score
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/patients/health-score" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/patients/health-score"
  }
]
}
```

## Appointments

### GET `/api/appointments`

- **Description:** List appointments
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/appointments" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments"
  }
]
}
```

### GET `/api/appointments/:id`

- **Description:** Get appointment by ID
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/appointments/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/:id"
  }
]
}
```

### POST `/api/appointments`

- **Description:** Create appointment
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/appointments" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create appointment\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create appointment",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments"
  }
]
}
```

### PUT `/api/appointments/:id`

- **Description:** Update appointment
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X PUT "https://{your-domain}.com/api/appointments/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update appointment\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update appointment",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/:id"
  }
]
}
```

### PATCH `/api/appointments/:id`

- **Description:** Partial update appointment
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/appointments/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Partial update appointment\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Partial update appointment",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/:id"
  }
]
}
```

### DELETE `/api/appointments/:id`

- **Description:** Delete appointment
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/appointments/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/:id"
  }
]
}
```

### GET `/api/appointments/available-slots`

- **Description:** Get available slots
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/appointments/available-slots" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/available-slots"
  }
]
}
```

### GET `/api/appointments/sse`

- **Description:** Real-time updates (SSE)
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/appointments/sse" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/sse"
  }
]
}
```

### POST `/api/appointments/:id/confirm`

- **Description:** Confirm appointment
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/appointments/{id}/confirm" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Confirm appointment\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Confirm appointment",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/:id/confirm"
  }
]
}
```

### POST `/api/appointments/:id/cancel`

- **Description:** Cancel appointment
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/appointments/{id}/cancel" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Cancel appointment\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Cancel appointment",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/:id/cancel"
  }
]
}
```

### POST `/api/appointments/:id/complete`

- **Description:** Complete appointment
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/appointments/{id}/complete" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Complete appointment\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Complete appointment",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/:id/complete"
  }
]
}
```

### POST `/api/appointments/:id/start-video`

- **Description:** Start video call
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/appointments/{id}/start-video" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Start video call\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Start video call",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/:id/start-video"
  }
]
}
```

### GET `/api/appointments/:id/video-token`

- **Description:** Get video token
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/appointments/{id}/video-token" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/appointments/:id/video-token"
  }
]
}
```

## Medical Records

### GET `/api/medical-records`

- **Description:** List medical records
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/medical-records" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/medical-records"
  }
]
}
```

### GET `/api/medical-records/:id`

- **Description:** Get record by ID
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/medical-records/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/medical-records/:id"
  }
]
}
```

### POST `/api/medical-records`

- **Description:** Create record
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/medical-records" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create record\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create record",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/medical-records"
  }
]
}
```

### PUT `/api/medical-records/:id`

- **Description:** Update record
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X PUT "https://{your-domain}.com/api/medical-records/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update record\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update record",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/medical-records/:id"
  }
]
}
```

### DELETE `/api/medical-records/:id`

- **Description:** Delete record
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/medical-records/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/medical-records/:id"
  }
]
}
```

### POST `/api/medical-records/:id/e-sign`

- **Description:** E-sign record
- **Authentication Required:** Yes
- **Roles:** doctor

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/medical-records/{id}/e-sign" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for E-sign record\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for E-sign record",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/medical-records/:id/e-sign"
  }
]
}
```

## Prescriptions

### GET `/api/prescriptions`

- **Description:** List prescriptions
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/prescriptions" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/prescriptions"
  }
]
}
```

### GET `/api/prescriptions/:id`

- **Description:** Get prescription by ID
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/prescriptions/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/prescriptions/:id"
}
}
```

### GET `/api/prescriptions/patient/:patientId`

- **Description:** Get patient prescriptions
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/prescriptions/patient/{patientId}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/prescriptions/patient/:patientId"
}
}
```

### POST `/api/prescriptions`

- **Description:** Create prescription
- **Authentication Required:** Yes
- **Roles:** doctor

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/prescriptions" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create prescription\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create prescription",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/prescriptions"
}
}
```

### PATCH `/api/prescriptions/:id`

- **Description:** Update prescription
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/prescriptions/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update prescription\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update prescription",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/prescriptions/:id"
}
}
```

### DELETE `/api/prescriptions/:id`

- **Description:** Delete prescription
- **Authentication Required:** Yes
- **Roles:** doctor, admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/prescriptions/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/prescriptions/:id"
}
}
```

### POST `/api/prescriptions/:id/send-to-pharmacy`

- **Description:** Send to pharmacy
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/prescriptions/{id}/send-to-pharmacy" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Send to pharmacy\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Send to pharmacy",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/prescriptions/:id/send-to-pharmacy"
}
}
```

### POST `/api/prescriptions/:id/e-sign`

- **Description:** E-sign prescription
- **Authentication Required:** Yes
- **Roles:** doctor

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/prescriptions/{id}/e-sign" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for E-sign prescription\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for E-sign prescription",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/prescriptions/:id/e-sign"
}
}
```

## Lab Results

### GET `/api/lab-results`

- **Description:** List lab results
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/lab-results" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-results"
  }
]
}
```

### GET `/api/lab-results/:id`

- **Description:** Get lab result by ID
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/lab-results/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-results/:id"
  }
]
}
```

### POST `/api/lab-results`

- **Description:** Create lab order
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/lab-results" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create lab order\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create lab order",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-results"
  }
]
}
```

### PUT `/api/lab-results/:id`

- **Description:** Update lab result
- **Authentication Required:** Yes
- **Roles:** lab_technician

**cURL**
```bash
curl -X PUT "https://{your-domain}.com/api/lab-results/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update lab result\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update lab result",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-results/:id"
  }
]
}
```

### DELETE `/api/lab-results/:id`

- **Description:** Delete lab result
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/lab-results/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-results/:id"
  }
]
}
```

### PATCH `/api/lab-results/:id/toggle-sample-collected`

- **Description:** Toggle sample status
- **Authentication Required:** Yes
- **Roles:** sample_taker, lab_technician

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/lab-results/{id}/toggle-sample-collected" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Toggle sample status\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Toggle sample status",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-results/:id/toggle-sample-collected"
  }
]
}
```

### POST `/api/lab-results/:id/collect-sample`

- **Description:** Mark sample collected
- **Authentication Required:** Yes
- **Roles:** sample_taker, lab_technician

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/lab-results/{id}/collect-sample" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Mark sample collected\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Mark sample collected",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-results/:id/collect-sample"
  }
]
}
```

### POST `/api/lab-results/:id/generate-pdf`

- **Description:** Generate PDF report
- **Authentication Required:** Yes
- **Roles:** non-patient

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/lab-results/{id}/generate-pdf" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Generate PDF report\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Generate PDF report",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-results/:id/generate-pdf"
  }
]
}
```

### POST `/api/lab-results/:id/e-sign`

- **Description:** E-sign results
- **Authentication Required:** Yes
- **Roles:** doctor

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/lab-results/{id}/e-sign" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for E-sign results\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for E-sign results",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-results/:id/e-sign"
  }
]
}
```

### GET `/api/lab-results/with-invoices`

- **Description:** Lab results with invoices
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/lab-results/with-invoices" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-results/with-invoices"
  }
]
}
```

### GET `/api/lab-technician/tests`

- **Description:** Tests for lab technician
- **Authentication Required:** Yes
- **Roles:** lab_technician, admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/lab-technician/tests" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/lab-technician/tests"
  }
]
}
```

## Invoices & Billing

### GET `/api/invoices`

- **Description:** List invoices
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/invoices" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/invoices"
  }
]
}
```

### GET `/api/invoices/:id`

- **Description:** Get invoice by ID
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/invoices/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/invoices/:id"
  }
]
}
```

### POST `/api/invoices`

- **Description:** Create invoice
- **Authentication Required:** Yes
- **Roles:** admin, receptionist

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/invoices" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create invoice\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create invoice",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/invoices"
  }
]
}
```

### PATCH `/api/invoices/:id`

- **Description:** Update invoice
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/invoices/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update invoice\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update invoice",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/invoices/:id"
  }
]
}
```

### DELETE `/api/invoices/:id`

- **Description:** Delete invoice
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/invoices/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/invoices/:id"
  }
]
}
```

### GET `/api/invoices/with-services`

- **Description:** Invoices with services
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/invoices/with-services" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/invoices/with-services"
  }
]
}
```

### GET `/api/invoices/by-service`

- **Description:** Invoices by service
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/invoices/by-service" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/invoices/by-service"
  }
]
}
```

### POST `/api/create-payment-intent`

- **Description:** Stripe payment intent
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/create-payment-intent" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Stripe payment intent\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Stripe payment intent",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/create-payment-intent"
}
}
```

### GET `/api/billing-history`

- **Description:** Get billing history
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/billing-history" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/billing-history"
  }
]
}
```

### GET `/api/billing-history/:paymentId/invoice`

- **Description:** Download invoice PDF
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/billing-history/{paymentId}/invoice" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/billing-history/:paymentId/invoice"
  }
]
}
```

### GET `/api/subscriptions/current`

- **Description:** Get current subscription
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/subscriptions/current" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/subscriptions/current"
}
}
```

## Notifications

### GET `/api/notifications`

- **Description:** List notifications
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/notifications" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/notifications"
  }
]
}
```

### GET `/api/notifications/unread-count`

- **Description:** Get unread count
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/notifications/unread-count" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/notifications/unread-count"
  }
]
}
```

### PATCH `/api/notifications/:id/read`

- **Description:** Mark as read
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/notifications/{id}/read" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Mark as read\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Mark as read",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/notifications/:id/read"
  }
]
}
```

### PATCH `/api/notifications/mark-all-read`

- **Description:** Mark all as read
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/notifications/mark-all-read" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Mark all as read\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Mark all as read",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/notifications/mark-all-read"
  }
]
}
```

### DELETE `/api/notifications/:id`

- **Description:** Delete notification
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/notifications/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/notifications/:id"
  }
]
}
```

## Users

### GET `/api/users`

- **Description:** List users
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/users" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/users"
  }
]
}
```

### GET `/api/users/:id`

- **Description:** Get user by ID
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/users/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/users/:id"
  }
]
}
```

### POST `/api/users`

- **Description:** Create user
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/users" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create user\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create user",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/users"
  }
]
}
```

### PUT `/api/users/:id`

- **Description:** Update user
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X PUT "https://{your-domain}.com/api/users/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update user\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update user",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/users/:id"
  }
]
}
```

### PATCH `/api/users/:id`

- **Description:** Partial update user
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/users/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Partial update user\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Partial update user",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/users/:id"
  }
]
}
```

### DELETE `/api/users/:id`

- **Description:** Delete user
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/users/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/users/:id"
  }
]
}
```

### GET `/api/users/current`

- **Description:** Get current user
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/users/current" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/users/current"
  }
]
}
```

### GET `/api/users/doctors`

- **Description:** List doctors
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/users/doctors" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/users/doctors"
  }
]
}
```

### GET `/api/users/by-role/:role`

- **Description:** Users by role
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/users/by-role/{role}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/users/by-role/:role"
  }
]
}
```

## Roles & Permissions

### GET `/api/roles`

- **Description:** List all roles
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/roles" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/roles"
  }
]
}
```

### GET `/api/roles/:id`

- **Description:** Get role by ID
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/roles/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/roles/:id"
  }
]
}
```

### POST `/api/roles`

- **Description:** Create role
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/roles" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create role\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create role",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/roles"
  }
]
}
```

### PUT `/api/roles/:id`

- **Description:** Update role
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X PUT "https://{your-domain}.com/api/roles/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update role\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update role",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/roles/:id"
  }
]
}
```

### DELETE `/api/roles/:id`

- **Description:** Delete role
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/roles/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/roles/:id"
  }
]
}
```

## Organizations

### GET `/api/tenant/info`

- **Description:** Get current organization
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/tenant/info" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/tenant/info"
}
}
```

### PATCH `/api/organization/settings`

- **Description:** Update org settings
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/organization/settings" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update org settings\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update org settings",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/organization/settings"
}
}
```

## GDPR Compliance

### POST `/api/gdpr/consent`

- **Description:** Record consent
- **Authentication Required:** Yes
- **Roles:** admin, patient

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/gdpr/consent" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Record consent\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Record consent",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/gdpr/consent"
}
}
```

### PATCH `/api/gdpr/consent/:id/withdraw`

- **Description:** Withdraw consent
- **Authentication Required:** Yes
- **Roles:** admin, patient

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/gdpr/consent/{id}/withdraw" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Withdraw consent\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Withdraw consent",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/gdpr/consent/:id/withdraw"
}
}
```

### POST `/api/gdpr/data-request`

- **Description:** Submit data request
- **Authentication Required:** Yes
- **Roles:** admin, patient

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/gdpr/data-request" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Submit data request\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Submit data request",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/gdpr/data-request"
}
}
```

### GET `/api/gdpr/patient/:patientId/data-export`

- **Description:** Export patient data
- **Authentication Required:** Yes
- **Roles:** admin, doctor

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/gdpr/patient/{patientId}/data-export" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/gdpr/patient/:patientId/data-export"
}
}
```

### POST `/api/gdpr/patient/:patientId/erasure`

- **Description:** Request data erasure
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/gdpr/patient/{patientId}/erasure" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Request data erasure\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Request data erasure",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/gdpr/patient/:patientId/erasure"
}
}
```

### GET `/api/gdpr/patient/:patientId/consent-status`

- **Description:** Check consent status
- **Authentication Required:** Yes
- **Roles:** admin, doctor, patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/gdpr/patient/{patientId}/consent-status" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/gdpr/patient/:patientId/consent-status"
}
}
```

### GET `/api/gdpr/compliance-report`

- **Description:** Generate compliance report
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/gdpr/compliance-report" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/gdpr/compliance-report"
}
}
```

## QuickBooks Integration

### GET `/api/quickbooks/auth/callback`

- **Description:** OAuth callback
- **Authentication Required:** No
- **Roles:** N/A

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/quickbooks/auth/callback" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/quickbooks/auth/callback"
}
}
```

### GET `/api/quickbooks/status`

- **Description:** Check connection status
- **Authentication Required:** Yes
- **Roles:** non-patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/quickbooks/status" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/quickbooks/status"
}
}
```

### POST `/api/quickbooks/connect`

- **Description:** Initiate connection
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/quickbooks/connect" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Initiate connection\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Initiate connection",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/quickbooks/connect"
}
}
```

### POST `/api/quickbooks/disconnect`

- **Description:** Disconnect QuickBooks
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/quickbooks/disconnect" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Disconnect QuickBooks\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Disconnect QuickBooks",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/quickbooks/disconnect"
}
}
```

### GET `/api/quickbooks/data/company-info`

- **Description:** Get company info
- **Authentication Required:** Yes
- **Roles:** non-patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/quickbooks/data/company-info" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/quickbooks/data/company-info"
}
}
```

### GET `/api/quickbooks/data/invoices`

- **Description:** Get QB invoices
- **Authentication Required:** Yes
- **Roles:** non-patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/quickbooks/data/invoices" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/quickbooks/data/invoices"
  }
]
}
```

### GET `/api/quickbooks/data/profit-loss`

- **Description:** Get P&L report
- **Authentication Required:** Yes
- **Roles:** non-patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/quickbooks/data/profit-loss" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/quickbooks/data/profit-loss"
}
}
```

### GET `/api/quickbooks/data/expenses`

- **Description:** Get expenses
- **Authentication Required:** Yes
- **Roles:** non-patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/quickbooks/data/expenses" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/quickbooks/data/expenses"
}
}
```

### GET `/api/quickbooks/data/accounts`

- **Description:** Get chart of accounts
- **Authentication Required:** Yes
- **Roles:** non-patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/quickbooks/data/accounts" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/quickbooks/data/accounts"
}
}
```

### GET `/api/quickbooks/data/customers`

- **Description:** Get customers
- **Authentication Required:** Yes
- **Roles:** non-patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/quickbooks/data/customers" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/quickbooks/data/customers"
}
}
```

## Telemedicine (LiveKit)

### POST `/api/livekit/token`

- **Description:** Get LiveKit access token
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/livekit/token" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Get LiveKit access token\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Get LiveKit access token",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/livekit/token"
}
}
```

### POST `/api/livekit/room`

- **Description:** Create LiveKit room
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/livekit/room" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create LiveKit room\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create LiveKit room",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/livekit/room"
}
}
```

### GET `/api/livekit/rooms`

- **Description:** List active rooms
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/livekit/rooms" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/livekit/rooms"
  }
]
}
```

### DELETE `/api/livekit/room/:roomName`

- **Description:** Close room
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/livekit/room/{roomName}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/livekit/room/:roomName"
}
}
```

### POST `/api/telemedicine/start-call`

- **Description:** Start video call
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/telemedicine/start-call" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Start video call\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Start video call",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/telemedicine/start-call"
}
}
```

### POST `/api/telemedicine/end-call`

- **Description:** End video call
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/telemedicine/end-call" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for End video call\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for End video call",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/telemedicine/end-call"
}
}
```

## AI Services

### POST `/api/ai/generate-treatment-plan`

- **Description:** Generate treatment plan
- **Authentication Required:** Yes
- **Roles:** admin, doctor

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/ai/generate-treatment-plan" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Generate treatment plan\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Generate treatment plan",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/ai/generate-treatment-plan"
}
}
```

### POST `/api/ai/generate-insights`

- **Description:** Generate AI insights
- **Authentication Required:** Yes
- **Roles:** admin, doctor

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/ai/generate-insights" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Generate AI insights\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Generate AI insights",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/ai/generate-insights"
  }
]
}
```

### POST `/api/ai/transcribe`

- **Description:** Transcribe audio
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/ai/transcribe" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Transcribe audio\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Transcribe audio",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/ai/transcribe"
}
}
```

### POST `/api/ai/chat`

- **Description:** AI chat assistant
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/ai/chat" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for AI chat assistant\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for AI chat assistant",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/ai/chat"
}
}
```

### POST `/api/ai/summarize-record`

- **Description:** Summarize medical record
- **Authentication Required:** Yes
- **Roles:** doctor

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/ai/summarize-record" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Summarize medical record\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Summarize medical record",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/ai/summarize-record"
}
}
```

## Mobile API - Doctor

### GET `/api/mobile/doctor/dashboard`

- **Description:** Doctor dashboard
- **Authentication Required:** Yes
- **Roles:** doctor

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/mobile/doctor/dashboard" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/mobile/doctor/dashboard"
}
}
```

### GET `/api/mobile/doctor/patients`

- **Description:** Doctor's patients
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/mobile/doctor/patients" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/mobile/doctor/patients"
  }
]
}
```

### GET `/api/mobile/doctor/appointments`

- **Description:** Doctor's appointments
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/mobile/doctor/appointments" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/mobile/doctor/appointments"
  }
]
}
```

### POST `/api/mobile/doctor/appointments/:id/accept`

- **Description:** Accept appointment
- **Authentication Required:** Yes
- **Roles:** doctor

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/mobile/doctor/appointments/{id}/accept" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Accept appointment\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Accept appointment",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/mobile/doctor/appointments/:id/accept"
  }
]
}
```

### POST `/api/mobile/doctor/appointments/:id/reject`

- **Description:** Reject appointment
- **Authentication Required:** Yes
- **Roles:** doctor

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/mobile/doctor/appointments/{id}/reject" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Reject appointment\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Reject appointment",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/mobile/doctor/appointments/:id/reject"
  }
]
}
```

### GET `/api/mobile/doctor/prescriptions`

- **Description:** Doctor's prescriptions
- **Authentication Required:** Yes
- **Roles:** doctor, nurse

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/mobile/doctor/prescriptions" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/mobile/doctor/prescriptions"
}
}
```

### POST `/api/mobile/doctor/prescriptions`

- **Description:** Create prescription
- **Authentication Required:** Yes
- **Roles:** doctor

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/mobile/doctor/prescriptions" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create prescription\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create prescription",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/mobile/doctor/prescriptions"
}
}
```

## Mobile API - Patient

### GET `/api/mobile/patient/dashboard`

- **Description:** Patient dashboard
- **Authentication Required:** Yes
- **Roles:** patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/mobile/patient/dashboard" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/mobile/patient/dashboard"
}
}
```

### GET `/api/mobile/patient/appointments`

- **Description:** Patient appointments
- **Authentication Required:** Yes
- **Roles:** patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/mobile/patient/appointments" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/mobile/patient/appointments"
  }
]
}
```

### POST `/api/mobile/patient/appointments`

- **Description:** Book appointment
- **Authentication Required:** Yes
- **Roles:** patient

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/mobile/patient/appointments" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Book appointment\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Book appointment",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/mobile/patient/appointments"
  }
]
}
```

### DELETE `/api/mobile/patient/appointments/:id`

- **Description:** Cancel appointment
- **Authentication Required:** Yes
- **Roles:** patient

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/mobile/patient/appointments/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/mobile/patient/appointments/:id"
  }
]
}
```

### GET `/api/mobile/patient/prescriptions`

- **Description:** Patient prescriptions
- **Authentication Required:** Yes
- **Roles:** patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/mobile/patient/prescriptions" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/mobile/patient/prescriptions"
}
}
```

### GET `/api/mobile/patient/medical-records`

- **Description:** Patient records
- **Authentication Required:** Yes
- **Roles:** patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/mobile/patient/medical-records" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/mobile/patient/medical-records"
  }
]
}
```

### GET `/api/mobile/patient/profile`

- **Description:** Patient profile
- **Authentication Required:** Yes
- **Roles:** patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/mobile/patient/profile" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/mobile/patient/profile"
}
}
```

### GET `/api/mobile/doctors`

- **Description:** Available doctors
- **Authentication Required:** Yes
- **Roles:** patient

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/mobile/doctors" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/mobile/doctors"
  }
]
}
```

### POST `/api/mobile/video/start-consultation`

- **Description:** Start video consult
- **Authentication Required:** Yes
- **Roles:** patient

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/mobile/video/start-consultation" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Start video consult\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Start video consult",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/mobile/video/start-consultation"
}
}
```

## SaaS Administration

### POST `/api/saas/login`

- **Description:** SaaS admin login
- **Authentication Required:** No
- **Roles:** saas_admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/saas/login" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for SaaS admin login\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for SaaS admin login",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/login"
}
}
```

### GET `/api/saas/debug`

- **Description:** Debug information
- **Authentication Required:** No
- **Roles:** N/A

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/saas/debug" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/debug"
}
}
```

### GET `/api/saas/dashboard`

- **Description:** SaaS dashboard stats
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/saas/dashboard" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/dashboard"
}
}
```

### GET `/api/saas/organizations`

- **Description:** List organizations
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/saas/organizations" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/saas/organizations"
  }
]
}
```

### POST `/api/saas/organizations`

- **Description:** Create organization
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/saas/organizations" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create organization\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create organization",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/organizations"
}
}
```

### PUT `/api/saas/organizations/:id`

- **Description:** Update organization
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X PUT "https://{your-domain}.com/api/saas/organizations/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update organization\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update organization",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/organizations/:id"
}
}
```

### DELETE `/api/saas/organizations/:id`

- **Description:** Delete organization
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/saas/organizations/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/organizations/:id"
}
}
```

### GET `/api/saas/subscriptions`

- **Description:** List subscriptions
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/saas/subscriptions" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/saas/subscriptions"
  }
]
}
```

### POST `/api/saas/subscriptions`

- **Description:** Create subscription
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/saas/subscriptions" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create subscription\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create subscription",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/subscriptions"
}
}
```

### PATCH `/api/saas/subscriptions/:id`

- **Description:** Update subscription
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/saas/subscriptions/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update subscription\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update subscription",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/subscriptions/:id"
}
}
```

### GET `/api/saas/packages`

- **Description:** List packages
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/saas/packages" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/saas/packages"
  }
]
}
```

### POST `/api/saas/packages`

- **Description:** Create package
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/saas/packages" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create package\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create package",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/packages"
}
}
```

### PUT `/api/saas/packages/:id`

- **Description:** Update package
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X PUT "https://{your-domain}.com/api/saas/packages/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update package\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update package",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/packages/:id"
}
}
```

### DELETE `/api/saas/packages/:id`

- **Description:** Delete package
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/saas/packages/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/packages/:id"
}
}
```

### GET `/api/saas/payments`

- **Description:** List payments
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/saas/payments" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/saas/payments"
  }
]
}
```

### POST `/api/saas/payments`

- **Description:** Record payment
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/saas/payments" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Record payment\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Record payment",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/payments"
}
}
```

### GET `/api/saas/audit-logs`

- **Description:** Audit logs
- **Authentication Required:** Yes
- **Roles:** saas_admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/saas/audit-logs" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/saas/audit-logs"
}
}
```

### GET `/api/website/packages`

- **Description:** Public packages list
- **Authentication Required:** No
- **Roles:** N/A

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/website/packages" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/website/packages"
  }
]
}
```

## Pricing Management

### GET `/api/pricing/doctors-fees`

- **Description:** List doctor fees
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/pricing/doctors-fees" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/doctors-fees"
  }
]
}
```

### GET `/api/pricing/doctors-fees/:id`

- **Description:** Get fee by ID
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/pricing/doctors-fees/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/doctors-fees/:id"
  }
]
}
```

### POST `/api/pricing/doctors-fees`

- **Description:** Create fee
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/pricing/doctors-fees" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create fee\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create fee",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/doctors-fees"
  }
]
}
```

### PATCH `/api/pricing/doctors-fees/:id`

- **Description:** Update fee
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/pricing/doctors-fees/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update fee\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update fee",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/doctors-fees/:id"
  }
]
}
```

### DELETE `/api/pricing/doctors-fees/:id`

- **Description:** Delete fee
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/pricing/doctors-fees/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/doctors-fees/:id"
  }
]
}
```

### GET `/api/pricing/lab-tests`

- **Description:** List lab test prices
- **Authentication Required:** Yes
- **Roles:** admin, doctor

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/pricing/lab-tests" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/lab-tests"
  }
]
}
```

### GET `/api/pricing/lab-tests/:id`

- **Description:** Get test price by ID
- **Authentication Required:** Yes
- **Roles:** admin, doctor

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/pricing/lab-tests/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/lab-tests/:id"
  }
]
}
```

### POST `/api/pricing/lab-tests`

- **Description:** Create test price
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/pricing/lab-tests" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create test price\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create test price",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/lab-tests"
  }
]
}
```

### PATCH `/api/pricing/lab-tests/:id`

- **Description:** Update test price
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/pricing/lab-tests/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update test price\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update test price",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/lab-tests/:id"
  }
]
}
```

### DELETE `/api/pricing/lab-tests/:id`

- **Description:** Delete test price
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/pricing/lab-tests/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/lab-tests/:id"
  }
]
}
```

### GET `/api/pricing/imaging`

- **Description:** List imaging prices
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/pricing/imaging" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/pricing/imaging"
  }
]
}
```

### GET `/api/pricing/imaging/:id`

- **Description:** Get imaging price
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/pricing/imaging/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/pricing/imaging/:id"
}
}
```

### POST `/api/pricing/imaging`

- **Description:** Create imaging price
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/pricing/imaging" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create imaging price\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create imaging price",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/pricing/imaging"
}
}
```

### PATCH `/api/pricing/imaging/:id`

- **Description:** Update imaging price
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/pricing/imaging/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update imaging price\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update imaging price",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/pricing/imaging/:id"
}
}
```

### DELETE `/api/pricing/imaging/:id`

- **Description:** Delete imaging price
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/pricing/imaging/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/pricing/imaging/:id"
}
}
```

## Symptom Checker

### POST `/api/symptom-checker/analyze`

- **Description:** Analyze symptoms (AI)
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/symptom-checker/analyze" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Analyze symptoms (AI)\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Analyze symptoms (AI)",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/symptom-checker/analyze"
}
}
```

### GET `/api/symptom-checker/history`

- **Description:** Get analysis history
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/symptom-checker/history" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/symptom-checker/history"
  }
]
}
```

## Clinic Configuration

### GET `/api/clinic-headers`

- **Description:** Get clinic headers
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/clinic-headers" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/clinic-headers"
}
}
```

### POST `/api/clinic-headers`

- **Description:** Create/update headers
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/clinic-headers" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create/update headers\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create/update headers",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/clinic-headers"
}
}
```

### GET `/api/clinic-footers`

- **Description:** Get clinic footers
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/clinic-footers" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/clinic-footers"
}
}
```

### POST `/api/clinic-footers`

- **Description:** Create/update footers
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/clinic-footers" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Create/update footers\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Create/update footers",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
  "id": "<id>",
  "message": "Sample result for /api/clinic-footers"
}
}
```

## Shifts & Scheduling

### GET `/api/shifts`

- **Description:** List all shifts
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/shifts" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/shifts"
  }
]
}
```

### GET `/api/shifts/staff/:staffId`

- **Description:** Shifts by staff
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/shifts/staff/{staffId}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/shifts/staff/:staffId"
  }
]
}
```

### GET `/api/default-shifts`

- **Description:** List default shifts
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/default-shifts" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/default-shifts"
  }
]
}
```

### GET `/api/default-shifts/:userId`

- **Description:** User's default shifts
- **Authentication Required:** Yes
- **Roles:** all

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/default-shifts/{userId}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/default-shifts/:userId"
  }
]
}
```

### PATCH `/api/default-shifts/:userId`

- **Description:** Update default shifts
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/default-shifts/{userId}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Update default shifts\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Update default shifts",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/default-shifts/:userId"
  }
]
}
```

### POST `/api/default-shifts/initialize`

- **Description:** Initialize shifts
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/default-shifts/initialize" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"note\": \"Replace this payload with valid values for Initialize shifts\",\n  \"example\": \"test\"\n}"
```

**Sample Request Payload**
```json
{
  "note": "Replace this payload with valid values for Initialize shifts",
  "example": "test"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/default-shifts/initialize"
  }
]
}
```

### DELETE `/api/default-shifts/all`

- **Description:** Delete all shifts
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/default-shifts/all" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/default-shifts/all"
  }
]
}
```

### DELETE `/api/default-shifts/:userId`

- **Description:** Delete user shifts
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/default-shifts/{userId}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": [
  {
    "id": "<id>",
    "message": "Sample item for /api/default-shifts/:userId"
  }
]
}
```
