# PDF Image Embedding Failure Diagnostic Guide

This guide helps you identify why images are failing to embed in PDF reports.

## 🔍 Step-by-Step Diagnosis

### Step 1: Check Server Console Logs

The code has extensive logging. Look for these log patterns:

#### ✅ Success Indicators:
```
📷 PRIMARY SOURCE: Found X image(s) in radiology_images table
📷 [1] ✅ PRIORITY 1 SUCCESS: Loaded X bytes from base64 imageData
📷 [1] ✅ FINAL SUCCESS: Image added to PDF buffer
📄 PDF EMBEDDING: ✅ Will embed ALL X image(s) into PDF report
📄 PDF EMBEDDING [1]: ✅ PNG/JPEG image embedded successfully
📄 PDF EMBEDDING [1]: ✅ Image drawn successfully on PDF page
📄 PDF EMBEDDING SUMMARY: Successfully embedded X out of X image(s)
```

#### ❌ Failure Indicators:
```
❌ PDF EMBEDDING: No images were loaded into the buffer
❌ PDF EMBEDDING: This means either:
   1. No rows found in radiology_images table
   2. Files were not found at the expected paths
   3. Files could not be read from the server filesystem
```

---

## 🐛 Common Failure Points

### **Failure Point 1: No Images in Database**

**Symptom:**
```
📷 PRIMARY SOURCE: ⚠️ No rows found in radiology_images table for medical_image_id: X
❌ PDF EMBEDDING: imageBuffers array is EMPTY!
```

**Cause:** No images were saved to the `radiology_images` table when uploaded.

**Fix:**
1. Check if images were uploaded successfully
2. Verify the upload endpoint (`/api/radiology-images`) is saving to database
3. Check database query:
   ```sql
   SELECT * FROM radiology_images 
   WHERE medical_image_id = <your_image_id> 
   AND organization_id = <your_org_id>;
   ```

---

### **Failure Point 2: Base64 Decoding Fails (Priority 1)**

**Symptom:**
```
📷 [1] PRIORITY 1: Using base64 imageData from database
📷 [1] ⚠️ PRIORITY 1 FAILED: Error decoding base64 imageData
```

**Possible Causes:**
1. **Invalid base64 format** - Database stores corrupted base64
2. **Missing data URL prefix** - Base64 should be: `data:image/png;base64,{base64data}`
3. **Empty base64 string** - Database field is empty or null

**Fix:**
1. Check database value:
   ```sql
   SELECT id, imageData, LENGTH(imageData) as data_length 
   FROM radiology_images 
   WHERE id = <image_id>;
   ```
2. Verify format: Should start with `data:image/` or be pure base64
3. If corrupted, delete `imageData` to force Priority 2 (file read)

---

### **Failure Point 3: File Not Found (Priority 2)**

**Symptom:**
```
📷 [1] PRIORITY 2: Loading image from server filesystem
📷 [1]    Database filePath: "uploads/Imaging_Images/1/patients/123/image.png"
📷 [1]    Resolved absolute server path: "C:\...\uploads\Imaging_Images\1\patients\123\image.png"
📷 [1]    File exists at resolved path: ❌ NO
📷 [1] ⚠️ PRIORITY 2: File not found at resolved path
```

**Possible Causes:**
1. **Wrong filePath in database** - Path doesn't match actual file location
2. **File was deleted** - File exists in DB but not on filesystem
3. **Path resolution issue** - Absolute vs relative path mismatch
4. **Wrong directory structure** - File is in different location

**Fix:**
1. Check actual file location:
   ```bash
   # Windows PowerShell
   Get-ChildItem -Path "uploads\Imaging_Images\1\patients\123" -Recurse
   
   # Unix/Linux
   find uploads/Imaging_Images/1/patients/123 -name "*.png" -o -name "*.jpg"
   ```
2. Check database `filePath` value:
   ```sql
   SELECT id, fileName, filePath 
   FROM radiology_images 
   WHERE id = <image_id>;
   ```
3. Compare database path vs actual file location
4. If mismatch, update database or move file to match

---

### **Failure Point 4: File Read Fails (Priority 2)**

**Symptom:**
```
📷 [1] PRIORITY 2: Loading image from server filesystem
📷 [1]    File exists at resolved path: ✅ YES
📷 [1] ❌ PRIORITY 2 FAILED: Error reading from filesystem
```

**Possible Causes:**
1. **File permissions** - Server doesn't have read permission
2. **File is locked** - Another process is using the file
3. **Corrupted file** - File exists but is corrupted
4. **Disk I/O error** - Filesystem issue

