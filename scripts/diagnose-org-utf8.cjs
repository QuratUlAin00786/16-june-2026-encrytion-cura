/**
 * Finds organization rows/columns that break UTF-8 reads.
 * Run: node scripts/diagnose-org-utf8.cjs
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { Pool } = require("pg");
const { getDatabaseConnectionString, getDatabaseSchema } = require("./load-db-config.cjs");

const TEXT_COLUMNS = [
  "name",
  "subdomain",
  "email",
  "region",
  "brand_name",
  "country_code",
  "currency_code",
  "currency_symbol",
  "language_code",
  "access_level",
  "subscription_status",
  "payment_status",
  "stripe_account_id",
  "stripe_status",
  "stripe_customer_id",
];

async function main() {
  const schema = getDatabaseSchema();
  const pool = new Pool({
    connectionString: getDatabaseConnectionString(),
    options: `-c search_path=${schema}`,
  });

  const { rows: ids } = await pool.query(
    `SELECT id FROM "${schema}"."organizations" ORDER BY id`,
  );

  console.log(`Checking ${ids.length} organization(s) in schema "${schema}"...\n`);

  for (const { id } of ids) {
    for (const col of TEXT_COLUMNS) {
      try {
        await pool.query(
          `SELECT "${col}" FROM "${schema}"."organizations" WHERE id = $1`,
          [id],
        );
      } catch (err) {
        if (err.code === "22021") {
          console.log(`❌ org id=${id} column "${col}" has invalid UTF-8`);
        } else {
          console.log(`⚠️ org id=${id} column "${col}": ${err.message}`);
        }
      }
    }
  }

  await pool.end();
  console.log("\nDone. Fix bad values with UPDATE ... or re-save the field as valid UTF-8.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
