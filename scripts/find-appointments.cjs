const { Pool } = require("pg");
const { getDatabaseConnectionString, getDatabaseSchema } = require("./load-db-config.cjs");

async function main() {
  const pool = new Pool({ connectionString: getDatabaseConnectionString() });
  console.log("DB_SCHEMA from .env:", getDatabaseSchema());

  const db = await pool.query("SELECT current_database() AS db");
  console.log("Database:", db.rows[0].db);

  const tables = ["appointments", "saas_subscriptions", "organizations"];
  for (const schema of ["encryption_cura", "curauser24nov25", "public"]) {
    console.log(`\n=== schema: ${schema} ===`);
    for (const table of tables) {
      try {
        const exists = await pool.query(
          `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
          [schema, table],
        );
        if (!exists.rows.length) {
          console.log(`  ${table}: (does not exist)`);
          continue;
        }
        const count = await pool.query(
          `SELECT COUNT(*)::int AS n FROM "${schema}"."${table}"`,
        );
        console.log(`  ${table}: ${count.rows[0].n} rows`);
      } catch (e) {
        console.log(`  ${table}: ${e.message}`);
      }
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
