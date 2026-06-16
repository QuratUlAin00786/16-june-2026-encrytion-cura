# Appointments API Reference

These routes control scheduling, availability checks, real-time streaming, and invoice generation. They are all rooted at `/api/appointments` and enforced by `authMiddleware`, with additional `requireModulePermission` guards where noted.

## 1. List Appointments / Availability
- **Method:** `GET`
- **Endpoint:** `/api/appointments`
- **Auth:** `authMiddleware`; `requireRole(["admin","doctor","nurse","patient"])`
- **Query Parameters:**
  - `start` / `end` (ISO date strings) – filter range.
  - `doctorId` / `providerId` – filter by provider (or check availability when `providerId` + `date` present).
  - `patientId` – filter by patient.
  - `date` – date string used with `providerId` for slot availability (returns minimal fields).
- **Response (200):**
  - Full appointment array per tenant with fields like `{ id, appointmentId, patientId, providerId, scheduledAt, status, type, duration, isVirtual, location }`.
  - When `providerId`+`date` provided, response contains succinct availability objects.
- **Errors:** `403` if role not allowed, `500` on failure.
- **Business Logic:** 
  - Role-based visibility: admin/receptionist see all (with filters), doctors see their own unless they have view permission, patients view their appointments by email/userId, nurses see all.
  - Bookable slot view bypasses most permissions, providing provider/time combos without sensitive patient data.
- **Dependencies:** `storage` getters, `req.user.permissions`.
- **Edge Cases:** Date filtering uses naive JS dates; providers/patients not found yield empty arrays; unauthorized roles get `403`.

## 2. Update Appointment (Custom full PUT)
- **Method:** `PUT`
- **Endpoint:** `/api/appointments/:id`
- **Auth:** `authMiddleware`
- **Path Param:** `id` = appointment numeric ID.
- **Request Body:** Allowed fields `{ title?, description?, scheduledAt?, duration?, status?, type?, location?, isVirtual? }`.
- **Response:** Updated appointment object; broadcasts SSE `appointment_updated`.
- **Errors:** `404` not found, `403` when user lacks role-based permission, `500` on failure.
- **Business Logic:** Only admins/receptionists can update all. Doctors/patients/nurses must own appointment or have module permissions; updates limited to sanitized fields; SSE broadcast uses global `appointmentClients`.
- **Dependencies:** `storage.updateAppointment`, SSE broadcaster.
- **Edge Cases:** `scheduledAt` stored as string; unauthorized access returns `403`.

## 3. Appointment Stream (SSE)
- **Method:** `GET`
- **Endpoint:** `/api/appointments/stream`
- **Auth:** `authMiddleware`
- **Description:** Server-Sent Events endpoint for real-time updates within tenant.
- **Response:** Stream `Content-Type: text/event-stream` containing JSON messages: connection confirmation, periodic `ping`, plus `appointment.created/updated/deleted` events emitted elsewhere in the routes.
- **Dependencies:** `global.appointmentClients` map; SSE heartbeat keeps connection alive.
- **Edge Cases:** Connection cleanup on `close`/`error`; includes `Authorization` header.

## 4. Conflict Check
- **Method:** `POST`
- **Endpoint:** `/api/appointments/check-conflicts`
- **Auth:** `authMiddleware`
- **Body:** `{ patientId: number, providerId: number, scheduledAt: string ("YYYY-MM-DDTHH:mm:ss") }`
- **Response:** `{ hasConflict: boolean, patientConflict: [...], providerConflict: [...] }`
- **Errors:** `400` missing fields, `500` on DB errors.
- **Business Logic:** Queries `schema.appointments` for same patient/provider at the same date/time (non-cancelled). Uses `SQL DATE`/`TO_CHAR` comparisons to match exact minute.
- **Dependencies:** Drizzle `schema.appointments`, `db`.

