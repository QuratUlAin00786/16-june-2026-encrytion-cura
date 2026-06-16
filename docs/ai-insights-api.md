# AI & Insights API Reference

This document captures every AI, AI insights, and AI agent route in the application, including real-time SSE events. All routes sit under `/api/ai*`.

## 1. Generate Anatomical Treatment Plan
- **Method:** POST  
- **Endpoint:** `/api/ai/generate-treatment-plan`  
- **Auth:** `Authorization: Bearer <token>` + `X-Tenant-Subdomain` (handled by `authMiddleware`). Requires role `admin`, `doctor`, or `nurse`.  

**Request:**  
Headers: standard authenticated request headers.  
Body (JSON):
```json
{
  "patientId": "number",            // required
  "muscleGroup": "string",         // required (e.g., "biceps")
  "analysisType": "string",        // required
  "treatment": "string",           // required
  "treatmentIntensity": "string",  // optional
  "sessionFrequency": "string",    // optional
  "primarySymptoms": "string",     // optional
  "severityScale": "string",       // optional
  "followUpPlan": "string"         // optional
}
```

**Response (200):**
```json
{ "success": true, "treatmentPlan": "string" }
```

**Errors:**
- `400` if any required field is missing.
- `500` when the OpenAI call and fallback both fail.

**Business Logic:** Converts user inputs into an OpenAI request via `aiService.generateAnatomicalTreatmentPlan`, falls back to a templated plan on failure, and returns the plan text.  
**Dependencies:** `aiService`, `storage` (for context logging), fallback template.  
**Validation:** Server ensures essential input fields are present; no schema library is used beyond manual checks.

## 2. Generate AI Insights
- **Method:** POST  
- **Endpoint:** `/api/ai/generate-insights`  
- **Auth:** Same as above (requires `admin`, `doctor`, `nurse`).  

**Request body:**
```json
{ "patientId": number }
```

**Response (200):**
```json
{
  "success": true,
  "insights": [ ...saved records... ],
  "generated": number,
  "patientName": "string",
  "usingFallbackData": boolean
}
```

**Errors:**  
- `400` if `patientId` missing.  
- `404` if patient not found.  
- `500` on storage or OpenAI failures.

**Business Logic:** Loads patient & medical records, requests insights from `aiService.analyzePatientRisk`, stores each result via `storage.createAiInsight`, and returns an array of saved insights plus metadata. Falls back to mock insights if OpenAI fails (logs are emitted).  
**Dependencies:** `aiService`, `storage`, `aiInsightBroadcaster` indirectly for stored records.  
**Validation:** No Zod; manual checks for `patientId` presence and patient existence.

## 3. Analyze Patient (Per-Patient Analysis Trigger)
- **Method:** POST  
- **Endpoint:** `/api/ai/analyze-patient/:id`  
- **Auth:** `requireRole(["doctor", "nurse"])`  

**Path Parameter:** `id` = numeric patient identifier.  
**Request:** Body empty.  

**Response (200):** Array of insights from `aiService.analyzePatientRisk`.  

**Errors:**  
- `404` if patient missing.  
- `500` when storage or AI service fails.

**Business Logic:** Fetches patient and records, generates insights via `aiService`, stores them in DB, and returns raw insights.  
**Dependencies:** `aiService`, `storage`.

## 4. Update Single AI Insight (Status Tracking)
- **Method:** PATCH  
- **Endpoint:** `/api/ai/insights/:id`  
- **Auth:** `requireRole(["doctor","nurse","admin"])`

**Path Parameter:** `id` = insight ID.  
**Request Body:**
```json
{
  "status": "active|dismissed|resolved",
  "aiStatus": "pending|reviewed|implemented|dismissed"
}
```

**Response (200):** Updated insight record.  

**Errors:**  
- `400` invalid ID or payload.  
- `404` insight not found.  
- `500` otherwise.

**Business Logic:** Applies `storage.updateAiInsight`, compares status for SSE, and broadcasts updates using `aiInsightBroadcaster`.  
**Dependencies:** `storage`, `aiInsightBroadcaster`, `zod` for validation.

## 5. AI Insights SSE Stream
- **Method:** GET  
- **Endpoint:** `/api/ai-insights/events`  
- **Auth:** `requireRole(["doctor","nurse","admin"])`

**Headers:** SSE requires `Content-Type: text/event-stream`.  
**Query Params:** None.  

**Response:** Stream of events (`connected`, `heartbeat`, updates) with `event: connected` and ongoing `: heartbeat` lines.  

