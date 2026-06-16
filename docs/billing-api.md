# Billing API Reference

**Base path:** `/api`  
**Authentication:** All billing endpoints go through `authMiddleware` (JWT via `Authorization: Bearer <token>` plus `X-Tenant-Subdomain`). Many routes also enforce `requireRole(...)` so only staff with the right roles can call them.

---

## 1. Billing Overview
- **Method:** `GET`
- **Endpoint:** `/api/billing`
- **Auth:** `authMiddleware`
- **Purpose:** Return all invoices for the current tenant. Patients only see invoices tied to their email/patientId.
- **Response (200):** Array of invoice objects from `storage.getInvoicesByOrganization`, filtered to the calling patient when `req.user.role === "patient"`.
- **Errors:** `401` if unauthenticated, `500` if fetching fails.
- **Notes:** Logs include organization/role info to help debug filters.

---

## 2. Billing History (SaaS Payments)
- **Method:** `GET`
- **Endpoint:** `/api/billing-history`
- **Auth:** `authMiddleware`, `requireRole(["admin"])`
- **Purpose:** Return SaaS billing/payment history (`saasPayments`) for the organization.
- **Response (200):** Array of `saasPayments` rows ordered by `paymentDate`.
- **Errors:** `500` on failure.
- **Dependencies:** `saasPayments` table.

---

## 3. Download SaaS Invoice PDF
- **Method:** `GET`
- **Endpoint:** `/api/billing-history/:paymentId/invoice`
- **Auth:** `authMiddleware`, `requireRole(["admin"])`
- **Purpose:** Dynamically renders a PDF invoice for a SaaS payment using `pdf-lib`.
- **Response (200):** Streamed PDF (`Content-Type: application/pdf`, `Content-Disposition: attachment`).
- **Errors:** `404` if payment not found, `500` if generation fails.
- **Dependencies:** `saasPayments`, `saasSubscriptions`, `saasPackages`, `organizations`, `pdf-lib` for rendering.

---

## 4. Billing Search Suggestions
- **Method:** `GET`
- **Endpoint:** `/api/billing/search-suggestions`
- **Auth:** `authMiddleware`
- **Query:** `query` (string, min length 2)
- **Purpose:** Return suggestions for invoices/patients matching the partial query.
- **Response (200):** Top 10 suggestions `{ type: 'invoice_id'|'patient_id'|'patient_name', value, display, searchValue }`.
- **Errors:** `500` if query fails.
- **Dependencies:** `schema.invoices`, builds case-insensitive LIKE queries.

---

## 5. List Invoices
- **Method:** `GET`
- **Endpoint:** `/api/billing/invoices`
- **Auth:** `requireRole(["admin", "doctor", "nurse", "receptionist", "patient"])`
- **Query:** Optional `status` filter.
- **Purpose:** Return invoices for the tenant, optionally filtered by `status`. Patients are narrowed to their own invoices.
- **Response (200):** Array of invoice objects.
- **Errors:** `500` on failure.
- **Dependencies:** `storage.getInvoicesByOrganization`, `storage.getPatientsByOrganization`.

---

## 6. Doctor-specific Invoices
- **Method:** `GET`
- **Endpoint:** `/api/billing/doctor-invoices`
- **Auth:** `requireRole(["doctor"])`
- **Purpose:** Returns doctor-specific invoices grouped by source (appointments, lab, imaging) by cross-referencing `labResults`, `medicalImages`, `appointments`.
- **Response (200):**
  ```json
  {
    "overall": [...],
    "appointments": [...],
    "labResults": [...],
    "imaging": [...]
  }
  ```
- **Errors:** `500` on failure.
- **Dependencies:** `schema.labResults`, `schema.medicalImages`, `schema.appointments`, `storage.getInvoicesByOrganization`.

---

