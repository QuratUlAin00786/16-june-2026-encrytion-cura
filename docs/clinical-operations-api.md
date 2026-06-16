# Clinical & Operations API Reference

This document covers the clinical decision-support, pharmacy, revenue/claims, and emergency/teleconference endpoints that sit outside the previously documented modules.

## Claims & Revenue Tracking

### 1. List Claims
- **Method:** GET  
- **Endpoint:** `/api/claims`  
- **Auth:** `authMiddleware`  
- **Purpose:** Returns all claims tied to the tenant.  
- **Response:** Array of claim objects from `storage.getClaimsByOrganization` with fields such as `claimNumber`, `insuranceProvider`, `amount`, and `status`.  
- **Errors:** `500` on retrieval failure.  
- **Dependencies:** `storage.getClaimsByOrganization`.

### 2. Create Claim
- **Method:** POST  
- **Endpoint:** `/api/claims`  
- **Auth:** `authMiddleware`  
- **Request Body:**  
  ```json
  {
    "patientId": number,
    "claimNumber": "string",
    "insuranceProvider": "string",
    "amount": number,
    "status": "submitted|pending|approved|denied|paid",
    "submissionDate": "string (ISO date, optional)",
    "description": "string (optional)"
  }
  ```
- **Response:** Created claim record (201).  
- **Errors:** `400`/`422` if validation fails; `500` if database insert fails. Uses `zod` to enforce schema.  
- **Business Logic:** Converts numeric `amount` to string currency, auto-populates `serviceDate`/`submissionDate`, and attaches `organizationId`.  
- **Dependencies:** `storage.createClaim`.

### 3. Revenue Records
- **Method:** GET  
- **Endpoint:** `/api/revenue-records`  
- **Auth:** `authMiddleware`  
- **Response:** Monthly revenue summaries (profit/collections) from `storage.getRevenueRecordsByOrganization`.  

- **Method:** POST  
- **Endpoint:** `/api/revenue-records`  
- **Auth:** `authMiddleware`  
- **Request Body:**
  ```json
  {
    "source": "string",
    "amount": number,
    "category": "string",
    "description": "string (optional)",
    "date": "string (optional)"
  }
  ```
- **Response:** Created revenue record entry (201).  
- **Logic:** Stores tenant and month (YYYY-MM), sets `revenue`, `collections`, and `profit` equal to the supplied amount, leaves `expenses`/`target` at `"0"`.  
- **Dependencies:** `storage.createRevenueRecord`.

## Clinical Insights & Risk Tools

### 4. Clinical Insights CRUD
- **GET `/api/clinical/insights`**
  - **Auth:** `requireRole(["doctor","nurse","admin"])`
  - **Query:** Optional `patientId` to scope results.
  - **Returns:** Up to 50 insights, confidence cast to number; `404` if requested patient not in tenant.
- **PATCH `/api/clinical/insights/:id`**
  - **Auth:** Same.
  - **Request Body:** `{ status?: "active|reviewed|dismissed|implemented", notes?: string }`
  - **Purpose:** Update insight status or notes (mock stub). Always responds with `message` for backwards compatibility.

### 5. Clinical Drug Interactions
- **GET `/api/clinical/drug-interactions`**
  - **Auth:** `authMiddleware`
  - **Purpose:** Scans each patient’s manual interactions plus medication lists to build severity/recommendation data. Outputs `success`, `interactions`, `totalInteractions`, and `patientsScanned`.
  - **Dependencies:** `storage.getPatientsByOrganization`, `storage.getLabResultsByOrganization`, `medicationsDatabase` for interaction lookups, `patientDrugInteractions` table.

### 6. Patient Drug Interactions Management
- **POST `/api/clinical/patient-drug-interactions`**
  - **Auth:** `authMiddleware`
  - **Role Guard:** Patients are forbidden (`403`).
  - **Request Body:** Fields for `patientId`, two medication names/dosages, `severity`, `description`, arrays of `warnings`/`recommendations`, optional `notes`.
  - **Validation:** `zod` enforces required names & severity.
  - **Response:** `{ success: true, interaction, message }`
  - **Logic:** Persists in `patientDrugInteractions` with `reportedBy` (current user) and tenant context.

