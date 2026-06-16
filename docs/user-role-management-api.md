# User & Role Management API Reference

**Base path:** `/api`  
**Authentication:** All routes use `authMiddleware` (JWT via `Authorization: Bearer <token>` plus `X-Tenant-Subdomain`). Role-management routes additionally require `requireRole(["admin"])` where noted.

---

## 1. List Users
- **Method:** `GET`
- **Endpoint:** `/api/users`
- **Auth:** `authMiddleware` + `requireRole(["admin", "doctor", "nurse"])`
- **Request headers:**
  - `Authorization: Bearer <token>`
  - `X-Tenant-Subdomain: <tenant>`
- **Request body / query parameters:** None.
- **Response (200):**
  ```json
  [
    {
      "id": 123,
      "email": "jane@curaemr.ai",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "doctor",
      "organizationId": 5,
      // ...other user fields (no passwordHash)...
      // If user.role === "patient", additional merged fields:
      "dateOfBirth": "1990-01-01",
      "phone": "+44...",
      "insuranceVerification": {
        "id": 10,
        "provider": "...",
        "status": "active",
        ...
      }
    },
    ...
  ]
  ```
- **Errors:**
  - `500`: Failed to fetch users.
- **Business logic:** Calls `storage.getUsersByOrganization(orgId)` then strips `passwordHash`. Patient records get merged with latest insurance verification via `storage.getPatientByUserId` + `storage.getInsuranceVerificationsByPatient`.
- **Dependencies:** `storage.getUsersByOrganization`, `storage.getPatientByUserId`, `storage.getInsuranceVerificationsByPatient`.

---

## 2. Check Subscription Limits for Users
- **Method:** `GET`
- **Endpoint:** `/api/users/check-subscription-limit`
- **Auth:** `authMiddleware`
- **Request headers:** same as above.
- **Response (200):**
  ```json
  {
    "canCreateUser": true,
    "maxUsers": 20,
    "currentUserCount": 16,
    "remainingUsers": 4,
    "maxPatients": 100,
    "currentPatientCount": 66,
    "remainingPatients": 34,
    "subscriptionStatus": "active"
  }
  ```
- **Errors:**
  - `403`: No active subscription exists or limits exceeded (message signals upgrade needed).
  - `500`: Query failure.
- **Business logic:** Reads `saasSubscriptions` to determine limits and counts users/patients via raw SQL with `db`.
- **Dependencies:** `db`, `saasSubscriptions`, `users` table.

---

## 3. Create User
- **Method:** `POST`
- **Endpoint:** `/api/users`
- **Auth:** `authMiddleware`
- **Request body:**
  ```json
  {
    "email": "string (email)",
    "username": "string (min 3)",
    "password": "string (min 6)",
    "firstName": "string",
    "lastName": "string",
    "role": "string",
    "department": "string?",
    "medicalSpecialtyCategory": "string?",
    "subSpecialty": "string?",
    "dateOfBirth": "ISO date?",
    "phone": "string?",
    "nhsNumber": "string?",
    "address": { "street?": "...", ... }?,
    "emergencyContact": { ... }?,
    "insuranceInfo": { provider?, policyNumber?, ... }?
  }
  ```
- **Validation:** Zod schema checks required strings, optional patient fields. Unique constraints on `email`+`username`.
- **Response (201):**
  ```json
  {
    "id": 456,
    "email": "...",
    "firstName": "...",
    "role": "patient",
    "permissions": { ...default permissions... }
  }
  ```
- **Errors:**
  - `400`: Validation failure (with `details` array), duplicate username/email.
  - `403`: Subscription limit reached (patients vs non-patients).
  - `500`: General failure.
- **Business logic:**
  - Enforces SaaS subscription limits (`saasSubscriptions.maxUsers`/`maxPatients`).
  - Hashes password via `authService.hashPassword`.
  - Sets default permissions (`getDefaultPermissionsByRole(role)` inlined switch).
  - Persists user via `storage.createUser`.
  - If role is `patient`, auto-creates a patient record with `storage.createPatient` (generates ID `P0000xx`, fills insurance info, defaults).
  - Logs operations for debugging.
- **Dependencies:** `saasSubscriptions`, `storage.createUser`, `storage.createPatient`, `storage.getPatientsByOrganization`, `authService`, `db`, patient tables for auto-creation.

---

## 4. Send Welcome Email
- **Method:** `POST`
- **Endpoint:** `/api/users/send-welcome-email`
- **Auth:** `authMiddleware`
- **Request body:**
  ```json
  {
    "userEmail": "string (email)",
    "userName": "string",
    "password": "string",
    "role": "string"
  }
  ```
- **Response (200):**
  ```json
  { "success": true, "message": "Welcome email sent successfully" }
  ```
- **Errors:** `400` on validation, `404` if organization missing, `500` if email service fails.
- **Business logic:** Fetches current organization via `storage.getOrganization`, then calls `emailService.sendNewUserAccountEmail(...)`.
- **Dependencies:** `storage.getOrganization`, `emailService`.

---

## 5. Update User
- **Method:** `PATCH`
- **Endpoint:** `/api/users/:id`
- **Auth:** `authMiddleware`
- **Request params:**
  - `id`: user ID (integer).
