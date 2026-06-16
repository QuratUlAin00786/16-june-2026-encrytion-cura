# Sample Workflow: Creating "Halo Treatments" Analytics Subject

## Step-by-Step Visual Guide

### Step 1: Open the Dialog
```
┌─────────────────────────────────────────────────────────────┐
│  Analytics Dashboard                                         │
├─────────────────────────────────────────────────────────────┤
│  [Custom Analytics] [Treatment Analytics]                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Select Subject: [Select a subject... ▼]             │  │
│  │  Status: [All ▼]                                     │  │
│  │                                                       │  │
│  │  [Create Analytics Subject] ← Click this button      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Dialog Opens - Initial State
```
┌─────────────────────────────────────────────────────────────┐
│  Manage Analytics Subjects                            [×]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Create custom analytics subjects to track specific         │
│  treatments or consultations with graphical insights.       │
│                                                              │
│  Example: Create "Halo Treatments" and add multiple         │
│  treatments like "Halo Laser", "Halo Facial", and "Halo      │
│  Follow-up Sessions" to view combined analytics.           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Subject Title: [________________]                   │  │
│  │                                                       │  │
│  │  Appointment Type: [Select type ▼]                  │  │
│  │                                                       │  │
│  │  (Treatment/Consultation inputs appear after         │  │
│  │   selecting appointment type)                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Enter Subject Title and Select Type
```
┌─────────────────────────────────────────────────────────────┐
│  Manage Analytics Subjects                            [×]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Subject Title: [Halo Treatments____________]        │  │
│  │                                                       │  │
│  │  Appointment Type: [Treatment ▼]                    │  │
│  │                                                       │  │
│  │  Treatment Name: [________________]                  │  │
│  │                    [Add Treatment]                   │  │
│  │                                                       │  │
│  │  Selected Treatments:                               │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │ No treatments added yet. Type a treatment     │  │  │
│  │  │ name above and click "Add Treatment" to add.  │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│                    [Create Subject]                         │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Add First Treatment - "Halo Laser"
```
User types: "Halo Laser" and clicks "Add Treatment"

┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Treatment Name: [Halo Laser________________]        │  │
│  │                    [Add Treatment]                   │  │
│  │                                                       │  │
│  │  Selected Treatments:                               │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │ [Halo Laser ×]                                 │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ✓ Treatment "Halo Laser" created and added!                │
│  ✓ Input field cleared, ready for next treatment           │
└─────────────────────────────────────────────────────────────┘
```

### Step 5: Add Second Treatment - "Halo Facial"
```
User types: "Halo Facial" and clicks "Add Treatment"

┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Treatment Name: [Halo Facial_______________]       │  │
│  │                    [Add Treatment]                   │  │
│  │                                                       │  │
│  │  Selected Treatments:                               │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │ [Halo Laser ×]  [Halo Facial ×]                │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ✓ Treatment "Halo Facial" created and added!              │
│  ✓ Now showing 2 treatments                                │
└─────────────────────────────────────────────────────────────┘
```

### Step 6: Add Third Treatment - "Halo Follow-up Sessions"
```
User types: "Halo Follow-up Sessions" and clicks "Add Treatment"

┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Treatment Name: [________________]                  │  │
│  │                    [Add Treatment]                   │  │
│  │                                                       │  │
│  │  Selected Treatments:                               │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │ [Halo Laser ×]  [Halo Facial ×]                │  │  │
│  │  │ [Halo Follow-up Sessions ×]                     │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ✓ Treatment "Halo Follow-up Sessions" created and added!   │
│  ✓ Now showing 3 treatments                                │
│  ✓ Ready to create subject with all 3 treatments           │
└─────────────────────────────────────────────────────────────┘
```

### Step 7: Create the Subject
```
User clicks "Create Subject" button

┌─────────────────────────────────────────────────────────────┐
│  Processing...                                              │
│  ✓ Creating analytics subject "Halo Treatments"            │
│  ✓ Linking 3 treatments to subject                         │
│  ✓ Subject created successfully!                            │
└─────────────────────────────────────────────────────────────┘

Success Message: "Analytics subject created successfully!"
```

### Step 8: View the Created Subject
```
┌─────────────────────────────────────────────────────────────┐
│  Manage Analytics Subjects                            [×]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Existing Analytics Subjects                         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  📊 Halo Treatments                                   │  │
│  │     Treatments: Halo Laser, Halo Facial,             │  │
│  │     Halo Follow-up Sessions                           │  │
│  │     [Edit] [Delete]                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Step 9: View Analytics
```
┌─────────────────────────────────────────────────────────────┐
│  Custom Analytics                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Subject: [Halo Treatments ▼]                               │
│  Status: [All ▼]                                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Total Halo Treatments                                │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │                                                 │  │  │
│  │  │  45 Treatments                                  │  │  │
│  │  │  (Combined: Laser + Facial + Follow-up)         │  │  │
│  │  │                                                 │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Monthly Halo Treatment Trends                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  [Bar Chart showing combined monthly data]     │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Revenue from Halo Treatments                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  £12,450                                        │  │  │
│  │  │  (From all 3 Halo treatment types)              │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Console Logs (What Happens Behind the Scenes)

```
[MANAGE-SUBJECTS] Creating treatment: Halo Laser
[MANAGE-SUBJECTS] Calling POST /api/treatments-info with payload: {name: "Halo Laser", colorCode: "#2563eb"}
[MANAGE-SUBJECTS] Treatment creation response received, status: 201
[MANAGE-SUBJECTS] Extracted treatment ID: 101
[MANAGE-SUBJECTS] Treatment added: Halo Laser ID: 101

