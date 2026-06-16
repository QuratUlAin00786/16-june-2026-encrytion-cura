# Treatment & Billing API Reference

Base domain: https://{your-domain}.com (replace with your deployment)
Common headers:
- Authorization: Bearer <JWT_TOKEN>
- X-Tenant-Subdomain: <tenant_subdomain>
- Content-Type: application/json (if the request has a body)

Replace placeholder values before running the requests below.

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

