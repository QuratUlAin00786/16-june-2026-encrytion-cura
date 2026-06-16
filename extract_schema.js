import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon(process.env.DATABASE_URL);

async function extractSchema() {
  let output = '-- Cura EMR Database Schema Export\n';
  output += `-- Generated: ${new Date().toISOString()}\n\n`;
  
  // Get all tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  
  for (const { table_name } of tables) {
    // Get table columns
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = ${table_name}
      ORDER BY ordinal_position
    `;
    
    output += `-- Table: ${table_name}\n`;
    output += `CREATE TABLE ${table_name} (\n`;
    
    const columnDefs = columns.map(col => {
      let def = `  ${col.column_name} ${col.data_type}`;
      if (col.character_maximum_length) {
        def += `(${col.character_maximum_length})`;
      }
      if (col.is_nullable === 'NO') {
        def += ' NOT NULL';
      }
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`;
      }
      return def;
    });
    
    output += columnDefs.join(',\n');
    output += '\n);\n\n';
  }
  
  // Get all sequences
  const sequences = await sql`
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name
  `;
  
  for (const { sequence_name } of sequences) {
    output += `-- Sequence: ${sequence_name}\n`;
    output += `CREATE SEQUENCE ${sequence_name};\n\n`;
  }
  
  // Get all constraints
  const constraints = await sql`
    SELECT 
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_type
  `;
  
  const constraintsByTable = {};
  for (const c of constraints) {
    if (!constraintsByTable[c.table_name]) {
      constraintsByTable[c.table_name] = [];
    }
    constraintsByTable[c.table_name].push(c);
  }
  
  output += '-- Constraints\n';
  for (const [tableName, tableConstraints] of Object.entries(constraintsByTable)) {
    output += `\n-- Constraints for ${tableName}\n`;
    for (const c of tableConstraints) {
      if (c.constraint_type === 'PRIMARY KEY') {
        output += `ALTER TABLE ${tableName} ADD CONSTRAINT ${c.constraint_name} PRIMARY KEY (${c.column_name});\n`;
      } else if (c.constraint_type === 'FOREIGN KEY') {
        output += `ALTER TABLE ${tableName} ADD CONSTRAINT ${c.constraint_name} FOREIGN KEY (${c.column_name}) REFERENCES ${c.foreign_table_name}(${c.foreign_column_name});\n`;
      } else if (c.constraint_type === 'UNIQUE') {
        output += `ALTER TABLE ${tableName} ADD CONSTRAINT ${c.constraint_name} UNIQUE (${c.column_name});\n`;
      }
    }
  }
  
  fs.writeFileSync('database_schema.sql', output);
  console.log('Schema exported to database_schema.sql');
  console.log(`Total tables: ${tables.length}`);
  console.log(`Total sequences: ${sequences.length}`);
}

extractSchema().catch(console.error);
