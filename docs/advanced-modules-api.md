# Advanced Module APIs

This reference covers the remaining dashboard/insight modules that back the sidebar links you mentioned (Dashboard, Telemedicine, Voice Documentation, Financial Intelligence, Shift Management, Subscription/Packages, and Settings). Each section summarizes the exposed routes, required permissions, and the core business logic or dependencies so you can match the frontend behavior to the backend contracts.

## Dashboard & Mobile Insights
- **`GET /api/mobile/doctor/dashboard`**  
  - **Auth:** `Authorization` + tenant + any authenticated user.  
  - **Purpose:** Return lightweight KPIs for a doctor’s home view (today’s appointments, patient count, pending prescriptions, upcoming appointments).  
  - **Response:** `{ todayAppointments, totalPatients, pendingPrescriptions, upcomingAppointments[] }`, derived from `storage.getAppointmentsByProvider`, `storage.getUsersByRole("patient")`, and `storage.getPrescriptionsByProvider`.  
  - **Notes:** Filters `todayAppointments` to the current day before counting and truncates `upcomingAppointments` to five entries.
- **`GET /api/mobile/doctor/patients`**  
  - **Auth:** Same as above.  
  - **Purpose:** Mirror patient search for mobile clients.  
  - **Response:** Patient summary list with `id`, `patientId`, `name`, `email`, `phone`, `lastVisit`, and `riskLevel`.
- **`GET /api/mobile/doctor/appointments`**  
  - **Auth:** Same; optional `date` query to filter by scheduled day.  
  - **Response:** Virtualized appointment payload (`id`, `patientName`, `status`, etc.) plus patient contact details.
- **`POST /api/mobile/doctor/appointments/:id/accept`** / **`reject`**  
  - **Auth:** Same.  
  - **Purpose:** Mark a mobile appointment as `confirmed` or `cancelled` (with optional reason).  
  - **Response:** Confirmation message with updated appointment.

## Telemedicine
- **`GET /api/telemedicine/consultations`**  
  - **Auth:** `authMiddleware`.  
  - **Purpose:** Return mocked consultation history for the telemedicine dashboard (type, status, vital signs, prescriptions).  
  - **Response:** Array of consultations with timestamps, vitals, and provider/patient metadata.
- **`GET /api/telemedicine/waiting-room`**  
  - **Purpose:** Mock waiting-room status objects (`patientId`, `patientName`, `appointmentTime`, `priority`, `waitTime`).
- **`POST /api/telemedicine/consultations/:id/start`**  
  - **Purpose:** Signal meeting start; returns `meetingUrl` pointing to `https://vid2.averox.com/join/<id>`.  
  - **Response:** `{ success: true, consultationId, meetingUrl }`.
- **`POST /api/telemedicine/consultations/:id/end`**  
  - **Request:** `{ notes?, duration? }`.  
  - **Purpose:** Mark consultation complete.  
  - **Response:** Duration/notes echo.
- **`POST /api/telemedicine/consultations`**  
  - **Auth:** Requires module permission `telemedicine:create`.  
  - **Request:** `{ patientId, scheduledTime, notes? }`.  
  - **Response:** Newly created consultation stub with status `scheduled`.
- **`GET /api/telemedicine/users`**  
  - **Purpose:** Return all users (admin) or non-patients (others) for telemedicine selectors.

## Voice Documentation
- **`GET /api/voice-documentation/notes`**  
  - **Purpose:** Fetch voice notes; creates a sample note if collection is empty.  
  - **Response:** Voice note records including `transcript`, `confidence`, and `structuredData`.
- **`POST /api/voice-documentation/notes`**  
  - **Request:** `{ patientId, type?, transcript?, duration?, confidence? }`.  
  - **Validation:** Ensures patient exists; `patientId` must parse to number.  
  - **Response:** Newly created voice note.
- **`PUT /api/voice-documentation/notes/:id`**  
  - **Validation:** Requires `transcript`.  
  - **Purpose:** Update an existing note’s transcript.
- **`DELETE /api/voice-documentation/notes/:id`**  
  - **Purpose:** Remove note by `id` after verifying membership in tenant.
- **`GET /api/voice-documentation/templates`**  
  - **Purpose:** Static templates (e.g., SOAP note) for rendering structured docs.
- **`GET /api/voice-documentation/photos`** / **`POST /api/voice-documentation/photos`** / **`DELETE /api/voice-documentation/photos/:id`**  
  - **Purpose:** Manage clinical photos stored via `storage`. `POST` expects `photo` multipart file plus `patientId`, `type`, and optional `description`. Files move into `uploads/wound_assessment/<filename>`.
- **`POST /api/voice-documentation/check-directory`**  
  - **Purpose:** Ensure `uploads/VoiceNotes` exists before uploads.
