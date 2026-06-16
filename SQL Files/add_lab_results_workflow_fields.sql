-- Add workflow fields to lab_results table
-- These fields control the visibility and workflow of lab results across different tabs

ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS ready_to_generate_lab BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS lab_result_generated_report BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comments to explain the workflow
COMMENT ON COLUMN lab_results.ready_to_generate_lab IS 'Indicates that a signed document and prescription have been created. When true, the record moves from Request Report tab to Generate Reports tab.';
COMMENT ON COLUMN lab_results.lab_result_generated_report IS 'Indicates that the lab report has been generated. When true, the record moves from Generate Reports tab to Lab Results tab.';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lab_results_ready_to_generate_lab ON lab_results(ready_to_generate_lab);
CREATE INDEX IF NOT EXISTS idx_lab_results_generated_report ON lab_results(lab_result_generated_report);
CREATE INDEX IF NOT EXISTS idx_lab_results_workflow ON lab_results(ready_to_generate_lab, lab_result_generated_report);
