# Cura EMR - Complete Mobile API Endpoints Guide

## 🔐 Authentication & Token Management

### Get Authentication Token
**Endpoint:** `POST /api/auth/login`
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-Tenant-Subdomain": "demo"
}
```
**Body:**
```json
{
  "email": "patient@cura.com",
  "password": "patient123"
}
```
**Note:** You can use either email OR username in the email field
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 351,
    "email": "patient@cura.com",
    "role": "patient"
  }
}
```

### Validate Token Session
**Endpoint:** `GET /api/auth/validate`
**Headers:**
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
{
  "user": {
    "id": 351,
    "email": "patient@cura.com",
    "role": "patient"
  }
}
```

---

## 📱 Patient Mobile App Endpoints

### 1. Patient Dashboard
**Endpoint:** `GET /api/mobile/patient/dashboard`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
{
  "patientInfo": {
    "name": "Zahra Qureshi",
    "email": "patel@averoxemr.com",
    "phone": "+44123456789",
    "patientId": "P000005"
  },
  "upcomingAppointments": 4,
  "activePrescriptions": 76,
  "totalRecords": 60,
  "recentAppointments": [
    {
      "id": 1320,
      "title": "Cardiology Consultation",
      "scheduledAt": "2025-07-24T10:00:00.000Z",
      "status": "scheduled",
      "type": "consultation"
    }
  ]
}
```

### 2. Patient Profile
**Endpoint:** `GET /api/mobile/patient/profile`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
{
  "id": 161,
  "patientId": "P000005",
  "firstName": "Zahra",
  "lastName": "Qureshi",
  "email": "patel@averoxemr.com",
  "phone": "+44123456789",
  "dateOfBirth": "1997-10-10T00:00:00.000Z",
  "address": {},
  "emergencyContact": {
    "name": "0044 765 863 454 8",
    "phone": "0987-6543210",
    "relationship": ""
  },
  "riskLevel": "low"
}
```

### 3. Patient Appointments
**Endpoint:** `GET /api/mobile/patient/appointments`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
[
  {
    "id": 1320,
    "title": "Cardiology Consultation",
    "scheduledAt": "2025-07-24T10:00:00.000Z",
    "status": "scheduled",
    "type": "consultation",
    "provider": "Dr. Emily Johnson",
    "location": "Room 205, Cardiology Department"
  }
]
```

### 4. Patient Prescriptions
**Endpoint:** `GET /api/mobile/patient/prescriptions`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
[
  {
    "id": 1281,
    "status": "active",
    "createdAt": "2025-07-24T05:34:03.383Z",
    "providerName": "Dr. Emily Johnson",
    "medication": "Lisinopril",
    "dosage": "10mg",
    "frequency": "Once daily"
  }
]
```

### 5. Book Appointment
**Endpoint:** `POST /api/mobile/patient/appointments`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "providerId": 349,
  "scheduledAt": "2025-07-25T10:00:00.000Z",
  "type": "consultation",
  "description": "Regular checkup"
}
```

### 6. Update Profile
**Endpoint:** `PUT /api/mobile/patient/profile`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "phone": "+44987654321",
  "emergencyContact": {
    "name": "John Doe",
    "phone": "+44123456789",
    "relationship": "Spouse"
  }
}
```

---

## 👨‍⚕️ Doctor Mobile App Endpoints

### 1. Doctor Dashboard
**Endpoint:** `GET /api/mobile/doctor/dashboard`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
{
  "todayAppointments": 5,
  "totalPatients": 127,
  "pendingTasks": 8,
  "upcomingAppointments": [
    {
      "id": 1320,
      "patientName": "Zahra Qureshi",
      "scheduledAt": "2025-07-24T10:00:00.000Z",
      "type": "consultation"
    }
  ]
}
```

### 2. Doctor Patients List
**Endpoint:** `GET /api/mobile/doctor/patients`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
[
  {
    "id": 161,
    "patientId": "P000005",
    "firstName": "Zahra",
    "lastName": "Qureshi",
    "email": "patel@averoxemr.com",
    "phone": "+44123456789",
    "riskLevel": "low"
  }
]
```

### 3. Doctor Appointments
**Endpoint:** `GET /api/mobile/doctor/appointments`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
[
  {
    "id": 1320,
    "patientName": "Zahra Qureshi",
    "scheduledAt": "2025-07-24T10:00:00.000Z",
    "status": "scheduled",
    "type": "consultation",
    "location": "Room 205"
  }
]
```

