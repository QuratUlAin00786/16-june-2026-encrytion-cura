# Cura Healthcare EMR - Remaining API Documentation

**Supplement to COMPLETE_API_DOCUMENTATION.md**  
**Contains:** Roles & Permissions, User Management (Full CRUD), Messaging, Integrations, Inventory, Analytics, Automation, Population Health, AI Agent, Chatbot, Forms, and Additional Endpoints

---

## Table of Contents

1. [Roles & Permissions](#1-roles--permissions)
2. [User Management (Full CRUD)](#2-user-management-full-crud)
3. [Messaging & Conversations](#3-messaging--conversations)
4. [Integrations & Webhooks](#4-integrations--webhooks)
5. [Analytics & Automation](#5-analytics--automation)
6. [Inventory Management](#6-inventory-management)
7. [Population Health](#7-population-health)
8. [AI Agent & Chatbot](#8-ai-agent--chatbot)
9. [Forms Management](#9-forms-management)
10. [Imaging & Radiology](#10-imaging--radiology)
11. [Financial Forecasting](#11-financial-forecasting)
12. [Letters & Documents](#12-letters--documents)
13. [Emergency Protocols](#13-emergency-protocols)
14. [Clinic Headers & Footers](#14-clinic-headers--footers)
15. [Default Shifts](#15-default-shifts)
16. [SaaS Management (Extended)](#16-saas-management-extended)

---

## 1. Roles & Permissions

### GET `/api/saas/roles`

**Description:** Get all roles for a specific organization (SaaS Admin access only).

**Authentication Required:** Yes (SaaS Token)  
**Roles:** SaaS Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| organizationId | number | Yes | Organization ID to get roles for |

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "admin",
    "displayName": "Administrator",
    "description": "Full system access with all permissions",
    "permissions": {
      "modules": {
        "patients": {"view": true, "create": true, "edit": true, "delete": true},
        "appointments": {"view": true, "create": true, "edit": true, "delete": true},
        "billing": {"view": true, "create": true, "edit": true, "delete": true},
        "reports": {"view": true, "create": true, "export": true},
        "settings": {"view": true, "edit": true}
      },
      "features": {
        "ai_insights": true,
        "telemedicine": true,
        "quickbooks": true,
        "gdpr_management": true
      }
    },
    "isSystem": true,
    "organizationId": 3,
    "createdAt": "2025-01-15T10:00:00.000Z"
  },
  {
    "id": 2,
    "name": "doctor",
    "displayName": "Doctor",
    "description": "Medical practitioner with patient care access",
    "permissions": {
      "modules": {
        "patients": {"view": true, "create": true, "edit": true, "delete": false},
        "appointments": {"view": true, "create": true, "edit": true, "delete": false},
        "prescriptions": {"view": true, "create": true, "edit": true, "sign": true},
        "lab_results": {"view": true, "create": true, "edit": true}
      },
      "features": {
        "ai_insights": true,
        "telemedicine": true
      }
    },
    "isSystem": true,
    "organizationId": 3
  },
  {
    "id": 3,
    "name": "nurse",
    "displayName": "Nurse",
    "description": "Nursing staff with patient care support access",
    "permissions": {
      "modules": {
        "patients": {"view": true, "create": false, "edit": true, "delete": false},
        "appointments": {"view": true, "create": true, "edit": true, "delete": false},
        "prescriptions": {"view": true, "create": false, "edit": false},
        "vitals": {"view": true, "create": true, "edit": true}
      }
    },
    "isSystem": true,
    "organizationId": 3
  },
  {
    "id": 4,
    "name": "receptionist",
    "displayName": "Receptionist",
    "description": "Front desk staff with scheduling access",
    "permissions": {
      "modules": {
        "patients": {"view": true, "create": true, "edit": false, "delete": false},
        "appointments": {"view": true, "create": true, "edit": true, "delete": true}
      }
    },
    "isSystem": true,
    "organizationId": 3
  },
  {
    "id": 5,
    "name": "patient",
    "displayName": "Patient",
    "description": "Patient with access to own records",
    "permissions": {
      "modules": {
        "my_records": {"view": true},
        "my_appointments": {"view": true, "create": true, "cancel": true},
        "my_prescriptions": {"view": true},
        "my_invoices": {"view": true, "pay": true}
      }
    },
    "isSystem": true,
    "organizationId": 3
  },
  {
    "id": 6,
    "name": "lab_technician",
    "displayName": "Lab Technician",
    "description": "Laboratory staff with lab results access",
    "permissions": {
      "modules": {
        "lab_results": {"view": true, "create": true, "edit": true, "generate_report": true},
        "patients": {"view": true}
      }
    },
    "isSystem": true,
    "organizationId": 3
  },
  {
    "id": 7,
    "name": "pharmacist",
    "displayName": "Pharmacist",
    "description": "Pharmacy staff with prescription access",
    "permissions": {
      "modules": {
        "prescriptions": {"view": true, "dispense": true},
        "patients": {"view": true},
        "inventory": {"view": true, "edit": true}
      }
    },
    "isSystem": true,
    "organizationId": 3
  },
  {
    "id": 8,
    "name": "finance",
    "displayName": "Finance",
    "description": "Finance team with billing access",
    "permissions": {
      "modules": {
        "billing": {"view": true, "create": true, "edit": true, "delete": false},
        "reports": {"view": true, "export": true},
        "patients": {"view": true}
      }
    },
    "isSystem": true,
    "organizationId": 3
  }
]
```

**Error Response (400 Bad Request):**
```json
{
  "error": "organizationId is required"
}
```

---

### Available System Roles Reference

| Role | Display Name | Key Permissions |
|------|-------------|-----------------|
| `admin` | Administrator | Full system access |
| `doctor` | Doctor | Patient care, prescriptions, lab orders |
| `nurse` | Nurse | Patient care support, vitals |
| `receptionist` | Receptionist | Scheduling, patient registration |
| `patient` | Patient | Own records only |
| `lab_technician` | Lab Technician | Lab results management |
| `pharmacist` | Pharmacist | Prescription dispensing |
| `finance` | Finance | Billing and reports |
| `sample_taker` | Sample Taker | Sample collection |
| `dentist` | Dentist | Dental care |
| `dental_nurse` | Dental Nurse | Dental support |
| `optician` | Optician | Eye care |
| `physiotherapist` | Physiotherapist | Physical therapy |
| `podiatrist` | Podiatrist | Foot care |
| `aesthetician` | Aesthetician | Aesthetic procedures |
| `phlebotomist` | Phlebotomist | Blood collection |
| `paramedic` | Paramedic | Emergency care |
| `physician` | Physician | General medicine |

---

## 2. User Management (Full CRUD)

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
| department | string | No | Filter by department |
| search | string | No | Search by name or email |

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "organizationId": 3,
    "email": "admin@cura.com",
    "username": "admin",
    "firstName": "System",
    "lastName": "Admin",
    "role": "admin",
    "department": null,
    "medicalSpecialtyCategory": null,
    "subSpecialty": null,
    "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "workingHours": {"start": "09:00", "end": "17:00"},
    "permissions": {
      "modules": {
        "patients": {"view": true, "create": true, "edit": true, "delete": true}
      }
    },
    "isActive": true,
    "isSaaSOwner": false,
    "profileImage": null,
    "phone": "+44 20 1234 5678",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-12-01T14:30:00.000Z"
  },
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
    "workingHours": {"start": "09:00", "end": "17:00"},
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

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | User ID |

**Success Response (200 OK):**
```json
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
  "workingHours": {"start": "09:00", "end": "17:00"},
  "permissions": {
    "modules": {
      "appointments": {"view": true, "create": true, "edit": true}
    }
  },
  "isActive": true,
  "phone": "+44 7700 900123",
  "profileImage": "/uploads/profiles/user-3.jpg",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-12-01T14:30:00.000Z"
}
```

---

### POST `/api/users`

**Description:** Create a new user with role and permissions.

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
  "email": "newdoctor@cura.com",
  "username": "drmiller",
  "password": "SecurePassword123!",
  "firstName": "Dr. James",
  "lastName": "Miller",
  "role": "doctor",
  "department": "Cardiology",
  "medicalSpecialtyCategory": "Cardiology",
  "subSpecialty": "Interventional Cardiology",
  "phone": "+44 7700 900456",
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday"],
  "workingHours": {
    "start": "08:00",
    "end": "16:00"
  },
  "permissions": {
    "modules": {
      "patients": {"view": true, "create": true, "edit": true, "delete": false},
      "appointments": {"view": true, "create": true, "edit": true, "delete": false}
    },
    "features": {
      "telemedicine": true,
      "ai_insights": true
    }
  }
}
```

**Success Response (201 Created):**
```json
{
  "id": 20,
  "organizationId": 3,
  "email": "newdoctor@cura.com",
  "username": "drmiller",
  "firstName": "Dr. James",
  "lastName": "Miller",
  "role": "doctor",
  "department": "Cardiology",
  "medicalSpecialtyCategory": "Cardiology",
  "subSpecialty": "Interventional Cardiology",
  "phone": "+44 7700 900456",
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday"],
  "workingHours": {"start": "08:00", "end": "16:00"},
  "permissions": {...},
  "isActive": true,
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

### PUT `/api/users/:id`

**Description:** Update a user's details including role and permissions.

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
  "department": "Emergency Medicine",
  "role": "doctor",
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "workingHours": {
    "start": "07:00",
    "end": "15:00"
  },
  "permissions": {
    "modules": {
      "patients": {"view": true, "create": true, "edit": true, "delete": true},
      "emergency": {"view": true, "create": true, "triage": true}
    }
  },
  "isActive": true
}
```

**Success Response (200 OK):**
```json
{
  "id": 20,
  "department": "Emergency Medicine",
  "role": "doctor",
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "workingHours": {"start": "07:00", "end": "15:00"},
  "permissions": {...},
  "isActive": true,
  "updatedAt": "2025-12-03T15:00:00.000Z"
}
```

---

### DELETE `/api/users/:id`

**Description:** Delete a user from the organization.

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

**Note:** If the user has role "patient", the associated patient record will also be deleted.

---

### PATCH `/api/users/:id/permissions`

**Description:** Update only the permissions for a specific user.

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
  "permissions": {
    "modules": {
      "patients": {"view": true, "create": true, "edit": true, "delete": false},
      "appointments": {"view": true, "create": true, "edit": true, "delete": true},
      "billing": {"view": true, "create": false, "edit": false}
    },
    "features": {
      "telemedicine": true,
      "ai_insights": true,
      "quickbooks": false
    }
  }
}
```

**Success Response (200 OK):**
```json
{
  "id": 20,
  "permissions": {
    "modules": {...},
    "features": {...}
  },
  "updatedAt": "2025-12-03T15:30:00.000Z"
}
```

---

### GET `/api/users/doctors`

**Description:** Get all users with doctor-like roles.

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
    "subSpecialty": "Cardiology",
    "isActive": true
  },
  {
    "id": 7,
    "email": "dentist@cura.com",
    "firstName": "Dr. Michael",
    "lastName": "Brown",
    "role": "dentist",
    "department": "Dental",
    "isActive": true
  }
]
```

---

### GET `/api/users/current`

**Description:** Get the currently authenticated user's details.

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
  "organizationId": 3,
  "permissions": {
    "modules": {
      "patients": {"view": true, "create": true, "edit": true}
    }
  }
}
```

---

## 3. Messaging & Conversations

### GET `/api/messaging/conversations`

**Description:** Get all conversations for the current user.

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
    "id": "conv_1733234567890",
    "participantIds": [3, 5],
    "participants": [
      {"id": 3, "name": "Dr. Sarah Johnson", "role": "doctor"},
      {"id": 5, "name": "John Patient", "role": "patient"}
    ],
    "lastMessage": {
      "content": "Your test results are ready.",
      "sentAt": "2025-12-03T14:00:00.000Z",
      "senderId": 3
    },
    "unreadCount": 2,
    "createdAt": "2025-12-01T10:00:00.000Z",
    "updatedAt": "2025-12-03T14:00:00.000Z"
  }
]
```

---

### GET `/api/messaging/messages/:conversationId`

**Description:** Get all messages in a conversation.

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Cache-Control: no-cache
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "conversationId": "conv_1733234567890",
    "senderId": 3,
    "senderName": "Dr. Sarah Johnson",
    "senderRole": "doctor",
    "content": "Hello, how are you feeling today?",
    "type": "internal",
    "priority": "normal",
    "isRead": true,
    "createdAt": "2025-12-01T10:00:00.000Z"
  },
  {
    "id": 2,
    "conversationId": "conv_1733234567890",
    "senderId": 5,
    "senderName": "John Patient",
    "senderRole": "patient",
    "content": "Much better, thank you doctor!",
    "type": "internal",
    "priority": "normal",
    "isRead": true,
    "createdAt": "2025-12-01T10:05:00.000Z"
  }
]
```

---

### POST `/api/messaging/send`

**Description:** Send a message (internal, SMS, or WhatsApp).

**Authentication Required:** Yes  
**Roles:** All  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body (Internal Message):**
```json
{
  "conversationId": "conv_1733234567890",
  "recipientId": 5,
  "content": "Your appointment is confirmed for tomorrow at 10 AM.",
  "type": "internal",
  "priority": "normal"
}
```

**Request Body (SMS Message):**
```json
{
  "recipientId": 5,
  "content": "Reminder: Your appointment is tomorrow at 10 AM.",
  "type": "sms",
  "messageType": "sms",
  "phoneNumber": "+447700900123",
  "priority": "normal"
}
```

**Request Body (WhatsApp Message):**
```json
{
  "recipientId": 5,
  "content": "Your prescription is ready for collection.",
  "type": "whatsapp",
  "messageType": "whatsapp",
  "phoneNumber": "+447700900123",
  "priority": "normal"
}
```

**Success Response (200 OK):**
```json
{
  "id": 25,
  "conversationId": "conv_1733234567890",
  "senderId": 3,
  "recipientId": 5,
  "content": "Your appointment is confirmed for tomorrow at 10 AM.",
  "type": "internal",
  "status": "sent",
  "createdAt": "2025-12-03T14:00:00.000Z",
  "externalDelivery": {
    "success": true,
    "messageId": "SM1234567890",
    "cost": "0.05"
  }
}
```

---

### GET `/api/messaging/templates`

**Description:** Get message templates.

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
    "name": "Appointment Reminder",
    "content": "Hi {{patientName}}, this is a reminder for your appointment on {{date}} at {{time}} with {{doctorName}}.",
    "type": "sms",
    "category": "appointment",
    "isActive": true
  },
  {
    "id": 2,
    "name": "Prescription Ready",
    "content": "Dear {{patientName}}, your prescription is ready for collection at {{pharmacyName}}.",
    "type": "sms",
    "category": "prescription",
    "isActive": true
  }
]
```

---

### GET `/api/messaging/analytics`

**Description:** Get messaging analytics.

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
  "totalMessages": 1250,
  "messagesSent": 890,
  "messagesReceived": 360,
  "smsSent": 150,
  "whatsappSent": 75,
  "deliveryRate": 98.5,
  "averageResponseTime": "2.5 hours",
  "topRecipients": [
    {"userId": 5, "name": "John Patient", "messageCount": 45}
  ]
}
```

---

### GET `/api/messaging/twilio-config`

**Description:** Check Twilio configuration status.

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
  "phoneNumber": "+1234567890",
  "accountSid": "AC12345678...",
  "authToken": "Configured",
  "isConfigured": true
}
```

---

### POST `/api/messaging/reset-twilio`

**Description:** Reset Twilio client connection.

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
  "message": "Twilio client reset successfully"
}
```

---

## 4. Integrations & Webhooks

### GET `/api/integrations`

**Description:** List all integrations for the organization.

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
    "name": "QuickBooks",
    "type": "accounting",
    "status": "connected",
    "lastSyncAt": "2025-12-03T10:00:00.000Z",
    "config": {
      "companyId": "123456789"
    }
  },
  {
    "id": 2,
    "name": "Twilio",
    "type": "messaging",
    "status": "connected",
    "config": {
      "phoneNumber": "+1234567890"
    }
  },
  {
    "id": 3,
    "name": "SendGrid",
    "type": "email",
    "status": "connected"
  }
]
```

---

### POST `/api/integrations/connect`

**Description:** Connect a new integration.

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
  "name": "Stripe",
  "type": "payment",
  "config": {
    "publishableKey": "pk_test_...",
    "webhookSecret": "whsec_..."
  }
}
```

**Success Response (200 OK):**
```json
{
  "id": 4,
  "name": "Stripe",
  "type": "payment",
  "status": "connected",
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

### GET `/api/integrations/webhooks`

**Description:** List all webhooks.

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
    "name": "Appointment Created",
    "url": "https://external-system.com/webhooks/appointments",
    "events": ["appointment.created", "appointment.updated"],
    "isActive": true,
    "secret": "whk_...",
    "lastTriggeredAt": "2025-12-03T12:00:00.000Z"
  }
]
```

---

### POST `/api/integrations/webhooks`

**Description:** Create a new webhook.

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
  "name": "Patient Created Webhook",
  "url": "https://crm.example.com/webhooks/patients",
  "events": ["patient.created", "patient.updated"],
  "secret": "my-webhook-secret"
}
```

**Success Response (200 OK):**
```json
{
  "id": 2,
  "name": "Patient Created Webhook",
  "url": "https://crm.example.com/webhooks/patients",
  "events": ["patient.created", "patient.updated"],
  "isActive": true,
  "secret": "whk_..."
}
```

---

### GET `/api/integrations/api-keys`

**Description:** List API keys.

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
    "name": "Mobile App Key",
    "keyPrefix": "cura_live_...",
    "permissions": ["read:patients", "write:appointments"],
    "lastUsedAt": "2025-12-03T14:00:00.000Z",
    "expiresAt": "2026-12-03",
    "isActive": true
  }
]
```

---

### POST `/api/integrations/api-keys`

**Description:** Create a new API key.

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
  "name": "Third Party Integration Key",
  "permissions": ["read:patients", "read:appointments", "write:appointments"],
  "expiresAt": "2026-12-31"
}
```

**Success Response (200 OK):**
```json
{
  "id": 2,
  "name": "Third Party Integration Key",
  "key": "cura_live_sk_abc123def456",
  "keyPrefix": "cura_live_...",
  "permissions": ["read:patients", "read:appointments", "write:appointments"],
  "expiresAt": "2026-12-31",
  "isActive": true,
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

**Note:** The full API key is only returned once upon creation.

---

## 5. Analytics & Automation

### GET `/api/analytics`

**Description:** Get organization analytics.

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
  "overview": {
    "totalPatients": 156,
    "activePatients": 142,
    "newPatientsThisMonth": 12,
    "totalAppointments": 1250,
    "appointmentsThisMonth": 145
  },
  "revenue": {
    "totalRevenue": "125430.50",
    "monthlyRevenue": "15230.00",
    "outstandingBalance": "3450.00"
  },
  "appointments": {
    "completed": 1100,
    "cancelled": 85,
    "noShow": 65,
    "completionRate": 88
  },
  "trends": {
    "patientGrowth": 8.5,
    "revenueGrowth": 12.3,
    "appointmentGrowth": 5.2
  }
}
```

---

### GET `/api/automation/rules`

**Description:** Get automation rules.

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
    "id": "rule_1",
    "name": "Appointment Reminder",
    "description": "Send SMS reminder 24 hours before appointment",
    "trigger": "appointment.scheduled",
    "conditions": [
      {"field": "appointment.isVirtual", "operator": "equals", "value": false}
    ],
    "actions": [
      {"type": "send_sms", "template": "appointment_reminder"}
    ],
    "isActive": true,
    "executionCount": 450,
    "lastExecutedAt": "2025-12-03T08:00:00.000Z"
  }
]
```

---

### GET `/api/automation/stats`

**Description:** Get automation execution statistics.

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
  "totalRules": 5,
  "activeRules": 4,
  "totalExecutions": 2500,
  "successfulExecutions": 2450,
  "failedExecutions": 50,
  "successRate": 98,
  "executionsToday": 45,
  "executionsThisWeek": 320
}
```

---

### POST `/api/automation/rules/:id/toggle`

**Description:** Toggle automation rule on/off.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "id": "rule_1",
  "name": "Appointment Reminder",
  "isActive": false,
  "updatedAt": "2025-12-03T14:00:00.000Z"
}
```

---

## 6. Inventory Management

### GET `/api/inventory/categories`

**Description:** Get inventory categories.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor, Nurse, Receptionist  

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
    "name": "Medications",
    "description": "Pharmaceutical products",
    "parentCategoryId": null,
    "itemCount": 150
  },
  {
    "id": 2,
    "name": "Medical Supplies",
    "description": "Consumable medical supplies",
    "parentCategoryId": null,
    "itemCount": 85
  },
  {
    "id": 3,
    "name": "Antibiotics",
    "description": "Antibiotic medications",
    "parentCategoryId": 1,
    "itemCount": 25
  }
]
```