**Business Logic:** Adds client connection to `aiInsightBroadcaster`, emits heartbeat every 30s, and removes connection on disconnect.  
**Dependencies:** `aiInsightBroadcaster`, `uuidv4`.

## 6. List AI Insights
- **Method:** GET  
- **Endpoint:** `/api/ai-insights`  
- **Auth:** `requireRole(["doctor","nurse","admin"])`

**Query Parameters:**  
`patientId` (optional) – filters insights scoped to that patient (tenant-aware).  

**Response (200):**  
Array of insight objects with `confidence` converted to numbers.  

**Errors:**  
- `404` if requested `patientId` is invalid (not belonging to tenant).  
- `500` for storage errors.

**Business Logic:** Retrieves either patient-specific or organization-wide insights (max 50) via `storage`, then casts `confidence` from string to number for the UI.  
**Dependencies:** `storage`.

## 7. Create AI Insight
- **Method:** POST  
- **Endpoint:** `/api/ai-insights`  
- **Auth:** Same as above.

**Request Body Schema (validated via Zod):**
```json
{
  "patientId": "number (optional)",
  "type": "risk_alert|drug_interaction|treatment_suggestion|preventive_care",
  "title": "string",
  "description": "string",
  "severity": "low|medium|high|critical",
  "actionRequired": "boolean",
  "confidence": "string '0' to '1'",
  "symptoms": "string (optional)",
  "history": "string (optional)",
  "status": "string (defaults to active)",
  "aiStatus": "string (defaults to pending)",
  "metadata": "object (optional)"
}
```

**Response (201):** Newly created insight with `confidence` returned as number.  

**Errors:**  
- `400` for validation failures or invalid patient.  
- `404` if designated patient not found.  
- `500` for persistence errors.

**Business Logic:** Ensures patient ownership (if provided), enriches metadata via helper functions (`generateSuggestedActions`, `generateRelatedConditions`), stores the insight with `storage.createAiInsight`, and returns transformed record.  
**Dependencies:** `storage`, `zod`.

## 8. Delete AI Insight
- **Method:** DELETE  
- **Endpoint:** `/api/ai-insights/:id`  
- **Auth:** same roles.

**Path Parameter:** `id` = insight ID.  

**Response:** `{ success: true, message: "AI insight deleted successfully" }`  

**Errors:**  
- `400` invalid ID.  
- `404` insight not found (per-tenant).  
- `500` storage failure.

**Logic:** Verifies existence via `storage.getAiInsight` before deleting.

## 9. Update AI Insight (Extended Fields)
- **Method:** PATCH  
- **Endpoint:** `/api/ai-insights/:id` (second definition)  
- **Auth:** `requireRole(["doctor","nurse","admin"])`

**Request Body:**
```json
{
  "severity": "critical|high|medium|low",
  "status": "active|reviewed|dismissed|implemented",
  "aiStatus": "pending|reviewed|implemented|dismissed",
  "notes": "string"
}
```

**Response (200):** `{ success: true, insight: {...}, message: "AI insight updated successfully" }`  

**Errors:** similar to delete.  

**Logic:** Validates fields, checks tenant ownership, updates via `storage.updateAiInsight`, and returns transformed confidence.

## 10. AI Agent Chat
- **Method:** POST  
- **Endpoint:** `/api/ai-agent/chat`  
- **Auth:** Authenticated user (`authMiddleware`).  

**Request Body:**
```json
{
  "message": "string",                    // required
  "conversationHistory": [ ... ]         // optional
}
```

**Response (200):**
```json
{
  "message": "AI generated response",
  "intent": "string",
  "confidence": number,
  "data": { ... } (prescription/appointment payloads),
  "action": "string (optional)",
  "actionDescription": "string"
}
```

**Errors:**  
- `400` missing message.  
- `500` processing failure (returns friendly apology).  

**Business Logic:** Builds conversation context, tries OpenAI via `aiService.processComprehensiveChatWithOpenAI`, falls back to `processWithLocalNLP`, triggers appointment creation or prescription search flows, and returns structured response.  
**Dependencies:** `aiService`, `storage`.

## Edge Cases & Validation Summary
- All AI endpoints enforce tenant isolation via `req.tenant!.id`.  
- Most endpoints confirm requested `patientId` belongs to the tenant before acting.  
- SSE endpoint keeps connections alive with heartbeats and cleans up on disconnect.  
- A fallback path exists when OpenAI calls fail, ensuring graceful degradation.
