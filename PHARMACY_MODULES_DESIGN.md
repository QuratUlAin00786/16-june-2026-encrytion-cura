# Cura Healthcare EMR - Pharmacy Modules Design Document

## Module 4: Pharmacy Sales Process & Module 5: Returns Management

**Version:** 1.0  
**Date:** December 2025  
**Author:** Cura Development Team  
**Status:** Design Complete - Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Module 4: Pharmacy Sales Process](#2-module-4-pharmacy-sales-process)
   - [2.1 Overview](#21-overview)
   - [2.2 Complete Workflow Steps](#22-complete-workflow-steps)
   - [2.3 Data Entities](#23-data-entities)
   - [2.4 Validation Rules & Business Logic](#24-validation-rules--business-logic)
   - [2.5 Stock Impact Analysis](#25-stock-impact-analysis)
   - [2.6 Error Handling](#26-error-handling)
   - [2.7 Reports](#27-reports)
3. [Module 5: Returns Management](#3-module-5-returns-management)
   - [3.1 Overview](#31-overview)
   - [3.2 Complete Workflow Steps](#32-complete-workflow-steps)
   - [3.3 Data Entities](#33-data-entities)
   - [3.4 Validation Rules & Business Logic](#34-validation-rules--business-logic)
   - [3.5 Stock Impact Analysis](#35-stock-impact-analysis)
   - [3.6 Error Handling](#36-error-handling)
   - [3.7 Reports](#37-reports)
4. [Integration with Existing Modules](#4-integration-with-existing-modules)
5. [API Endpoints Specification](#5-api-endpoints-specification)
6. [Database Schema Extensions](#6-database-schema-extensions)
7. [Role-Based Access Control](#7-role-based-access-control)

---

## 1. Executive Summary

This document defines two new pharmacy modules that extend the existing Cura Healthcare inventory management system:

| Module | Purpose | Key Features |
|--------|---------|--------------|
| **Module 4: Pharmacy Sales** | Complete point-of-sale for pharmacy operations | FEFO batch deduction, multi-payment, insurance billing, prescription integration |
| **Module 5: Returns Management** | Handle all return scenarios with proper stock adjustment | Customer returns, supplier returns, approval workflow, audit trail |

### Existing Modules (Reference)
- **Module 1**: Inventory Setup (Master Data)
- **Module 2**: Purchase Process (Procurement Workflow)
- **Module 3**: Inventory Management (Ongoing Control)

### Integration Points
Both new modules integrate seamlessly with:
- `inventoryItems` - Product master data
- `inventoryBatches` - Batch/lot tracking with FEFO
- `inventoryStockMovements` - Audit trail for all stock changes
- `inventoryPurchaseOrders` - Supplier purchase references
- `prescriptions` - Prescription validation and dispensing

---

## 2. Module 4: Pharmacy Sales Process

### 2.1 Overview

The Pharmacy Sales Process module handles all point-of-sale operations including:
- Prescription-based dispensing with validation
- Walk-in (OTC) sales without prescription
- FEFO (First Expiry First Out) batch allocation
- Multi-tier pricing (MRP, wholesale, insurance)
- Split payments (cash + card + insurance)
- Automatic inventory deduction
- Invoice generation and printing

#### Key Actors
| Role | Permissions |
|------|------------|
| Pharmacist | Create sales, view batches, dispense medications |
| Admin | Full access including void sales, price overrides |
| Patient | View own purchase history (via patient portal) |

---

### 2.2 Complete Workflow Steps

#### 2.2.1 Sales Initiation

```
Step 1: SELECT SALE TYPE
├── Option A: Prescription Sale
│   ├── Scan/Enter Prescription ID
│   ├── Validate: prescription.status = 'active'
│   ├── Validate: prescription.expiryDate > current_date
│   ├── Load prescribed medications with dosage
│   └── Auto-populate patient information
│
└── Option B: Walk-in (OTC) Sale
    ├── Optional: Select existing patient
    ├── Optional: Create new patient profile
    └── Manual item selection begins
```

#### 2.2.2 Item Selection & Batch Allocation (FEFO)

```
Step 2: ADD ITEMS TO CART
│
├── Search/Scan Item (by name, barcode, SKU)
│
├── FEFO Batch Selection Algorithm:
│   │
│   │  SELECT batches FROM inventoryBatches
│   │  WHERE itemId = selected_item
│   │    AND remainingQuantity > 0
│   │    AND status = 'active'
│   │    AND isExpired = false
│   │    AND expiryDate > CURRENT_DATE
│   │  ORDER BY expiryDate ASC  -- First Expiry First Out
│   │  
│   ├── Auto-select batch with earliest expiry
│   ├── If quantity spans multiple batches:
│   │   └── Cascade to next-earliest-expiry batch
│   │
│   └── Manual batch override (Admin only)
│
├── Quantity Entry:
│   ├── Validate: requestedQty <= batch.remainingQuantity
│   ├── For prescription items: qty <= prescription.allowedQuantity
│   └── Reserve quantity (temporary hold)
│
└── Pricing Calculation:
    ├── Load item.sellingPrice (MRP)
    ├── Apply customer-specific discount (if any)
    ├── Apply promotional discount (if active)
    ├── Calculate line tax: (price - discount) * taxRate
    └── Display line total
```

#### 2.2.3 Discount & Tax Handling

```
Step 3: APPLY DISCOUNTS & CALCULATE TAX
│
├── Item-Level Discount:
│   ├── Percentage discount (e.g., 10% off)
│   ├── Fixed amount discount (e.g., $5 off)
│   └── Validation: discount <= item.maxDiscountAllowed
│
├── Order-Level Discount:
│   ├── Coupon code validation
│   ├── Loyalty points redemption
│   └── Senior citizen / staff discount
│
├── Tax Calculation:
│   │
│   │  For each item:
│   │    taxableAmount = (unitPrice * qty) - discountAmount
│   │    taxAmount = taxableAmount * (taxRate / 100)
│   │
│   ├── Tax-exempt items (marked in master data)
│   ├── Insurance-covered items (tax varies by region)
│   └── Tax breakdown by rate (e.g., 5%, 12%, 18%)
│
└── Order Summary:
    ├── Subtotal (before tax & discount)
    ├── Total Discount
    ├── Total Tax
    └── Grand Total
```

#### 2.2.4 Payment Processing

```
Step 4: COLLECT PAYMENT
│
├── Payment Methods Supported:
│   ├── CASH
│   │   ├── Enter amount received
│   │   └── Calculate change due
│   │
│   ├── CARD (Credit/Debit)
│   │   ├── Integrate with payment gateway
│   │   ├── Capture authorization code
│   │   └── Store last 4 digits reference
│   │
│   ├── INSURANCE
│   │   ├── Select insurance provider
│   │   ├── Enter policy/claim number
│   │   ├── Validate coverage amount
│   │   ├── Calculate patient co-pay
│   │   └── Create insurance claim record
│   │
│   └── SPLIT PAYMENT
│       ├── Insurance covers X amount
│       ├── Patient pays remainder via cash/card
│       └── Record multiple payment entries
│
├── Payment Validation:
│   ├── totalPayments >= grandTotal
│   └── All payment methods processed successfully
│
└── Payment Status:
    ├── PAID - Full payment received
    ├── PARTIAL - Partial payment (credit sale)
    └── PENDING - Payment promised (rare)
```

#### 2.2.5 Stock Deduction & Invoice Generation

```
Step 5: FINALIZE SALE
│
├── Transaction Commit:
│   │
│   │  BEGIN TRANSACTION
│   │  
│   │  1. Create inventorySales record
│   │  2. Create inventorySaleItems for each line
│   │  3. For each sale item:
│   │     - Deduct from inventoryBatches.remainingQuantity
│   │     - Update inventoryItems.currentStock
│   │     - Create inventoryStockMovements record
│   │  4. Create payment records
│   │  5. If prescription: update dispensed quantity
│   │  6. Generate invoice number
│   │  
│   │  COMMIT TRANSACTION
│   │
│   └── On failure: ROLLBACK all changes
│
├── Invoice Generation:
│   ├── Generate unique invoice number (INV-YYYYMMDD-XXXX)
│   ├── Include clinic header/footer
│   ├── List all items with batch numbers
│   ├── Show tax breakdown
│   ├── Payment details
│   └── Prescription reference (if applicable)
│
├── Post-Sale Actions:
│   ├── Check for low stock alerts
│   ├── Update expiry alerts if batch depleted
│   ├── Trigger reorder notification if below minimum
│   └── Send receipt via email/SMS (optional)
│
└── Audit Trail:
    ├── Log sale creation with timestamp
    ├── Record user who processed sale
    └── Store original amounts (before any voids)
```

---

### 2.3 Data Entities

#### 2.3.1 Enhanced Sales Table (`inventory_sales`)

```typescript
// Extends existing inventorySales table
export const inventorySales = pgTable("inventory_sales", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  
  // Sale identification
  saleNumber: varchar("sale_number", { length: 100 }).notNull().unique(),
  invoiceNumber: varchar("invoice_number", { length: 100 }).unique(),
  
  // Customer info
  patientId: integer("patient_id"),
  customerName: varchar("customer_name", { length: 200 }), // For walk-ins
  customerPhone: varchar("customer_phone", { length: 20 }),
  
  // Sale type
  saleType: varchar("sale_type", { length: 20 }).notNull().default("walk_in"), 
  // Values: prescription, walk_in, otc
  prescriptionId: integer("prescription_id"),
  
  // Financials
  subtotalAmount: decimal("subtotal_amount", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  discountType: varchar("discount_type", { length: 20 }), // percentage, fixed, coupon
  discountReason: varchar("discount_reason", { length: 200 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  
  // Payment tracking
  paymentMethod: varchar("payment_method", { length: 50 }).default("cash"),
  // Values: cash, card, insurance, split, credit
  paymentStatus: varchar("payment_status", { length: 20 }).default("paid"),
  // Values: paid, partial, pending, refunded
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0.00"),
  amountDue: decimal("amount_due", { precision: 12, scale: 2 }).default("0.00"),
  changeGiven: decimal("change_given", { precision: 10, scale: 2 }).default("0.00"),
  
  // Insurance
  insuranceProviderId: integer("insurance_provider_id"),
  insuranceClaimNumber: varchar("insurance_claim_number", { length: 100 }),
  insuranceAmount: decimal("insurance_amount", { precision: 12, scale: 2 }),
  copayAmount: decimal("copay_amount", { precision: 10, scale: 2 }),
  
  // Status
  status: varchar("status", { length: 20 }).default("completed"),
  // Values: draft, completed, voided, returned
  voidedAt: timestamp("voided_at"),
  voidedBy: integer("voided_by"),
  voidReason: varchar("void_reason", { length: 500 }),
  
  // Metadata
  notes: text("notes"),
  soldBy: integer("sold_by").notNull(),
  saleDate: timestamp("sale_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### 2.3.2 Enhanced Sale Items (`inventory_sale_items`)

```typescript
export const inventorySaleItems = pgTable("inventory_sale_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  saleId: integer("sale_id").notNull(),
  itemId: integer("item_id").notNull(),
  
  // Batch tracking (FEFO)
  batchId: integer("batch_id").notNull(),
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  
  // Quantities
  quantity: integer("quantity").notNull(),
  returnedQuantity: integer("returned_quantity").default(0),
  
  // Pricing
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(), // MRP
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(), // Purchase price
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  
  // Prescription reference
  prescriptionItemId: integer("prescription_item_id"),
  
  // Status
  status: varchar("status", { length: 20 }).default("sold"),
  // Values: sold, returned, partially_returned
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### 2.3.3 Sales Payments Table (NEW)

```typescript
export const inventorySalePayments = pgTable("inventory_sale_payments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  saleId: integer("sale_id").notNull(),
  
  // Payment details
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  // Values: cash, card_credit, card_debit, insurance, upi, bank_transfer
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  
  // Card payment details
  cardLast4: varchar("card_last_4", { length: 4 }),
  cardType: varchar("card_type", { length: 20 }), // visa, mastercard, amex
  authorizationCode: varchar("authorization_code", { length: 50 }),
  transactionReference: varchar("transaction_reference", { length: 100 }),
  
  // Insurance payment details
  insuranceProviderId: integer("insurance_provider_id"),
  claimNumber: varchar("claim_number", { length: 100 }),
  claimStatus: varchar("claim_status", { length: 20 }), 
  // Values: submitted, approved, rejected, pending
  
  // Status
  status: varchar("status", { length: 20 }).default("completed"),
  // Values: completed, pending, failed, refunded
  
  processedBy: integer("processed_by").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### 2.3.4 Tax Configuration Table (NEW)

```typescript
export const inventoryTaxRates = pgTable("inventory_tax_rates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  
  name: varchar("name", { length: 100 }).notNull(), // e.g., "GST 5%", "VAT 20%"
  code: varchar("code", { length: 20 }).notNull(), // e.g., "GST5", "VAT20"
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(), // 5.00, 20.00
  
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  
  // Applicability
  appliesTo: varchar("applies_to", { length: 50 }).default("all"),
  // Values: all, medications, supplies, services
  
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### 2.3.5 Insurance Providers Table (NEW)

```typescript
export const insuranceProviders = pgTable("insurance_providers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  
  name: varchar("name", { length: 200 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  
  contactPerson: varchar("contact_person", { length: 200 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 200 }),
  address: text("address"),
  
  // Billing
  defaultCoveragePercent: decimal("default_coverage_percent", { precision: 5, scale: 2 }).default("80.00"),
  maxCoverageAmount: decimal("max_coverage_amount", { precision: 12, scale: 2 }),
  
  // Integration
  apiEndpoint: varchar("api_endpoint", { length: 500 }),
  apiKey: varchar("api_key", { length: 500 }),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

---

### 2.4 Validation Rules & Business Logic

#### 2.4.1 Pre-Sale Validations

| Rule ID | Rule Name | Validation Logic | Error Message |
|---------|-----------|------------------|---------------|
| SALE-V001 | Prescription Status | `prescription.status == 'active'` | "Prescription is not active or has been cancelled" |
| SALE-V002 | Prescription Expiry | `prescription.expiryDate > today` | "Prescription has expired" |
| SALE-V003 | Dispense Limit | `dispensedQty + requestedQty <= prescribedQty` | "Cannot dispense more than prescribed quantity" |
| SALE-V004 | Controlled Substance | If controlled drug, require `prescription.controlledDrugAuth == true` | "Controlled substance requires proper authorization" |
| SALE-V005 | Patient Allergy | Check `patient.allergies` against `item.ingredients` | "Warning: Patient has allergy to [ingredient]" |

#### 2.4.2 Batch Validations (FEFO)

| Rule ID | Rule Name | Validation Logic | Error Message |
|---------|-----------|------------------|---------------|
| BATCH-V001 | Batch Active | `batch.status == 'active'` | "Selected batch is not active" |
| BATCH-V002 | Not Expired | `batch.isExpired == false && batch.expiryDate > today` | "Cannot sell from expired batch" |
| BATCH-V003 | Sufficient Quantity | `batch.remainingQuantity >= requestedQty` | "Insufficient quantity in batch [batchNumber]" |
| BATCH-V004 | Expiry Warning | If `batch.expiryDate < today + 30 days` | "Warning: Batch expires in [X] days" |
| BATCH-V005 | FEFO Enforcement | Auto-select earliest expiry batch | System auto-selects, logs override if manual |

#### 2.4.3 Pricing Validations

| Rule ID | Rule Name | Validation Logic | Error Message |
|---------|-----------|------------------|---------------|
| PRICE-V001 | Max Discount | `discountPercent <= item.maxDiscountAllowed` | "Discount exceeds maximum allowed [X]%" |
| PRICE-V002 | Price Override Auth | If `unitPrice != item.sellingPrice`, require admin role | "Price override requires admin authorization" |
| PRICE-V003 | Below Cost Alert | If `unitPrice < item.purchasePrice` | "Warning: Selling below cost price" |
| PRICE-V004 | Tax Configuration | `taxRate` must exist for item category | "Tax configuration not found for category" |

#### 2.4.4 Payment Validations

| Rule ID | Rule Name | Validation Logic | Error Message |
|---------|-----------|------------------|---------------|
| PAY-V001 | Sufficient Payment | `sum(payments) >= grandTotal` | "Payment amount is less than total due" |
| PAY-V002 | Insurance Coverage | `insuranceAmount <= patient.insuranceCoverage.remaining` | "Insurance coverage limit exceeded" |
| PAY-V003 | Card Authorization | For card payments, `authorizationCode` must be received | "Card payment authorization failed" |
| PAY-V004 | Split Payment Balance | For split, `sum(allPaymentMethods) == grandTotal` | "Split payment amounts do not balance" |

#### 2.4.5 Business Logic: FEFO Algorithm

```typescript
/**
 * FEFO (First Expiry First Out) Batch Selection Algorithm
 * 
 * Purpose: Automatically select batches with earliest expiry dates
 *          to minimize wastage from expired stock
 */
function selectBatchesFEFO(
  itemId: number, 
  requiredQuantity: number, 
  organizationId: number
): BatchAllocation[] {
  
  // Step 1: Get all eligible batches sorted by expiry
  const eligibleBatches = await db
    .select()
    .from(inventoryBatches)
    .where(and(
      eq(inventoryBatches.itemId, itemId),
      eq(inventoryBatches.organizationId, organizationId),
      eq(inventoryBatches.status, 'active'),
      eq(inventoryBatches.isExpired, false),
      gt(inventoryBatches.remainingQuantity, 0),
      gt(inventoryBatches.expiryDate, new Date())
    ))
    .orderBy(asc(inventoryBatches.expiryDate)); // FEFO order
  
  // Step 2: Allocate from earliest expiry first
  const allocations: BatchAllocation[] = [];
  let remainingQty = requiredQuantity;
  
  for (const batch of eligibleBatches) {
    if (remainingQty <= 0) break;
    
    const allocateQty = Math.min(remainingQty, batch.remainingQuantity);
    
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: allocateQty,
      unitCost: batch.purchasePrice
    });
    
    remainingQty -= allocateQty;
  }
  
  // Step 3: Check if fully allocated
  if (remainingQty > 0) {
    throw new InsufficientStockError(
      `Insufficient stock. Short by ${remainingQty} units.`
    );
  }
  
  return allocations;
}
```

---

### 2.5 Stock Impact Analysis

#### 2.5.1 Sale Creation Stock Flow

```
SALE CREATION
│
├── RESERVATION PHASE (Draft)
│   ├── Action: Temporary hold on batch quantities
│   ├── inventoryBatches.remainingQuantity: NO CHANGE (reserved in memory)
│   ├── inventoryItems.currentStock: NO CHANGE
│   └── inventoryStockMovements: NO ENTRY (draft state)
│
├── COMMIT PHASE (Finalize)
│   │
│   ├── inventoryBatches (for each batch used):
│   │   └── remainingQuantity = remainingQuantity - soldQuantity
│   │
│   ├── inventoryItems:
│   │   └── currentStock = currentStock - totalSoldQuantity
│   │
│   ├── inventoryStockMovements:
│   │   └── INSERT {
│   │         movementType: 'sale',
│   │         quantity: -soldQuantity (negative),
│   │         previousStock: oldStock,
│   │         newStock: oldStock - soldQuantity,
│   │         referenceType: 'sale',
│   │         referenceId: saleId
│   │       }
│   │
│   └── inventoryStockAlerts:
│       └── IF newStock <= minimumStock:
│           INSERT low_stock alert
│
└── POST-COMMIT CHECKS
    ├── Check if batch depleted (remainingQuantity == 0)
    │   └── Update batch.status = 'depleted'
    ├── Check expiry exposure
    └── Trigger reorder if below reorderPoint
```

#### 2.5.2 Stock Movement Record Example

```json
{
  "id": 1234,
  "organizationId": 3,
  "itemId": 45,
  "batchId": 89,
  "movementType": "sale",
  "quantity": -10,
  "previousStock": 150,
  "newStock": 140,
  "unitCost": "5.50",
  "referenceType": "sale",
  "referenceId": 567,
  "notes": "Sale INV-20251204-0023",
  "createdBy": 12,
  "createdAt": "2025-12-04T10:30:00Z"
}
```

---

### 2.6 Error Handling

#### 2.6.1 Error Categories & Responses

| Error Code | Category | Scenario | User Message | System Action |
|------------|----------|----------|--------------|---------------|
| `SALE_ERR_001` | Stock | Insufficient stock in all batches | "Insufficient stock for [Item]. Available: [X], Requested: [Y]" | Block sale, suggest alternatives |
| `SALE_ERR_002` | Stock | All batches expired | "No unexpired stock available for [Item]" | Block sale |
| `SALE_ERR_003` | Prescription | Prescription not found | "Prescription [ID] not found or not accessible" | Request valid prescription |
| `SALE_ERR_004` | Prescription | Prescription expired | "Prescription expired on [Date]. Please obtain new prescription." | Block prescription items |
| `SALE_ERR_005` | Payment | Card declined | "Card payment declined. Please try another payment method." | Allow retry, don't commit sale |
| `SALE_ERR_006` | Payment | Insurance claim rejected | "Insurance claim rejected: [Reason]. Patient pays full amount." | Switch to cash/card |
| `SALE_ERR_007` | System | Database transaction failure | "Sale could not be processed. Please try again." | Full rollback, log error |
| `SALE_ERR_008` | Concurrency | Batch sold by another user | "Stock updated. Please refresh and try again." | Refresh batch data |
| `SALE_ERR_009` | Authorization | Discount exceeds limit | "Discount of [X]% exceeds your authorization limit." | Request admin override |
| `SALE_ERR_010` | Controlled | Missing controlled drug auth | "This medication requires controlled substance authorization." | Block until authorized |

#### 2.6.2 Transaction Rollback Strategy

```typescript
async function processSale(saleData: CreateSaleDTO): Promise<Sale> {
  return await db.transaction(async (tx) => {
    try {
      // 1. Create sale header
      const sale = await tx.insert(inventorySales).values(saleHeader).returning();
      
      // 2. Create sale items and deduct stock
      for (const item of saleData.items) {
        // Get FEFO batches
        const allocations = await selectBatchesFEFO(item.itemId, item.quantity, saleData.organizationId);
        
        for (const alloc of allocations) {
          // Create sale item
          await tx.insert(inventorySaleItems).values({
            saleId: sale[0].id,
            itemId: item.itemId,
            batchId: alloc.batchId,
            quantity: alloc.quantity,
            // ... other fields
          });
          
          // Deduct from batch
          await tx.update(inventoryBatches)
            .set({ 
              remainingQuantity: sql`remaining_quantity - ${alloc.quantity}` 
            })
            .where(eq(inventoryBatches.id, alloc.batchId));
          
          // Update item stock
          await tx.update(inventoryItems)
            .set({ 
              currentStock: sql`current_stock - ${alloc.quantity}` 
            })
            .where(eq(inventoryItems.id, item.itemId));
          
          // Record movement
          await tx.insert(inventoryStockMovements).values({
            itemId: item.itemId,
            batchId: alloc.batchId,
            movementType: 'sale',
            quantity: -alloc.quantity,
            // ... other fields
          });
        }
      }
      
      // 3. Create payment records
      for (const payment of saleData.payments) {
        await tx.insert(inventorySalePayments).values({
          saleId: sale[0].id,
          ...payment
        });
      }
      
      return sale[0];
      
    } catch (error) {
      // Transaction automatically rolls back on throw
      throw error;
    }
  });
}
```

---

### 2.7 Reports

#### 2.7.1 Daily Sales Register

| Report Field | Source | Aggregation |
|--------------|--------|-------------|
| Date | inventorySales.saleDate | Group by date |
| Total Sales Count | inventorySales.id | COUNT |
| Gross Sales | inventorySales.subtotalAmount | SUM |
| Total Discounts | inventorySales.discountAmount | SUM |
| Total Tax | inventorySales.taxAmount | SUM |
| Net Sales | inventorySales.totalAmount | SUM |
| Cash Received | inventorySalePayments (method=cash) | SUM |
| Card Received | inventorySalePayments (method=card) | SUM |
| Insurance Billed | inventorySalePayments (method=insurance) | SUM |

#### 2.7.2 Batch Consumption Report

```sql
SELECT 
  i.name AS item_name,
  b.batch_number,
  b.expiry_date,
  b.quantity AS initial_quantity,
  b.remaining_quantity,
  (b.quantity - b.remaining_quantity) AS consumed,
  ROUND(((b.quantity - b.remaining_quantity)::decimal / b.quantity) * 100, 2) AS consumption_rate
FROM inventory_batches b
JOIN inventory_items i ON b.item_id = i.id
WHERE b.organization_id = :orgId
  AND b.status = 'active'
ORDER BY b.expiry_date ASC;
```

#### 2.7.3 Expiry Exposure Report

| Report Purpose | Identifies batches at risk of expiring unsold |
|----------------|-----------------------------------------------|
| **Filters** | Expiry within next 30/60/90 days |
| **Fields** | Item, Batch, Expiry Date, Remaining Qty, Value at Risk |
| **Action** | Prioritize for FEFO, consider discounts/returns |

#### 2.7.4 Sales by Payment Method

```sql
SELECT 
  sp.payment_method,
  COUNT(*) AS transaction_count,
  SUM(sp.amount) AS total_amount,
  ROUND(SUM(sp.amount) / (SELECT SUM(amount) FROM inventory_sale_payments WHERE organization_id = :orgId) * 100, 2) AS percentage
FROM inventory_sale_payments sp
WHERE sp.organization_id = :orgId
  AND sp.processed_at BETWEEN :startDate AND :endDate
GROUP BY sp.payment_method
ORDER BY total_amount DESC;
```

#### 2.7.5 Discount & Margin Analysis

| Metric | Calculation |
|--------|-------------|
| Gross Profit | (Selling Price - Cost Price) * Quantity Sold |
| Gross Margin % | (Gross Profit / Revenue) * 100 |
| Discount Impact | Total Discounts Given / Gross Sales * 100 |
| Net Margin | (Revenue - Cost - Discounts) / Revenue * 100 |

---

## 3. Module 5: Returns Management

### 3.1 Overview

The Returns Management module handles all return scenarios:

| Return Type | Description | Stock Impact |
|-------------|-------------|--------------|
| **Customer Return (Sales Return)** | Patient returns purchased items | Stock increases (if accepted) |
| **Supplier Return (Purchase Return)** | Return damaged/expired goods to supplier | Stock decreases |

#### Key Features
- Full and partial returns support
- Batch and expiry validation
- Quality inspection workflow
- Approval hierarchy (pharmacist -> supervisor)
- Refund, credit note, or replacement options
- Complete audit trail

---

### 3.2 Complete Workflow Steps

#### 3.2.1 Customer Return (Sales Return) Workflow

```
Step 1: INITIATE RETURN
│
├── Locate Original Sale:
│   ├── Enter Invoice/Sale Number
│   ├── Scan invoice barcode
│   └── Search by patient name/phone
│
├── Validate Return Window:
│   ├── Check: saleDate + returnWindowDays >= today
│   └── If expired: Reject or escalate to manager
│
└── Load Sale Details:
    ├── Display all sold items
    ├── Show quantities and batches
    └── Highlight non-returnable items (if any)

Step 2: SELECT ITEMS TO RETURN
│
├── For each item:
│   ├── Enter return quantity (max = sold quantity - already returned)
│   ├── Select return reason:
│   │   ├── Wrong medication dispensed
│   │   ├── Patient reaction/side effects
│   │   ├── Medication recalled
│   │   ├── Expired at time of sale
│   │   ├── Damaged packaging
│   │   ├── Patient deceased
│   │   └── Other (require notes)
│   │
│   ├── Batch Matching:
│   │   ├── Verify returned batch matches sold batch
│   │   └── If mismatch: Flag for investigation
│   │
│   └── Condition Assessment:
│       ├── Unopened/Sealed: Eligible for restocking
│       ├── Opened but intact: May restock (per policy)
│       ├── Damaged/Tampered: Quarantine or dispose
│       └── Temperature-sensitive spoiled: Dispose
│
└── Calculate Refund Amount:
    ├── unitPrice * returnQty
    ├── Proportional discount reversal
    ├── Tax reversal
    └── Restocking fee (if applicable)

Step 3: QUALITY INSPECTION
│
├── Pharmacist Visual Inspection:
│   ├── Check seal integrity
│   ├── Verify batch number on package
│   ├── Check expiry date
│   └── Inspect for damage/tampering
│
├── Inspection Result:
│   ├── PASS: Eligible for restock
│   ├── FAIL_QUARANTINE: Hold for further review
│   └── FAIL_DISPOSE: Mark for disposal
│
└── Controlled Substance Check:
    ├── If controlled: Require supervisor witness
    └── Log chain of custody

Step 4: APPROVAL WORKFLOW
│
├── Auto-Approve Conditions:
│   ├── Return amount <= $50 (configurable)
│   ├── Within 24 hours of sale
│   └── Unopened, undamaged
│
├── Require Supervisor Approval:
│   ├── Return amount > threshold
│   ├── Controlled substances
│   ├── Opened packages
│   └── Outside standard return window
│
└── Approval Actions:
    ├── APPROVED: Proceed to refund
    ├── REJECTED: Provide reason, end process
    └── PARTIAL: Approve subset of items

Step 5: REFUND PROCESSING
│
├── Refund Methods:
│   │
│   ├── CASH REFUND:
│   │   ├── Open cash drawer
│   │   ├── Count out refund amount
│   │   └── Customer signs receipt
│   │
│   ├── CARD REFUND:
│   │   ├── Process reversal through gateway
│   │   ├── Same card as original payment required
│   │   └── May take 5-7 business days
│   │
│   ├── STORE CREDIT:
│   │   ├── Issue credit note
│   │   ├── Record credit note number
│   │   └── Set expiry (e.g., 1 year)
│   │
│   └── REPLACEMENT:
│       ├── No monetary refund
│       ├── Issue equivalent or alternative product
│       └── Process as new sale + return
│
└── Insurance Adjustment:
    ├── If original paid by insurance:
    │   ├── Reverse insurance claim
    │   ├── Refund patient copay only
    │   └── Notify insurance provider
    └── Track adjustment separately

Step 6: STOCK ADJUSTMENT
│
├── For Restockable Items:
│   │
│   │  BEGIN TRANSACTION
│   │
│   ├── inventoryBatches:
│   │   └── remainingQuantity += returnedQuantity
│   │
│   ├── inventoryItems:
│   │   └── currentStock += returnedQuantity
│   │
│   ├── inventoryStockMovements:
│   │   └── INSERT {
│   │         movementType: 'return',
│   │         quantity: +returnedQuantity (positive),
│   │         referenceType: 'sales_return',
│   │         referenceId: returnId
│   │       }
│   │
│   │  COMMIT
│   │
│   └── Update return record status = 'completed'
│
├── For Non-Restockable Items:
│   ├── DO NOT add back to inventory
│   ├── Record in disposal log
│   └── Update loss/wastage records
│
└── Update Original Sale:
    ├── inventorySaleItems.returnedQuantity += qty
    ├── If fully returned: saleItem.status = 'returned'
    └── If partial: saleItem.status = 'partially_returned'

Step 7: DOCUMENTATION
│
├── Generate Return Receipt:
│   ├── Return number
│   ├── Original invoice reference
│   ├── Items returned with quantities
│   ├── Refund amount and method
│   └── Customer acknowledgment
│
├── Update Records:
│   ├── Link return to original sale
│   ├── Record all approvals
│   └── Store inspection notes
│
└── Audit Trail:
    ├── Who initiated return
    ├── Who approved (if required)
    ├── Who processed refund
    └── Timestamps for each step
```

#### 3.2.2 Supplier Return (Purchase Return) Workflow

```
Step 1: INITIATE SUPPLIER RETURN
│
├── Create Return Request:
│   ├── Select supplier
│   ├── Select purchase order or GRN (Goods Received Note)
│   └── Enter return reason:
│       ├── Damaged on arrival
│       ├── Wrong items received
│       ├── Short expiry received
│       ├── Quality defect discovered
│       ├── Product recall
│       └── Overstock return (if agreed)
│
└── Select Items to Return:
    ├── From received goods list
    ├── Enter return quantity
    ├── Specify batch numbers
    └── Attach photos if damaged

Step 2: SUPPLIER COMMUNICATION
│
├── Generate Return Material Authorization (RMA):
│   ├── Create RMA number
│   └── Send to supplier for approval
│
├── Await Supplier Response:
│   ├── APPROVED: Proceed with return
│   ├── REJECTED: Close request or escalate
│   └── PARTIAL: Return approved subset
│
└── Record Supplier RMA Number (if provided)

Step 3: STOCK ADJUSTMENT (Pre-Ship)
│
├── Move to Return Staging:
│   │
│   │  inventoryBatches.remainingQuantity -= returnQuantity
│   │  inventoryItems.currentStock -= returnQuantity
│   │
│   │  inventoryStockMovements:
│   │    movementType: 'purchase_return'
│   │    quantity: -returnQuantity
│   │
│   └── Status: 'in_transit_return'
│
└── Physical Segregation:
    ├── Move items to return area
    └── Label with RMA number

Step 4: SHIP TO SUPPLIER
│
├── Prepare Shipment:
│   ├── Pack items securely
│   ├── Include return documentation
│   └── Arrange pickup or drop-off
│
├── Record Shipping:
│   ├── Carrier name
│   ├── Tracking number
│   └── Ship date
│
└── Update Status: 'shipped_to_supplier'

Step 5: FINANCIAL SETTLEMENT
│
├── Settlement Options:
│   │
│   ├── CREDIT NOTE:
│   │   ├── Supplier issues credit
│   │   ├── Apply to future purchases
│   │   └── Record in AP ledger
│   │
│   ├── REFUND:
│   │   ├── Supplier refunds amount
│   │   └── Record payment receipt
│   │
│   └── REPLACEMENT:
│       ├── Supplier sends replacement
│       ├── Process as new purchase
│       └── Link to return record
│
├── Await Supplier Confirmation:
│   ├── Goods received acknowledgment
│   └── Credit/refund confirmation
│
└── Close Return:
    ├── Update status: 'completed'
    ├── Record settlement details
    └── Link credit note/payment
```

---

### 3.3 Data Entities

#### 3.3.1 Returns Master Table (NEW)

```typescript
export const inventoryReturns = pgTable("inventory_returns", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  
  // Return identification
  returnNumber: varchar("return_number", { length: 100 }).notNull().unique(),
  returnType: varchar("return_type", { length: 20 }).notNull(),
  // Values: sales_return, purchase_return
  
  // Original reference
  originalSaleId: integer("original_sale_id"), // For sales returns
  originalPurchaseOrderId: integer("original_purchase_order_id"), // For purchase returns
  originalInvoiceNumber: varchar("original_invoice_number", { length: 100 }),
  
  // For sales returns - customer info
  patientId: integer("patient_id"),
  customerName: varchar("customer_name", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  
  // For purchase returns - supplier info
  supplierId: integer("supplier_id"),
  supplierRmaNumber: varchar("supplier_rma_number", { length: 100 }),
  
  // Financials
  subtotalAmount: decimal("subtotal_amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  restockingFee: decimal("restocking_fee", { precision: 10, scale: 2 }).default("0.00"),
  netRefundAmount: decimal("net_refund_amount", { precision: 12, scale: 2 }).notNull(),
  
  // Refund/Settlement
  settlementType: varchar("settlement_type", { length: 20 }),
  // Values: cash_refund, card_refund, store_credit, replacement, supplier_credit
  creditNoteNumber: varchar("credit_note_number", { length: 100 }),
  creditNoteAmount: decimal("credit_note_amount", { precision: 12, scale: 2 }),
  refundTransactionId: varchar("refund_transaction_id", { length: 100 }),
  
  // Reason and notes
  returnReason: varchar("return_reason", { length: 100 }).notNull(),
  returnReasonDetails: text("return_reason_details"),
  internalNotes: text("internal_notes"),
  
  // Status workflow
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  // Values: pending, pending_approval, approved, rejected, 
  //         processing, shipped, completed, cancelled
  
  // Approval workflow
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  rejectedBy: integer("rejected_by"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  
  // Tracking (for supplier returns)
  shippedAt: timestamp("shipped_at"),
  shippedBy: integer("shipped_by"),
  carrierName: varchar("carrier_name", { length: 100 }),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  receivedBySupplierAt: timestamp("received_by_supplier_at"),
  
  // Metadata
  initiatedBy: integer("initiated_by").notNull(),
  processedBy: integer("processed_by"),
  returnDate: timestamp("return_date").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### 3.3.2 Return Items Table (NEW)

```typescript
export const inventoryReturnItems = pgTable("inventory_return_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  returnId: integer("return_id").notNull(),
  
  // Item reference
  itemId: integer("item_id").notNull(),
  originalSaleItemId: integer("original_sale_item_id"), // For sales returns
  originalPurchaseOrderItemId: integer("original_po_item_id"), // For purchase returns
  
  // Batch info
  batchId: integer("batch_id").notNull(),
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  
  // Quantities
  returnedQuantity: integer("returned_quantity").notNull(),
  acceptedQuantity: integer("accepted_quantity").default(0),
  rejectedQuantity: integer("rejected_quantity").default(0),
  
  // Pricing (at time of original transaction)
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  
  // Condition and inspection
  conditionOnReturn: varchar("condition_on_return", { length: 30 }),
  // Values: sealed, opened_intact, damaged, expired, spoiled
  isRestockable: boolean("is_restockable").default(false),
  inspectionNotes: text("inspection_notes"),
  inspectedBy: integer("inspected_by"),
  inspectedAt: timestamp("inspected_at"),
  
  // Disposition
  disposition: varchar("disposition", { length: 30 }),
  // Values: restock, quarantine, dispose, return_to_supplier
  dispositionNotes: text("disposition_notes"),
  
  // Status
  status: varchar("status", { length: 20 }).default("pending"),
  // Values: pending, inspected, accepted, rejected, restocked, disposed
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### 3.3.3 Return Approvals Table (NEW)

```typescript
export const inventoryReturnApprovals = pgTable("inventory_return_approvals", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  returnId: integer("return_id").notNull(),
  
  // Approval step
  approvalLevel: integer("approval_level").notNull().default(1),
  // Level 1: Pharmacist, Level 2: Supervisor, Level 3: Admin
  
  approverRole: varchar("approver_role", { length: 50 }).notNull(),
  approverId: integer("approver_id"),
  
  // Decision
  decision: varchar("decision", { length: 20 }),
  // Values: pending, approved, rejected, escalated
  decisionNotes: text("decision_notes"),
  decisionAt: timestamp("decision_at"),
  
  // Escalation
  escalatedTo: integer("escalated_to"),
  escalationReason: text("escalation_reason"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### 3.3.4 Stock Adjustments Table (NEW)

```typescript
export const inventoryStockAdjustments = pgTable("inventory_stock_adjustments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  
  // Adjustment identification
  adjustmentNumber: varchar("adjustment_number", { length: 100 }).notNull().unique(),
  adjustmentType: varchar("adjustment_type", { length: 30 }).notNull(),
  // Values: return_restock, damage_writeoff, expiry_writeoff, 
  //         cycle_count, transfer_in, transfer_out, opening_stock
  
  // Reference
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: integer("reference_id"),
  
  // Item details
  itemId: integer("item_id").notNull(),
  batchId: integer("batch_id"),
  
  // Quantities
  previousQuantity: integer("previous_quantity").notNull(),
  adjustmentQuantity: integer("adjustment_quantity").notNull(), // +/- value
  newQuantity: integer("new_quantity").notNull(),
  
  // Cost impact
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalCostImpact: decimal("total_cost_impact", { precision: 12, scale: 2 }),
  
  // Reason
  reason: varchar("reason", { length: 200 }).notNull(),
  notes: text("notes"),
  
  // Approval
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  
  // Metadata
  adjustedBy: integer("adjusted_by").notNull(),
  adjustmentDate: timestamp("adjustment_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### 3.3.5 Credit Notes Table (NEW)

```typescript
export const inventoryCreditNotes = pgTable("inventory_credit_notes", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  
  // Credit note identification
  creditNoteNumber: varchar("credit_note_number", { length: 100 }).notNull().unique(),
  creditNoteType: varchar("credit_note_type", { length: 30 }).notNull(),
  // Values: customer_credit, supplier_credit
  
  // Reference
  returnId: integer("return_id"),
  originalInvoiceNumber: varchar("original_invoice_number", { length: 100 }),
  
  // Recipient
  patientId: integer("patient_id"), // For customer credits
  supplierId: integer("supplier_id"), // For supplier credits
  recipientName: varchar("recipient_name", { length: 200 }),
  
  // Amounts
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }).notNull(),
  usedAmount: decimal("used_amount", { precision: 12, scale: 2 }).default("0.00"),
  remainingAmount: decimal("remaining_amount", { precision: 12, scale: 2 }).notNull(),
  
  // Validity
  issueDate: timestamp("issue_date").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date"),
  
  // Status
  status: varchar("status", { length: 20 }).default("active"),
  // Values: active, partially_used, fully_used, expired, cancelled
  
  // Metadata
  issuedBy: integer("issued_by").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

---

### 3.4 Validation Rules & Business Logic

#### 3.4.1 Sales Return Validations

| Rule ID | Rule Name | Validation Logic | Error Message |
|---------|-----------|------------------|---------------|
| RET-V001 | Sale Exists | `sale.id exists AND sale.status == 'completed'` | "Original sale not found or not eligible for return" |
| RET-V002 | Return Window | `sale.saleDate + returnWindowDays >= today` | "Return period of [X] days has expired" |
| RET-V003 | Not Already Returned | `saleItem.returnedQuantity < saleItem.quantity` | "Item has already been fully returned" |
| RET-V004 | Batch Match | `returnedBatch == soldBatch` | "Batch number does not match original sale" |
| RET-V005 | Quantity Limit | `returnQty <= (soldQty - alreadyReturnedQty)` | "Cannot return more than purchased quantity" |
| RET-V006 | Non-Returnable Check | `item.isReturnable == true` | "This item is marked as non-returnable" |
| RET-V007 | Controlled Substance | If controlled, require supervisor | "Controlled substance returns require supervisor approval" |

#### 3.4.2 Purchase Return Validations

| Rule ID | Rule Name | Validation Logic | Error Message |
|---------|-----------|------------------|---------------|
| PRET-V001 | PO Exists | `purchaseOrder.id exists AND status == 'received'` | "Purchase order not found or not received yet" |
| PRET-V002 | Within Return Policy | Check supplier return terms | "Return period with supplier has expired" |
| PRET-V003 | Quantity Available | `returnQty <= (receivedQty - previouslyReturnedQty)` | "Cannot return more than received quantity" |
| PRET-V004 | Batch In Stock | `batch.remainingQuantity >= returnQty` | "Insufficient stock in batch to return" |
| PRET-V005 | RMA Required | If `supplier.requiresRMA == true` | "Supplier RMA number required for returns" |

#### 3.4.3 Approval Rules

| Condition | Approval Level | Auto-Approve |
|-----------|---------------|--------------|
| Return amount <= $50 | None (Auto) | Yes |
| Return amount $50-$200 | Pharmacist | No |
| Return amount > $200 | Supervisor | No |
| Controlled substance | Supervisor + Documentation | No |
| Opened package | Pharmacist | No |
| Beyond return window | Manager | No |
| Damaged merchandise | Pharmacist (with photos) | No |

#### 3.4.4 Restocking Decision Logic

```typescript
function determineRestockability(returnItem: ReturnItem): RestockDecision {
  // Rule 1: Check expiry
  if (returnItem.expiryDate && returnItem.expiryDate < addDays(new Date(), 30)) {
    return { restock: false, reason: 'Too close to expiry', disposition: 'dispose' };
  }
  
  // Rule 2: Check condition
  if (returnItem.conditionOnReturn === 'damaged' || 
      returnItem.conditionOnReturn === 'spoiled') {
    return { restock: false, reason: 'Damaged or spoiled', disposition: 'dispose' };
  }
  
  // Rule 3: Check if opened
  if (returnItem.conditionOnReturn === 'opened_intact') {
    // Check item category policy
    if (returnItem.item.category === 'medication') {
      return { restock: false, reason: 'Opened medication', disposition: 'dispose' };
    }
    // Medical supplies may be restocked if intact
    return { restock: true, reason: 'Opened but intact supply', disposition: 'restock' };
  }
  
  // Rule 4: Sealed items
  if (returnItem.conditionOnReturn === 'sealed') {
    return { restock: true, reason: 'Sealed and intact', disposition: 'restock' };
  }
  
  // Default: Quarantine for review
  return { restock: false, reason: 'Requires manual review', disposition: 'quarantine' };
}
```

---

### 3.5 Stock Impact Analysis

#### 3.5.1 Sales Return Stock Flow

```
CUSTOMER RETURN - STOCK FLOW
│
├── INITIATION (No stock change)
│   └── Return record created with status: 'pending'
│
├── INSPECTION PHASE
│   ├── For restockable items: Mark for restock
│   └── For non-restockable: Mark for disposal
│
├── APPROVAL PHASE (No stock change)
│   └── Wait for required approvals
│
├── APPROVED - RESTOCK
│   │
│   │  BEGIN TRANSACTION
│   │
│   ├── inventoryBatches:
│   │   └── remainingQuantity += acceptedQuantity
│   │
│   ├── inventoryItems:
│   │   └── currentStock += acceptedQuantity
│   │
│   ├── inventoryStockMovements:
│   │   └── INSERT {
│   │         movementType: 'return',
│   │         quantity: +acceptedQuantity (positive),
│   │         referenceType: 'sales_return',
│   │         referenceId: returnId,
│   │         notes: 'Customer return - restocked'
│   │       }
│   │
│   ├── inventorySaleItems (original):
│   │   └── returnedQuantity += acceptedQuantity
│   │
│   │  COMMIT
│   │
│   └── Stock alerts: Check if now above minimum
│
├── APPROVED - DISPOSE
│   │
│   ├── inventoryStockAdjustments:
│   │   └── INSERT {
│   │         adjustmentType: 'damage_writeoff',
│   │         adjustmentQuantity: 0 (no change),
│   │         reason: 'Return disposed - [condition]'
│   │       }
│   │
│   └── NO stock increase (item written off)
│
└── REJECTED
    └── NO stock change (item stays with customer)
```

#### 3.5.2 Supplier Return Stock Flow

```
SUPPLIER RETURN - STOCK FLOW
│
├── INITIATION
│   └── Return record created, items marked for return
│
├── PRE-SHIPMENT ADJUSTMENT
│   │
│   │  BEGIN TRANSACTION
│   │
│   ├── inventoryBatches:
│   │   └── remainingQuantity -= returnQuantity
│   │   └── status = 'pending_return' (or reduce if depleted)
│   │
│   ├── inventoryItems:
│   │   └── currentStock -= returnQuantity
│   │
│   ├── inventoryStockMovements:
│   │   └── INSERT {
│   │         movementType: 'purchase_return',
│   │         quantity: -returnQuantity (negative),
│   │         referenceType: 'purchase_return',
│   │         referenceId: returnId,
│   │         notes: 'Return to supplier - [reason]'
│   │       }
│   │
│   │  COMMIT
│   │
│   └── Physical: Move items to return staging area
│
├── SHIPMENT
│   └── Update tracking info, no stock change
│
├── SUPPLIER ACKNOWLEDGMENT
│   └── Update status: 'received_by_supplier'
│
└── SETTLEMENT
    ├── Credit note received: Record in AP
    ├── Refund received: Record payment
    └── Replacement: Process as new receipt
```

---

### 3.6 Error Handling

#### 3.6.1 Error Categories & Responses

| Error Code | Category | Scenario | User Message | System Action |
|------------|----------|----------|--------------|---------------|
| `RET_ERR_001` | Validation | Sale not found | "Cannot find sale with invoice [ID]" | Request valid invoice |
| `RET_ERR_002` | Validation | Return window expired | "Return period has ended. Contact manager for exceptions." | Offer escalation |
| `RET_ERR_003` | Validation | Item already returned | "This item was already returned on [Date]" | Show previous return |
| `RET_ERR_004` | Validation | Batch mismatch | "Batch [X] doesn't match original sale batch [Y]" | Request matching batch |
| `RET_ERR_005` | Approval | Awaiting approval | "Return pending approval by [Role]" | Notify approver |
| `RET_ERR_006` | Approval | Return rejected | "Return rejected: [Reason]" | End process, notify customer |
| `RET_ERR_007` | Refund | Card refund failed | "Card refund failed. Alternative method available." | Offer cash/credit |
| `RET_ERR_008` | Stock | Batch depleted | "Original batch no longer in system" | Allow with override |
| `RET_ERR_009` | Supplier | RMA not obtained | "Supplier RMA required. Contact supplier first." | Pause until RMA obtained |
| `RET_ERR_010` | System | Concurrency conflict | "Record was modified. Please refresh and retry." | Reload return data |

#### 3.6.2 Compensation/Rollback Scenarios

```typescript
async function processReturnWithCompensation(returnData: ProcessReturnDTO) {
  const compensationActions: CompensationAction[] = [];
  
  try {
    // Step 1: Update return status
    await updateReturnStatus(returnData.returnId, 'processing');
    compensationActions.push({
      action: 'rollback_status',
      params: { returnId: returnData.returnId, previousStatus: 'approved' }
    });
    
    // Step 2: Restock inventory (if applicable)
    for (const item of returnData.restockItems) {
      const previousQty = await getbatchQuantity(item.batchId);
      await restockBatch(item.batchId, item.quantity);
      compensationActions.push({
        action: 'deduct_stock',
        params: { batchId: item.batchId, quantity: item.quantity }
      });
    }
    
    // Step 3: Process refund
    const refundResult = await processRefund(returnData.refundDetails);
    if (!refundResult.success) {
      throw new RefundFailedError(refundResult.error);
    }
    compensationActions.push({
      action: 'reverse_refund',
      params: { transactionId: refundResult.transactionId }
    });
    
    // Step 4: Create credit note (if applicable)
    if (returnData.settlementType === 'store_credit') {
      await createCreditNote(returnData);
    }
    
    // Success - clear compensation stack
    return { success: true };
    
  } catch (error) {
    // Execute compensation in reverse order
    for (const compensation of compensationActions.reverse()) {
      await executeCompensation(compensation);
    }
    throw error;
  }
}
```

---

### 3.7 Reports

#### 3.7.1 Customer Returns Register

```sql
SELECT 
  r.return_number,
  r.return_date,
  r.original_invoice_number,
  r.customer_name,
  r.return_reason,
  r.total_amount AS return_value,
  r.settlement_type,
  r.status,
  u.first_name || ' ' || u.last_name AS processed_by
FROM inventory_returns r
LEFT JOIN users u ON r.processed_by = u.id
WHERE r.organization_id = :orgId
  AND r.return_type = 'sales_return'
  AND r.return_date BETWEEN :startDate AND :endDate
ORDER BY r.return_date DESC;
```

#### 3.7.2 Supplier Returns Tracker

| Report Field | Source | Purpose |
|--------------|--------|---------|
| Return Number | inventoryReturns.returnNumber | Identification |
| Supplier | inventorySuppliers.name | Supplier tracking |
| RMA Number | inventoryReturns.supplierRmaNumber | Supplier reference |
| Items | inventoryReturnItems | Detail breakdown |
| Status | inventoryReturns.status | Progress tracking |
| Ship Date | inventoryReturns.shippedAt | Logistics |
| Settlement | creditNoteNumber / refundAmount | Financial reconciliation |

#### 3.7.3 Net Stock Adjustment Log

```sql
SELECT 
  i.name AS item_name,
  adj.adjustment_number,
  adj.adjustment_type,
  adj.previous_quantity,
  adj.adjustment_quantity,
  adj.new_quantity,
  adj.reason,
  adj.adjustment_date,
  CASE 
    WHEN adj.adjustment_quantity > 0 THEN 'IN'
    ELSE 'OUT'
  END AS direction
FROM inventory_stock_adjustments adj
JOIN inventory_items i ON adj.item_id = i.id
WHERE adj.organization_id = :orgId
  AND adj.adjustment_date BETWEEN :startDate AND :endDate
ORDER BY adj.adjustment_date DESC;
```

#### 3.7.4 Refund/Credit Liability Summary

```sql
SELECT 
  settlement_type,
  COUNT(*) AS count,
  SUM(net_refund_amount) AS total_amount
FROM inventory_returns
WHERE organization_id = :orgId
  AND status = 'completed'
  AND return_date BETWEEN :startDate AND :endDate
GROUP BY settlement_type;

-- Outstanding store credits
SELECT 
  cn.credit_note_number,
  cn.recipient_name,
  cn.original_amount,
  cn.remaining_amount,
  cn.issue_date,
  cn.expiry_date,
  CASE 
    WHEN cn.expiry_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN cn.remaining_amount = 0 THEN 'USED'
    ELSE 'ACTIVE'
  END AS status
FROM inventory_credit_notes cn
WHERE cn.organization_id = :orgId
  AND cn.status = 'active'
ORDER BY cn.expiry_date ASC;
```

#### 3.7.5 Approval SLA Compliance

```sql
SELECT 
  a.approver_role,
  COUNT(*) AS total_requests,
  COUNT(CASE WHEN a.decision IS NOT NULL THEN 1 END) AS processed,
  AVG(EXTRACT(EPOCH FROM (a.decision_at - a.created_at))/3600) AS avg_hours_to_decision,
  COUNT(CASE WHEN a.decision_at > a.created_at + INTERVAL '24 hours' THEN 1 END) AS breached_sla
FROM inventory_return_approvals a
WHERE a.organization_id = :orgId
  AND a.created_at BETWEEN :startDate AND :endDate
GROUP BY a.approver_role;
```

---

## 4. Integration with Existing Modules

### 4.1 Module Integration Matrix

| Existing Module | Integration Point | Data Exchange |
|-----------------|-------------------|---------------|
| **Inventory Setup** | Item master, pricing, tax rates | Read item details, pricing rules |
| **Purchase Process** | Purchase orders, GRN | Link returns to original PO, batch info |
| **Inventory Management** | Stock levels, movements, alerts | Update stock, record movements |
| **Prescriptions** | Prescription dispensing | Validate, update dispensed qty |
| **Billing** | Invoice generation | Create sale invoices, process payments |
| **Patients** | Patient records | Link sales to patients |

### 4.2 Shared Services

```typescript
// Shared inventory service extensions
interface IInventoryService {
  // Existing methods
  getItems(orgId: number, filters?: ItemFilters): Promise<InventoryItem[]>;
  getBatches(itemId: number, orgId: number): Promise<InventoryBatch[]>;
  
  // New methods for Module 4 & 5
  reserveBatches(itemId: number, qty: number, orgId: number): Promise<BatchReservation[]>;
  deductFromBatch(batchId: number, qty: number, orgId: number): Promise<void>;
  restockBatch(batchId: number, qty: number, orgId: number): Promise<void>;
  recordStockMovement(movement: StockMovementDTO): Promise<void>;
  selectBatchesFEFO(itemId: number, qty: number, orgId: number): Promise<BatchAllocation[]>;
}
```

---

## 5. API Endpoints Specification

### 5.1 Module 4: Sales Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/pharmacy/sales` | List sales with filters | pharmacist, admin |
| GET | `/api/pharmacy/sales/:id` | Get sale details | pharmacist, admin |
| POST | `/api/pharmacy/sales` | Create new sale | pharmacist, admin |
| POST | `/api/pharmacy/sales/:id/void` | Void a sale | admin |
| GET | `/api/pharmacy/sales/:id/invoice` | Generate invoice PDF | pharmacist, admin |
| POST | `/api/pharmacy/batches/select-fefo` | FEFO batch selection | pharmacist, admin |
| GET | `/api/pharmacy/tax-rates` | Get tax rates | pharmacist, admin |
| GET | `/api/pharmacy/insurance-providers` | List insurance providers | pharmacist, admin |
| POST | `/api/pharmacy/payments` | Process payment | pharmacist, admin |

### 5.2 Module 5: Returns Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/pharmacy/returns` | List returns with filters | pharmacist, admin |
| GET | `/api/pharmacy/returns/:id` | Get return details | pharmacist, admin |
| POST | `/api/pharmacy/returns/sales` | Create sales return | pharmacist, admin |
| POST | `/api/pharmacy/returns/purchase` | Create purchase return | admin |
| PATCH | `/api/pharmacy/returns/:id/inspect` | Record inspection | pharmacist, admin |
| POST | `/api/pharmacy/returns/:id/approve` | Approve return | admin |
| POST | `/api/pharmacy/returns/:id/reject` | Reject return | admin |
| POST | `/api/pharmacy/returns/:id/process-refund` | Process refund | pharmacist, admin |
| POST | `/api/pharmacy/returns/:id/ship` | Mark shipped to supplier | admin |
| GET | `/api/pharmacy/credit-notes` | List credit notes | pharmacist, admin |
| POST | `/api/pharmacy/credit-notes/:id/apply` | Apply credit note | pharmacist, admin |

---

## 6. Database Schema Extensions

### 6.1 New Tables Summary

| Table Name | Purpose | Key Relationships |
|------------|---------|-------------------|
| `inventory_sale_payments` | Multi-payment tracking | -> inventory_sales |
| `inventory_tax_rates` | Tax configuration | -> organizations |
| `insurance_providers` | Insurance company master | -> organizations |
| `inventory_returns` | Return header | -> inventory_sales, inventory_purchase_orders |
| `inventory_return_items` | Return line items | -> inventory_returns, inventory_batches |
| `inventory_return_approvals` | Approval workflow | -> inventory_returns |
| `inventory_stock_adjustments` | Stock adjustment audit | -> inventory_items, inventory_batches |
| `inventory_credit_notes` | Credit note tracking | -> inventory_returns |

### 6.2 Schema Migration Order

```
1. inventory_tax_rates (no dependencies)
2. insurance_providers (no dependencies)
3. inventory_sale_payments (depends on inventory_sales)
4. inventory_returns (depends on inventory_sales, inventory_purchase_orders, inventory_suppliers)
5. inventory_return_items (depends on inventory_returns, inventory_batches)
6. inventory_return_approvals (depends on inventory_returns, users)
7. inventory_stock_adjustments (depends on inventory_items, inventory_batches)
8. inventory_credit_notes (depends on inventory_returns)
```

---

## 7. Role-Based Access Control

### 7.1 Permission Matrix - Module 4 (Sales)

| Permission | Pharmacist | Admin |
|------------|------------|-------|
| View sales | Yes | Yes |
| Create sale | Yes | Yes |
| Apply discount (within limit) | Yes | Yes |
| Apply discount (over limit) | No | Yes |
| Override price | No | Yes |
| Void sale | No | Yes |
| View all payment methods | Yes | Yes |
| Process insurance claims | Yes | Yes |
| Generate reports | Yes | Yes |
| Configure tax rates | No | Yes |

### 7.2 Permission Matrix - Module 5 (Returns)

| Permission | Pharmacist | Admin |
|------------|------------|-------|
| View returns | Yes | Yes |
| Create sales return | Yes | Yes |
| Create purchase return | No | Yes |
| Inspect returned items | Yes | Yes |
| Approve returns (< threshold) | Yes | Yes |
| Approve returns (> threshold) | No | Yes |
| Reject returns | No | Yes |
| Process cash refund | Yes | Yes |
| Process card refund | Yes | Yes |
| Issue credit note | Yes | Yes |
| Ship to supplier | No | Yes |
| View audit trail | Yes | Yes |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **FEFO** | First Expiry First Out - Inventory management method prioritizing sale of items with earliest expiry |
| **MRP** | Maximum Retail Price - Highest price at which product can be sold |
| **RMA** | Return Material Authorization - Supplier approval number for returns |
| **GRN** | Goods Received Note - Document confirming receipt of goods |
| **OTC** | Over The Counter - Medications not requiring prescription |
| **Batch** | Specific production lot of a product with unique expiry |
| **Credit Note** | Document issued for returns, allowing future purchases |
| **Restocking Fee** | Charge applied to returned items to cover handling costs |

---

## Appendix B: Status Workflow Diagrams

### B.1 Sale Status Flow

```
[draft] -> [completed] -> [voided]
                      -> [returned]
                      -> [partially_returned]
```

### B.2 Sales Return Status Flow

```
[pending] -> [pending_approval] -> [approved] -> [processing] -> [completed]
                              |                              -> [refunded]
                              -> [rejected]
                              
[pending] -> [cancelled]
```

### B.3 Supplier Return Status Flow

```
[pending] -> [pending_rma] -> [approved] -> [processing] -> [shipped] -> [received_by_supplier] -> [completed]
                          |                                                                     -> [credited]
                          -> [rejected]
```

---

*Document End*  
*Cura Healthcare EMR - Pharmacy Modules Design Document v1.0*  
*December 2025*