---

### POST `/api/inventory/categories`

**Description:** Create a new inventory category.

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
  "name": "Vaccines",
  "description": "Immunization vaccines",
  "parentCategoryId": 1
}
```

**Success Response (201 Created):**
```json
{
  "id": 4,
  "name": "Vaccines",
  "description": "Immunization vaccines",
  "parentCategoryId": 1,
  "organizationId": 3,
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

### GET `/api/inventory/items`

**Description:** Get inventory items with optional filters.

**Authentication Required:** Yes  
**Roles:** Admin, Doctor, Nurse, Receptionist  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| categoryId | number | No | Filter by category |
| lowStock | boolean | No | Show only low stock items |
| search | string | No | Search by name or SKU |
| limit | number | No | Maximum results |

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "categoryId": 1,
    "name": "Paracetamol 500mg",
    "description": "Pain relief tablets",
    "sku": "MED-PARA-500",
    "barcode": "5012345678901",
    "genericName": "Paracetamol",
    "brandName": "Panadol",
    "manufacturer": "GSK",
    "unitOfMeasurement": "tablets",
    "quantity": 500,
    "minimumStock": 100,
    "maximumStock": 1000,
    "reorderPoint": 150,
    "unitCost": "0.05",
    "unitPrice": "0.15",
    "expiryDate": "2026-12-31",
    "batchNumber": "BATCH001",
    "location": "Shelf A1",
    "isLowStock": false,
    "status": "active"
  }
]
```

---

### POST `/api/inventory/items`

**Description:** Create a new inventory item.

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
  "categoryId": 1,
  "name": "Amoxicillin 250mg",
  "description": "Antibiotic capsules",
  "sku": "MED-AMOX-250",
  "barcode": "5012345678902",
  "genericName": "Amoxicillin",
  "brandName": "Amoxil",
  "manufacturer": "Pfizer",
  "unitOfMeasurement": "capsules",
  "quantity": 200,
  "minimumStock": 50,
  "maximumStock": 500,
  "reorderPoint": 75,
  "unitCost": "0.10",
  "unitPrice": "0.30",
  "expiryDate": "2026-06-30",
  "batchNumber": "BATCH002",
  "location": "Shelf B2"
}
```

