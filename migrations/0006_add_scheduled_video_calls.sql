-- Migration: Add scheduled_video_calls table
-- Created: 2026-02-06

CREATE TABLE IF NOT EXISTS scheduled_video_calls (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    participant_name TEXT NOT NULL,
    participant_email TEXT NOT NULL,
    participant_role VARCHAR(50),
    scheduled_at TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30,
    call_type VARCHAR(50) NOT NULL DEFAULT 'consultation',
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    room_name TEXT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_video_calls_organization_id ON scheduled_video_calls(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_video_calls_created_by ON scheduled_video_calls(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_video_calls_participant_id ON scheduled_video_calls(participant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_video_calls_scheduled_at ON scheduled_video_calls(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_video_calls_status ON scheduled_video_calls(status);
