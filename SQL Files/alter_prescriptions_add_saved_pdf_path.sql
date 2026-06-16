-- Alter prescriptions table to add saved_pdf_path column
-- This script checks if the column exists before adding it to avoid errors

DO $$
BEGIN
    -- Check if column exists, if not, add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'prescriptions' 
        AND column_name = 'saved_pdf_path'
    ) THEN
        ALTER TABLE prescriptions 
        ADD COLUMN saved_pdf_path TEXT;
        
        RAISE NOTICE 'Column saved_pdf_path added to prescriptions table';
    ELSE
        RAISE NOTICE 'Column saved_pdf_path already exists in prescriptions table';
    END IF;
END $$;
