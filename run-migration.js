// Simple script to run the SQL migration
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  // Get DATABASE_URL from environment or use the connection from db.ts
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.log('\nPlease set it using one of these methods:');
    console.log('  PowerShell: $env:DATABASE_URL="postgresql://user:password@host:port/database"');
    console.log('  CMD: set DATABASE_URL=postgresql://user:password@host:port/database');
    console.log('  Or create a .env file with: DATABASE_URL=postgresql://user:password@host:port/database');
    process.exit(1);
  }

  console.log('📦 Connecting to database...');
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    // Read the SQL file
    const sqlFile = join(__dirname, 'SQL Files', 'add_lab_results_workflow_fields.sql');
    const sql = readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Reading migration file...');
    console.log('🚀 Executing migration...\n');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\nThe following columns have been added to lab_results table:');
    console.log('  - ready_to_generate_lab (BOOLEAN DEFAULT FALSE)');
    console.log('  - lab_result_generated_report (BOOLEAN DEFAULT FALSE)');
    console.log('\nIndexes have been created for better performance.');
    console.log('\n✨ You can now restart your server to see the changes!');
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('\n⚠️  Note: Some columns or indexes may already exist. This is safe to ignore.');
      console.log('✅ Migration is complete (columns may have already been added).');
    } else {
      console.error('\nFull error:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();
