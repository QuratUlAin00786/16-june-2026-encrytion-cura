# Forms, Automation & Messaging API Reference

**Base path:** `/api`  
**Authentication:** Most routes use `authMiddleware`; share/create/delete endpoints also require staff roles (`admin`, `doctor`, `nurse`). Messaging endpoints rely on tenant & user context (non-patient modules include additional guards). Automation toggles require `admin/doctor/nurse`.

---

## Forms Collection & Sharing

### 1. List Forms
- **GET** `/api/forms`
- **Auth:** `authMiddleware`
- **Purpose:** Returns all forms defined for the tenant via `formService.getForms`.
- **Response:** Array of form metadata.

### 2. Create Form
- **POST** `/api/forms`
- **Auth:** `authMiddleware`, `requireRole(["admin","doctor","nurse"])`
- **Body:** `{ title, description, metadata, status, sections }`
- **Purpose:** Persists new form under organization with creator ID.
- **Response:** Created form object.

### 3. Share Form
- **POST** `/api/forms/:formId/share`
- **Auth:** `authMiddleware`, `requireRole(["admin","doctor","nurse"])`
- **Body:** `{ patientId }`
- **Purpose:** Shares form with patient; records details via `formService.shareForm`.
- **Response:** Share log record.

### 4. Share Logs
- **GET** `/api/forms/:formId/shares`
- **Auth:** same as share.
- **Purpose:** Lists share deliveries for a form (filters to organization).

### 5. Form Responses
- **GET** `/api/forms/:formId/responses`
- **Auth:** same as share.
- **Purpose:** Returns submitted responses (via `formService.getFormResponses`).

### 6. Resend Share Email
- **POST** `/api/forms/share-logs/:logId/resend`
- **Auth:** same as share.
- **Purpose:** Retriggers email for share log entry.

### 7. Preview Share Email
- **POST** `/api/forms/:formId/share/preview`
- **Auth:** same as share.
- **Body:** `{ patientId }`
- **Purpose:** Generates preview data for email content before sending.

### 8. Delete Form
- **DELETE** `/api/forms/:formId`
- **Auth:** same as share.
- **Purpose:** Removes form storage and metadata (204 response).

---

## Analytics & Automation

### 9. Analytics Overview
- **GET** `/api/analytics`
- **Auth:** `authMiddleware`
- **Purpose:** Aggregated metrics from `storage.getAnalytics`.

### 10. Automation Rules
- **GET** `/api/automation/rules`
- **GET** `/api/automation/stats`
- **Auth:** `authMiddleware`
- **Purpose:** Manage automation rule definitions and stats. Rules list from `storage.getAutomationRules`, stats from `storage.getAutomationStats`.

### 11. Toggle Rule
- **POST** `/api/automation/rules/:id/toggle`
- **Auth:** `authMiddleware`, `requireRole(["admin","doctor","nurse"])`
- **Purpose:** Enable/disable automation rule by ID.

---

## Messaging & Twilio

**Key services:** `storage` handles conversations/messages; `messagingService` handles SMS/WhatsApp/voice, `emailService` handles email fallbacks.

### 12. Conversations & Messages
- **GET** `/api/messaging/conversations`
- **Auth:** `authMiddleware`
- **Purpose:** Returns user conversations for organization. Includes debug logs of headers.  
- **GET** `/api/messaging/messages/:conversationId`
- **Auth:** `authMiddleware`
- **Purpose:** Retrieves message history with cache-control headers.

### 13. Messaging Debug & Consolidation
- **GET** `/api/messaging/debug` – dumps raw conversations for debugging.  
- **POST** `/api/messaging/consolidate` – deduplicates conversations for organization (no extra auth).  
- **GET** `/api/messaging/twilio-config` – returns masked Twilio credentials + isConfigured flag.  
- **GET** `/api/messaging/account-info` – fetches Twilio account info.  
- **POST** `/api/messaging/reset-twilio` – `requireRole(["admin"])`, triggers `resetTwilioClient`.

### 14. Send Message
- **POST** `/api/messaging/send`
- **Auth:** `authMiddleware`
- **Body:** `{ conversationId, recipientId, content/message, type, priority, phoneNumber, messageType }`
- **Purpose:** Persists message via `storage.sendMessage`, optionally delivers via `messagingService` (sms/whatsapp/phone) or `emailService`. Handles `messageType` to differentiate internal vs external. Logs and consolidates duplicates before storing.

### 15. Webhook & Notifications
- **GET** `/api/messaging/webhook` ??? (not in excerpt). (if not present skip)

---

## Notes

- **Security:** All messaging endpoints require `authMiddleware`. Twilio endpoints require `requireRole` for admin operations.  
- **Delivery logic:** `messagingService` and `emailService` send actual text/voice; fallback to internal logs if external delivery fails.  
- **Automation:** Stored automation rules connect to other modules (e.g., appointment reminders).  