**Success Response (201 Created):**
```json
{
  "id": 25,
  "categoryId": 1,
  "name": "Amoxicillin 250mg",
  "sku": "MED-AMOX-250",
  "quantity": 200,
  "status": "active",
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

## 7. Population Health

### GET `/api/population-health/interventions`

**Description:** Get population health interventions.

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
    "name": "Diabetes Prevention Program",
    "description": "Comprehensive lifestyle intervention program designed to prevent type 2 diabetes in high-risk patients.",
    "type": "educational",
    "status": "active",
    "targetPopulation": "Pre-diabetic adults aged 35-65",
    "duration": 16,
    "budget": 25000,
    "startDate": "2024-06-01",
    "metrics": {
      "enrolled": 47,
      "completed": 23,
      "successRate": 78
    }
  },
  {
    "id": 2,
    "name": "Hypertension Monitoring Initiative",
    "description": "Remote blood pressure monitoring program with automated alerts.",
    "type": "screening",
    "status": "active",
    "targetPopulation": "Hypertensive patients",
    "duration": 24,
    "budget": 18000,
    "startDate": "2024-05-15",
    "metrics": {
      "enrolled": 156,
      "completed": 89,
      "successRate": 85
    }
  }
]
```

---

## 8. AI Agent & Chatbot