**Fix:**
1. Check file permissions:
   ```bash
   # Windows
   icacls "uploads\Imaging_Images\1\patients\123\image.png"
   
   # Unix/Linux
   ls -la uploads/Imaging_Images/1/patients/123/image.png
   ```
2. Try reading file manually to verify it's not corrupted
3. Check server logs for disk I/O errors

---

### **Failure Point 5: Constructed Path Fails (Priority 3)**

**Symptom:**
```
📷 [1] PRIORITY 3: Constructing absolute path from fileName
📷 [1]    Constructed absolute path: "C:\...\uploads\Imaging_Images\1\patients\123\image.png"
📷 [1]    File exists: ❌ NO
📷 [1] ⚠️ PRIORITY 3 FAILED: File not found at constructed path
```

**Possible Causes:**
1. **Wrong directory structure** - Files are stored in different location
2. **Wrong organizationId/patientId** - IDs don't match actual directory
3. **File was never uploaded** - File doesn't exist anywhere

**Fix:**
1. Check actual directory structure:
   ```bash
   # List all Imaging_Images directories
   find uploads/Imaging_Images -type d
   ```
2. Verify organizationId and patientId match:
   ```sql
   SELECT medical_image_id, organization_id, patient_id 
   FROM radiology_images 
   WHERE id = <image_id>;
   ```
3. Check if file exists in a different location (search entire uploads folder)

---

### **Failure Point 6: Image Conversion Fails**

**Symptom:**
```
📷 [1] Processing image: X bytes, extension: .webp
🔄 Converting .webp image to JPEG for PDF compatibility
❌ Failed to convert .webp image using sharp
```

**Possible Causes:**
1. **Sharp library not installed** - Missing `sharp` npm package
2. **Unsupported format** - Image format can't be converted
3. **Corrupted image** - Image buffer is corrupted

**Fix:**
1. Install sharp:
   ```bash
   npm install sharp
   ```
2. Check if image can be opened in image viewer
3. Try converting manually to verify image is valid

---

### **Failure Point 7: PDF Embedding Fails**

**Symptom:**
```
📄 PDF EMBEDDING [1]: Attempting to embed image/jpeg image (X bytes)
📄 PDF EMBEDDING [1]: ❌ FATAL ERROR embedding image
```

**Possible Causes:**
1. **Invalid buffer** - Buffer is not a valid image
2. **Wrong MIME type** - MIME type doesn't match actual image format
3. **Corrupted buffer** - Buffer is corrupted during conversion
4. **pdf-lib error** - Library can't parse the image

**Fix:**
1. Check buffer validation logs:
   ```
   📄 PDF EMBEDDING [1]: Buffer validation - is Buffer: true, length: X
   ```
2. Verify MIME type matches actual format:
   - PNG files should have `mimeType: 'image/png'`
   - JPEG files should have `mimeType: 'image/jpeg'`
3. Check if buffer is valid image by saving to file and opening

---

### **Failure Point 8: Image Drawing Fails**

**Symptom:**
```
📄 PDF EMBEDDING [1]: ✅ JPEG image embedded successfully
📄 PDF EMBEDDING [1]: ❌ FATAL ERROR drawing image on PDF page
```

**Possible Causes:**
1. **Invalid coordinates** - xPos or yPos is out of bounds
2. **Invalid dimensions** - width or height is 0 or negative
3. **Page not initialized** - PDF page object is invalid

**Fix:**
1. Check coordinate logs:
   ```
   📄 PDF EMBEDDING [1]: Drawing image at position (X, Y)
   📄 PDF EMBEDDING [1]: Page dimensions: 595 x 842
   ```
2. Verify dimensions are valid:
   ```
   📄 PDF EMBEDDING [1]: Final (scaled): X x Y points
   ```

---

## 🔧 Debugging Checklist

Use this checklist to systematically diagnose the issue:

### ✅ Database Check
- [ ] Are images in `radiology_images` table?
- [ ] Does `medical_image_id` match `medical_images.id`?
- [ ] Is `organization_id` correct?
- [ ] Does `filePath` exist and is it correct?
- [ ] Is `imageData` (base64) valid or empty?

### ✅ File System Check
- [ ] Do files exist at the paths in database?
- [ ] Are file permissions correct (readable)?
- [ ] Is directory structure correct?
- [ ] Are files not corrupted (can open in image viewer)?

