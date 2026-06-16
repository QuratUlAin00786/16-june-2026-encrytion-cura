#!/bin/bash

OUTPUT_FILE="database_export_full.sql"

echo "-- =============================================" > $OUTPUT_FILE
echo "-- Healthcare EMR Database Export" >> $OUTPUT_FILE
echo "-- Generated on: $(date)" >> $OUTPUT_FILE
echo "-- Database: Development" >> $OUTPUT_FILE
echo "-- Note: Credentials excluded for security" >> $OUTPUT_FILE
echo "-- =============================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Export schema
pg_dump $DATABASE_URL --schema-only --no-owner --no-privileges --clean --if-exists >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "-- =============================================" >> $OUTPUT_FILE
echo "-- DATA IMPORT" >> $OUTPUT_FILE
echo "-- =============================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Export data
pg_dump $DATABASE_URL --data-only --no-owner --no-privileges --inserts --column-inserts >> $OUTPUT_FILE 2>&1

echo "Export completed: $OUTPUT_FILE"
ls -lh $OUTPUT_FILE