### POST `/api/ai-agent/chat`

**Description:** Send a message to the AI agent.

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
  "message": "What medications are commonly used for hypertension?",
  "context": {
    "patientId": 5,
    "sessionId": "sess_123456"
  }
}
```

**Success Response (200 OK):**
```json
{
  "response": "Common medications for hypertension include ACE inhibitors (like Lisinopril), ARBs (like Losartan), calcium channel blockers (like Amlodipine), and diuretics (like Hydrochlorothiazide). The choice depends on individual patient factors.",
  "intent": "medical_information",
  "confidence": 0.92,
  "medicalAdviceLevel": "informational",
  "disclaimers": [
    "This is an AI assistant and should not replace professional medical advice."
  ],
  "followUpQuestions": [
    "Would you like more details about any specific medication?",
    "Do you have questions about side effects?"
  ],
  "urgencyLevel": "low"
}
```

---

### POST `/api/chatbot/book-appointment`

**Description:** Book an appointment through the chatbot.

**Authentication Required:** No (Public chatbot)  

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "patient@example.com",
  "name": "John Smith",
  "phone": "+447700900123",
  "appointmentType": "consultation",
  "preferredDate": "2025-12-10",
  "preferredTime": "10:00",
  "reason": "Annual check-up"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Appointment booked successfully! You'll receive a confirmation email shortly.",
  "appointmentId": 47,
  "doctorName": "Dr. Sarah Johnson",
  "scheduledFor": "2025-12-10T10:00:00.000Z"
}
```

