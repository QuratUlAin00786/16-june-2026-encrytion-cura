# Patient & Appointment API Reference

**Base path:** `/api`  
**Authentication:** Most routes require `authMiddleware` plus tenant resolution; some endpoints also enforce `requireRole` or `requireNonPatientRole`. Appointment creation checks module permissions (patients bypass the check for their own bookings). Health-score, reminders, and other patient-specific endpoints log heavily for debugging.

---

## Patients

### 1. List Patients
- **GET** `/api/patients`
- **Auth:** `authMiddleware`, `requireRole(["admin","doctor","nurse","patient"])`
- **Query:** `limit` (default 50), `isActive` (`true|false`)
- **Purpose:** Returns up to `limit` patient rows for the tenant (filtered by `isActive` if provided).  
- **Response:** Array from `storage.getPatientsByOrganization`.

### 2. Email Availability Check
- **GET** `/api/patients/check-email`
- **Auth:** `authMiddleware`
- **Query:** `email`
- **Purpose:** Ensures email is unused by patients/users/organizations (cross-org). Response includes `emailAvailable` and `associatedWithAnotherOrg`. Adds no-cache headers.

### 3. My Prescriptions (patient-only)
- **GET** `/api/patients/my-prescriptions`
- **Auth:** `authMiddleware`, `requireRole(["patient"])`
- **Purpose:** Finds patient by user email and returns their prescriptions + total count.
- **Response:** `{ prescriptions: [...], totalCount, patientId }`

### 4. Health Score
- **GET** `/api/patients/health-score`
- **Auth:** `authMiddleware`
- **Purpose:** Finds patient by user and calculates weighted health score via `calculateHealthScore` (spo2, bp, hr, labs, bmi, lifestyle). Based on medical records stored in DB.
- **Response:** `{ score, category, breakdown, totalRecords, lastUpdated }`

### 5. Fetch Patient Details
- **GET** `/api/patients/:id`
- **Auth:** None explicitly (route public but tenant aware)
- **Purpose:** Returns patient record plus AI insights via `storage.getAiInsightsByPatient`.

### 6. Delete Patient
- **DELETE** `/api/patients/:id`
- **Auth:** `authMiddleware`, `requireRole(["admin"])`
- **Purpose:** Deletes patient and related records.

### 7. Patient Sub-resources
- **GET** `/api/patients/:id/records` – Medical records list.
- **GET** `/api/patients/:id/history` – Structured medical history.
- **GET** `/api/patients/:id/prescriptions` – Prescription list formatted for UI.
- **GET** `/api/patients/:id/pending-results` – Aggregates prescriptions, lab results, AI insights, voice notes, claims, medical records for pending statuses.
- **GET** `/api/patients/:id/lab-results` – Returns lab tests formatted with primary result, status, values.
- **GET** `/api/patients/:id/medical-imaging` – Imaging rows for patient.
- **GET** `/api/patients/:id/insurance` – Insurance info stored on patient.
- **GET** `/api/patients/:id/address` – Address JSON.
- **GET** `/api/patients/:id/emergency-contact` – Emergency contact object.
- **GET** `/api/patients/:id/invoices` – Invoices linked to patient via `patient.patientId`.
- **GET** `/api/patients/:id/payments` – Collects payments for each invoice.
- **GET** `/api/patients/:id/communications` – All communications from storage.

### 8. Medical Records Management
- **POST** `/api/patients/:id/records`
  - **Auth:** `authMiddleware`, `requireNonPatientRole()`
  - **Body:** `type`, `title`, optional `notes`, `diagnosis`, `treatment`, `prescription`, `followUp`, `referrals`. Zod enforces enums for type and nested structures.
  - **Response:** Newly created record with provider info.
- **PATCH** `/api/patients/:patientId/records/:recordId` – Partial updates, same schema minus required fields.
- **DELETE** `/api/patients/:patientId/records/:recordId` – Removes medical record.

### 9. Patient Creation & Updates
- **POST** `/api/patients`
  - **Auth:** `requireRole(["doctor","nurse","admin"])`
  - **Body:** Extensive schema (name, dob, gender, contact, insurance, medicalHistory with nested arrays).
  - **Flow:** Creates a user (hashes password `cura123`), patient record with auto-generated ID (`P0000xx`), optional insurance verification, AI insights (if enabled), logging at every step.
  - **Response:** Created patient row.