### 4. Patient Details
**Endpoint:** `GET /api/mobile/doctor/patients/:patientId`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
{
  "patient": {
    "id": 161,
    "firstName": "Zahra",
    "lastName": "Qureshi",
    "email": "patel@averoxemr.com",
    "phone": "+44123456789",
    "dateOfBirth": "1997-10-10T00:00:00.000Z"
  },
  "medicalHistory": [
    {
      "id": 50,
      "diagnosis": "Hypertension",
      "date": "2025-07-17T07:25:36.328Z",
      "notes": "Patient responding well to medication"
    }
  ],
  "prescriptions": [
    {
      "id": 1281,
      "medication": "Lisinopril",
      "dosage": "10mg",
      "status": "active"
    }
  ]
}
```

### 5. Create Prescription
**Endpoint:** `POST /api/mobile/doctor/prescriptions`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "patientId": 161,
  "medication": "Metformin",
  "dosage": "500mg",
  "frequency": "Twice daily",
  "duration": "30 days",
  "instructions": "Take with meals"
}
```

### 6. Update Appointment Status
**Endpoint:** `PUT /api/mobile/doctor/appointments/:appointmentId`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "status": "completed",
  "notes": "Patient consultation completed successfully"
}
```

### 7. Add Medical Record
**Endpoint:** `POST /api/mobile/doctor/medical-records`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "patientId": 161,
  "diagnosis": "Type 2 Diabetes",
  "symptoms": "Increased thirst, frequent urination",
  "treatment": "Metformin prescribed",
  "notes": "Patient education provided on diet and exercise"
}
```

---

## 🔧 Common Endpoints (Both Apps)

### 1. Get Providers List
**Endpoint:** `GET /api/mobile/providers`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
[
  {
    "id": 349,
    "firstName": "Emily",
    "lastName": "Johnson",
    "specialization": "Cardiology",
    "email": "doctor@cura.com"
  }
]
```

### 2. Get Departments
**Endpoint:** `GET /api/mobile/departments`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo"
}
```
**Response:**
```json
[
  {
    "id": 1,
    "name": "Cardiology",
    "description": "Heart and cardiovascular care"
  },
  {
    "id": 2,
    "name": "Neurology",
    "description": "Brain and nervous system care"
  }
]
```

### 3. Send Message
**Endpoint:** `POST /api/mobile/messages`
**Headers:**
```json
{
  "Authorization": "Bearer [YOUR_TOKEN]",
  "X-Tenant-Subdomain": "demo",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "recipientId": 349,
  "subject": "Appointment Follow-up",
  "content": "Thank you for the consultation today",
  "type": "general"
}
```

---

## 🔑 Authentication Flow

### Step 1: Login
```dart
final response = await http.post(
  Uri.parse('$baseUrl/api/auth/login'),
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Subdomain': 'demo',
  },
  body: jsonEncode({
    'email': 'patient@cura.com',
    'password': 'patient123',
  }),
);

final data = jsonDecode(response.body);
final token = data['token'];
```

### Step 2: Store Token
```dart
await _storage.write(key: 'auth_token', value: token);
```

### Step 3: Use Token in Headers
```dart
static Future<Map<String, String>> _getHeaders() async {
  final token = await _storage.read(key: 'auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
    'X-Tenant-Subdomain': 'demo',
  };
}
```

---

## 📋 Production Environment Variables

For production deployment, ensure these environment variables are set:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `OPENAI_API_KEY` - For AI features
- `SESSION_SECRET` - Session management secret

---

## 🧪 Updated Test Credentials (ALL WORKING)

**✅ Admin Account:**
- Email: `admin@cura.com` OR Username: `admin`  
- Password: `admin123`
- Role: Administrator

**✅ Doctor Account:**
- Email: `doctor@cura.com` OR Username: `doctor`
- Password: `doctor123`
- Role: Doctor

**✅ Patient Account:**
- Email: `patient@cura.com` OR Username: `patient`
- Password: `patient123`
- Role: Patient

**✅ Nurse Account:**
- Email: `nurse@cura.com` OR Username: `nurse`
- Password: `nurse123`
- Role: Nurse

**✅ Lab Technician:**
- Email: `labtech@cura.com` OR Username: `labtech`
- Password: `labtech123`
- Role: Lab Technician

**✅ Receptionist:**
- Email: `receptionist@cura.com` OR Username: `receptionist`
- Password: `labtech123`
- Role: Receptionist

---

## 🚀 Production URLs

**Development:** `http://localhost:5000`
**Production:** `https://halo.averox.com`

Make sure to update the base URL in your mobile apps when deploying to production.