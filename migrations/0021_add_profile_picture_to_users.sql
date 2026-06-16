-- Migration: add profile picture path to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_picture_path text;

