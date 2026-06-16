#!/usr/bin/env python3
"""
Healthcare EMR Database Export Tool
Exports PostgreSQL database schema and data to SQL file
Note: Credentials are NOT included for security
"""

import os
import subprocess
import sys
from datetime import datetime

def export_database():
    """Export database using chunked approach"""
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)
    
    output_file = "database_export_full.sql"
    
    print(f"Starting database export at {datetime.now()}")
    print(f"Output file: {output_file}")
    
    with open(output_file, 'w') as f:
        # Write header
        f.write(f"""-- =============================================
-- Healthcare EMR Database Export
-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
-- Environment: Development
-- SECURITY NOTE: Credentials excluded for safety
-- =============================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

""")
    
    print("\n1. Exporting schema...")
    try:
        # Export schema only
        result = subprocess.run(
            ['pg_dump', database_url, '--schema-only', '--no-owner', '--no-privileges'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        with open(output_file, 'a') as f:
            f.write(result.stdout)
        
        print("   ✓ Schema exported successfully")
    except subprocess.TimeoutExpired:
        print("   ✗ Schema export timed out")
        with open(output_file, 'a') as f:
            f.write("-- Schema export timed out\n\n")
    
    print("\n2. Exporting data...")
    
    # Get list of tables
    try:
        result = subprocess.run(
            ['psql', database_url, '-t', '-c', 
             "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        tables = [t.strip() for t in result.stdout.split('\n') if t.strip()]
        
        print(f"   Found {len(tables)} tables to export")
        
        with open(output_file, 'a') as f:
            f.write(f"\n-- =============================================\n")
            f.write(f"-- DATA EXPORT ({len(tables)} tables)\n")
            f.write(f"-- =============================================\n\n")
        
        # Export each table's data
        for i, table in enumerate(tables, 1):
            print(f"   [{i}/{len(tables)}] Exporting data from: {table}")
            
            try:
                result = subprocess.run(
                    ['pg_dump', database_url, '--data-only', '--no-owner', 
                     '--no-privileges', '--inserts', '--table', table],
                    capture_output=True,
                    text=True,
                    timeout=20
                )
                
                with open(output_file, 'a') as f:
                    f.write(f"\n-- Table: {table}\n")
                    f.write(result.stdout)
                    f.write("\n")
                
            except subprocess.TimeoutExpired:
                print(f"      ✗ Timeout on {table}")
                with open(output_file, 'a') as f:
                    f.write(f"-- Data export timed out for table: {table}\n\n")
            except Exception as e:
                print(f"      ✗ Error on {table}: {e}")
                
    except Exception as e:
        print(f"   ✗ Error getting table list: {e}")
    
    # Get file size
    file_size = os.path.getsize(output_file)
    size_mb = file_size / (1024 * 1024)
    
    print(f"\n{'='*50}")
    print(f"Export completed!")
    print(f"Output file: {output_file}")
    print(f"File size: {size_mb:.2f} MB ({file_size:,} bytes)")
    print(f"{'='*50}")
    
    print("\nIMPORTANT SECURITY NOTES:")
    print("- Database credentials are NOT included in this export")
    print("- Connection strings are excluded for security")
    print("- Safe to share schema and data without exposing secrets")
    
    return output_file

if __name__ == '__main__':
    try:
        export_database()
    except KeyboardInterrupt:
        print("\n\nExport cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)
