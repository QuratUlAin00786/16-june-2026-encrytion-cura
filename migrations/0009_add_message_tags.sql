-- Create message_tags table
CREATE TABLE IF NOT EXISTS message_tags (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT 'blue',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER NOT NULL,
    UNIQUE(organization_id, name)
);

-- Create message_tag_assignments table (junction table)
CREATE TABLE IF NOT EXISTS message_tag_assignments (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    message_id VARCHAR(50) NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER NOT NULL,
    UNIQUE(organization_id, message_id, tag_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_tags_organization ON message_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_message_tag_assignments_message ON message_tag_assignments(message_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_message_tag_assignments_tag ON message_tag_assignments(tag_id);
