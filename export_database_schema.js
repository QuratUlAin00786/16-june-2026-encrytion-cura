import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon(process.env.DATABASE_URL);

async function exportSchema() {
  console.log('Starting schema export...');
  
  let output = `-- PostgreSQL Database Schema Export
-- Generated: ${new Date().toISOString()}
-- Database: Cura EMR System

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

`;

  try {
    // Get all sequences first
    console.log('Fetching sequences...');
    const sequences = await sql`
      SELECT 
        sequence_name,
        start_value,
        increment,
        maximum_value,
        minimum_value,
        data_type
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `;
    
    console.log(`Found ${sequences.length} sequences`);
    
    if (sequences.length > 0) {
      output += '\n-- Sequences\n';
      sequences.forEach(seq => {
        output += `CREATE SEQUENCE public.${seq.sequence_name}`;
        output += `\n    START WITH ${seq.start_value}`;
        output += `\n    INCREMENT BY ${seq.increment}`;
        output += `\n    NO MINVALUE`;
        output += `\n    NO MAXVALUE`;
        output += `\n    CACHE 1;\n\n`;
      });
    }
    
    // Get all tables
    console.log('Fetching tables...');
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    
    console.log(`Found ${tables.length} tables`);

    // For each table, get full DDL
    for (const { tablename } of tables) {
      console.log(`Processing table: ${tablename}`);
      
      output += `\n-- Table: ${tablename}\n`;
      
      // Get columns
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          udt_name,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = ${tablename}
        ORDER BY ordinal_position
      `;

      output += `CREATE TABLE public.${tablename} (\n`;
      
      const columnDefs = columns.map(col => {
        let def = `    ${col.column_name} `;
        
        // Data type
        if (col.data_type === 'USER-DEFINED') {
          def += col.udt_name;
        } else if (col.data_type === 'character varying' && col.character_maximum_length) {
          def += `varchar(${col.character_maximum_length})`;
        } else if (col.data_type === 'numeric' && col.numeric_precision) {
          def += `numeric(${col.numeric_precision},${col.numeric_scale})`;
        } else if (col.data_type === 'ARRAY') {
          def += col.udt_name.replace('_', '') + '[]';
        } else {
          def += col.data_type;
        }
        
        // Nullable
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        
        // Default
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        
        return def;
      });

      output += columnDefs.join(',\n');
      output += '\n);\n';
    }

    // Get primary keys
    console.log('Fetching primary keys...');
    const primaryKeys = await sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.ordinal_position
    `;

    if (primaryKeys.length > 0) {
      output += '\n-- Primary Keys\n';
      const pkByTable = {};
      primaryKeys.forEach(pk => {
        if (!pkByTable[pk.table_name]) {
          pkByTable[pk.table_name] = {
            name: pk.constraint_name,
            columns: []
          };
        }
        pkByTable[pk.table_name].columns.push(pk.column_name);
      });

      for (const [table, pk] of Object.entries(pkByTable)) {
        output += `ALTER TABLE ONLY public.${table} ADD CONSTRAINT ${pk.name} PRIMARY KEY (${pk.columns.join(', ')});\n`;
      }
    }

    // Get foreign keys
    console.log('Fetching foreign keys...');
    const foreignKeys = await sql`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `;

    if (foreignKeys.length > 0) {
      output += '\n-- Foreign Keys\n';
      foreignKeys.forEach(fk => {
        output += `ALTER TABLE ONLY public.${fk.table_name} ADD CONSTRAINT ${fk.constraint_name} `;
        output += `FOREIGN KEY (${fk.column_name}) `;
        output += `REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name})`;
        if (fk.update_rule !== 'NO ACTION') {
          output += ` ON UPDATE ${fk.update_rule}`;
        }
        if (fk.delete_rule !== 'NO ACTION') {
          output += ` ON DELETE ${fk.delete_rule}`;
        }
        output += ';\n';
      });
    }

    // Get unique constraints
    console.log('Fetching unique constraints...');
    const uniqueConstraints = await sql`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
    `;

    if (uniqueConstraints.length > 0) {
      output += '\n-- Unique Constraints\n';
      const uniqueByConstraint = {};
      uniqueConstraints.forEach(uc => {
        if (!uniqueByConstraint[uc.constraint_name]) {
          uniqueByConstraint[uc.constraint_name] = {
            table: uc.table_name,
            columns: []
          };
        }
        uniqueByConstraint[uc.constraint_name].columns.push(uc.column_name);
      });

      for (const [name, uc] of Object.entries(uniqueByConstraint)) {
        output += `ALTER TABLE ONLY public.${uc.table} ADD CONSTRAINT ${name} UNIQUE (${uc.columns.join(', ')});\n`;
      }
    }

    // Get indexes
    console.log('Fetching indexes...');
    const indexes = await sql`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
    `;

    if (indexes.length > 0) {
      output += '\n-- Indexes\n';
      indexes.forEach(idx => {
        output += `${idx.indexdef};\n`;
      });
    }

    // Get sequence ownership (link sequences to their columns)
    console.log('Fetching sequence ownership...');
    const sequenceOwnership = await sql`
      SELECT 
        s.sequence_name,
        t.table_name,
        c.column_name
      FROM information_schema.sequences s
      JOIN pg_depend d ON d.objid = (s.sequence_schema || '.' || s.sequence_name)::regclass
      JOIN pg_class tc ON tc.oid = d.refobjid
      JOIN information_schema.tables t ON t.table_name = tc.relname AND t.table_schema = s.sequence_schema
      JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = d.refobjsubid
      JOIN information_schema.columns c ON c.table_name = t.table_name 
        AND c.column_name = a.attname 
        AND c.table_schema = t.table_schema
      WHERE s.sequence_schema = 'public'
      ORDER BY s.sequence_name
    `;

    if (sequenceOwnership.length > 0) {
      output += '\n-- Sequence Ownership\n';
      sequenceOwnership.forEach(so => {
        output += `ALTER SEQUENCE public.${so.sequence_name} OWNED BY public.${so.table_name}.${so.column_name};\n`;
      });
    }

    // Write to file
    const filename = 'database_schema_complete.sql';
    fs.writeFileSync(filename, output);
    
    console.log(`\n✅ Schema exported successfully to ${filename}`);
    console.log(`   Sequences: ${sequences.length}`);
    console.log(`   Tables: ${tables.length}`);
    console.log(`   Primary Keys: ${Object.keys(primaryKeys.reduce((acc, pk) => ({...acc, [pk.table_name]: true}), {})).length}`);
    console.log(`   Foreign Keys: ${foreignKeys.length}`);
    console.log(`   Unique Constraints: ${Object.keys(uniqueConstraints.reduce((acc, uc) => ({...acc, [uc.constraint_name]: true}), {})).length}`);
    console.log(`   Indexes: ${indexes.length}`);
    console.log(`   Sequence Ownership: ${sequenceOwnership.length}`);
    console.log(`   File size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('Error exporting schema:', error);
    process.exit(1);
  }
}

exportSchema();
