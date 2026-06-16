# Medical Imaging API Reference

**Base path:** `/api`  
**Authentication:** Most imaging endpoints require `authMiddleware` with JWT (`Authorization: Bearer <token>`) plus tenant context (`X-Tenant-Subdomain`). Additional `requireRole` guards restrict access by staff role. Certain signed-link viewers (`/imaging-files/view`, `/imaging/view-prescription`) validate JWT-like tokens instead of the standard auth header.

---

## 1. Get Imaging Studies
- **Method:** `GET`
- **Endpoint:** `/api/imaging`
- **Auth:** `authMiddleware`
- **Purpose:** Returns a stubbed list of imaging studies (currently static sample data) for the organization.  
- **Response (200):** Array of study objects (`{ id, patientId, patientName, studyType, modality, orderedBy, scheduledAt, status, findings, impression, radiologist, priority }`).  
- **Errors:** `401` if unauthenticated, `500` on failure.

---

## 2. Generate Signed URL for Report PDF
- **Method:** `GET`
- **Endpoint:** `/api/imaging-files/:id/signed-url`
- **Auth:** `authMiddleware`
- **Purpose:** Creates a short-lived JWT token linking to the `/api/imaging-files/view/:id` viewer.  
- **Response (200):** `{ "signedUrl": "https://.../api/imaging-files/view/{id}?token=... }` valid for 5 minutes.  
- **Errors:** `400` invalid `id`, `404` missing image, `500` config failure.  
- **Dependencies:** `storage.getMedicalImagesByOrganization`, `FILE_SECRET` env, `jwt`.

---

## 3. View Imaging Report via Signed Link
- **Method:** `GET`
- **Endpoint:** `/api/imaging-files/view/:id`
- **Auth:** None (token only)
- **Query:** `token=<JWT>` (expires in 5m)
- **Purpose:** Streams the PDF located at `uploads/Imaging_Reports/{org}/patients/{patient}/{imageId}.pdf`.  
- **Response (200):** PDF file (`Content-Type: application/pdf`).  
- **Errors:** `403` invalid token, `404` file not found, `500` on failure.

---

## 4. Upload Report Images
- **Method:** `POST`
- **Endpoint:** `/api/imaging/upload-report-images`
- **Auth:** `authMiddleware`, `requireRole(["doctor","nurse","admin","receptionist"])`
- **Body:** `multipart/form-data` with fields:
  - `studyId` (required)
  - `patientId` (optional)
  - `images` (array of files; up to 10)
- **Purpose:** Validates image MIME types (JPEG/PNG/GIF/BMP/TIFF/WebP/Icon/DICOM) and stores them on disk, returning metadata for UI.  
- **Response (200):** `{ success: true, uploadedImages: [...], message }`.
- **Errors:** `400` missing study or invalid files, `401` auth failure, `500` upload or cleanup failure.

---

## 5. Generate Imaging Report PDF
- **Method:** `POST`
- **Endpoint:** `/api/imaging/generate-report`
- **Auth:** `authMiddleware`, `requireRole(["doctor","nurse","admin"])`
- **Body (JSON):** `{ study: {...}, reportFormData?: {...}, imageData?: string, uploadedImageFileNames?: string[] }`
- **Purpose:** Uses `pdf-lib` to build a full radiology report PDF (header, patient info, findings, images, signature).  
- **Response (200):** `{ success: true, reportId, fileName, filePath, message }`.
- **Notes:** Stores file under `uploads/Imaging_Reports/{org}/patients/{patient}` and updates `storage.updateMedicalImageReport`. Supports clinic headers/footers, signature data, and optional image attachments.  
- **Errors:** `400` missing study, `404` missing medical image, `500` PDF generation or storage errors.

---

## 6. Generate Image Prescription PDF
- **Method:** `POST`
- **Endpoint:** `/api/imaging/generate-image-prescription`
- **Auth:** `authMiddleware`, `requireRole(["doctor","nurse","admin"])`
- **Body:** `{ imageId: string }`
- **Purpose:** Produces a prescription PDF for a medical image (using clinic header/footer metadata), saves to `uploads/Image_Prescriptions/{org}/patients/{patient}`, and stores metadata (path/filename).  
- **Response (200):** `{ success: true, fileName, viewUrl, message }` where `viewUrl` includes a 7-day JWT tokenized link (`/api/imaging/view-prescription/...`).  
- **Errors:** `400` missing id, `404` image/patient missing, `500` failure.

---

## 7. Generate Prescription Token
- **Method:** `POST`
- **Endpoint:** `/api/imaging/generate-prescription-token`
- **Auth:** `authMiddleware`, `requireRole(["doctor","nurse","patient","admin"])`
- **Body:** `{ organizationId, patientId, fileName }`
- **Purpose:** Issues a `FILE_SECRET` JWT token valid 7 days for viewing a saved prescription via `/imaging/view-prescription/...`.  
- **Response (200):** `{ success: true, token }`.
- **Errors:** `400` missing params, `500` config failure.