- **GET `/api/clinical/patient-drug-interactions`**
  - **Auth:** `authMiddleware`
  - **Response:** `{ success: true, count, interactions[] }` for the tenant.

### 7. Risk Assessments
- **Method:** GET  
- **Endpoint:** `/api/clinical/risk-assessments`  
- **Auth:** `authMiddleware`  
- **Purpose:** Calculate cardiovascular, diabetes, renal, and osteoporosis risk per patient by analyzing all lab results.  
- **Response:** Array of assessments per patient, each containing aggregated factors, scores, recommendations, and timestamps.  
- **Logic:** Groups lab results by patient; inspects cholesterol, glucose, hemoglobin A1c, renal markers, flagging `criticalValues` to boost scores; factors in age and abnormal labs to create recommendations.  
- **Dependencies:** `storage.getLabResultsByOrganization`, `storage.getPatientsByOrganization`.

## Clinical Knowledge Bases & Protocols

### 8. Clinical Procedures
- **Method:** GET `/api/clinical-procedures`  
  - Auth via `authMiddleware`.
  - Returns all clinical procedure definitions for tenant.
- **Method:** POST `/api/clinical-procedures`  
  - Body: `{ name, category, description, duration?, requirements?, riskLevel?, cost? }`
  - Validation: `riskLevel` enum `["low","medium","high"]`.
  - Logic: Adds tenant metadata, sets `complexity` to `riskLevel`, stores durations as strings.
  - Response: Created procedure.

### 9. Emergency Protocols
- **Method:** GET `/api/emergency-protocols`
  - Returns stored protocols via `storage.getEmergencyProtocolsByOrganization`.
- **Method:** POST `/api/emergency-protocols`
  - Body: `{ title, category, description, steps, priority?, requiredPersonnel?, equipment? }`
  - Validation: `priority` in `["low","medium","high","critical"]`.
  - Logic: Splits newline-delimited `steps` string into array before saving.
  - Response: Created protocol.

### 10. Medications Database
- **GET `/api/medications-database`**  
  - Authenticated. Returns repository of medications (name, category, dosage, manufacturer, interactions etc.).
- **POST `/api/medications-database`**  
  - Request Body: `{ name, genericName?, category, dosageForm, strength, manufacturer?, description?, sideEffects?, contraindications?, interactions? }`
  - Validation: All core fields required except optional metadata.
  - Logic: Normalizes severity to `medium`, uses `strength` as `dosage`, converts `interactions` string to array.
  - Response: Created medication entry.

## Telehealth & Communications

### 11. BigBlueButton Conference Creation
- **Method:** POST `/api/video-conference/create`  
- **Auth:** `authMiddleware`  
- **Request Body:** `{ meetingName, participantName, moderatorPassword?, attendeePassword?, duration?, maxParticipants? }`  
- **Response:** Meeting metadata including `meetingID`, `moderatorJoinUrl`, `attendeeJoinUrl`, generated passwords, and duration/participant limits.  
- **Logic:** Calls BigBlueButton's `/api/create` via fetch, signs request with SHA1 checksum (`BBB_SECRET` hardcoded), returns join URLs/reports.  
- **Dependencies:** `fetch`, `crypto`, `BB` credentials.

### 12. End Conference
- **Method:** POST `/api/video-conference/end/:meetingID`  
- **Auth:** `authMiddleware`  
- **Path Parameter:** `meetingID`  
- **Request Body:** `{ moderatorPassword }`  
- **Response:** `{ success: boolean, message: string }` after invoking BigBlueButton `/api/end`.

## Notes
- **Authentication:** All endpoints use tenant-aware `authMiddleware`, some require `requireRole` guards.  
- **Validation:** `zod` is used on POST routes (claims, procedures, protocols, medications, patient drug interactions, video conference creation).  
- **Dependencies:** Most operations interact with `storage` helpers and raw Drizzle tables (`patientDrugInteractions`, `medicationsDatabase`, `emergencyProtocols`, etc.).  
- **Edge Cases:** Risk assessment gracefully handles missing patients or lab fields; emergency protocol steps transform newline text into arrays for consistent storage.