---

### POST `/api/chatbot/request-prescription`

**Description:** Request a prescription through the chatbot.

**Authentication Required:** No (Public chatbot)  

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "patient@example.com",
  "name": "John Smith",
  "phone": "+447700900123",
  "medication": "Lisinopril 10mg",
  "reason": "Regular repeat prescription",
  "medicalHistory": "Previously prescribed by Dr. Johnson"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Prescription request submitted successfully! Our medical team will review it within 24 hours.",
  "requestId": 25,
  "reviewingDoctor": "Dr. Sarah Johnson",
  "status": "pending_review"
}
```

---

### GET `/api/chatbot/context`

**Description:** Get context data for the chatbot.

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
  "availableDoctors": [
    {"id": 3, "name": "Dr. Sarah Johnson", "specialty": "General Medicine"},
    {"id": 7, "name": "Dr. Michael Brown", "specialty": "Cardiology"}
  ],
  "patientInfo": {
    "id": 5,
    "name": "John Patient",
    "email": "john.patient@email.com"
  }
}
```

---

## 9. Forms Management

### GET `/api/forms`

**Description:** Get all forms.

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
    "id": "form_001",
    "title": "Patient Intake Form",
    "description": "Comprehensive new patient registration",
    "category": "intake",
    "status": "published",
    "fields": [
      {"id": "1", "type": "text", "label": "Full Name", "required": true},
      {"id": "2", "type": "email", "label": "Email Address", "required": true},
      {"id": "3", "type": "date", "label": "Date of Birth", "required": true},
      {"id": "4", "type": "textarea", "label": "Medical History", "required": false}
    ],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "responses": 45
  }
]
```

---

### POST `/api/forms`

**Description:** Create a new form.

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
  "title": "COVID-19 Screening Form",
  "description": "Pre-appointment COVID-19 screening questions",
  "category": "screening",
  "fields": [
    {"id": "1", "type": "checkbox", "label": "Do you have a fever?", "required": true},
    {"id": "2", "type": "checkbox", "label": "Do you have a cough?", "required": true},
    {"id": "3", "type": "checkbox", "label": "Have you been in contact with someone with COVID-19?", "required": true}
  ]
}
```

