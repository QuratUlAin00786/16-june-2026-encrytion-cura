-- Add doctor_id column to invoices table
-- This migration adds a doctor_id column to track which provider/doctor performed the service

-- Add doctor_id column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS doctor_id INTEGER REFERENCES users(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_doctor_id ON invoices(doctor_id);

-- Add comment to document the column
COMMENT ON COLUMN invoices.doctor_id IS 'Reference to provider/doctor who performed the service';
