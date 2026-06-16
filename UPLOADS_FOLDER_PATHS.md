# File Paths Accessed from "uploads" Folder

This document lists all the exact file paths that are accessed from the `uploads` folder in the codebase.

## 📁 Imaging Images (Primary Use Case)

### **1. Image Upload Path (When Saving Images)**
```typescript
// Location: server/routes.ts, line ~18235
const organizationalDir = path.join('./uploads/Imaging_Images', String(organizationId), 'patients', String(patientId));

// Example (Windows):
// C:\Users\user\Downloads\18th-jan-2026-cura-main\18th-jan-2026-cura-main\uploads\Imaging_Images\1\patients\123\image.png

// Example (Unix):
// /var/www/app/uploads/Imaging_Images/1/patients/123/image.png
```

**Full Absolute Path Construction:**
```typescript
// Location: server/routes.ts, line ~19093
const imagingImagesDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Images', String(organizationId), 'patients', String(patientId));

// Resolved to:
// {process.cwd()}/uploads/Imaging_Images/{organizationId}/patients/{patientId}/{fileName}
```

### **2. Image Reading Path (Priority 2 - From filePath in Database)**
```typescript
// Location: server/routes.ts, line ~26406
// If database stores: "uploads/Imaging_Images/1/patients/123/image.png"
imagePath = path.resolve(process.cwd(), normalizedRelative);

// Resolved to:
// {process.cwd()}/uploads/Imaging_Images/1/patients/123/image.png
```

### **3. Image Reading Path (Priority 3 - Constructed Fallback)**
```typescript
// Location: server/routes.ts, line ~26457
const imagesDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Images', String(organizationId), 'patients', String(patientId));
const constructedPath = path.join(imagesDir, radiologyImage.fileName);

// Resolved to:
// {process.cwd()}/uploads/Imaging_Images/{organizationId}/patients/{patientId}/{fileName}
```

### **4. Image Reading Path (From Uploaded Image FileNames)**
```typescript
// Location: server/routes.ts, line ~26770
const imagesDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Images', String(organizationId), String(patientId));
const imagePath = path.join(imagesDir, fileName);

// Resolved to:
// {process.cwd()}/uploads/Imaging_Images/{organizationId}/{patientId}/{fileName}
```

### **5. Image Reading Path (Medical Image Fallback)**
```typescript
// Location: server/routes.ts, line ~26798
const imagesDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Images', String(organizationId), String(patientId));
const imagePath = path.join(imagesDir, medicalImage.fileName);

// Resolved to:
// {process.cwd()}/uploads/Imaging_Images/{organizationId}/{patientId}/{fileName}
```

### **6. Temporary Upload Path (Before Moving to Organizational Path)**
```typescript
// Location: server/routes.ts, line ~19096
const tempUploadDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Images');
const tempFilePath = path.join(tempUploadDir, req.file.filename);

// Resolved to:
// {process.cwd()}/uploads/Imaging_Images/{tempFileName}
```

---

## 📄 Imaging Reports (PDF Reports)

### **1. PDF Report Save Path**
```typescript
// Location: server/routes.ts, line ~25632
const reportsDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Reports', String(organizationId), 'patients', String(patientId));

// Resolved to:
// {process.cwd()}/uploads/Imaging_Reports/{organizationId}/patients/{patientId}/{reportFileName}
```

### **2. PDF Report Read Path (Multiple Fallback Patterns)**
```typescript
// Location: server/routes.ts, line ~12324-12344
// Pattern 1: New structure
const relativePath = `uploads/Imaging_Reports/${organizationId}/patients/${patientId}/${fileName}`;
fullPath = path.join(process.cwd(), relativePath);

// Pattern 2: Old structure (backward compatibility)
const relativePath = `uploads/Imaging_Reports/${organizationId}/patients/${patientId}/${fileName}`;
fullPath = path.join(process.cwd(), relativePath);

// Resolved to:
// {process.cwd()}/uploads/Imaging_Reports/{organizationId}/patients/{patientId}/{fileName}
```

---

## 🧪 Lab Test Results

### **1. Lab Result Save Path**
```typescript
// Location: server/routes.ts, line ~11233
const dirPath = path.join(process.cwd(), 'uploads', 'Lab_TestResults', organizationId.toString(), labResult.patientId.toString());

// Resolved to:
// {process.cwd()}/uploads/Lab_TestResults/{organizationId}/{patientId}/{fileName}
```

### **2. Lab Result Read Path**
```typescript
// Location: server/routes.ts, line ~11581
const filePath = path.join(process.cwd(), 'uploads', 'Lab_TestResults', organizationId.toString(), labResult.patientId.toString(), fileName);

// Resolved to:
// {process.cwd()}/uploads/Lab_TestResults/{organizationId}/{patientId}/{fileName}
```

