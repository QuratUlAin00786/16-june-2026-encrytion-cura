-- Add 'unpaid' status to invoice status constraints
-- This migration updates both the invoices and saas_invoices tables to allow 'unpaid' as a valid status

-- Drop existing constraints
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS chk_patient_invoice_status;
ALTER TABLE saas_invoices DROP CONSTRAINT IF EXISTS chk_invoice_status;

-- Add new constraints with 'unpaid' status included
ALTER TABLE invoices ADD CONSTRAINT chk_patient_invoice_status 
  CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'unpaid'));

ALTER TABLE saas_invoices ADD CONSTRAINT chk_invoice_status 
  CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'unpaid'));
