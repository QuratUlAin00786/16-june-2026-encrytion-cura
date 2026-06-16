# Email Templates and Dark Mode Logo Usage - Complete Reference

This document provides a comprehensive list of all email templates used in the application and where the dark mode (night theme) logo is applied.

---

## 📧 EMAIL TEMPLATES IN THE APPLICATION

### Total Email Templates: **12 Unique Email Types**

---

## 1. EMAIL SERVICE FILE: `server/services/email.ts`

This is the main email service file containing all email template generators and senders.

### Email Template Methods:

#### 1.1 **Appointment Reminder Email**
- **Method**: `generateAppointmentReminderEmail()`
- **Sender Method**: `sendAppointmentReminder()`
- **Purpose**: Sends appointment reminders to patients
- **Parameters**: `patientName`, `doctorName`, `appointmentDate`, `appointmentTime`
- **Subject**: `Appointment Reminder - ${appointmentDate}`
- **Used In**: `server/routes.ts` (line 18230)

#### 1.2 **Prescription Notification Email**
- **Method**: `generatePrescriptionNotificationEmail()`
- **Sender Method**: `sendPrescriptionNotification()`
- **Purpose**: Notifies patients about new prescriptions
- **Parameters**: `patientName`, `medicationName`, `dosage`, `instructions`
- **Subject**: `New Prescription - ${medicationName}`
- **Used In**: `server/routes.ts` (line 18265)

#### 1.3 **Test Results Notification Email**
- **Method**: `generateTestResultsEmail()`
- **Sender Method**: `sendTestResultsNotification()`
- **Purpose**: Notifies patients when test results are available
- **Parameters**: `patientName`, `testName`, `status`
- **Subject**: `Test Results Available - ${testName}`
- **Used In**: `server/routes.ts` (line 18299)

#### 1.4 **General Reminder Email**
- **Method**: `generateGeneralReminderEmail()`
- **Sender Method**: `sendGeneralReminder()`
- **Purpose**: Sends various types of healthcare reminders
- **Parameters**: `patientName`, `reminderType`, `message`
- **Reminder Types**: 
  - `appointment_reminder`
  - `medication_reminder`
  - `follow_up_reminder`
  - `emergency_alert`
  - `preventive_care`
  - `billing_notice`
  - `health_check`
- **Subject**: `${typeLabels[reminderType] || 'Healthcare Reminder'} - Cura EMR`
- **Used In**: `server/routes.ts` (line 4728)

#### 1.5 **Password Change Notification Email**
- **Method**: `generatePasswordChangeEmail()`
- **Sender Method**: `sendPasswordChangeNotification()`
- **Purpose**: Notifies users when their password is changed
- **Parameters**: `userName`, `timestamp`, `viewToken`, `newPassword`
- **Subject**: `Password Changed - Cura EMR`
- **Features**: Includes secure link to view password, security warnings
- **Used In**: `server/routes.ts` (line 1604)

#### 1.6 **Imaging Study Share Email**
- **Method**: `generateImagingStudyShareEmail()`
- **Sender Method**: `sendImagingStudyShare()`
- **Purpose**: Shares imaging studies with colleagues
- **Parameters**: `recipientEmail`, `patientName`, `studyType`, `sharedBy`, `customMessage`, `reportUrl`
- **Subject**: `Imaging Study Shared - ${patientName}`
- **Used In**: `server/routes.ts` (line 18332)

#### 1.7 **Prescription Email (PDF Attachment)**
- **Method**: `generatePrescriptionEmail()`
- **Sender Method**: `sendPrescriptionEmail()`
- **Purpose**: Sends prescription PDF to pharmacy
- **Parameters**: `patientName`, `pharmacyName`, `prescriptionData`, `clinicLogoUrl`, `organizationName`
- **Subject**: `Prescription PDF - ${patientName}`
- **Features**: Includes clinic logo in header, Cura logo in footer, PDF attachment
- **Used In**: `server/routes.ts` (line 18870, 18882)

#### 1.8 **New User Account Email**
- **Method**: `generateNewUserAccountEmail()`
- **Sender Method**: `sendNewUserAccountEmail()`
- **Purpose**: Welcome email for newly created user accounts
- **Parameters**: `userName`, `userEmail`, `password`, `organizationName`, `role`
- **Subject**: `Welcome to Cura EMR - Your Account Has Been Created`
- **Features**: Includes login credentials, security notice, next steps
- **Used In**: 
  - `server/routes.ts` (line 7465)
  - `server/saas-routes.ts` (via `sendWelcomeEmail`)

#### 1.9 **Password Reset Email**
- **Method**: `generatePasswordResetEmail()`
- **Sender Method**: `sendPasswordResetEmail()`
- **Purpose**: Sends password reset link to users
- **Parameters**: `userFirstName`, `resetToken`
- **Subject**: `Password Reset Request - Cura EMR`
- **Features**: Reset link with 1-hour expiration
- **Used In**: `server/routes.ts` (line 1823)