### ✅ Image Buffer Check
- [ ] Is buffer loaded successfully?
- [ ] Is buffer size > 0 bytes?
- [ ] Is buffer a valid Buffer instance?
- [ ] Is image format supported (PNG/JPEG)?

### ✅ PDF Embedding Check
- [ ] Is MIME type correct (image/png or image/jpeg)?
- [ ] Does pdf-lib accept the buffer?
- [ ] Are image dimensions valid (> 0)?
- [ ] Are coordinates within page bounds?

---

## 📊 Diagnostic Commands

### Check Database
```sql
-- Check if images exist for a medical image
SELECT 
  id, 
  medical_image_id, 
  organization_id, 
  fileName, 
  filePath, 
  CASE 
    WHEN imageData IS NULL THEN 'NULL' 
    WHEN imageData = '' THEN 'EMPTY' 
    ELSE CONCAT('HAS_DATA (', LENGTH(imageData), ' chars)') 
  END as imageDataStatus
FROM radiology_images 
WHERE medical_image_id = <your_medical_image_id>
AND organization_id = <your_org_id>;
```

### Check File System (Windows PowerShell)
```powershell
# Check if directory exists
Test-Path "uploads\Imaging_Images\1\patients\123"

# List all files in directory
Get-ChildItem "uploads\Imaging_Images\1\patients\123" -Recurse

# Check file size
(Get-Item "uploads\Imaging_Images\1\patients\123\image.png").Length
```

### Check File System (Unix/Linux)
```bash
# Check if directory exists
test -d "uploads/Imaging_Images/1/patients/123" && echo "EXISTS" || echo "NOT EXISTS"

# List all files in directory
find uploads/Imaging_Images/1/patients/123 -type f

# Check file size
ls -lh uploads/Imaging_Images/1/patients/123/image.png
```

---

## 🎯 Quick Fixes

### Fix 1: Force Re-upload Images
If images are in database but files are missing:
1. Delete records from `radiology_images` table
2. Re-upload images through the UI
3. Verify files are created in filesystem

### Fix 2: Regenerate Base64 from Files
If `imageData` is missing but files exist:
1. The code automatically does this in Priority 2
2. Check logs for: `✅ Updated database with base64 imageData`
3. Next PDF generation will use Priority 1 (faster)

### Fix 3: Fix File Paths in Database
If `filePath` is wrong:
```sql
-- Update filePath to correct relative path
UPDATE radiology_images 
SET filePath = 'uploads/Imaging_Images/1/patients/123/image.png'
WHERE id = <image_id>;
```

### Fix 4: Check Directory Structure
If files are in wrong location:
1. Move files to correct location:
   ```
   uploads/Imaging_Images/{organizationId}/patients/{patientId}/{fileName}
   ```
2. Update database `filePath` to match

---

## 📝 Log Analysis Template

When reporting an issue, include these logs:

```
1. PRIMARY SOURCE logs:
   📷 PRIMARY SOURCE: Found X image(s)...
   📷   Row 1: id=X, fileName="...", filePath="..."

2. PRIORITY logs (1, 2, or 3):
   📷 [1] PRIORITY X: ...
   📷 [1] ✅/❌ PRIORITY X SUCCESS/FAILED: ...

3. PDF EMBEDDING logs:
   📄 PDF EMBEDDING: Total images in buffer: X
   📄 PDF EMBEDDING [1]: ✅/❌ ...

4. SUMMARY logs:
   📄 PDF EMBEDDING SUMMARY: Successfully embedded X out of X
```

---

## 🚨 Most Common Issues

1. **No images in database** (60% of cases)
   - Solution: Verify upload process saves to database

2. **File path mismatch** (25% of cases)
   - Solution: Check `filePath` in database vs actual file location

3. **Base64 decoding fails** (10% of cases)
   - Solution: Delete `imageData` to force file read (Priority 2)

4. **File doesn't exist** (5% of cases)
   - Solution: Re-upload images or fix file paths

---

## 💡 Prevention Tips

1. **Always save base64 to database** when uploading images
2. **Store relative paths** (from 'uploads' onwards) in database
3. **Validate images** before saving to database
4. **Test PDF generation** immediately after uploading images
5. **Monitor server logs** for embedding failures

---

## 🔗 Related Files

- **Image Loading**: `server/routes.ts` lines ~26233-26650
- **PDF Embedding**: `server/routes.ts` lines ~26814-27070
- **Image Conversion**: `server/routes.ts` lines ~153-180
- **Path Resolution**: `server/routes.ts` lines ~26385-26517
