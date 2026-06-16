-- =====================================================
-- CLAIMS TABLE - CREATE AND INSERT QUERIES
-- =====================================================

-- =====================================================
-- 1. CREATE SEQUENCE
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS claims_id_seq;

-- =====================================================
-- 2. CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY DEFAULT nextval('claims_id_seq'),
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    claim_number VARCHAR(50) NOT NULL UNIQUE,
    insurance_provider TEXT NOT NULL,
    total_billed NUMERIC(10, 2) NOT NULL,
    total_approved NUMERIC(10, 2),
    total_paid NUMERIC(10, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    submission_date TIMESTAMP NOT NULL,
    response_date TIMESTAMP,
    denial_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_claim_status CHECK (status IN ('submitted', 'approved', 'denied', 'pending')),
    CONSTRAINT chk_claim_amounts CHECK (total_billed >= 0)
);

-- =====================================================
-- 3. ADD FOREIGN KEYS
-- =====================================================

ALTER TABLE claims ADD CONSTRAINT claims_organization_id_fk 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE claims ADD CONSTRAINT claims_patient_id_fk 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

-- =====================================================
-- 4. CREATE INDEXES (Optional - for performance)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_claims_organization_id ON claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient_id ON claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_invoice_id ON claims(invoice_id);
CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_submission_date ON claims(submission_date);

-- =====================================================
-- 5. INSERT SAMPLE DATA
-- =====================================================

-- Sample Claims for Organization 1
INSERT INTO claims (
    organization_id,
    patient_id,
    invoice_id,
    claim_number,
    insurance_provider,
    total_billed,
    total_approved,
    total_paid,
    status,
    submission_date,
    response_date,
    denial_reason,
    notes,
    created_at
) VALUES
-- Claim 1: Approved claim
(
    1,                                  -- organization_id
    1,                                  -- patient_id (John Anderson)
    1,                                  -- invoice_id
    'CLM-2024-001',                    -- claim_number
    'Bupa',                            -- insurance_provider
    150.00,                            -- total_billed
    120.00,                            -- total_approved
    120.00,                            -- total_paid
    'approved',                        -- status
    NOW() - INTERVAL '30 days',       -- submission_date
    NOW() - INTERVAL '25 days',       -- response_date
    NULL,                              -- denial_reason
    'Annual checkup claim processed successfully',  -- notes
    NOW()                              -- created_at
),

-- Claim 2: Approved claim
(
    1,
    2,                                  -- patient_id (Mary Johnson)
    2,
    'CLM-2024-002',
    'AXA',
    200.00,
    150.00,
    150.00,
    'approved',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '20 days',
    NULL,
    'Diabetes consultation and HbA1c test approved',
    NOW()
),

-- Claim 3: Pending claim
(
    1,
    3,                                  -- patient_id (David Williams)
    3,
    'CLM-2024-003',
    'Vitality Health',
    120.00,
    NULL,                              -- total_approved (pending)
    NULL,                              -- total_paid (pending)
    'pending',
    NOW() - INTERVAL '10 days',
    NULL,                              -- response_date (pending)
    NULL,
    'Asthma consultation claim under review',
    NOW()
),

-- Claim 4: Denied claim
(
    1,
    1,
    NULL,                              -- invoice_id (no invoice yet)
    'CLM-2024-004',
    'Bupa',
    300.00,
    0.00,
    0.00,
    'denied',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '15 days',
    'Service not covered under current plan',  -- denial_reason
    'Patient needs to upgrade plan for specialist consultations',
    NOW()
),

-- Claim 5: Submitted claim (awaiting response)
(
    1,
    2,
    NULL,
    'CLM-2024-005',
    'AXA',
    250.00,
    NULL,
    NULL,
    'submitted',
    NOW() - INTERVAL '5 days',
    NULL,
    NULL,
    'Follow-up diabetes consultation claim submitted',
    NOW()
),

-- Claim 6: Approved with partial payment
(
    1,
    3,
    NULL,
    'CLM-2024-006',
    'Vitality Health',
    400.00,
    300.00,                            -- Partial approval
    300.00,
    'approved',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '10 days',
    'Partial approval - some services not covered',
    'Patient responsible for $100 balance',
    NOW()
);

-- =====================================================
-- 6. UPDATE SEQUENCE TO CONTINUE FROM MAX ID
-- =====================================================

SELECT setval('claims_id_seq', (SELECT COALESCE(MAX(id), 0) FROM claims));

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- View all claims
-- SELECT 
--     c.id,
--     c.claim_number,
--     c.insurance_provider,
--     c.total_billed,
--     c.total_approved,
--     c.total_paid,
--     c.status,
--     c.submission_date,
--     c.response_date
-- FROM claims c
-- ORDER BY c.submission_date DESC;

-- View claims by status
-- SELECT 
--     status,
--     COUNT(*) as claim_count,
--     SUM(total_billed) as total_billed,
--     SUM(total_approved) as total_approved,
--     SUM(total_paid) as total_paid
-- FROM claims
-- GROUP BY status
-- ORDER BY status;

-- View claims with patient and invoice details
-- SELECT 
--     c.claim_number,
--     p.patient_id,
--     p.first_name || ' ' || p.last_name as patient_name,
--     c.insurance_provider,
--     c.total_billed,
--     c.status,
--     c.submission_date
-- FROM claims c
-- JOIN patients p ON c.patient_id = p.id
-- ORDER BY c.submission_date DESC;

-- =====================================================
-- SUMMARY
-- =====================================================

-- ✅ Claims Table Created with:
--    - Primary key (id) with auto-increment
--    - Foreign keys to organizations and patients
--    - Unique constraint on claim_number
--    - Check constraints for status and amounts
--    - Indexes for performance optimization
--
-- ✅ Sample Data Inserted:
--    - 6 claims with different statuses
--    - 3 Approved claims (with payments)
--    - 1 Pending claim (under review)
--    - 1 Denied claim (with reason)
--    - 1 Submitted claim (awaiting response)
--    - 1 Partially approved claim
--
-- ✅ Statuses Included:
--    - submitted: Claim sent to insurance
--    - pending: Under review
--    - approved: Claim approved
--    - denied: Claim denied
--
-- ✅ Insurance Providers:
--    - Bupa
--    - AXA
--    - Vitality Health
