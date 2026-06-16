# Analytics Subjects - Complete Workflow Example

## Overview
This document demonstrates how to create and use custom analytics subjects to track specific treatments or consultations with graphical insights.

## Example: Creating "Halo Treatments" Analytics Subject

### Step 1: Open the Analytics Page
1. Navigate to the **Analytics** page in your application
2. Click on the **"Custom Analytics"** tab
3. Click the **"Create Analytics Subject"** button

### Step 2: Create the Subject
1. **Enter Subject Title**: `Halo Treatments`
2. **Select Appointment Type**: Choose `Treatment` from the dropdown

### Step 3: Add Multiple Treatments
You can add multiple related treatments to track them together:

#### Treatment 1: Halo Laser
- Type in the treatment input: `Halo Laser`
- Click **"Add Treatment"** button (or press Enter)
- You'll see a badge appear: `Halo Laser` with a remove button

#### Treatment 2: Halo Facial
- Type in the treatment input: `Halo Facial`
- Click **"Add Treatment"** button
- Another badge appears: `Halo Facial`

#### Treatment 3: Halo Follow-up Sessions
- Type in the treatment input: `Halo Follow-up Sessions`
- Click **"Add Treatment"** button
- Third badge appears: `Halo Follow-up Sessions`

### Step 4: Review Selected Treatments
You should now see three badges displayed:
```
[Halo Laser ×]  [Halo Facial ×]  [Halo Follow-up Sessions ×]
```

Each badge can be removed individually by clicking the × button.

### Step 5: Create the Subject
- Click **"Create Subject"** button
- The system will:
  1. Create each treatment in the database (if they don't exist)
  2. Create the analytics subject "Halo Treatments"
  3. Link all three treatments to this subject
  4. Show a success message

### Step 6: View Analytics
Once created, you can:
1. Select "Halo Treatments" from the subject dropdown
2. View combined analytics for all three treatments:
   - **Total Halo treatments performed** (sum of all three)
   - **Monthly Halo treatment trends** (aggregated data)
   - **Revenue generated from Halo treatments** (combined revenue)
   - **Patient distribution for Halo procedures** (all patients across all three treatments)

## Example Data Flow

### What Happens Behind the Scenes:

1. **Treatment Creation**:
   ```
   POST /api/treatments-info
   Body: { name: "Halo Laser", colorCode: "#2563eb" }
   Response: { id: 101, name: "Halo Laser", ... }
   ```

2. **Subject Creation**:
   ```
   POST /api/analytics/custom-subjects
   Body: {
     subjectTitle: "Halo Treatments",
     treatmentIds: [101, 102, 103]  // IDs of all three treatments
   }
   Response: { id: 1, subjectTitle: "Halo Treatments", ... }
   ```

3. **Analytics Generation**:
   ```
   GET /api/analytics/custom-subjects/1/analytics
   Returns: Combined data from all treatments with IDs [101, 102, 103]
   ```

## Visual Example

### Before Creating:
```
┌─────────────────────────────────────────┐
│ Manage Analytics Subjects              │
├─────────────────────────────────────────┤
│ Subject Title: [Halo Treatments      ] │
│                                         │
│ Appointment Type: [Treatment ▼]        │
│                                         │
│ Treatment Name: [Halo Laser         ] │
│                    [Add Treatment]     │
│                                         │
│ Selected Treatments:                   │
│ ┌───────────────────────────────────┐ │
│ │ No treatments added yet...        │ │
│ └───────────────────────────────────┘ │
│                                         │
│              [Create Subject]           │
└─────────────────────────────────────────┘
```

### After Adding Treatments:
```
┌─────────────────────────────────────────┐
│ Manage Analytics Subjects              │
├─────────────────────────────────────────┤
│ Subject Title: [Halo Treatments      ] │
│                                         │
│ Appointment Type: [Treatment ▼]        │
│                                         │
│ Treatment Name: [                    ] │
│                    [Add Treatment]     │
│                                         │
│ Selected Treatments:                   │
│ ┌───────────────────────────────────┐ │
│ │ [Halo Laser ×] [Halo Facial ×]    │ │
│ │ [Halo Follow-up Sessions ×]        │ │
│ └───────────────────────────────────┘ │
│                                         │
│              [Create Subject]           │
└─────────────────────────────────────────┘
```

### After Creation - Analytics View:
```
┌─────────────────────────────────────────┐
│ Custom Analytics                       │
├─────────────────────────────────────────┤
│ Subject: [Halo Treatments ▼]          │
│ Status: [All ▼]                        │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Total Halo Treatments: 45           ││
│ │ (Combined: Laser + Facial + Follow) ││
│ └─────────────────────────────────────┘│
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Monthly Trends                      ││
│ │ [Bar Chart showing combined data]   ││
│ └─────────────────────────────────────┘│
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Revenue: £12,450                    ││
│ │ (From all Halo treatments)          ││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

## Real-World Use Cases

### Use Case 1: Treatment Family Analytics
**Subject**: "Botox Procedures"
**Treatments**:
- Botox Forehead
- Botox Crow's Feet
- Botox Frown Lines

**Result**: Combined analytics showing total Botox treatments across all areas.

### Use Case 2: Consultation Types
**Subject**: "Initial Consultations"
**Consultations**:
- General Consultation
- Specialist Consultation
- Follow-up Consultation

**Result**: Track all consultation types together.

### Use Case 3: Seasonal Treatments
**Subject**: "Summer Treatments"
**Treatments**:
- Laser Hair Removal
- Skin Rejuvenation
- Sun Damage Repair

**Result**: Analyze seasonal treatment patterns.

## Key Benefits

1. **Flexibility**: Create custom groupings that match your business needs
2. **Combined Analytics**: View aggregated data across related treatments
3. **Easy Management**: Add/remove treatments with simple UI
4. **Real-time Creation**: Treatments are created automatically as you type
5. **Visual Insights**: Graphical charts show trends and performance

## Technical Details

- **Backend**: Supports multiple `treatmentIds` per subject
- **Database**: Uses `analytics_subjects` and `analytics_subject_treatments` tables
- **Analytics**: Aggregates data from all linked treatments
- **API Endpoints**:
  - `POST /api/treatments-info` - Create treatment
  - `POST /api/analytics/custom-subjects` - Create subject with multiple treatments
  - `GET /api/analytics/custom-subjects/:id/analytics` - Get combined analytics
