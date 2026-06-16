const pg = require("pg");
const { Pool } = pg;

// Use the same connection string as the running app (server/db.ts) to avoid
// accidentally seeding a different DB via env vars.
const { getDatabaseConnectionString } = require("./load-db-config.cjs");

const pool = new Pool({ connectionString: getDatabaseConnectionString() });

// Note: do not force search_path here; environments differ.
// We rely on the DB user's default search_path so tables like `appointments` resolve correctly.

function pad2(n) {
  return String(n).padStart(2, "0");
}

function makeAppointmentId() {
  // similar shape to existing ids; uniqueness via Date.now + random
  const ts = Date.now();
  const rnd = Math.floor(Math.random() * 1e6);
  return `APT${ts}${rnd}AUTO`;
}

async function main() {
  const orgId = parseInt(process.argv[2] || "20", 10);
  const treatmentId = parseInt(process.argv[3] || "50", 10);
  const start = process.argv[4] || "2026-03-26 00:00:00";
  const end = process.argv[5] || "2026-03-26 23:59:59";
  const countToInsert = Math.min(Math.max(parseInt(process.argv[6] || "5", 10) || 5, 1), 20);

  console.log("Seeding sample TREATMENT appointments…");
  console.log({ orgId, treatmentId, start, end, countToInsert });

  // pick an existing patient/provider for this org from existing appointments
  // (avoids depending on patients/users tables existing in the same schema)
  const apptRes = await pool.query(
    "select patient_id, provider_id from appointments where organization_id=$1 order by id asc limit 1",
    [orgId],
  );
  const patientId = apptRes.rows?.[0]?.patient_id;
  const providerId = apptRes.rows?.[0]?.provider_id;

  if (!patientId || !providerId) {
    throw new Error(
      `Missing patient/provider for org ${orgId}. patientId=${patientId} providerId=${providerId}`,
    );
  }

  // generate evenly spaced scheduled_at within range
  // Parse as local time (avoid implicit UTC conversions)
  const startMs = new Date(start.replace(" ", "T")).getTime();
  const endMs = new Date(end.replace(" ", "T")).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new Error("Invalid start/end. Use 'YYYY-MM-DD HH:mm:ss' format.");
  }

  const inserts = [];
  for (let i = 0; i < countToInsert; i++) {
    const t = startMs + Math.floor(((endMs - startMs) * i) / Math.max(countToInsert - 1, 1));
    const d = new Date(t);
    const scheduledAt =
      `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
      `${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;

    inserts.push({
      appointmentId: makeAppointmentId(),
      scheduledAt,
    });
  }

  // Insert rows
  // NOTE: columns required by schema: organization_id, appointment_id, patient_id, provider_id, title, scheduled_at, duration, status, type, appointment_type
  const inserted = [];
  for (const row of inserts) {
    const r = await pool.query(
      `
      insert into appointments (
        organization_id,
        appointment_id,
        patient_id,
        provider_id,
        title,
        scheduled_at,
        duration,
        status,
        type,
        appointment_type,
        treatment_id,
        consultation_id,
        created_by
      )
      values ($1,$2,$3,$4,$5,$6::timestamp,$7,$8,$9,$10,$11,$12,$13)
      returning id, appointment_id, scheduled_at, appointment_type, treatment_id
      `,
      [
        orgId,
        row.appointmentId,
        patientId,
        providerId,
        "Sample Treatment Appointment",
        row.scheduledAt,
        30,
        "scheduled",
        "procedure",
        "treatment",
        treatmentId,
        null,
        providerId,
      ],
    );
    inserted.push(r.rows[0]);
  }

  console.log("Inserted rows:", inserted.length);
  console.log(inserted);

  // Verify count in range for treatment
  const verify = await pool.query(
    `
    select count(*)::int as cnt
    from appointments
    where organization_id=$1
      and appointment_type='treatment'
      and scheduled_at >= $2::timestamp
      and scheduled_at <= $3::timestamp
    `,
    [orgId, start, end],
  );
  console.log("Verify treatment count in range:", verify.rows?.[0] || null);
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