## 5. Create Appointment
- **Method:** `POST`
- **Endpoint:** `/api/appointments`
- **Auth:** `authMiddleware` + `requireModulePermission('appointments','create')` (patients bypass this guard).
- **Body Schema (Zod):**
  ```json
  {
    "patientId": number | string (supports "PXXXX"),
    "providerId": number,
    "assignedRole?": string,
    "title?": string,
    "description?": string,
    "appointmentDate?": string,
    "scheduledAt?": string,
    "duration?": number (default 30),
    "type?": "consultation|follow_up|procedure",
    "appointmentType?": "consultation|treatment",
    "treatmentId?": number,
    "consultationId?": number,
    "location?": string,
    "department?": string,
    "notes?": string,
    "status?": string,
    "isVirtual?": boolean,
    "createdBy?": number
  }
  ```
- **Response (201):** Created appointment with auto-generated `appointmentId` (e.g., `APT...`); SSE broadcast `appointment.created`.
- **Errors:** 
  - `400` invalid patient ID (complex string parsing and fallback).
  - `400` for missing fields, `400` conflict message if offset.
  - `500` on storage failure.
- **Business Logic:** Normalizes patient ID (supports padded `P000123`), rejects missing patients, auto-generates appointment ID, stores appointment via `storage.createAppointment`, notifies patient/provider, creates notifications, and broadcasts SSE event.
- **Dependencies:** `storage.createAppointment`, `storage.getPatient`, `storage.getUser`, `createBulkNotifications`, SSE broadcaster.
- **Edge Cases:** 
  - Accepts patient IDs as numbers or strings (tries numeric conversions with padding).
  - Returns `type: "appointment_validation_error"` when general failure occurs.

## 6. Create Appointment with Invoice
- **Method:** `POST`
- **Endpoint:** `/api/appointments-with-invoice`
- **Auth:** `requireRole(["doctor","nurse","receptionist","admin","patient"])`
- **Body Schema (Zod):**
  ```json
  {
    "patientId": number,
    "providerId": number,
    "scheduledAt": string,
    "duration?": number,
    "type?": string,
    "status?": string,
    "title?": string,
    "description?": string,
    "location?": string,
    "isVirtual?": boolean,
    "invoice": {
      "serviceDate": string,
      "invoiceDate": string,
      "dueDate": string,
      "serviceCode": string,
      "serviceDescription": string,
      "amount": string,
      "insuranceProvider?": string,
      "notes?": string,
      "paymentMethod?": string,
      "status?": string
    }
  }
  ```
- **Response:** `{ appointment, invoice }` with invoice persisted via `schema.invoices`.
- **Errors:** `400` patient missing, `400` validation error, `500` on DB failure.
- **Business Logic:** Creates appointment record, then immediately builds invoice (with autop added `invoiceNumber`, status, total), returns both entities.
- **Dependencies:** `storage.createAppointment`, `storage.getPatient`, Drizzle `schema.invoices`.

## 7. Partial Appointment Update (PATCH)
- **Method:** `PATCH`
- **Endpoint:** `/api/appointments/:id`
- **Auth:** `authMiddleware`, `requireModulePermission('appointments','edit')`
- **Body Schema:** optional fields (title, type, status, scheduledAt, description, duration, location, isVirtual, appointmentType, treatmentId, consultationId). Uses Zod to validate enums and date formats.
- **Response:** Updated appointment object (also broadcasts SSE `appointment.updated`).
- **Errors:** `400` invalid payload or ID, `404` not found, `500` on storage error.
- **Business Logic:** Converts `scheduledAt` to `Date` before update; ensures tenant ownership via `storage`.

## 8. Delete Appointment
- **Method:** `DELETE`
- **Endpoint:** `/api/appointments/:id`
- **Auth:** `authMiddleware`, `requireModulePermission('appointments','delete')`
- **Response:** `{ success: true, message: "Appointment deleted successfully" }`
- **Errors:** `400` invalid ID, `404` not found, `500` on failure.
- **Business Logic:** Deletes via `storage.deleteAppointment`, broadcasts SSE `appointment.deleted`, logs telemetry.

## Notes
- All endpoints rely on `req.tenant!.id` for multi-tenancy.
- SSE broadcast uses a global map of connected clients; failure to send cleans up the client.
- Appointment creation uses heavy logging/notifications to integrate with other UI components.
