-- Migration: add professional registration id to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "Professional_RegistrationID" text;