- **Request body:** Partial user object (same shape as creation fields plus `workingDays`, `workingHours`, `medicalHistory`, etc.). Admins can update any fields; non-admins updating themselves may only change `workingDays`, `workingHours`, `medicalSpecialtyCategory`, `subSpecialty`.
- **Logic details:**
  - Non-admin & non-self updates ⇒ `403`.
  - Non-admin self-updates limited to schedule/specialty fields `['workingDays','workingHours','medicalSpecialtyCategory','subSpecialty']`.
  - Password updates hash (admin only).
  - Splits payload into `patientFields` vs `userFields`.
  - If patient updates exist, ensures patient record exists (`storage.getPatientByEmail`, auto-creates if missing).
  - Updates insurance verifications if `insuranceInfo` included.
  - Returns merged patient info for patients.
- **Response (200):** Updated user object (without password hash), enriched with patient fields if applicable.
- **Errors:**
  - `403`: Permission denied or attempt to change restricted fields.
  - `404`: User not found.
  - `500`: Update failure.
- **Dependencies:** `storage.updateUser`, `storage.getUser`, `storage.getPatientByEmail`, `storage.createPatient`, `storage.updatePatient`, `storage.getInsuranceVerificationsByPatient`, `storage.updateInsuranceVerification`, `storage.createInsuranceVerification`, `authService`.
- **Edge cases:** Auto-creates patient record when missing; ensures email sync between user/patient.

---

## 6. Delete User
- **Method:** `DELETE`
- **Endpoint:** `/api/users/:id`
- **Auth:** `authMiddleware`
- **Request params:** `id`.
- **Response (200):** `{ "message": "User deleted successfully" }`
- **Errors:** `404` if not found, `500` on failure.
- **Business logic:** Calls `storage.deleteUser`. Logs challenge.
- **Dependencies:** `storage.deleteUser`.

---

## 7. List Roles
- **Method:** `GET`
- **Endpoint:** `/api/roles`
- **Auth:** `authMiddleware`
- **Response (200):** Array of role objects `{ id, name, displayName, description, permissions: { modules, fields }, isSystem, organizationId }`
- **Errors:** `500` on failure.
- **Business logic:** Delegates to `storage.getRolesByOrganization`.
- **Dependencies:** `storage.getRolesByOrganization`.

---

## 8. Get Role by Name
- **Method:** `GET`
- **Endpoint:** `/api/roles/by-name/:roleName`
- **Auth:** `authMiddleware`
- **Security:** Non-admins can only fetch their own role.
- **Response (200):** Single role object (same shape as list).
- **Errors:** `403` if unauthorized, `404` if role not found, `500` on failure.
- **Business logic:** Verifies requester’s role matches param (unless admin), then loads via `storage.getRoleByName`.
- **Dependencies:** `storage.getRoleByName`.

---

## 9. Create Role
- **Method:** `POST`
- **Endpoint:** `/api/roles`
- **Auth:** `requireRole(["admin"])`
- **Request body:**
  ```json
  {
    "name": "string",
    "displayName": "string",
    "description": "string",
    "permissions": {
      "modules": {
        "<moduleKey>": { "view": boolean, "create": boolean, "edit": boolean, "delete": boolean },
        ...
      },
      "fields": {
        "<fieldKey>": { "view": boolean, "edit": boolean },
        ...
      }
    },
    "isSystem": boolean? (defaults to false)
  }
  ```
- **Validation:** Permissions normalize via `preparePermissionsForValidation` (parses JSON strings/objects) into defined `MODULE_KEYS` / `FIELD_KEYS`, then validated with `rolePermissionsUpdate`. Name/displayName/description must be non-empty.
- **Response (201):** Newly created role.
- **Errors:** `400` validation; `500` creation failure.
- **Dependencies:** `storage.createRole`, permission normalization helpers.
- **Edge cases:** Permissions entries may be `null`; normalization ensures boolean fallback.

---

## 10. Update Role
- **Method:** `PATCH`
- **Endpoint:** `/api/roles/:id`
- **Auth:** `requireRole(["admin"])`
- **Request params:** `id`.
- **Request body:** Same shape as creation but fields optional. Permissions always normalized/validated.
- **Logic:** Normalizes permissions payload, then merges with sanitized fields. Returns updated role.
- **Response (200):** Updated role.
- **Errors:** `400` invalid permissions, `404` role not found, `500` failure.
- **Dependencies:** `storage.updateRole`, `preparePermissionsForValidation`.

---

## 11. Delete Role
- **Method:** `DELETE`
- **Endpoint:** `/api/roles/:id`
- **Auth:** `requireRole(["admin"])`
- **Logic:** Prevents deletion of `isSystem === true` roles. Deletes via `storage.deleteRole`.
- **Response (200):** `{ "success": true }`
- **Errors:** `400` if system role, `404` not found, `500` other errors.
- **Dependencies:** `storage.getRole`, `storage.deleteRole`.

---

## Notes
- **Tenant resolution:** All routes rely on `tenant` injected by `tenantMiddleware` via `X-Tenant-Subdomain`/cookie/referrer.
- **Authorization:** `authMiddleware` decodes JWT, populates `req.user`, ensures only internal roles can manipulate data.
- **Logging:** Endpoints are heavily logged (console) for debugging; look for `console.log` statements in route handlers.