- **PATCH** `/api/patients/:id/medical-history` – Merges provided medical history with existing data, ensures arrays preserved, logs.
- **PATCH** `/api/patients/:id` – General patient updates (details not repeated here) with notifications when risk levels/flags change.

### 10. Reminder & Flags
- **POST** `/api/patients/:id/send-reminder`
  - **Auth:** `requireRole(["doctor","nurse","receptionist","admin"])`
  - **Body:** `type` (enum), `message`, `method` (email/sms/whatsapp/phone/system), optional scheduling/timezone.
  - **Logic:** Sends message via `messagingService` (sms/whatsapp), `emailService`, or voice call. Saves communication log with status. Schedules if `scheduledFor` in future.
- **POST** `/api/patients/:id/flags` – Adds clinical flags; not shown but exists earlier.
- **DELETE** `/api/patients/:id/flags/:flagIndex` – Removes flagged entry.

### 11. Prescription Safety & Communications
- **POST** `/api/prescription/safety-check`
  - **Auth:** `requireRole(["doctor","nurse"])`
  - **Purpose:** Cross-checks interactions/allergies; returns risk level, alerts, timestamp.

---

## Appointments

### 12. List Appointments
- **GET** `/api/appointments`
- **Auth:** `authMiddleware`, `requireRole(["admin","doctor","nurse","patient"])`
- **Query:** `start`, `end`, `doctorId`, `patientId`, `providerId`, `date`.
- **Logic:** Role-specific filtering (admin/receptionist = all, doctors limited to themselves unless permission, patients only their records, nurses with view permission). Slot availability queries (`providerId` + `date`) return minimal data for any user.

### 13. Update Appointment
- **PUT** `/api/appointments/:id`
- **Auth:** `authMiddleware`
- **Rules:** Admin/receptionist can update any; doctors limited to own appointments or edit permission; patients limited to their appointments; nurses require edit permission. Allows updating `title`, `description`, `scheduledAt`, `duration`, `status`, `type`, `location`, `isVirtual`. Broadcasts SSE updates to connected clients.

### 14. Appointment Streaming & Events
- **GET** `/api/appointments/stream`
- **Auth:** `authMiddleware`
- **Purpose:** Server-Sent Events stream sending connection ping, broadcast updates stored in `global.appointmentClients`. Setup includes keep-alive ping and cleanup on disconnect.
- **Broadcast helper:** `broadcastAppointmentEvent(organizationId, eventType, data)` writes SSE to each matching client.

### 15. Conflict Checking
- **POST** `/api/appointments/check-conflicts`
- **Auth:** `authMiddleware`
- **Body:** `patientId`, `providerId`, `scheduledAt` (ISO string).
- **Logic:** Performs SQL queries to detect same date/time conflicts for patient and provider (excludes cancelled status). Returns `hasConflict` plus arrays of conflicting appointments.

### 16. Create Appointment
- **POST** `/api/appointments`
- **Auth:** `authMiddleware`
- **Flow:** Patients bypass module permission check, others require `appointments.create` permission. Normalizes fields, resolves `patientId` (supports `P000007` style strings with retries), logs request, generates appointment ID (`APT<timestamp>P<patient>`), populates fields (provider, scheduledAt, duration, notes). Inserts record via `storage.createAppointment`.
 Terms: uses `requireModulePermission` for others.

### 17. Additional Appointment Features
- **Global SSE clients:** maintained in `global.appointmentClients`.
- **Connectivity:** On creation or update, `broadcastAppointmentEvent` triggers SSE to keep UI in sync.

---

## Notes

- **Storage dependencies:** `storage` module powers every patient, record, appointment, communication, payment, and AI insight query.
- **Messaging & Email:** `messagingService` and `emailService` handle reminders; `createNotification` writes user notifications.
- **Logging:** Handlers include extensive logging for debugging (e.g., patient creation trace, appointment conflict details, reminder statuses).
- **Validation:** Zod schemas enforce payload shapes for patients, appointments, and reminders, preventing invalid data before DB writes.
