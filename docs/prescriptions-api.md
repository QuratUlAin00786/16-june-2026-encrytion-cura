# Prescription API Reference

**Base path:** `/api`  
**Authentication:** All prescription routes require `authMiddleware` and tenant context; most enforce specific roles (doctors/nurses/admins for creation/updates, various clinician roles for deletes and e-signatures).  
**Dependencies:** `storage` for persistence, `createNotification`/`createBulkNotifications` for alerts, `emailService` for pharmacy communication, `clinicHeaders/Footers` for branding, `messagingService` and `createNotification` for reminders, `upload` middleware for attachments.

---

## General Prescription Listing

### 1. List Prescriptions
- **GET** `/api/prescriptions`
- **Auth:** `authMiddleware`
- **Query:** 
  - `patientId` – filter by patient (patients use this to view their own).
  - `providerId` – filter by provider (doctors).
- **Response:** Array of prescription records `{ id, prescriptionNumber, patientId, doctorId, status, medications, pharmacy, notes, createdAt, ... }`.
- **Notes:** Defaults to organization-wide list for admins/nurses. Logs query filters for debugging.

### 2. Patient-Specific List
- **GET** `/api/prescriptions/patient/:patientId`
- **Auth:** `authMiddleware`
- **Purpose:** Always fetch by numeric patient ID regardless of user role.

---

## Prescription Lifecycle

### 3. Create Prescription
- **POST** `/api/prescriptions`
- **Auth:** `authMiddleware`
- **Body:** Freeform JSON; expected keys include:
  ```json
  {
    "patientId": "123",
    "providerId": "456",
    "diagnosis": "Hypertension",
    "medications": [
      { "name": "Lisinopril", "dosage": "10mg", "frequency": "Once daily", "duration": "30 days", "instructions": "Take in morning" }
    ],
    "notes": "...",
    "validUntil": "2025-02-15",
    "interactions": []
  }
  ```
- **Logic:** Validates presence of patient/provider IDs, prevents millisecond-duplicate entries by comparing timestamps; selects first medication for legacy columns; constructs `prescriptionNumber`, sets default status `active`, saves via `storage.createPrescription`.
- **Side effects:** Sends notification to patient (if user) with metadata, logs.
- **Response:** `201 Created` with persisted prescription.

### 4. Update Prescription
- **PATCH** `/api/prescriptions/:id`
- **Auth:** `authMiddleware`, `requireRole(["admin","doctor","nurse"])`
- **Body:** Partial updates for `status`, `diagnosis`, `medications`, `pharmacy`, `notes`, `validUntil`, `interactions`.
- **Response:** Updated record or `404`.

### 5. Delete Prescription
- **DELETE** `/api/prescriptions/:id`
- **Auth:** `authMiddleware`, role list includes pharmacists/lab technicians/dental staff etc.
- **Purpose:** Soft/hard delete. Returns success message or `404`.

---

## Prescription Distribution

### 6. Send to Pharmacy
- **POST** `/api/prescriptions/:id/send-to-pharmacy`
- **Auth:** `authMiddleware`, `requireRole(["doctor","nurse"])`
- **Body:** `{ pharmacyData: { name, email, phone, address } }`
- **Flow:** Verifies prescription/patient/doctor exist, updates pharmacy info, uses clinic header/footer & `generatePrescriptionEmailHTML`, emails pharmacy via `sendEmail`, returns success boolean `sentAt`.

### 7. Send Prescription PDF
- **POST** `/api/prescriptions/:id/send-pdf`
- **Auth:** `authMiddleware`
- **Body:** multipart `attachments[]` + fields `pharmacyEmail`, `pharmacyName`, optional `patientName`.
- **Flow:** Validates pharmacy email, resolves patient name, fetches clinic logo (header), adds attachments, builds HTML template via `emailService.generatePrescriptionEmail`, sends email.
- **Response:** `{ success: true, message, attachmentsCount }` or errors (400 invalid email, 500 send failure).

---

## Compliance & Signatures

### 8. Safety Check
- **POST** `/api/prescription/safety-check`
- **Auth:** `authMiddleware`, `requireRole(["doctor","nurse"])`
- **Body:** patient-specific data (allergies, medications, etc.)
- **Purpose:** Calls `messagingService.prescriptionSafetyCheck`? (not shown) to detect interactions/allergies and returns risk level.  
- **Response:** `{ success: true, patientId, analysis, riskLevel, timestamp }`.

### 9. E-sign Prescription
- **POST** `/api/prescriptions/:id/e-sign`
- **Auth:** `authMiddleware`, role list includes admin/doctors/nurses plus allied roles.
- **Body:** `{ signature: "<base64>" }`
- **Flow:** Validates prescription exists, saves `signature` data with signer info, sets status `signed`.
- **Response:** `{ success: true, signature, prescription }`.

---

## Notifications & Follow-up

### 10. Notifications on Creation/Completion
- Prescription creation triggers `createNotification` for patient about new Rx if user/patient records exist.
- Completing lab results also uses notifications referenced earlier (not repeated).

---

## Notes
- **Tenant context:** `enforceCreatedBy` ensures `createdBy` originates from authenticated user.
- **Logging:** Creation/update endpoints log full payload plus user info for traceability; send-to-pharmacy logs brand info/res.
- **Storage:** `storage.createPrescription`, `updatePrescription`, `deletePrescription`, `get...` functions manage persistence.  
