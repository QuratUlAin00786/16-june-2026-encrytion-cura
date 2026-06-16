-- Create prescription_share_logs table
-- This table tracks all prescription sharing activities (sending to pharmacy, email shares, etc.)

CREATE TABLE IF NOT EXISTS prescription_share_logs (
  id SERIAL PRIMARY KEY,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recipient_email TEXT,
  pharmacy_email TEXT,
  pharmacy_name TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_subject TEXT,
  email_html TEXT,
  email_text TEXT,
  email_error TEXT,
  shared_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prescription_share_logs_prescription_id ON prescription_share_logs(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_share_logs_organization_id ON prescription_share_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_prescription_share_logs_patient_id ON prescription_share_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_share_logs_sent_by ON prescription_share_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_prescription_share_logs_shared_at ON prescription_share_logs(shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_share_logs_pharmacy_email ON prescription_share_logs(pharmacy_email);

-- Add comments for documentation
COMMENT ON TABLE prescription_share_logs IS 'Tracks all prescription sharing activities including pharmacy emails and PDF shares';
COMMENT ON COLUMN prescription_share_logs.prescription_id IS 'Reference to the prescription that was shared';
COMMENT ON COLUMN prescription_share_logs.organization_id IS 'Organization that owns this share log';
COMMENT ON COLUMN prescription_share_logs.patient_id IS 'Patient associated with the prescription';
COMMENT ON COLUMN prescription_share_logs.sent_by IS 'User ID who shared the prescription';
COMMENT ON COLUMN prescription_share_logs.recipient_email IS 'Email address of the recipient (pharmacy or patient)';
COMMENT ON COLUMN prescription_share_logs.pharmacy_email IS 'Pharmacy email address (if shared with pharmacy)';
COMMENT ON COLUMN prescription_share_logs.pharmacy_name IS 'Name of the pharmacy';
COMMENT ON COLUMN prescription_share_logs.status IS 'Share status: sent, success, or failed';
COMMENT ON COLUMN prescription_share_logs.email_sent IS 'Whether the email was successfully sent';
COMMENT ON COLUMN prescription_share_logs.email_subject IS 'Subject line of the email sent';
COMMENT ON COLUMN prescription_share_logs.email_html IS 'HTML content of the email sent';
COMMENT ON COLUMN prescription_share_logs.email_text IS 'Plain text content of the email sent';
COMMENT ON COLUMN prescription_share_logs.email_error IS 'Error message if email sending failed';
COMMENT ON COLUMN prescription_share_logs.shared_at IS 'Timestamp when the prescription was shared';
COMMENT ON COLUMN prescription_share_logs.created_at IS 'Timestamp when the log entry was created';
