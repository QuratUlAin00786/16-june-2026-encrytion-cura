#!/bin/bash

OUTPUT="database_export_full.sql"

# Header
cat > $OUTPUT << 'HEADER'
-- =============================================
-- Healthcare EMR Database Export
-- Generated: November 2, 2025
-- Environment: Development
-- Security: Credentials excluded
-- =============================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

HEADER

# Get list of all tables
psql $DATABASE_URL -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" | grep -v "^$" | while read table; do
  table=$(echo $table | xargs)  # trim whitespace
  echo "Processing table: $table"
  
  # Add table comment
  echo "" >> $OUTPUT
  echo "-- =============================================" >> $OUTPUT
  echo "-- Table: $table" >> $OUTPUT
  echo "-- =============================================" >> $OUTPUT
  
  # Get CREATE TABLE statement
  timeout 10 psql $DATABASE_URL -c "\d+ $table" 2>&1 | head -n 100 >> $OUTPUT || echo "-- Timeout getting schema for $table" >> $OUTPUT
  
done

echo "Export completed!"
ls -lh $OUTPUT
head -n 50 $OUTPUT

