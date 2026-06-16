import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function exportSchema() {
  try {
    // Get all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    let schemaSQL = `-- Database Schema Export\n-- Generated: ${new Date().toISOString()}\n\n`;
    
    for (const { table_name } of tables) {
      // Get table definition
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
      
      schemaSQL += `-- Table: ${table_name}\n`;
      schemaSQL += `CREATE TABLE ${table_name} (\n`;
      
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
      
      schemaSQL += columnDefs.join(',\n');
      schemaSQL += '\n);\n\n';
    }
    
    console.log(schemaSQL);
  } catch (error) {
    console.error('Error:', error);
  }
}

exportSchema();