**Success Response (201 Created):**
```json
{
  "id": "form_1733300000000",
  "title": "COVID-19 Screening Form",
  "description": "Pre-appointment COVID-19 screening questions",
  "category": "screening",
  "status": "draft",
  "fields": [...],
  "createdBy": 3,
  "createdAt": "2025-12-03T14:00:00.000Z",
  "responses": 0
}
```

---

## 10. Imaging & Radiology

### GET `/api/imaging`

**Description:** Get imaging studies.

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
    "id": "img_001",
    "patientId": "p_001",
    "patientName": "Sarah Johnson",
    "studyType": "Chest X-Ray",
    "modality": "XR",
    "orderedBy": "Dr. Sarah Smith",
    "orderedAt": "2024-01-15T09:00:00Z",
    "scheduledAt": "2024-01-16T14:00:00Z",
    "completedAt": "2024-01-16T14:30:00Z",
    "status": "completed",
    "findings": "No acute cardiopulmonary abnormalities identified.",
    "impression": "Normal chest radiograph",
    "radiologist": "Dr. Michael Johnson",
    "priority": "routine"
  }
]
```

---

### GET `/api/pricing/imaging`

**Description:** Get imaging service prices.

**Authentication Required:** Yes  
**Roles:** Doctor, Nurse, Patient, Admin  

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
    "name": "Chest X-Ray",
    "code": "IMG-XR-CHEST",
    "modality": "XR",
    "price": "75.00",
    "currency": "GBP",
    "description": "Standard chest X-ray imaging"
  },
  {
    "id": 2,
    "name": "MRI Brain",
    "code": "IMG-MRI-BRAIN",
    "modality": "MRI",
    "price": "450.00",
    "currency": "GBP",
    "description": "Magnetic resonance imaging of brain"
  }
]
```

---

## 11. Financial Forecasting

### GET `/api/financial-forecasting`

