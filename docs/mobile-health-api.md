# Mobile Health APIs

These routes support the “Mobile Health” module (device monitoring, patient consents, mobile apps/notifications). They rely on `authMiddleware` and are mostly read-only/mock, with simple consent management logic for testing.

## 1. List Devices
- **Endpoint:** `GET /api/mobile-health/devices`  
- **Auth:** `authMiddleware`  
- **Description:** Returns a hardcoded list of wearable/monitoring devices per patient (smartwatch, glucose monitor, blood pressure cuff).  
- **Response:** Array of device objects with fields such as `id`, `patientId`, `patientName`, `deviceType`, `brand`, `model`, `status`, `batteryLevel`, `lastSync`, `dataTypes`, and `readings[]` (timestamped vitals).  
- **Errors:** `401` if user missing; `500` on server failure.

## 2. Sync Device
- **Endpoint:** `POST /api/mobile-health/devices/:id/sync`  
- **Auth:** `authMiddleware`  
- **Path Params:** `id` = device identifier (string)  
- **Description:** Simulates syncing a device by returning success metadata after a 2-second delay.  
- **Response:** `{ deviceId, status: "success", syncedAt, newReadings, batteryLevel, message }`.  
- **Errors:** `401` if unauthenticated; `500` on failure.

## 3. List Mobile Apps
- **Endpoint:** `GET /api/mobile-health/apps`  
- **Auth:** `authMiddleware`  
- **Description:** Returns static metadata for mobile companion apps (e.g., patient portal, medication tracker).  
- **Response:** Array containing `id`, `name`, `description`, `category`, `platform`, `version`, `downloads`, `rating`, `features[]`, `screenshots`.  
- **Errors:** `401`/`500` as above.

## 4. Mobile Health Notifications
- **Endpoint:** `GET /api/mobile-health/notifications`  
- **Auth:** `authMiddleware`  
- **Description:** Returns mock notifications for patients (appointment reminders, alerts). Each entry includes `id`, `patientId`, `type`, `title`, `message`, `priority`, `scheduledTime`, `status`, and optional `deliveryTime`.  
- **Errors:** `401`/`500`.

## 5. Patient Consent Listing
- **Endpoint:** `GET /api/mobile-health/patient-consent`  
- **Auth:** `authMiddleware`  
- **Description:** Merges in-memory consent records with real patients from the database. If consent data already exists (matching `patient.patientId`), it merges names/emails; otherwise it returns a default `pending` template.  
- **Response:** Array of consent records (`id`, `patientId`, `patientName`, `email`, `consentStatus`, `monitoringTypes`, `deviceAccess`, `dataSharing`, `emergencyContact`, `lastUpdated`).  
- **Errors:** `500` on fetch failures.

## 6. Update Patient Consent
- **Endpoint:** `PUT /api/mobile-health/patient-consent/:patientId`  
- **Auth:** `authMiddleware`  
- **Path Params:** `patientId` (string)  
- **Body:** Accepts any consent fields (no schema). Typical properties include `consentStatus`, `monitoringTypes`, `deviceAccess`, `dataSharing`, `emergencyContact`, `revokedDate`.  
- **Behavior:**  
  * If a consent record exists, it merges updates and adjusts `deviceAccess/dataSharing/monitoringTypes` based on status (`consented` vs `declined/revoked`).  
  * If not found, it looks up the patient via `storage.getPatientByPatientId`; if missing, returns `404`. Otherwise it creates a new consent object seeded with the request data and default boolean values.  
  * Each update stamps `lastUpdated` to the current time and, when consent is granted, flips all `monitoringTypes`/device/data sharing flags on. Revoking/declining sets them to `false`.  
- **Response:** `{ success: true, consent: {...} }` for new records or `{ success: true, message: "Patient consent updated successfully", data: {...} }` for updates.  
- **Errors:** `401`, `404` when patient missing, `500` on storage errors.

## Notes
- All endpoints reuse tenant context (`req.tenant!.id`).  
- Device data is mocked; patient consent updates operate on an in-memory array but back them with real patient lookups from `storage`.  
- Use these routes to drive the Mobile Health dashboard in the UI; the real implementation would persist consent data in a database-backed table.  
