# SaaS Management API Reference

**Base path:** `/api/saas` (unless noted otherwise).  
**Authentication:** SaaS endpoints require a SaaS owner JWT issued via `/api/saas/login` (see below). Some helper routes (welcome email, production setup, website packages) are public or use their own verification. Requests must include `Authorization: Bearer <saas_jwt>` where required.

---

## 1. SaaS Owner Login
- **POST** `/api/saas/login`
- **Body:** `{ "username": "saas_admin", "password": "admin123" }`
- **Response:** `{ success: true, token: "...", owner: { id, username, email, firstName, lastName } }`
- **Errors:** `400` missing credentials, `401` invalid/deactivated account, `500` other.
- **Notes:** JWT signed with `SAAS_JWT_SECRET` and valid 24h; owner stored under `organizationId = 0`.

---

## 2. SaaS Owner Profile
- **GET** `/api/saas/owner/profile`
- **PUT** `/api/saas/owner/profile`
- **PUT** `/api/saas/owner/password`
- **Auth:** `verifySaaSToken`
- **Purpose:** View/update owner info and rotate password. `PUT /password` requires `currentPassword` + `newPassword`.

---

## 3. SaaS Dashboard / Monitoring
- **GET** `/api/saas/stats` – returns aggregated stats from `storage.getSaaSStats`.
- **GET** `/api/saas/activity` – paginated recent activity (`page`, `limit` query).
- **GET** `/api/saas/alerts` – system alerts list.
- All `verifySaaSToken`.

---

## 4. Subscription Contacts
- **GET** `/api/saas/subscription-contacts` – optional `search` query, returns limited org admins entries.
- **POST** `/api/saas/subscription-contacts/reset-password` – body `{ contactId }`.
- **PATCH** `/api/saas/subscription-contacts/status` – body `{ contactId, isActive }`.
- All `verifySaaSToken`.

---

## 5. SaaS Users
- **GET** `/api/saas/users` – optional `search`, `organizationId`.
- **PATCH** `/api/saas/users/status` – body `{ userId, isActive }`.
- **POST** `/api/saas/users/reset-password` – body `{ userId }`.
- **PATCH** `/api/saas/users/:id` – update user by id; supports `password`.
- **DELETE** `/api/saas/users/:id` – removes user+patient record for patients.
- **POST** `/api/saas/users/create` – create user; if role patient, also creates patient record + welcome email (optional send). Validates uniqueness globally.
- All require `verifySaaSToken`.

---

## 6. SaaS Customers / Organizations
- **GET** `/api/saas/organizations` – list all organizations.
- **GET** `/api/saas/customers` – search + status filtering.
- **GET** `/api/saas/customers/:id` – detail per customer.
- **GET** `/api/saas/organizations/:id/subscription` – subscription details + `hasActiveSubscription`.
- **POST** `/api/saas/customers` – create organization/customer; requires `name`, `subdomain`, `adminEmail`; invites admin (welcome email). Handles duplicate subdomain/email errors.
- **PATCH** `/api/saas/customers/:id` – update customer metadata (supports status-only flow redirect to next endpoint).
- **PATCH** `/api/saas/customers/status` – status-only update.
- **DELETE** `/api/saas/customers/:id` – remove customer.
- All `verifySaaSToken`.

---

## 7. Customer Email Availability
- **GET** `/api/saas/users/check-availability` (public) – query params `username`, `email`, `organizationId`; returns booleans with cache-busting headers.
- **GET** `/api/saas/customers/check-email` (public) – verifies email across `users` + `organizations`.

---

## 8. SaaS Billing
- **DELETE** `/api/saas/billing/payments/:id` – delete SaaS payment record.

---

## 9. Packages & Pricing
- **GET** `/api/saas/packages` – all packages (admin view).
- **GET** `/api/website/packages` – public pricing list.
- **POST** `/api/saas/packages` – create package.
- **PUT** `/api/saas/packages/order` – reorder packages; body `{ order: [{ id, displayOrder }] }`.

---

## 10. Welcome Emails & Helpers
- **POST** `/api/saas/send-email-to-customer/:customerId` – sends welcome email to org admin via `sendWelcomeEmail`.
- **GET** `/api/direct-email-test` – diagnostics email (public).
- **POST** `/api/production-setup` – ensures SaaS owner exists (public).
- **GET** `/api/saas/debug` – system debug info (public).

---

## Notes
- **Token verification:** Middleware `verifySaaSToken` loads owner (orgId=0) and enforces `isSaaSOwner`.
- **Storage dependencies:** Many endpoints call `storage` helpers (`getAllUsers`, `getAllCustomers`, `createCustomerOrganization`, `updateCustomerOrganization`, `deleteCustomerOrganization`, `getAllPackages`, `createPackage`, `reorderPackages`, `deletePayment`, etc.).  
- **Email service:** Welcome/patient notifications call `emailService.sendEmail` with templated HTML/text bodies and retry loops for reliability.  
