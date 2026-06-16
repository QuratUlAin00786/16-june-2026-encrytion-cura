# Cura EMR — Lab Results & Imaging Integration Guide

**Document purpose:** Setup process, client vs Cura responsibilities, and integration scope  
**Platform:** Cura EMR (multi-tenant UK healthcare)

---

## 1. Lab Results Integration

### 1.1 What it means in Cura today

Lab management in Cura is primarily an **in-platform workflow**, not an automatic feed from an external Laboratory Information System (LIS). The product supports:

- Ordering lab tests from the **Lab Results** module (doctor, nurse, lab technician, admin, and other clinical roles)
- Status tracking (e.g. pending → results entered → report generated)
- **Manual result entry** and **PDF generation** for lab reports
- File storage for lab request and result documents
- **Billing:** lab test catalog under **Finance → Billing → Lab Tests**
- **Permissions** via User Management roles

**Note:** Contract materials describe HL7 and LIS automation. The Integrations screen lists “HL7, FHIR, Labs” as a clinical category. Working self-serve connectors today include Stripe, Twilio, QuickBooks, and NHS Digital—not a dedicated live LIS connector. Automated LIS is a **custom integration project** unless explicitly delivered.

### 1.2 Setup process (typical go-live)

| Phase | Who | What happens |
|-------|-----|----------------|
| 1. Tenant & access | Client (admin) | Users, roles; Lab Results access for lab and clinical staff |
| 2. Service catalog | Client (finance/admin) | **Billing → Lab Tests** — name, code, price, sample type |
| 3. Documents | Client (admin) | Header/footer templates for branded lab PDFs |
| 4. Operations | Client (clinical + lab) | Order tests; enter results; generate/send PDFs |
| 5. External LIS | Client + Cura | Optional HL7/LIS auto-import — joint project |

Go-live prerequisites (user manual): roles, shifts, fees/charges, PDF header/footer.

### 1.3 Client responsibility

- Define lab tests and **pricing** (Billing → Lab Tests)
- Assign **roles and permissions**
- Run **clinical workflow** in Cura
- For HL7/LIS: vendor specs, mapping, firewall, UAT sign-off
- **Data quality:** patient ID, NHS number, order matching

### 1.4 Cura responsibility

- Multi-tenant hosting, APIs, storage, security
- Lab Results UI, workflows, PDF tooling, billing linkage
- Custom LIS/HL7 (if contracted): interfaces, deployment, support

### 1.5 External LIS integration (optional)

**Target:** HL7 import, critical values, trending, provider review.

| Area | Client | Cura |
|------|--------|------|
| Vendor & connectivity | LIS choice, firewall, certificates | Interface build |
| Code mapping | Local panels → Cura catalog | Import/match logic |
| Testing | Real orders/results | Staging validation |
| Go-live | Clinical sign-off | Monitoring |

---

## 2. Imaging Integration

### 2.1 What it means in Cura today

**In-platform radiology workflow:**

- Imaging study orders (patient, provider, study type, indication)
- **File upload** (including DICOM MIME); storage under org uploads
- Radiology **reports** and status workflow
- **Billing → Imaging** pricing catalog
- Role-based access

**Note:** Specs mention PACS, DICOM viewer, AI analysis. Today: orders, uploads, in-app reporting—not full embedded PACS. Distinguish **in-platform** vs **PACS project**.

### 2.2 Setup process (typical go-live)

| Phase | Who | What happens |
|-------|-----|----------------|
| 1. Tenant & access | Client (admin) | Roles; Imaging module permissions |
| 2. Study catalog | Client (finance/admin) | **Billing → Imaging** — X-Ray, MRI, etc. |
| 3. Study types | Client (admin) | `imaging_pricing` drives order UI |
| 4. Documents | Client (admin) | Header/footer for radiology PDFs |
| 5. Operations | Client (clinical + radiology) | Order, upload, report |
| 6. External PACS | Client + Cura | Optional DICOM routing — custom project |

### 2.3 Client responsibility

- Imaging **services and charges** in Billing
- Workflow: who orders vs who reports
- Upload/manage studies in Imaging module
- For PACS: vendor, AE titles, routing, acceptance testing
- GDPR/governance for diagnostic images

### 2.4 Cura responsibility

- Hosting, imaging APIs, file handling
- Order-to-report workflow and billing catalog
- Custom PACS/DICOM when contracted (project-based)

### 2.5 External PACS integration (optional)

**Target:** DICOM, secure transmission, viewing, worklist from orders.

| Area | Client | Cura |
|------|--------|------|
| PACS & network | Own PACS, VPN | Architecture & build |
| Modality routing | PACS admin | Receive/store/display |
| Workflow | Reporting standards | Order ↔ study link |
| Testing | Real DICOM studies | Validation |

---

## 3. Comparison summary

| Topic | In Cura today | Full external integration |
|-------|---------------|---------------------------|
| Lab | Order → enter → PDF → bill | HL7 from LIS |
| Imaging | Order → upload → report → bill | PACS DICOM + viewer |
| Setup | Client admin, finance, clinical | Client IT + vendor + Cura |
| Integrations UI | Stripe, SMS, NHS, etc. | Lab/PACS = custom work |

---

## 4. Recommendations for proposals

**Standard package:** Client setup (roles, lab/imaging billing catalog, branding) + Cura platform (modules, workflows). No external LIS/PACS on day one.

**Enhanced package:** LIS (HL7) and PACS (DICOM) as add-on — client provides vendor access and testing; Cura delivers integration engineering.

---

*© Cura Software Limited · Integration guide aligned with Cura EMR product scope*