### **3. Lab Result Upload Path**
```typescript
// Location: server/routes.ts, line ~11829
const dirPath = path.join(process.cwd(), `uploads/Lab_TestResults/${organizationId}/${patientId}`);

// Resolved to:
// {process.cwd()}/uploads/Lab_TestResults/{organizationId}/{patientId}/
```

### **4. Lab Result Download Path**
```typescript
// Location: server/routes.ts, line ~12046
const fullPath = path.join(process.cwd(), `uploads/Lab_TestResults/${organizationId}/${labResult.patientId}/${fileName}`);

// Resolved to:
// {process.cwd()}/uploads/Lab_TestResults/{organizationId}/{patientId}/{fileName}
```

---

## 💰 Invoices

### **1. Invoice PDF Save/Read Path**
```typescript
// Location: server/routes.ts, line ~25225
const filePath = path.join(process.cwd(), 'uploads', 'Invoices', req.tenant!.id.toString(), invoice.patientId, fileName);

// Resolved to:
// {process.cwd()}/uploads/Invoices/{organizationId}/{patientId}/{fileName}
```

### **2. Invoice PDF Generate Path**
```typescript
// Location: server/routes.ts, line ~25290
const filePath = path.join(process.cwd(), 'uploads', 'Invoices', organizationId.toString(), patientId, fileName);

// Resolved to:
// {process.cwd()}/uploads/Invoices/{organizationId}/{patientId}/{fileName}
```

---

## 📋 Forms

### **1. Form Upload Path**
```typescript
// Location: server/routes.ts, line ~17754
const filePath = path.join(process.cwd(), 'uploads', 'Forms', String(organizationId), String(userId), filename);

// Resolved to:
// {process.cwd()}/uploads/Forms/{organizationId}/{userId}/{filename}
```

### **2. Forms Directory Path**
```typescript
// Location: server/routes.ts, line ~17867
const formsDir = path.join(process.cwd(), 'uploads', 'Forms', String(organizationId), String(userId));

// Resolved to:
// {process.cwd()}/uploads/Forms/{organizationId}/{userId}/
```

---

## 🩹 Wound Assessment

### **1. Wound Assessment Photo Path**
```typescript
// Location: server/routes.ts, line ~15682
const filePath = path.join('uploads', 'wound_assessment', filename);

// Resolved to:
// {process.cwd()}/uploads/wound_assessment/{filename}
```

### **2. Wound Assessment Directory**
```typescript
// Location: server/routes.ts, line ~15685
const dir = path.join('uploads', 'wound_assessment');

// Resolved to:
// {process.cwd()}/uploads/wound_assessment/
```

### **3. Wound Assessment Photo Delete Path**
```typescript
// Location: server/routes.ts, line ~15837
const filePath = path.join('uploads', 'wound_assessment', photo.fileName);

// Resolved to:
// {process.cwd()}/uploads/wound_assessment/{fileName}
```

---

## 🎤 Voice Notes

### **1. Voice Note Upload Path**
```typescript
// Location: server/routes.ts, line ~15782
const filePath = path.join('uploads', 'VoiceNotes', filename);

// Resolved to:
// {process.cwd()}/uploads/VoiceNotes/{filename}
```

### **2. Voice Notes Directory**
```typescript
// Location: server/routes.ts, line ~15743
const dir = path.join('uploads', 'VoiceNotes');

// Resolved to:
// {process.cwd()}/uploads/VoiceNotes/
```

---

## 🧠 Anatomical Analysis Images

### **1. Anatomical Analysis Image Delete Path**
```typescript
// Location: server/routes.ts, line ~17029
path.join("./uploads", "anatomical_analysis_img", organizationId.toString(), patientId.toString())

// Resolved to:
// {process.cwd()}/uploads/anatomical_analysis_img/{organizationId}/{patientId}/
```

---

## 📊 Summary of All Uploads Paths

| Category | Path Pattern | Example |
|----------|-------------|---------|
| **Imaging Images** | `uploads/Imaging_Images/{orgId}/patients/{patientId}/{fileName}` | `uploads/Imaging_Images/1/patients/123/image.png` |
| **Imaging Reports** | `uploads/Imaging_Reports/{orgId}/patients/{patientId}/{fileName}` | `uploads/Imaging_Reports/1/patients/123/report.pdf` |
| **Lab Test Results** | `uploads/Lab_TestResults/{orgId}/{patientId}/{fileName}` | `uploads/Lab_TestResults/1/123/result.pdf` |
| **Invoices** | `uploads/Invoices/{orgId}/{patientId}/{fileName}` | `uploads/Invoices/1/123/invoice.pdf` |
| **Forms** | `uploads/Forms/{orgId}/{userId}/{fileName}` | `uploads/Forms/1/456/form.pdf` |
| **Wound Assessment** | `uploads/wound_assessment/{fileName}` | `uploads/wound_assessment/photo.jpg` |
| **Voice Notes** | `uploads/VoiceNotes/{fileName}` | `uploads/VoiceNotes/recording.mp3` |
| **Anatomical Analysis** | `uploads/anatomical_analysis_img/{orgId}/{patientId}/` | `uploads/anatomical_analysis_img/1/123/` |

