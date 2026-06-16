#!/bin/bash

OUTPUT="database_export_full.sql"

echo "-- =============================================" > $OUTPUT
echo "-- Healthcare EMR Database Export" >> $OUTPUT
echo "-- Generated on: $(date)" >> $OUTPUT
echo "-- Database: Development Environment" >> $OUTPUT
echo "-- Security Note: Credentials excluded" >> $OUTPUT
echo "-- =============================================" >> $OUTPUT
echo "" >> $OUTPUT

# Export schema only (should be fast)
echo "Exporting schema..."
timeout 30 pg_dump $DATABASE_URL --schema-only --no-owner --no-privileges --clean --if-exists 2>&1 | head -n 100000 >> $OUTPUT

echo "" >> $OUTPUT
echo "-- =============================================" >> $OUTPUT
echo "-- DATA SECTION" >> $OUTPUT
echo "-- =============================================" >> $OUTPUT

echo "Schema export completed. File size: $(du -h $OUTPUT | cut -f1)"
ls -lh $OUTPUT