---

## 8. View Prescription via Signed Link
- **Method:** `GET`
- **Endpoint:** `/api/imaging/view-prescription/:organizationId/:patientId/:fileName`
- **Auth:** None (token only)
- **Query:** `token=<JWT>`
- **Purpose:** Streams the prescription PDF.  
- **Response (200):** PDF stream with `inline` disposition.  
- **Errors:** `403` invalid token, `404` file not found, `500` server error.

---

## 9. Save Imaging Prescription
- **Method:** `POST`
- **Endpoint:** `/api/imaging/save-prescription`
- **Auth:** `authMiddleware`, `requireRole(["doctor","nurse","admin"])`
- **Body:** `{ studyId, prescriptionData: {...} }`
- **Purpose:** Builds a new prescription PDF (with hospital/physician/patient sections), saves to `uploads/Image_Prescriptions`, and updates the study (path/filename).  
- **Response (200):** `{ success: true, filePath, message }`.
- **Errors:** `400` payload/study missing, `404` study not found, `500` PDF creation failure.

---

## 10. Save Uploaded Images to Imaging-Images Folder
- **Method:** `POST`
- **Endpoint:** `/api/imaging/save-uploaded-images`
- **Auth:** `authMiddleware`, `requireRole(["doctor","nurse","admin"])`
- **Body:** `{ organizationId, patientId, imageUrls: string[] }`
- **Purpose:** Copies user-provided image URLs from `/uploads/medical_images` into `uploads/Imaging_Images/...`, converts files to base64, and updates `schema.medicalImages.imageData` for the first matching record without data.  
- **Response (200):** `{ success: true, savedCount, savedFiles, directory, message }`.  
- **Errors:** `400` missing params, `500` I/O failure.

---

## 11. Share Imaging Study
- **Method:** `POST`
- **Endpoint:** `/api/imaging/share-study`
- **Auth:** `authMiddleware`
- **Body:** `{ studyId, recipientEmail, customMessage?, shareSource = 'report' }`
- **Purpose:** Emails the report or prescription PDF to the recipient. Chooses stored path (report/prescription) and falls back to constructed filenames. Sends via `emailService.sendEmail` with PDF attachment.  
- **Response (200):** `{ success: true, message, studyId, recipientEmail, patientName }`.  
- **Errors:** `400` missing fields, `404` study/patient or missing file, `500` email failure.  
- **Notes:** Updates `orderStudyShared` flag when share succeeds.

---

## 12. Check Report Existence
- **Method:** `HEAD`
- **Endpoint:** `/api/imaging/reports/:reportId`
- **Auth:** `authMiddleware`
- **Purpose:** Quick HEAD check to confirm the PDF exists on disk before loading in iframe.  
- **Response (200)** if file exists, `404` otherwise.

---

## 13. Serve Report PDF
- **Method:** `GET`
- **Endpoint:** `/api/imaging/reports/:reportId`
- **Auth:** Token-based; supports `Authorization: Bearer <token>` or `?token=` in query.  
- **Purpose:** Streams the `uploads/Imaging_Reports/.../{reportId}.pdf` file.  
- **Query:** `download=true` forces `attachment`.  
- **Response (200):** PDF (inline/attachment based on query).  
- **Errors:** `401` missing/invalid token, `404` missing study/file, `500` failure.  
- **Dependencies:** `authService.verifyToken`, `storage.getMedicalImagesByOrganization`.

---

## 14. Delete Report PDF
- **Method:** `DELETE`
- **Endpoint:** `/api/imaging/reports/:reportId`
- **Auth:** `authMiddleware`, `requireRole(["doctor","nurse","admin"])`
- **Purpose:** Deletes report file from disk and clears stored path info in DB (`reportFileName`, `reportFilePath`).  
- **Response (200):** `{ success: true, message, reportId }`.  
- **Errors:** `401` auth, `404` study not found, `500` deletion failure.

---

## 15. Update Report Field
- **Method:** `PATCH`
- **Endpoint:** `/api/imaging/studies/:studyId/report-field`
- **Auth:** `authMiddleware`, `requireRole(["doctor","nurse"])`
- **Body:** `{ fieldName, value }`
- **Validation:** `updateMedicalImageReportFieldSchema` ensures `fieldName` is known and `value` is string/nullable.  
- **Purpose:** Patch a single report field (e.g., findings, impression).  
- **Response (200):** `{ success: true, studyId, updated: { [fieldName]: value } }`.  
- **Errors:** `400` validation failure, `404` study missing, `500` DB failure.

---

## Notes
- **Storage dependencies:** `storage` module handles medical image metadata, patient lookup, clinic headers/footers, and report/prescription path persistence.  
- **File handling:** PDFs stored under `uploads/{Imaging_Reports,Image_Prescriptions,Imaging_Images}` per organization/patient.  
- **Security:** Signed links rely on `FILE_SECRET`; ensure env is configured in production. Image uploads apply MIME filtering and cleanup invalid files.  