**Description:** Get financial forecasts.

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
    "name": "Q1 2026 Revenue Forecast",
    "period": "2026-Q1",
    "projectedRevenue": "45000.00",
    "projectedExpenses": "32000.00",
    "projectedProfit": "13000.00",
    "confidence": 85,
    "assumptions": [
      "10% patient growth",
      "Stable pricing",
      "2 new doctors hired"
    ],
    "createdAt": "2025-12-01T10:00:00.000Z"
  }
]
```

---

### POST `/api/financial-forecasting/generate`

**Description:** Generate a new financial forecast.

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
  "name": "Q2 2026 Revenue Forecast",
  "period": "2026-Q2",
  "assumptions": [
    "15% patient growth",
    "5% price increase",
    "New cardiology department"
  ]
}
```

**Success Response (200 OK):**
```json
{
  "id": 2,
  "name": "Q2 2026 Revenue Forecast",
  "period": "2026-Q2",
  "projectedRevenue": "52000.00",
  "projectedExpenses": "35000.00",
  "projectedProfit": "17000.00",
  "confidence": 80,
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

## 12. Letters & Documents

### GET `/api/letter-drafts`

**Description:** Get letter drafts.

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
    "title": "Referral Letter - Cardiology",
    "patientId": 5,
    "patientName": "John Patient",
    "type": "referral",
    "status": "draft",
    "content": "Dear Colleague,\n\nI am referring...",
    "createdBy": 3,
    "createdAt": "2025-12-01T10:00:00.000Z"
  }
]
```

---

### POST `/api/letter-drafts`

**Description:** Create a letter draft.

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
  "title": "Medical Certificate",
  "patientId": 5,
  "type": "certificate",
  "content": "This is to certify that John Patient attended..."
}
```

**Success Response (201 Created):**
```json
{
  "id": 2,
  "title": "Medical Certificate",
  "patientId": 5,
  "type": "certificate",
  "status": "draft",
  "content": "This is to certify that John Patient attended...",
  "createdBy": 3,
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

### POST `/api/email/send-letter`

**Description:** Send a letter via email.

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
  "letterId": 2,
  "recipientEmail": "specialist@hospital.com",
  "recipientName": "Dr. Specialist",
  "subject": "Medical Certificate for John Patient",
  "attachPdf": true
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Letter sent successfully",
  "sentAt": "2025-12-03T14:00:00.000Z"
}
```

---

## 13. Emergency Protocols

### GET `/api/emergency-protocols`

**Description:** Get emergency protocols.

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
    "name": "Cardiac Arrest",
    "code": "CODE-BLUE",
    "steps": [
      "Call for help",
      "Begin CPR",
      "Apply AED if available",
      "Continue until advanced help arrives"
    ],
    "medications": ["Epinephrine", "Amiodarone"],
    "equipment": ["AED", "Crash cart", "Oxygen"],
    "contactNumbers": ["+44 20 1234 5678"]
  }
]
```

---

### POST `/api/emergency-protocols`

**Description:** Create an emergency protocol.

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
  "name": "Anaphylaxis",
  "code": "CODE-ALLERGY",
  "steps": [
    "Remove allergen if possible",
    "Administer epinephrine auto-injector",
    "Call emergency services",
    "Monitor airway"
  ],
  "medications": ["Epinephrine", "Antihistamines"],
  "equipment": ["EpiPen", "Oxygen"]
}
```

**Success Response (201 Created):**
```json
{
  "id": 2,
  "name": "Anaphylaxis",
  "code": "CODE-ALLERGY",
  "steps": [...],
  "createdAt": "2025-12-03T14:00:00.000Z"
}
```

---

## 14. Clinic Headers & Footers

### GET `/api/clinic-headers`

**Description:** Get clinic header configurations.

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
    "organizationId": 3,
    "clinicName": "Cura Healthcare Clinic",
    "logoUrl": "/uploads/logos/cura-logo.png",
    "logoBase64": "data:image/png;base64,...",
    "address": "123 Medical Centre, London SW1A 1AA",
    "phone": "+44 20 1234 5678",
    "email": "contact@curahealthcare.com",
    "website": "www.curahealthcare.com",
    "registrationNumber": "CQC-12345",
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
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
  "logoBase64": "data:image/png;base64,...",
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

**Description:** Get clinic footer configurations.

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
    "organizationId": 3,
    "footerText": "Cura Healthcare - Registered in England. Company No. 12345678",
    "disclaimer": "This document is confidential medical information.",
    "backgroundColor": "#4A7DFF",
    "textColor": "#FFFFFF",
    "isActive": true
  }
]
```

---

### POST `/api/clinic-footers`

**Description:** Create or update clinic footer.

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
  "footerText": "Cura Healthcare - Registered in England. Company No. 12345678",
  "disclaimer": "This document is confidential medical information.",
  "backgroundColor": "#4A7DFF",
  "textColor": "#FFFFFF"
}
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "message": "Clinic footer saved successfully"
}
```

---

## 15. Default Shifts

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
  },
  {
    "id": 2,
    "userId": 3,
    "dayOfWeek": "Tuesday",
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
    {"dayOfWeek": "Wednesday", "startTime": "08:00", "endTime": "12:00", "isAvailable": true},
    {"dayOfWeek": "Thursday", "startTime": "08:00", "endTime": "16:00", "isAvailable": true},
    {"dayOfWeek": "Friday", "startTime": "08:00", "endTime": "14:00", "isAvailable": true},
    {"dayOfWeek": "Saturday", "startTime": null, "endTime": null, "isAvailable": false},
    {"dayOfWeek": "Sunday", "startTime": null, "endTime": null, "isAvailable": false}
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Default shifts updated successfully",
  "shifts": [...]
}
```

