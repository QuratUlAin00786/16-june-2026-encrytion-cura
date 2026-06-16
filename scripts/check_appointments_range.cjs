const pg = require("pg");
const { Pool } = pg;
const { getDatabaseConnectionString } = require("./load-db-config.cjs");

const pool = new Pool({
  connectionString: getDatabaseConnectionString(),
});

async function main() {
  const org = parseInt(process.argv[2] || "20", 10);
  const start = process.argv[3] || "2026-02-24 00:00:00";
  const end = process.argv[4] || "2026-03-26 23:59:59";
  const appointmentType = (process.argv[5] || "treatment").toLowerCase();

  const countRes = await pool.query(
    "select count(*)::int as cnt from appointments where organization_id=$1 and scheduled_at >= $2::timestamp and scheduled_at <= $3::timestamp",
    [org, start, end],
  );

  const sampleRes = await pool.query(
    "select scheduled_at, appointment_id, appointment_type, type, treatment_id, consultation_id from appointments where organization_id=$1 and scheduled_at >= $2::timestamp and scheduled_at <= $3::timestamp order by scheduled_at asc limit 10",
    [org, start, end],
  );

  console.log("ORG", org);
  console.log("RANGE", start, "->", end);
  console.log("COUNT", countRes.rows?.[0] || null);
  console.log("SAMPLE_ROWS", sampleRes.rows || []);

  const reportRes = await pool.query(
    `
    WITH base AS (
      SELECT
        date_trunc('minute', a.scheduled_at) AS scheduled_bucket,
        a.organization_id,
        a.appointment_type,
        a.type,
        a.treatment_id,
        a.consultation_id
      FROM appointments a
      WHERE a.organization_id = $1
        AND LOWER(TRIM(COALESCE(a.appointment_type, a.type, ''))) = $2
        AND a.scheduled_at >= $3::timestamp
        AND a.scheduled_at <= $4::timestamp
    ),
    grouped AS (
      SELECT
        scheduled_bucket,
        CASE
          WHEN LOWER(TRIM(COALESCE(appointment_type, type, ''))) = 'treatment' THEN t.id
          WHEN LOWER(TRIM(COALESCE(appointment_type, type, ''))) = 'consultation' THEN df.id
          ELSE NULL
        END as service_id,
        CASE
          WHEN LOWER(TRIM(COALESCE(appointment_type, type, ''))) = 'treatment' THEN COALESCE(t.name, 'Unknown Treatment')
          WHEN LOWER(TRIM(COALESCE(appointment_type, type, ''))) = 'consultation' THEN COALESCE(df.service_name, 'Unknown Consultation')
          ELSE 'Unknown'
        END as service_name,
        COUNT(*)::integer as appointment_count
      FROM base b
      LEFT JOIN treatments t
        ON t.id = b.treatment_id
        AND t.organization_id = b.organization_id
      LEFT JOIN doctors_fee df
        ON df.id = b.consultation_id
        AND df.organization_id = b.organization_id
      GROUP BY scheduled_bucket, service_id, service_name
      ORDER BY scheduled_bucket DESC
      LIMIT 50
    )
    SELECT
      to_char(scheduled_bucket, 'YYYY-MM-DD HH24:MI:SS') as scheduled_at,
      service_id,
      service_name,
      appointment_count
    FROM grouped
    ORDER BY scheduled_at ASC, service_name ASC
    `,
    [org, appointmentType, start, end],
  );
  console.log("REPORT_ROWS", reportRes.rows?.length || 0);
  console.log("REPORT_SAMPLE", reportRes.rows?.slice(0, 10) || []);
}

main()
  .catch((e) => {
    console.error("ERROR", e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.end();
    } catch {}
  });