- **`POST /api/voice-documentation/audio`**  
  - **Request:** Multipart `audio` plus `patientId`, `noteId`.  
  - **Purpose:** Save `.mp4` voice note, link to patient, and return accessible URL.

## Financial Intelligence
- **`GET /api/financial/revenue`**  
  - **Auth:** Roles `admin`, `finance`, `doctor`, `nurse`, `patient`.  
  - **Purpose:** Return mocked revenue KPIs per month.  
- **`GET /api/financial/claims`** / **`POST /api/financial/claims`** / **`PATCH /api/financial/claims/:id`** / **`DELETE /api/financial/claims/:id`**  
  - **Auth:** `admin`, `finance`, `doctor`, `nurse`.  
  - **Input:** Claim payloads validated through `zod` for required fields (patientId, claimNumber, status, treatment dates).  
  - **Business logic:** Includes patient name enrichment and conversion of amounts to floats before returning.
- **`GET /api/financial/insurance`** / **`POST /api/financial/insurance`** / **`PUT/PATCH /api/financial/insurance/:id`** / **`DELETE /api/financial/insurance/:id`** / **`POST /api/financial/insurance/:id/verify`**  
  - **Auth:** Same roles as claims.  
  - **Purpose:** CRUD insurance entries and trigger mock verification flows (e.g., `verify` reuses storage).  
- **`GET /api/financial/forecasts`**  
  - **Auth:** `admin`, `finance`.  
  - **Response:** Forecast templates for financial planning.
- **`GET /api/reports/revenue-breakdown`**  
  - **Auth:** `admin`.  
  - **Query:** `dateRange`, `insuranceType`, `role`, `userName`.  
  - **Logic:** Builds tenant-aware SQL query over `invoices`, `patients`, and `users`, applies filters and aggregates revenue by service type.
- **`GET /api/financial-forecasting`**, **`/api/financial-forecasting/:id`**, **`/generate`**, **`PUT`**, **`DELETE`**  
  - **Auth:** `admin`, `doctor`, `nurse`, `patient`.  
  - **Purpose:** Manage saved forecast entries per tenant. Generation endpoint accepts model inputs and returns forecast metadata.

## Shift Management
- **`GET /api/shifts/:id`**, **`POST /api/shifts`**, **`PUT /api/shifts/:id`**, **`DELETE /api/shifts/:id`**  
  - **Auth:** `admin` except creation allows `admin`, `doctor`, `nurse`.  
  - **Payload:** Shift data validated via `zod` (`staffId`, `date`, `shiftType`, `startTime`, `endTime`, `status`, optional `notes`, `isAvailable`).  
  - **Purpose:** CRUD staff schedules tied to tenant via `organizationId`.
- **`GET /api/shifts/staff/:staffId`**  
  - **Auth:** `admin`.  
  - **Query:** Optional `date` filter; returns all shifts for staff member.
- **`GET /api/default-shifts`**, **`/default-shifts/:userId`**, **`POST /initialize`**, **`/delete`**  
  - **Auth:** Uniform `authMiddleware` with `admin` guard for initialization/deletion.  
  - **Purpose:** Manage default shift templates for users; enforces owner-only modifications when not admin.

## Subscription / Packages
- **`POST /api/create-subscription-payment-intent`** & **`POST /api/subscription/upgrade`** / **`POST /api/stripe/create-checkout-session`**  
  - **Auth:** Authenticated tenant user.  
  - **Purpose:** Provide mock Stripe client secrets, handle subscription upgrade request, and create checkout session placeholders.  
- **`/api/saas/packages`, `/api/saas/packages/order`, `/api/saas/packages/:id` (POST / PUT / DELETE)**  
  - **Auth:** SaaS owner (`verifySaaSToken`).  
  - **Purpose:** CRUD SaaS package definitions and ability to reorder packages. Documented in `docs/saas-api.md`, but still part of the sidebar.

## Settings & Integrations
- **`GET /api/integrations/twilio/status`**, **`POST /api/integrations/twilio/configure`**, **`POST /api/integrations/twilio/test`**, **`POST /api/integrations/twilio/sms/toggle`**, **`/whatsapp/toggle`**  
  - **Auth:** `admin` + tenant context.  
  - **Purpose:** Persist WhatsApp/SMS toggles and record phone numbers in `organizationIntegrations` table; prefer storing secrets via env vars.
- **`POST /api/messaging/twilio/status`**  
  - **Purpose:** Quick check for Twilio account status with balance.  
- **`POST /api/webhooks/twilio/*`**  
  - **Paths:** `/status`, `/inbound`.  
  - **Purpose:** Handle delivery receipts and inbound SMS; no auth but uses Twilio’s webhook signing (raw/form parsing is applied).

Let me know if you’d like a dedicated document per section (e.g., a standalone telemedicine API guide) or if you want me to keep adding more areas beyond this list.