[MANAGE-SUBJECTS] Creating treatment: Halo Facial
[MANAGE-SUBJECTS] Calling POST /api/treatments-info with payload: {name: "Halo Facial", colorCode: "#2563eb"}
[MANAGE-SUBJECTS] Treatment creation response received, status: 201
[MANAGE-SUBJECTS] Extracted treatment ID: 102
[MANAGE-SUBJECTS] Treatment added: Halo Facial ID: 102

[MANAGE-SUBJECTS] Creating treatment: Halo Follow-up Sessions
[MANAGE-SUBJECTS] Calling POST /api/treatments-info with payload: {name: "Halo Follow-up Sessions", colorCode: "#2563eb"}
[MANAGE-SUBJECTS] Treatment creation response received, status: 201
[MANAGE-SUBJECTS] Extracted treatment ID: 103
[MANAGE-SUBJECTS] Treatment added: Halo Follow-up Sessions ID: 103

[MANAGE-SUBJECTS] Button clicked
[MANAGE-SUBJECTS] handleCreate called {subjectTitle: "Halo Treatments", appointmentType: "treatment", ...}
[MANAGE-SUBJECTS] Sending treatment IDs: [101, 102, 103]
[MANAGE-SUBJECTS] Creating subject with: {subjectTitle: "Halo Treatments", treatmentIds: [101, 102, 103]}
[MANAGE-SUBJECTS] Create response status: 201
[MANAGE-SUBJECTS] Subject created successfully: {id: 1, subjectTitle: "Halo Treatments", ...}
```

## API Calls Made

1. **Create Treatment 1:**
   ```http
   POST /api/treatments-info
   Authorization: Bearer <token>
   X-Tenant-Subdomain: <subdomain>
   Content-Type: application/json
   
   {
     "name": "Halo Laser",
     "colorCode": "#2563eb"
   }
   
   Response: { "id": 101, "name": "Halo Laser", ... }
   ```

2. **Create Treatment 2:**
   ```http
   POST /api/treatments-info
   { "name": "Halo Facial", "colorCode": "#2563eb" }
   Response: { "id": 102, "name": "Halo Facial", ... }
   ```

3. **Create Treatment 3:**
   ```http
   POST /api/treatments-info
   { "name": "Halo Follow-up Sessions", "colorCode": "#2563eb" }
   Response: { "id": 103, "name": "Halo Follow-up Sessions", ... }
   ```

4. **Create Analytics Subject:**
   ```http
   POST /api/analytics/custom-subjects
   Authorization: Bearer <token>
   X-Tenant-Subdomain: <subdomain>
   Content-Type: application/json
   
   {
     "subjectTitle": "Halo Treatments",
     "treatmentIds": [101, 102, 103]
   }
   
   Response: { "id": 1, "subjectTitle": "Halo Treatments", ... }
   ```

5. **Get Analytics (when viewing):**
   ```http
   GET /api/analytics/custom-subjects/1/analytics?status=all
   
   Response: {
     "totalRevenue": 12450,
     "totalSessions": 45,
     "monthlyTrends": [...],
     "revenuePerTreatment": [...],
     ...
   }
   ```

## Database Changes

### `treatments_info` table:
```sql
INSERT INTO treatments_info (organization_id, name, color_code, created_by)
VALUES 
  (20, 'Halo Laser', '#2563eb', 1),           -- ID: 101
  (20, 'Halo Facial', '#2563eb', 1),          -- ID: 102
  (20, 'Halo Follow-up Sessions', '#2563eb', 1); -- ID: 103
```

### `analytics_subjects` table:
```sql
INSERT INTO analytics_subjects (organization_id, subject_title)
VALUES (20, 'Halo Treatments');  -- ID: 1
```

### `analytics_subject_treatments` table:
```sql
INSERT INTO analytics_subject_treatments (subject_id, treatment_id)
VALUES 
  (1, 101),  -- Halo Laser
  (1, 102),  -- Halo Facial
  (1, 103);  -- Halo Follow-up Sessions
```

## Result

✅ **Subject Created**: "Halo Treatments"  
✅ **3 Treatments Linked**: Halo Laser, Halo Facial, Halo Follow-up Sessions  
✅ **Analytics Available**: Combined data from all 3 treatments  
✅ **Graphs Show**: Total treatments, monthly trends, revenue, patient distribution
