const { Pool } = require("pg");
const {
  getDatabaseConnectionString,
  getDatabaseSchema,
} = require("./load-db-config.cjs");

async function main() {
  const url = getDatabaseConnectionString();
  const schema = getDatabaseSchema();
  console.log("Connecting to:", url.replace(/:[^:@]+@/, ":****@"));
  console.log("DB_SCHEMA:", schema);
  const pool = new Pool({ connectionString: url });

  const dbInfo = await pool.query("SELECT current_database() AS db, current_user AS usr");
  console.log("Database:", dbInfo.rows[0]);

  const schemas = await pool.query(`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    ORDER BY schema_name
  `);
  console.log("\nSchemas:", schemas.rows.map((r) => r.schema_name).join(", "));

  for (const schema of ["public", "encryption_cura", "curauser24nov25"]) {
    try {
      const orgs = await pool.query(`
        SELECT id, name, subdomain, email
        FROM "${schema}".organizations
        ORDER BY id
      `);
      console.log(`\n${schema}.organizations (${orgs.rows.length} rows):`);
      console.table(orgs.rows);
    } catch (e) {
      console.log(`\n${schema}.organizations: ${e.message}`);
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