#### 1.10 **Password Reset Confirmation Email**
- **Method**: `generatePasswordResetConfirmationEmail()`
- **Sender Method**: `sendPasswordResetConfirmationEmail()`
- **Purpose**: Confirms successful password reset
- **Parameters**: `userFirstName`
- **Subject**: `Password Successfully Changed - Cura EMR`
- **Used In**: `server/routes.ts` (line 1897)

---

## 2. EMAIL TEMPLATES IN `server/routes.ts`

### 2.1 **Trial Account Verification Email**
- **Location**: Line 2092-2143
- **Purpose**: Email sent when creating a trial account
- **Subject**: `Verify your Cura EMR trial account`
- **Features**: Verification link, 24-hour expiration
- **Endpoint**: `POST /api/create-trial`

### 2.2 **Prescription Email (Legacy)**
- **Location**: Line 9410-9413
- **Method**: Uses `generatePrescriptionEmailHTML()` from `server/email.ts`
- **Purpose**: Sends prescription via email
- **Endpoint**: `POST /api/prescriptions/:id/send-email`

### 2.3 **Form Share Email**
- **Location**: Line 12215
- **Purpose**: Shares forms with patients
- **Service**: `formService.resendShareEmail()`
- **Endpoint**: `POST /api/forms/:id/share`

### 2.4 **Messaging Email**
- **Location**: Line 12529-12530
- **Purpose**: Sends messages via email
- **Service**: `email-service.sendEmail()`
- **Endpoint**: `POST /api/messaging/send`

### 2.5 **Appointment Confirmation Email**
- **Location**: Line 20290
- **Method**: `emailService.sendAppointmentConfirmation()`
- **Purpose**: Confirms appointment booking
- **Note**: Method needs to be implemented in EmailService

### 2.6 **Prescription Request Confirmation Email**
- **Location**: Line 20371
- **Method**: `emailService.sendPrescriptionRequestConfirmation()`
- **Purpose**: Confirms prescription request
- **Note**: Method needs to be implemented in EmailService

### 2.7 **Invoice Email**
- **Location**: Line 22381
- **Purpose**: Sends invoice via email
- **Endpoint**: `POST /api/invoices/:id/send`

### 2.8 **Lab Results Email**
- **Location**: Line 25360
- **Purpose**: Sends lab results via email
- **Endpoint**: `POST /api/lab-results/:id/send-email`

---

## 3. EMAIL TEMPLATES IN `server/saas-routes.ts`

### 3.1 **Welcome Email (SaaS)**
- **Location**: Line 19-229 (`sendWelcomeEmail()` function)
- **Purpose**: Welcome email for SaaS organization creation
- **Subject**: `Welcome to Cura EMR - Your ${organization.name} Account is Ready`
- **Features**: Organization details, login credentials, next steps
- **Used In**: 
  - Line 347: Organization creation
  - Line 390: Test organization creation
  - Line 904: Organization creation
  - Line 1502: Organization creation

### 3.2 **Patient Account Creation Email**
- **Location**: Line 641
- **Purpose**: Notifies patient about account creation
- **Subject**: Patient account creation notification
- **Used In**: Patient creation endpoint

### 3.3 **Email Service Test Email**
- **Location**: Line 275-281
- **Purpose**: Tests email service functionality
- **Subject**: `Cura EMR Email Service Test`
- **Endpoint**: `POST /api/saas/test-email`

### 3.4 **Invoice Email (SaaS)**
- **Location**: Line 2561
- **Purpose**: Sends invoice for SaaS subscriptions
- **Subject**: `Invoice ${payment.invoiceNumber} from Cura EMR`
- **Used In**: Invoice generation

---

## 4. EMAIL TEMPLATES IN OTHER FILES

### 4.1 **Inventory Purchase Order Email**
- **File**: `server/services/inventory.ts`
- **Location**: Line 493
- **Method**: `inventoryService.sendPurchaseOrderEmail()`
- **Purpose**: Sends purchase order emails
- **Used In**: `server/routes.ts` (line 20689)

### 4.2 **Subscription Reminder Email**
- **File**: `server/services/subscription-reminders.ts`
- **Location**: Line 98
- **Purpose**: Sends subscription expiration reminders
- **Method**: `emailService.sendEmail()`

### 4.3 **Form Share Email (Service)**
- **File**: `server/services/forms.ts`
- **Location**: Line 1024, 1274
- **Method**: `emailService.sendEmailWithReport()`
- **Purpose**: Shares forms with patients via email

---

## 📊 EMAIL SUMMARY BY FILE

