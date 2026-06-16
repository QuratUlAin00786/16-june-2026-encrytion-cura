-- Migration: Add analytics_subjects and analytics_subject_treatments tables
-- Created: 2026-02-17

-- Create analytics_subjects table
CREATE TABLE IF NOT EXISTS analytics_subjects (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subject_title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create analytics_subject_treatments mapping table
CREATE TABLE IF NOT EXISTS analytics_subject_treatments (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES analytics_subjects(id) ON DELETE CASCADE,
    treatment_id INTEGER NOT NULL REFERENCES treatments_info(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(subject_id, treatment_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_subjects_organization_id ON analytics_subjects(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_subject_treatments_subject_id ON analytics_subject_treatments(subject_id);
CREATE INDEX IF NOT EXISTS idx_analytics_subject_treatments_treatment_id ON analytics_subject_treatments(treatment_id);