## 7. Create Invoice
- **Method:** `POST`
- **Endpoint:** `/api/billing/invoices`
- **Auth:** `requireRole(["admin", "doctor", "nurse", "receptionist"])`
- **Request body:**
  ```json
  {
    "patientId": "P000001",
    "serviceDate": "2026-01-16",
    "invoiceDate": "2026-01-16",
    "dueDate": "2026-01-16",
    "totalAmount": "120.00",
    "lineItems": [
      {
        "code": "CT0792",
        "description": "Imaging study",
        "quantity": 1,
        "unitPrice": 120.0,
        "total": 120.0,
        "serviceType": "imaging",
        "serviceId": "567"
      }
    ],
    "serviceType": "imaging",
    "serviceIds": ["567"],
    "insuranceProvider": "Self-Pay",
    "notes": "Optional text",
    "paymentMethod": "cash"
  }
  ```
- **Validation:** Zod schema enforces required dates and numbers, ensures computed line item total matches invoice total, verifies referenced appointments/lab/imaging belong to patient.
- **Business logic:** Creates invoice number (`INV-...`), determines invoice/insurance type, saves `storage.createPatientInvoice`, returns `invoice` plus `structuredInvoice`.
- **Response (201):** Detailed invoice plus structured metadata for UI.
- **Errors:** `400` for validation mismatches or missing patient, `500` for general failure.
- **Dependencies:** `storage.getPatientByPatientId`, `storage.createPatientInvoice`, `storage.getAppointment`, `storage.getLabResult`, `storage.getMedicalImage`.

---

## 8. Update Invoice Status
- **Method:** `PATCH`
- **Endpoint:** `/api/billing/invoices/:id`
- **Auth:** `requireRole(["admin","doctor","nurse","receptionist","patient"])`
- **Request body:** `{ "status": "paid" }`
- **Purpose:** Update invoice status (patients can update for payments).
- **Response (200):** `{ "success": true }`
- **Errors:** `400` if status missing, `500` on failure.
- **Dependencies:** `storage.updateInvoice`.

---

## 9. Delete Invoice
- **Method:** `DELETE`
- **Endpoint:** `/api/billing/invoices/:id`
- **Auth:** `requireRole(["admin","doctor","nurse","receptionist"])`
- **Purpose:** Remove invoice by ID with validation.
- **Response (200):** `{ "success": true }`
- **Errors:** `400` invalid ID, `404` not found, `500` failure.
- **Dependencies:** `storage.deleteInvoice`.

---

## 10. List Payments
- **Method:** `GET`
- **Endpoint:** `/api/billing/payments`
- **Auth:** `requireRole(["admin","doctor","nurse","receptionist"])`
- **Purpose:** Return all payment records for tenant.
- **Response (200):** Array of payment objects with `amount`, `paymentMethod`, etc.
- **Errors:** `500` on failure.
- **Dependencies:** `storage.getPaymentsByOrganization`.

---

## 11. Create Payment Record
- **Method:** `POST`
- **Endpoint:** `/api/billing/payments`
- **Auth:** `requireRole(["admin","doctor","nurse","receptionist"])`
- **Request body:**
  ```json
  {
    "organizationId": 5,
    "invoiceId": 106,
    "patientId": "P003",
    "transactionId": "TXN-1234",
    "amount": 1.2,
    "currency": "GBP",
    "paymentMethod": "Cash",
    "paymentProvider": "cash",
    "paymentStatus": "completed",
    "paymentDate": "2026-01-16T14:05:22.409Z",
    "reference": "CASH-1234",
    "metadata": { "notes": "Cash payment for imaging services" }
  }
  ```
- **Validation:** Zod schema ensures required fields. Defaults `paymentStatus` to `completed`, `currency` to `'GBP'`.
- **Response (201):** Created payment object.
- **Errors:** `500` if creation fails.
- **Dependencies:** `storage.createPayment`.

---

