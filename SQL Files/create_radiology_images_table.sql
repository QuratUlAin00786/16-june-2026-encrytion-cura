-- Create radiology_images table to store multiple images per radiology report
-- This table allows storing multiple images that belong to a single medical_images record (report)

CREATE TABLE IF NOT EXISTS radiology_images (
    id SERIAL PRIMARY KEY,
    medical_image_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    image_data TEXT, -- Optional: base64 encoded image data
    uploaded_by INTEGER NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_radiology_images_medical_image 
        FOREIGN KEY (medical_image_id) 
        REFERENCES medical_images(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_radiology_images_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_radiology_images_patient 
        FOREIGN KEY (patient_id) 
        REFERENCES patients(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_radiology_images_uploaded_by 
        FOREIGN KEY (uploaded_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_radiology_images_medical_image_id ON radiology_images(medical_image_id);
CREATE INDEX IF NOT EXISTS idx_radiology_images_organization_id ON radiology_images(organization_id);
CREATE INDEX IF NOT EXISTS idx_radiology_images_patient_id ON radiology_images(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_images_display_order ON radiology_images(medical_image_id, display_order);

-- Add comments for documentation
COMMENT ON TABLE radiology_images IS 'Stores multiple images associated with a single radiology report (medical_images record)';
COMMENT ON COLUMN radiology_images.medical_image_id IS 'Foreign key to medical_images table - the report this image belongs to';
COMMENT ON COLUMN radiology_images.file_path IS 'Full filesystem path where the image is stored';
COMMENT ON COLUMN radiology_images.display_order IS 'Order for displaying images in the report (0 = first, 1 = second, etc.)';
