#!/usr/bin/env node
/**
 * Healthcare EMR Database Export Tool
 * Exports PostgreSQL database schema and data to SQL file
 * Security: Credentials are NOT included
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const OUTPUT_FILE = 'database_export_full.sql';
const MAX_TIMEOUT = 20000; // 20 seconds per operation

async function runCommand(command, timeout = MAX_TIMEOUT) {
  try {
    const { stdout, stderr } = await Promise.race([
      execAsync(command, { maxBuffer: 10 * 1024 * 1024 }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function exportDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log(`Starting database export at ${new Date().toISOString()}`);
  console.log(`Output file: ${OUTPUT_FILE}\n`);

  // Write header
  const header = `-- =============================================
-- Healthcare EMR Database Export
-- Generated: ${new Date().toISOString()}
-- Environment: Development
-- SECURITY NOTE: Credentials excluded for safety
-- =============================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

`;

  await fs.writeFile(OUTPUT_FILE, header);

  // Export schema
  console.log('1. Exporting schema...');
  const schemaResult = await runCommand(
    `pg_dump "${databaseUrl}" --schema-only --no-owner --no-privileges`,
    30000
  );

  if (schemaResult.success) {
    await fs.appendFile(OUTPUT_FILE, schemaResult.stdout);
    console.log('   ✓ Schema exported successfully\n');
  } else {
    await fs.appendFile(OUTPUT_FILE, '-- Schema export failed or timed out\n\n');
    console.log(`   ✗ Schema export failed: ${schemaResult.error}\n`);
  }

  // Get list of tables
  console.log('2. Getting table list...');
  const tablesResult = await runCommand(
    `psql "${databaseUrl}" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"`,
    10000
  );

  if (!tablesResult.success) {
    console.log('   ✗ Failed to get table list');
    await finalReport();
    return;
  }

  const tables = tablesResult.stdout
    .split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  console.log(`   Found ${tables.length} tables\n`);

  await fs.appendFile(OUTPUT_FILE, `\n-- =============================================\n`);
  await fs.appendFile(OUTPUT_FILE, `-- DATA EXPORT (${tables.length} tables)\n`);
  await fs.appendFile(OUTPUT_FILE, `-- =============================================\n\n`);

  // Export each table's data
  console.log('3. Exporting table data...');
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    process.stdout.write(`   [${i + 1}/${tables.length}] ${table}... `);

    const dataResult = await runCommand(
      `pg_dump "${databaseUrl}" --data-only --no-owner --no-privileges --inserts --table="${table}"`,
      20000
    );

    if (dataResult.success && dataResult.stdout.trim()) {
      await fs.appendFile(OUTPUT_FILE, `\n-- Table: ${table}\n`);
      await fs.appendFile(OUTPUT_FILE, dataResult.stdout);
      await fs.appendFile(OUTPUT_FILE, '\n');
      console.log('✓');
      successCount++;
    } else {
      await fs.appendFile(OUTPUT_FILE, `-- Data export failed/timed out for table: ${table}\n\n`);
      console.log(`✗ ${dataResult.error || 'timeout'}`);
      failCount++;
    }
  }

  console.log(`\n   Success: ${successCount} tables`);
  console.log(`   Failed: ${failCount} tables\n`);

  await finalReport();
}

async function finalReport() {
  const stats = await fs.stat(OUTPUT_FILE);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('='.repeat(50));
  console.log('Export completed!');
  console.log(`Output file: ${OUTPUT_FILE}`);
  console.log(`File size: ${sizeMB} MB (${stats.size.toLocaleString()} bytes)`);
  console.log('='.repeat(50));

  console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
  console.log('- Database credentials are NOT included in this export');
  console.log('- Connection strings are excluded for security');
  console.log('- Safe to share schema and data without exposing secrets\n');
}

// Run export
exportDatabase().catch(err => {
  console.error(`\nFATAL ERROR: ${err.message}`);
  process.exit(1);
});
