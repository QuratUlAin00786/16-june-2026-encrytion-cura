# Inventory & Pharmacy API Reference

**Base path:** `/api`  
**Authentication:** `authMiddleware` plus tenant context via `multiTenantEnforcer()` for many routes. Role guards (`requireRole`, `requireModulePermission`, or custom `requirePharmacistRole`) restrict access to admin/doctor/nurse/pharmacist/receptionist as noted.  
**Dependencies:** `storage`, `pharmacyService`, and related schema tables.

---

## Inventory Catalog

### 1. Inventory Categories
- `GET /api/inventory/categories` – list categories (admin/doctor/nurse/receptionist/pharmacist).
- `POST /api/inventory/categories` – create category (admin only).

### 2. Inventory Items
- `GET /api/inventory/items` – list items with optional filters (staff + pharmacist).
- `GET /api/inventory/items/:id` – fetch item detail.
- `POST /api/inventory/items` – create item (requires `inventory.create` module permission).
- `PATCH /api/inventory/items/:id` – update item (admin only).
- `DELETE /api/inventory/items/:id` – remove item (admin only).
- `POST /api/inventory/items/:id/stock` – adjust stock quantities (admin/doctor/nurse, requires reason/quantity).

### 3. Suppliers & Tax
- `GET /api/inventory/suppliers` – list supplier records.
- `POST /api/inventory/suppliers` – create supplier (admin).
- `GET /api/inventory/tax-rates` – list tax rates.
- `POST /api/inventory/tax-rates` – create tax rate (admin).
- `GET /api/inventory/insurance-providers` – list insurance providers for billing.
- `POST /api/inventory/insurance-providers` – add provider (admin).

---

## Inventory Procurement & Analytics

### 4. Purchase Orders
- `GET /api/inventory/purchase-orders` – list with status filters.
- `GET /api/inventory/purchase-orders/:id` – detail including items.
- `POST /api/inventory/purchase-orders` – create PO (admin/doctor/nurse). Body includes supplier, items, expected dates.
- `POST /api/inventory/purchase-orders/:id/send-email` – email PO.
- `DELETE /api/inventory/purchase-orders/:id` – cancel PO.

### 5. Goods Receipts
- `GET /api/inventory/goods-receipts` and `/goods-receipts/:id` – view receipts for orders (admin/doctor/nurse).
- `POST /api/inventory/goods-receipts` – register receipt details; updates stock/batching.

### 6. Alerts & Reports
- `GET /api/inventory/alerts` – low stock/expiry alerts.
- `GET /api/inventory/reports/value` – inventory valuation summary.
- `GET /api/inventory/reports/low-stock` – low-stock list.
- `GET /api/inventory/reports/stock-movements` – historical movements.

### 7. Batches & FEFO
- `GET /api/inventory/batches` – list batches per org.
- `GET /api/inventory/items/:itemId/batches-fefo` – list batches sorted by expiry (admin/doctor/nurse/receptionist/pharmacist).

---

## Sales & Returns

### 8. Sales Orders
- `POST /api/inventory/sales` – record sale (admin/doctor/nurse/receptionist/pharmacist). Payload includes `itemId`, `quantity`, `price`, `patientId`, etc.
- `GET /api/inventory/sales` – list filtered sales.
- `GET /api/inventory/sales/:id` – sale detail.
- `POST /api/inventory/sales/:id/void` – reverse sale (admin).

### 9. Returns & Credit Notes
- `POST /api/inventory/returns/sales` – create return (non-patient roles). Body includes sale reference, items, reason.
- `GET /api/inventory/returns` – list returns.
- `GET /api/inventory/returns/:id` – return detail.
- `POST /api/inventory/returns/:id/approval` – approve return (admin).
- `GET /api/inventory/credit-notes` – list credit notes.
- `POST /api/inventory/credit-notes/:id/apply` – apply credit note to sale (admin/doctor/nurse/receptionist).

### 10. Stock Adjustments
- `GET /api/inventory/stock-adjustments` – adjustments log for auditing (admin/doctor/nurse).

---

## Pharmacy Module

### Authorization Helper
- `requirePharmacistRole` enforces roles `pharmacist`, `admin`, or `store_manager`. Used extensively below.

### 11. Dashboard & Shift Management
- `GET /api/pharmacy/dashboard` – returns summary metrics (sales, revenue, inventory) for pharmacists.
- `POST /api/pharmacy/shifts/start` – begins shift with opening cash.
- `GET /api/pharmacy/shifts/current` – fetch current open shift.
- `POST /api/pharmacy/shifts/:id/close` – close shift with closing cash/discrepancy.
- `GET /api/pharmacy/shifts` – history with filters `{ pharmacistId, startDate, endDate, status }`.
- `POST /api/pharmacy/shifts/:id/approve` – admin/store-manager approves shift.
- `GET /api/pharmacy/activity-logs` – list pharmacist activity logs (with actions recorded in `pharmacyService.logActivity`).

---

## Clinic Branding Helpers

### 12. Clinic Headers & Footers
- `POST /api/clinic-headers` / `clinic-footers` – create or update header/footer using `insertClinicHeaderSchema` / `insertClinicFooterSchema`. `requireModulePermission('forms','edit')` ensures permission.
- `GET /api/clinic-headers` / `clinic-footers` – retrieve active header/footer for tenant.

---

## Notes
- **Validation:** `zod` schemas (`insertTreatmentSchema`, `insertTreatmentsInfoSchema`, `insertClinicHeaderSchema`, `insertClinicFooterSchema`) ensure clean payloads before storage updates.
- **Stock & pricing:** Inventory price adjustments happen via `/api/pricing/treatments/:id`.  
- **Multi-tenant enforcement:** Most routes call `requireOrgId(req)` (from middleware) to guarantee organization context.
- **Storage/Service dependencies:** `storage` module handles CRUD for inventory/suppliers/POs; `pharmacyService` manages shifts/reporting.  
