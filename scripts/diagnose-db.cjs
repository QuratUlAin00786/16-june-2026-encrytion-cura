/**
 * Shows which database/schema the app would use and row counts for key tables.
 * Run: node scripts/diagnose-db.cjs
 */
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { Pool } = require("pg");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

// What shell had before .env
const shellDatabaseUrl = process.env.DATABASE_URL;

dotenv.config({ path: envPath });

const {
  getDatabaseConnectionString,
  getDatabaseSchema,
} = require("./load-db-config.cjs");

// Match server: prefer DB_* when set
function getConnectionString() {
  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim() || "5432";
  const database = process.env.DB_NAME?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD ?? "";
  if (host && database && user) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }
  return getDatabaseConnectionString();
}

async function countInSchema(pool, schema, table) {
  const exists = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
    [schema, table],
  );
  if (!exists.rows.length) return null;
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM "${schema}"."${table}"`,
  );
  return r.rows[0].n;
}

async function main() {
  const conn = getConnectionString();
  const schema = process.env.DB_DATA_SCHEMA?.trim() || getDatabaseSchema();
  let dbName = process.env.DB_NAME || "?";
  try {
    dbName = new URL(conn).pathname.replace(/^\//, "");
  } catch {
    /* ignore */
  }

  console.log("--- Environment ---");
  console.log("  .env path:", envPath, fs.existsSync(envPath) ? "(found)" : "(MISSING)");
  if (shellDatabaseUrl && shellDatabaseUrl !== process.env.DATABASE_URL) {
    console.log("  WARNING: shell DATABASE_URL differed before/after dotenv");
  }
  try {
    const shellDb = shellDatabaseUrl
      ? new URL(shellDatabaseUrl).pathname.replace(/^\//, "")
      : "(not set in shell)";
    console.log("  Shell DATABASE_URL database:", shellDb);
  } catch {
    console.log("  Shell DATABASE_URL: (invalid URL)");
  }
  console.log("  .env DB_NAME:", process.env.DB_NAME);
  console.log("  .env DB_SCHEMA / DB_DATA_SCHEMA:", process.env.DB_SCHEMA, "/", process.env.DB_DATA_SCHEMA);
  console.log("  Effective connection database:", dbName);
  console.log("  Effective schema:", schema);
  console.log("");

  const pool = new Pool({ connectionString: conn });
  try {
    const who = await pool.query(
      `SELECT current_database() AS database, current_user AS db_user`,
    );
    console.log("--- Live connection ---");
    console.log("  current_database():", who.rows[0].database);
    console.log("  current_user:", who.rows[0].db_user);
    if (process.env.DB_NAME && who.rows[0].database !== process.env.DB_NAME) {
      console.log(
        `  *** MISMATCH: connected to "${who.rows[0].database}" but .env DB_NAME="${process.env.DB_NAME}" ***`,
      );
    }
    console.log("");

    console.log("--- Row counts by schema ---");
    for (const s of ["encryption_cura", "curauser24nov25", "public"]) {
      const users = await countInSchema(pool, s, "users");
      const packages = await countInSchema(pool, s, "saas_packages");
      const orgs = await countInSchema(pool, s, "organizations");
      console.log(`  ${s}:`);
      console.log(`    users: ${users === null ? "(no table)" : users}`);
      console.log(`    saas_packages: ${packages === null ? "(no table)" : packages}`);
      console.log(`    organizations: ${orgs === null ? "(no table)" : orgs}`);
    }

    await pool.query(`SET search_path TO ${schema}`);
    const u = await pool.query(`SELECT COUNT(*)::int AS n FROM users`);
    const p = await pool.query(`SELECT COUNT(*)::int AS n FROM saas_packages`);
    console.log("");
    console.log(`--- Via search_path="${schema}" (what the app queries) ---`);
    console.log("  users:", u.rows[0].n);
    console.log("  saas_packages:", p.rows[0].n);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