---

## 16. SaaS Management (Extended)

### GET `/api/saas/organizations`

**Description:** List all organizations (SaaS Admin).

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
    "brandName": "Cura Healthcare Clinic",
    "status": "active",
    "contactEmail": "admin@cura.com",
    "contactPhone": "+44 20 1234 5678",
    "address": "123 Medical Centre, London",
    "city": "London",
    "country": "UK",
    "userCount": 13,
    "patientCount": 156,
    "subscription": {
      "plan": "professional",
      "status": "active",
      "currentPeriodEnd": "2025-12-31"
    },
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

---

### GET `/api/saas/customers`

**Description:** List all customers with search/filter.

**Authentication Required:** Yes (SaaS Token)  
**Roles:** SaaS Admin  

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search | string | No | Search by name or email |
| status | string | No | Filter by status (active, suspended) |

**Success Response (200 OK):**
```json
[
  {
    "id": 3,
    "name": "Cura Healthcare",
    "subdomain": "cura",
    "status": "active",
    "adminEmail": "admin@cura.com",
    "plan": "professional",
    "userCount": 13,
    "monthlyRevenue": "299.00"
  }
]
```

---

### POST `/api/saas/customers`

**Description:** Create a new customer organization.

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
  "contactPhone": "+44 20 9876 5432",
  "address": "456 Medical St",
  "city": "Manchester",
  "country": "UK",
  "adminEmail": "admin@newhealthcare.com",
  "adminFirstName": "Admin",
  "adminLastName": "User",
  "adminPassword": "TempPassword123!",
  "plan": "starter"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "organization": {
    "id": 5,
    "name": "New Healthcare Clinic",
    "subdomain": "newhealthcare"
  },
  "adminUser": {
    "id": 25,
    "email": "admin@newhealthcare.com"
  },
  "tempPassword": "TempPassword123!",
  "emailSent": true
}
```

---

### GET `/api/saas/organizations/:id/subscription`

**Description:** Get subscription details for an organization.

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
  "id": 5,
  "organizationId": 3,
  "plan": "professional",
  "status": "active",
  "maxUsers": 25,
  "currentUsers": 13,
  "pricePerMonth": "299.00",
  "billingCycle": "monthly",
  "currentPeriodStart": "2025-12-01",
  "currentPeriodEnd": "2025-12-31",
  "features": ["ai_insights", "telemedicine", "quickbooks_integration"],
  "hasActiveSubscription": true,
  "isActive": true
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
    "description": "For small clinics just getting started",
    "priceMonthly": "99.00",
    "priceAnnual": "990.00",
    "maxUsers": 5,
    "features": [
      "Patient Management",
      "Appointment Scheduling",
      "Basic Invoicing",
      "Email Support"
    ],
    "isPopular": false,
    "displayOrder": 1
  },
  {
    "id": 2,
    "name": "Professional",
    "description": "For growing practices",
    "priceMonthly": "299.00",
    "priceAnnual": "2990.00",
    "maxUsers": 25,
    "features": [
      "Everything in Starter",
      "AI-Powered Insights",
      "Telemedicine",
      "QuickBooks Integration",
      "Priority Support"
    ],
    "isPopular": true,
    "displayOrder": 2
  },
  {
    "id": 3,
    "name": "Enterprise",
    "description": "For large healthcare networks",
    "priceMonthly": "799.00",
    "priceAnnual": "7990.00",
    "maxUsers": 100,
    "features": [
      "Everything in Professional",
      "Multi-location Support",
      "Custom Integrations",
      "Dedicated Account Manager",
      "SLA Guarantee",
      "On-premise Option"
    ],
    "isPopular": false,
    "displayOrder": 3
  }
]
```

---

## Permission Structure Reference

### Module Permissions

```json
{
  "modules": {
    "patients": {
      "view": true,
      "create": true,
      "edit": true,
      "delete": false
    },
    "appointments": {
      "view": true,
      "create": true,
      "edit": true,
      "delete": true
    },
    "prescriptions": {
      "view": true,
      "create": true,
      "edit": true,
      "sign": true,
      "dispense": false
    },
    "lab_results": {
      "view": true,
      "create": true,
      "edit": true,
      "generate_report": true
    },
    "billing": {
      "view": true,
      "create": true,
      "edit": true,
      "delete": false,
      "export": true
    },
    "reports": {
      "view": true,
      "create": true,
      "export": true
    },
    "settings": {
      "view": true,
      "edit": true
    },
    "users": {
      "view": true,
      "create": true,
      "edit": true,
      "delete": true
    }
  }
}
```

### Feature Permissions

```json
{
  "features": {
    "ai_insights": true,
    "telemedicine": true,
    "quickbooks": true,
    "gdpr_management": true,
    "population_health": false,
    "inventory": true
  }
}
```

---

*This documentation supplements COMPLETE_API_DOCUMENTATION.md*  
*Generated: December 2025*  
*Cura Healthcare EMR - Remaining API Documentation v1.0*