| File | Email Templates | Count |
|------|----------------|-------|
| `server/services/email.ts` | All template generators and senders | 10 |
| `server/routes.ts` | Trial verification, prescriptions, forms, messaging, invoices, lab results | 8 |
| `server/saas-routes.ts` | Welcome emails, patient creation, test emails, invoices | 4 |
| `server/services/inventory.ts` | Purchase order emails | 1 |
| `server/services/subscription-reminders.ts` | Subscription reminders | 1 |
| `server/services/forms.ts` | Form sharing emails | 1 |
| **TOTAL** | | **25+ email sending points** |

---

## 🌙 DARK MODE (NIGHT THEME) LOGO USAGE

### File: `client/src/components/layout/sidebar.tsx`

#### Logo Definition:
- **Line 59**: 
  ```typescript
  const darkLogoWhite = new URL("../../../../attached_assets/dark-logo/cura-logo-white.png", import.meta.url).href;
  ```

#### Logo Usage:
- **Line 313**: Used in sidebar logo display
  ```typescript
  src={
    organizationData?.settings?.theme?.logoUrl ||
    tenant?.settings?.theme?.logoUrl ||
    (theme === "dark" ? darkLogoWhite : "/cura-logo-chatbot.png")
  }
  ```

#### Logic:
- **When theme is "dark"**: Uses `darkLogoWhite` (white logo from `attached_assets/dark-logo/cura-logo-white.png`)
- **When theme is "light"**: Uses `/cura-logo-chatbot.png` (standard chatbot logo)
- **Priority**: Organization logo > Tenant logo > Theme-based default logo

#### Logo File Location:
- **Path**: `attached_assets/dark-logo/cura-logo-white.png`
- **Relative Path from sidebar.tsx**: `../../../../attached_assets/dark-logo/cura-logo-white.png`
- **File Exists**: ✅ Yes (verified)

---

## 📝 EMAIL TEMPLATE DETAILS

### Email Template Structure:
All email templates follow a consistent structure:
1. **HTML Version**: Full HTML email with styling
2. **Text Version**: Plain text fallback
3. **Subject Line**: Descriptive subject
4. **Branding**: Cura EMR branding in header/footer
5. **Footer**: Copyright and company information

### Common Email Features:
- **Header**: Cura EMR branding with gradient background
- **Content**: Main message with details
- **Footer**: Copyright notice, company information
- **Responsive**: Mobile-friendly HTML structure
- **Accessibility**: Alt text for images, semantic HTML

### Email Service Configuration:
- **Primary**: SendGrid (via connector)
- **Fallback**: SMTP (configurable via environment variables)
- **Secondary Fallback**: Gmail (if configured)
- **From Address**: Configurable via environment variables

---

## 🔍 EMAIL ENDPOINTS SUMMARY

### Authentication & User Management:
1. `POST /api/create-trial` - Trial account verification email
2. `POST /api/auth/reset-password` - Password reset email
3. `POST /api/auth/reset-password-confirm` - Password reset confirmation
4. `POST /api/users` - New user account email
5. `POST /api/auth/change-password` - Password change notification

### Healthcare Operations:
6. `POST /api/appointments/:id/reminder` - Appointment reminder
7. `POST /api/appointments/:id/confirm` - Appointment confirmation
8. `POST /api/prescriptions/:id/send-email` - Prescription email
9. `POST /api/prescriptions/:id/request-confirm` - Prescription request confirmation
10. `POST /api/lab-results/:id/send-email` - Lab results email
11. `POST /api/imaging/:id/share` - Imaging study share

### Forms & Messaging:
12. `POST /api/forms/:id/share` - Form share email
13. `POST /api/messaging/send` - Messaging email

### Billing & Inventory:
14. `POST /api/invoices/:id/send` - Invoice email
15. `POST /api/inventory/purchase-orders/:id/send-email` - Purchase order email

### SaaS:
16. `POST /api/saas/organizations` - Welcome email
17. `POST /api/saas/test-email` - Test email
18. `POST /api/saas/patients` - Patient account creation

---

## 📋 NOTES

1. **Email Templates**: Most email templates are defined in `server/services/email.ts` as methods of the `EmailService` class.

2. **Dark Mode Logo**: The dark mode logo is **only used in the sidebar** (`client/src/components/layout/sidebar.tsx`) and is automatically switched based on the current theme.

3. **Logo Priority**: The sidebar logo follows this priority:
   - Organization custom logo (if set)
   - Tenant custom logo (if set)
   - Theme-based default (dark logo for dark theme, chatbot logo for light theme)

4. **Email Service**: The application uses a multi-tier email delivery system:
   - SendGrid (primary)
   - SMTP (fallback)
   - Gmail (secondary fallback)

5. **Missing Implementations**: Two email methods are referenced but not yet implemented:
   - `sendAppointmentConfirmation()` - Needs implementation
   - `sendPrescriptionRequestConfirmation()` - Needs implementation

---

**Generated**: 2025-01-18
**Total Email Templates**: 12 unique types
**Total Email Sending Points**: 25+
**Dark Mode Logo Usage**: 1 file (sidebar.tsx)