## 12. Cash Payment Flow (Lab Tests)
- **Method:** `POST`
- **Endpoint:** `/api/payments/cash`
- **Auth:** `authMiddleware`, `multiTenantEnforcer()`
- **Request body:** `{ patient_id, patientName, items, totalAmount, serviceDate, invoiceDate, dueDate, serviceType?, serviceId?, insuranceProvider? }`
- **Purpose:** Creates invoice & payment simultaneously for a cash lab test.
- **Business logic:** 
  - Looks up patient record via `storage.getPatient`; throws `404` if missing.
  - Generates invoice and payment number, marks invoice `status: 'paid'`, `totalAmount`.
  - Persists invoice via `storage.createPatientInvoice` and payment via `storage.createPayment`.
- **Response (200):** `{ success: true, invoice: { id, invoiceNumber }, payment: { id, transactionId } }`
- **Errors:** `404` patient not found, `500` on failure.

---

## 13. Stripe Payment Intent (Billing)
- **Method:** `POST`
- **Endpoint:** `/api/billing/create-payment-intent`
- **Auth:** `authMiddleware`
- **Request body:** `{ "invoiceId": 123 }`
- **Purpose:** Creates Stripe payment intent for outstanding invoice amount.
- **Response (200):**
  ```json
  {
    "clientSecret": "...",
    "amount": 123.45,
    "invoiceNumber": "INV-...",
    "patientName": "John Doe"
  }
  ```
- **Errors:** `400` missing IDs or already paid, `404` invoice missing, `503` Stripe not configured, `500` generic.
- **Dependencies:** `storage.getInvoicesByOrganization`, `stripe`.

---

## 14. Process Stripe Payment
- **Method:** `POST`
- **Endpoint:** `/api/billing/process-payment`
- **Auth:** `authMiddleware`
- **Request body:** `{ "paymentIntentId": "...", "invoiceId": 123 }`
- **Purpose:** Verifies Stripe intent status, records payment, updates invoice status to `paid`.
- **Response (200):** `{ success: true, message: "...", receiptUrl: "..." }`
- **Errors:** `400` missing IDs or unsuccessful payment, `503` Stripe not configured, `404` invoice missing, `500` general.
- **Dependencies:** `stripe`, `storage.createPayment`, `storage.updateInvoice`.

---

## 15. Send Invoice Email
- **Method:** `POST`
- **Endpoint:** `/api/billing/send-invoice`
- **Auth:** `requireRole(["admin","doctor","nurse","receptionist"])`
- **Request body:**
  ```json
  {
    "invoiceId": 101,
    "sendMethod": "email",
    "recipientEmail": "patient@example.com",
    "customMessage": "Note..."
  }
  ```
- **Purpose:** Sends invoice via email (HTML + attachments); SMS/print currently just return success.
- **Response (200):** `{ success: true, message: "Invoice sent successfully" }`
- **Errors:** `400` missing invoice or email, `404` invoice not found, `500` email/send failure.
- **Dependencies:** `storage.getInvoicesByOrganization`, `emailService`, file system for PDF attachments.

---

## 16. Save Invoice PDF
- **Method:** `POST`
- **Endpoint:** `/api/billing/save-invoice-pdf`
- **Auth:** `requireRole(["admin","doctor","nurse","receptionist"])`
- **Request body:** `{ invoiceNumber, patientId, pdfData (base64) }`
- **Purpose:** Stores invoice PDF under `uploads/Invoices/{org}/{patient}/{invoice}.pdf`.
- **Response (200):** File path and success message.
- **Errors:** `400` missing params, `500` file save failure.
- **Dependencies:** `fs-extra`/`path` for file handling.

---

## Notes
- **Tenant enforcement:** Several routes (cash payment, Stripe flows) use `multiTenantEnforcer()` which ensures `X-Tenant-Subdomain` or other tenant context is present.
- **Logging:** Billing routes log detailed context to the console for debugging, including invoice numbers, organization IDs, etc.