---

## 🔧 Path Resolution Methods Used

### **Method 1: `path.resolve(process.cwd(), ...)`**
```typescript
// Creates absolute path from project root
const absolutePath = path.resolve(process.cwd(), 'uploads', 'Imaging_Images', orgId, 'patients', patientId);
// Result: C:\Users\...\project\uploads\Imaging_Images\1\patients\123
```

### **Method 2: `path.join(process.cwd(), ...)`**
```typescript
// Joins path segments (also creates absolute path)
const absolutePath = path.join(process.cwd(), 'uploads', 'Imaging_Images', orgId, 'patients', patientId);
// Result: C:\Users\...\project\uploads\Imaging_Images\1\patients\123
```

### **Method 3: Relative Path with `path.resolve()`**
```typescript
// If database stores: "uploads/Imaging_Images/1/patients/123/image.png"
const normalizedRelative = rawPath.replace(/\\/g, '/'); // Normalize separators
const absolutePath = path.resolve(process.cwd(), normalizedRelative);
// Result: C:\Users\...\project\uploads\Imaging_Images\1\patients\123\image.png
```

### **Method 4: Relative Path (Old Pattern)**
```typescript
// Some older code uses relative paths (less reliable)
const relativePath = path.join('./uploads', 'Imaging_Images', orgId);
// Result: ./uploads/Imaging_Images/1 (relative, not absolute)
```

---

## ⚠️ Important Notes

1. **Always Use Absolute Paths**: The code uses `path.resolve(process.cwd(), ...)` to ensure absolute paths are created, which is required for file system operations.

2. **Path Normalization**: Windows backslashes (`\`) are normalized to forward slashes (`/`) when extracting paths from database:
   ```typescript
   const normalizedRelative = relativePath.replace(/\\/g, '/');
   ```

3. **File Existence Check**: Before reading files, the code checks if they exist:
   ```typescript
   const fileExists = await fse.pathExists(imagePath);
   ```

4. **Priority System**: For imaging images, there's a 3-priority system:
   - **Priority 1**: Base64 from database (no file path needed)
   - **Priority 2**: Read from `filePath` in database (absolute or relative)
   - **Priority 3**: Construct path from expected location

5. **Directory Structure**: Most uploads follow an organizational structure:
   ```
   uploads/
   ├── Imaging_Images/
   │   └── {orgId}/
   │       └── patients/
   │           └── {patientId}/
   │               └── {fileName}
   ├── Imaging_Reports/
   │   └── {orgId}/
   │       └── patients/
   │           └── {patientId}/
   │               └── {fileName}
   └── ...
   ```

---

## 🐛 Common Path Issues

### **Issue 1: Relative Path in Database**
If database stores: `uploads/Imaging_Images/1/patients/123/image.png`
- ✅ **Correct**: Extract from 'uploads' and resolve: `path.resolve(process.cwd(), 'uploads/Imaging_Images/1/patients/123/image.png')`
- ❌ **Wrong**: Use directly without resolving

### **Issue 2: Windows Backslashes**
If database stores: `uploads\Imaging_Images\1\patients\123\image.png`
- ✅ **Correct**: Normalize first: `rawPath.replace(/\\/g, '/')` then resolve
- ❌ **Wrong**: Use backslashes directly (may fail on Unix)

### **Issue 3: Absolute Path Already in Database**
If database stores: `C:\Users\...\uploads\Imaging_Images\1\patients\123\image.png`
- ✅ **Correct**: Check if absolute first: `if (path.isAbsolute(rawPath))` then use directly
- ❌ **Wrong**: Try to resolve again (may create wrong path)

---

## 📍 Code Locations

- **Imaging Images Upload**: `server/routes.ts` line ~18235
- **Imaging Images Read (Priority 2)**: `server/routes.ts` line ~26406
- **Imaging Images Read (Priority 3)**: `server/routes.ts` line ~26457
- **Imaging Reports Save**: `server/routes.ts` line ~25632
- **Lab Results**: `server/routes.ts` line ~11233, ~11581, ~11829, ~12046
- **Invoices**: `server/routes.ts` line ~25225, ~25290
- **Forms**: `server/routes.ts` line ~17754, ~17867
- **Wound Assessment**: `server/routes.ts` line ~15682, ~15685, ~15837
- **Voice Notes**: `server/routes.ts` line ~15743, ~15782
