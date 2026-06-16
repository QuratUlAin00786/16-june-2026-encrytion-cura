# Billing Treatment APIs from billing.tsx

Extracted from `client/src/pages/billing.tsx`.

Endpoints below are the ones referenced in that page related to treatment metadata, pricing, billing, payments, insurance, and patient context.

### GET `/api/treatments-info`

- **Description:** List treatment metadata
- **Authentication Required:** Yes
- **Roles:** admin, doctor, nurse

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/treatments-info" \
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
      "name": "Physiotherapy",
      "basePrice": 120,
      "doctorRole": "physiotherapist"
    }
  ]
}
```

### POST `/api/treatments-info`

- **Description:** Create treatment metadata
- **Authentication Required:** Yes
- **Roles:** admin, doctor, nurse

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/treatments-info" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"name\": \"Physiotherapy\",\n  \"basePrice\": 150,\n  \"colorCode\": \"#2563eb\",\n  \"doctorRole\": \"physiotherapist\",\n  \"doctorName\": \"Dr. Rivera\",\n  \"doctorId\": 12\n}"
```

**Sample Request Payload**
```json
{
  "name": "Physiotherapy",
  "basePrice": 150,
  "colorCode": "#2563eb",
  "doctorRole": "physiotherapist",
  "doctorName": "Dr. Rivera",
  "doctorId": 12
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
    "id": "<id>",
    "name": "Physiotherapy",
    "basePrice": 150
  }
}
```

### PATCH `/api/treatments-info/:id`

- **Description:** Update treatment metadata
- **Authentication Required:** Yes
- **Roles:** admin, doctor, nurse

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/treatments-info/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"basePrice\": 160\n}"
```

**Sample Request Payload**
```json
{
  "basePrice": 160
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
    "id": "<id>",
    "basePrice": 160
  }
}
```

### DELETE `/api/treatments-info/:id`

- **Description:** Delete treatment metadata
- **Authentication Required:** Yes
- **Roles:** admin, doctor, nurse

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/treatments-info/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>"
```

**Sample Response**
```json
{
  "status": "success",
  "message": "Treatment metadata deleted"
}
```

### GET `/api/pricing/treatments`

- **Description:** List treatment pricing
- **Authentication Required:** Yes
- **Roles:** admin, doctor

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/pricing/treatments" \
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
      "name": "Physiotherapy",
      "basePrice": 150
    }
  ]
}
```

### POST `/api/pricing/treatments`

- **Description:** Create treatment pricing rule
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X POST "https://{your-domain}.com/api/pricing/treatments" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"treatmentId\": 3,\n  \"price\": 150,\n  \"currency\": \"GBP\"\n}"
```

**Sample Request Payload**
```json
{
  "treatmentId": 3,
  "price": 150,
  "currency": "GBP"
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
    "id": "<id>",
    "price": 150
  }
}
```

### PATCH `/api/pricing/treatments/:id`

- **Description:** Update treatment pricing
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X PATCH "https://{your-domain}.com/api/pricing/treatments/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json" \
  -d "{\n  \"price\": 160\n}"
```

**Sample Request Payload**
```json
{
  "price": 160
}
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
    "id": "<id>",
    "price": 160
  }
}
```

### DELETE `/api/pricing/treatments/:id`

- **Description:** Delete treatment pricing rule
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X DELETE "https://{your-domain}.com/api/pricing/treatments/{id}" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>"
```

**Sample Response**
```json
{
  "status": "success",
  "message": "Treatment pricing deleted"
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


### GET `/api/pricing/doctors-fees/check-duplicate`

- **Description:** Check for duplicate doctor fee by role/doctor
- **Authentication Required:** Yes
- **Roles:** admin

**cURL**
```bash
curl -X GET "https://{your-domain}.com/api/pricing/doctors-fees/check-duplicate?doctorRole=doctor&doctorId=5" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \
  -H "Content-Type: application/json"
```

**Sample Response**
```json
{
  "status": "success",
  "data": {
    "exists": false
  }
}
```

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

