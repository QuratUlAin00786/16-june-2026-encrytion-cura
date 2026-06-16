# Notifications API Reference

**Base path:** `/api`  
**Authentication:** `authMiddleware` plus tenant context. Admins can optionally share organization-wide visibility; other users operate scoped to their user+organization.

---

## 1. List Notifications
- **GET** `/api/notifications`
- **Query:** `limit` (default 20).
- **Auth:** `authMiddleware`
- **Logic:** Admins receive organization-wide notifications; others receive user-specific notifications limited to `limit` (with safe defaults).  
- **Response:** Array of notifications (see schema below).

## 2. Notification Counts
- **GET** `/api/notifications/count` – total notifications for organization (admin).
- **GET** `/api/notifications/unread-count` – unread count for user (admin sees org-wide count).

## 3. Create Notification
- **POST** `/api/notifications`
- **Auth:** `requireRole(["admin","doctor","nurse"])`
- **Body schema:**  
  ```json
  {
    "userId": 123,
    "title": "string",
    "message": "string",
    "type": "string",
    "priority": "low|normal|high|critical",
    "relatedEntityType": "string?",
    "relatedEntityId": number?,
    "actionUrl": "string?",
    "isActionable": boolean?,
    "scheduledFor": "ISO string?",
    "expiresAt": "ISO string?",
    "metadata": {
      "patientId?": number,
      "patientName?": string,
      "appointmentId?": number,
      "prescriptionId?": number,
      "urgency?": "low|medium|high|critical",
      "department?": string,
      "requiresResponse?": boolean,
      "autoMarkAsRead?": boolean,
      "icon?": string,
      "color?": string
    }
  }
  ```
- **Purpose:** Create scheduled/persistent alert for patient, appointment, invoice, etc. Returns created notification record (`schedule`, `expires`, other fields stored).

## 4. Update Notification Status
- **PATCH** `/api/notifications/:id/read` – mark read. Admins mark org-wide; others mark per user.
- **PATCH** `/api/notifications/:id/dismiss` – remove from active queue (org vs user).
- **PATCH** `/api/notifications/mark-all-read` – admin vs user action.

## 5. Delete Notification
- **DELETE** `/api/notifications/:id` – admin can delete org notifications; others delete their own entries.

## Notification Object
- Fields include `id`, `title`, `message`, `type`, `priority`, `userId`, `organizationId`, `metadata`, `createdAt`, `scheduledFor`, `expiresAt`, `isRead`, `isDismissed`, `actionUrl`, `relatedEntityType`, `relatedEntityId`.

## Notes
- **Storage:** `storage` handles counts and mutations (`createNotification`, `getNotifications`, `markNotificationAsRead`, `deleteNotification`, etc.).
- **Convenience logging:** endpoints log IDs/roles/counts for telemetry.
