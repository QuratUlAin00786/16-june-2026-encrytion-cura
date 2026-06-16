import type { Pool } from "pg";

export type SchemaBootstrapResult = {
  searchPath: string;
  dataSchema: string;
};

async function schemaHasTable(
  pool: Pool,
  schema: string,
  table: string,
): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = $2`,
    [schema, table],
  );
  return r.rows.length > 0;
}

async function countTableRows(
  pool: Pool,
  schema: string,
  table: string,
): Promise<number> {
  if (!(await schemaHasTable(pool, schema, table))) {
    return 0;
  }
  const r = await pool.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM "${schema}"."${table}"`,
  );
  return r.rows[0]?.n ?? 0;
}

async function schemaExists(pool: Pool, name: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
    [name],
  );
  return r.rows.length > 0;
}

/**
 * Uses DB_SCHEMA / DB_DATA_SCHEMA from .env when that schema exists.
 * Does not auto-switch to curauser24nov25 (set DB_SCHEMA explicitly if needed).
 */
async function resolveDataSchema(
  pool: Pool,
  preferredSchema: string,
): Promise<string> {
  const fromEnv =
    process.env.DB_SCHEMA?.trim() ||
    process.env.DB_DATA_SCHEMA?.trim() ||
    preferredSchema.trim() ||
    "encryption_cura";

  if (await schemaExists(pool, fromEnv)) {
    if (await schemaHasTable(pool, fromEnv, "organizations")) {
      const appts = await countTableRows(pool, fromEnv, "appointments");
      const subs = await countTableRows(pool, fromEnv, "saas_subscriptions");
      console.log(
        `[DB] Active schema "${fromEnv}" (from .env): organizations=yes, appointments=${appts}, saas_subscriptions=${subs}`,
      );
      return fromEnv;
    }
    console.warn(
      `[DB] Schema "${fromEnv}" exists but has no organizations table; falling back`,
    );
  } else {
    console.warn(`[DB] Schema "${fromEnv}" from .env does not exist; falling back`);
  }

  const fallbacks = ["encryption_cura", "curauser24nov25", "public"].filter(
    (s, i, arr) => s && s !== fromEnv && arr.indexOf(s) === i,
  );

  for (const schema of fallbacks) {
    if (
      (await schemaExists(pool, schema)) &&
      (await schemaHasTable(pool, schema, "organizations"))
    ) {
      console.warn(`[DB] Fallback active schema: "${schema}"`);
      return schema;
    }
  }

  return preferredSchema.trim() || "encryption_cura";
}

const FORM_RELATED_TABLES = [
  "forms",
  "form_sections",
  "form_fields",
  "form_shares",
  "form_share_logs",
  "form_responses",
  "form_response_values",
];

/**
 * Migrations may attach form_* FKs to public.* (or another legacy schema) while tenant data lives
 * in encryption_cura (etc.). That makes inserts fail with FK violations even when rows exist in
 * the active schema.
 */
export async function fixFormForeignKeysForActiveSchema(
  pool: Pool,
  dataSchema: string,
): Promise<void> {
  if (!(await schemaHasTable(pool, dataSchema, "form_shares"))) return;

  const { rows } = await pool.query<{
    constraint_name: string;
    table_name: string;
    column_name: string;
    foreign_schema: string;
    foreign_table: string;
    foreign_column: string;
  }>(
    `
    SELECT
      c.conname AS constraint_name,
      cl.relname AS table_name,
      a.attname AS column_name,
      nf.nspname AS foreign_schema,
      cf.relname AS foreign_table,
      af.attname AS foreign_column
    FROM pg_constraint c
    JOIN pg_class cl ON c.conrelid = cl.oid
    JOIN pg_namespace nl ON cl.relnamespace = nl.oid
    JOIN pg_class cf ON c.confrelid = cf.oid
    JOIN pg_namespace nf ON cf.relnamespace = nf.oid
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = c.confkey[1]
    WHERE c.contype = 'f'
      AND nl.nspname = $1
      AND cl.relname = ANY($2::text[])
      AND nf.nspname IS DISTINCT FROM $1
    `,
    [dataSchema, FORM_RELATED_TABLES],
  );

  if (rows.length === 0) return;

  let fixed = 0;
  for (const row of rows) {
    if (!(await schemaHasTable(pool, dataSchema, row.foreign_table))) {
      console.warn(
        `[DB] Skipping FK ${row.constraint_name}: ${dataSchema}.${row.foreign_table} does not exist`,
      );
      continue;
    }

    await pool.query(
      `ALTER TABLE "${dataSchema}"."${row.table_name}" DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`,
    );
    await pool.query(
      `
      ALTER TABLE "${dataSchema}"."${row.table_name}"
      ADD CONSTRAINT "${row.constraint_name}"
      FOREIGN KEY ("${row.column_name}")
      REFERENCES "${dataSchema}"."${row.foreign_table}" ("${row.foreign_column}")
      ON DELETE NO ACTION ON UPDATE NO ACTION
      `,
    );
    fixed += 1;
  }

  if (fixed > 0) {
    console.log(
      `[DB] Repointed ${fixed} form-related foreign key(s) onto "${dataSchema}".* (was referencing other schema(s))`,
    );
  }
}

/**
 * Ensures form_shares / form_share_logs patient_id references "${dataSchema}"."patients"(id)".
 * Repoints unqualified REFERENCES patients(id) or wrong-schema refs that break under connection pooling.
 */
export async function repointFormSharePatientForeignKeys(
  pool: Pool,
  dataSchema: string,
): Promise<void> {
  const tables = ["form_shares", "form_share_logs"] as const;
  const escapedSchema = dataSchema.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const qualifiedRef = new RegExp(
    `REFERENCES\\s+"${escapedSchema}"\\s*\\.\\s*"patients"\\s*\\(\\s*id\\s*\\)`,
    "i",
  );

  for (const table of tables) {
    if (!(await schemaHasTable(pool, dataSchema, table))) continue;

    const { rows } = await pool.query<{ conname: string; condef: string }>(
      `
      SELECT c.conname, pg_get_constraintdef(c.oid) AS condef
      FROM pg_constraint c
      JOIN pg_class cl ON c.conrelid = cl.oid
      JOIN pg_namespace nl ON nl.oid = cl.relnamespace
      WHERE nl.nspname = $1
        AND cl.relname = $2
        AND c.contype = 'f'
        AND EXISTS (
          SELECT 1
          FROM unnest(c.conkey) AS ck(attnum)
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ck.attnum
          WHERE a.attname = 'patient_id'
        )
      `,
      [dataSchema, table],
    );

    for (const row of rows) {
      if (qualifiedRef.test(row.condef)) {
        continue;
      }

      await pool.query(
        `ALTER TABLE "${dataSchema}"."${table}" DROP CONSTRAINT IF EXISTS "${row.conname}"`,
      );
      await pool.query(
        `ALTER TABLE "${dataSchema}"."${table}"
         ADD CONSTRAINT "${row.conname}"
         FOREIGN KEY (patient_id) REFERENCES "${dataSchema}"."patients"(id)
         ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }
  }
}

/**
 * Allows form shares to external emails without a patients row (nullable patient_id).
 */
export async function ensureFormShareRecipientSupport(
  pool: Pool,
  dataSchema: string,
): Promise<void> {
  const specs: Array<{ table: string; withRecipientEmail: boolean }> = [
    { table: "form_shares", withRecipientEmail: true },
    { table: "form_share_logs", withRecipientEmail: true },
    { table: "form_responses", withRecipientEmail: false },
  ];

  for (const { table, withRecipientEmail } of specs) {
    if (!(await schemaHasTable(pool, dataSchema, table))) continue;

    await pool
      .query(
        `ALTER TABLE "${dataSchema}"."${table}" ALTER COLUMN patient_id DROP NOT NULL`,
      )
      .catch(() => undefined);

    if (withRecipientEmail) {
      await pool
        .query(
          `ALTER TABLE "${dataSchema}"."${table}" ADD COLUMN IF NOT EXISTS recipient_email text`,
        )
        .catch(() => undefined);
    }
  }
}

/**
 * Legacy ai_insights tables were created without SERIAL; inserts then fail with
 * "null value in column id violates not-null constraint".
 */
export async function ensureAiInsightsIdSequence(
  pool: Pool,
  dataSchema: string,
): Promise<void> {
  if (!(await schemaHasTable(pool, dataSchema, "ai_insights"))) {
    return;
  }

  await pool.query(`SET search_path TO ${dataSchema}`);

  await pool.query(`CREATE SEQUENCE IF NOT EXISTS ai_insights_id_seq`).catch(() => undefined);

  await pool.query(`
    ALTER TABLE ai_insights
      ALTER COLUMN id SET DEFAULT nextval('ai_insights_id_seq'::regclass)
  `).catch(() => undefined);

  await pool.query(`
    ALTER SEQUENCE ai_insights_id_seq OWNED BY ai_insights.id
  `).catch(() => undefined);

  await pool.query(`
    SELECT setval(
      'ai_insights_id_seq',
      COALESCE((SELECT MAX(id) FROM ai_insights), 0) + 1,
      false
    )
  `).catch(() => undefined);
}

/**
 * Aligns the live PostgreSQL schema with what Drizzle expects.
 * Safe to run on every server start (IF NOT EXISTS / IF EXISTS guards).
 */
export async function ensureDatabaseSchema(
  pool: Pool,
  preferredSchema: string,
): Promise<SchemaBootstrapResult> {
  const dbInfo = await pool.query(
    `SELECT current_database() AS database, current_user AS db_user`,
  );
  const dataSchema = await resolveDataSchema(pool, preferredSchema);
  /** Use only the configured schema so queries never hit curauser24nov25 by mistake */
  const searchPath = dataSchema;

  if (
    dataSchema !== preferredSchema &&
    !process.env.DB_SCHEMA?.trim() &&
    !process.env.DB_DATA_SCHEMA?.trim()
  ) {
    console.warn(
      `[DB] DB_SCHEMA="${preferredSchema}" adjusted to active schema "${dataSchema}"`,
    );
  }

  await pool.query(`SET search_path TO ${searchPath}`);

  const expectedDb = process.env.DB_NAME?.trim();
  const actualDb = dbInfo.rows[0]?.database as string;
  if (expectedDb && actualDb && expectedDb !== actualDb) {
    console.error(
      `[DB] WRONG DATABASE: connected to "${actualDb}" but .env DB_NAME="${expectedDb}". ` +
        `Unset shell DATABASE_URL or fix .env (DB_* vars should point to cura24nov2025).`,
    );
  }

  let orgCount = 0;
  let appointmentCount = 0;
  let userCount = 0;
  let packageCount = 0;
  try {
    const count = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM organizations`,
    );
    orgCount = count.rows[0]?.n ?? 0;
    const appt = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM appointments`,
    );
    appointmentCount = appt.rows[0]?.n ?? 0;
    const users = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM users`,
    );
    userCount = users.rows[0]?.n ?? 0;
    const pkgs = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM saas_packages`,
    );
    packageCount = pkgs.rows[0]?.n ?? 0;
  } catch {
    /* table may not exist yet */
  }

  console.log(
    `[DB] Connected: database="${actualDb}" user="${dbInfo.rows[0]?.db_user}" search_path="${searchPath}" ` +
      `organizations=${orgCount} users=${userCount} saas_packages=${packageCount} appointments=${appointmentCount}`,
  );

  await pool.query(`
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS country_code CHAR(2),
      ADD COLUMN IF NOT EXISTS currency_code CHAR(3),
      ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10),
      ADD COLUMN IF NOT EXISTS language_code CHAR(5),
      ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'full',
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial',
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'trial',
      ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS stripe_status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
  `);

  await pool.query(`
    UPDATE organizations SET payment_status = 'trial' WHERE payment_status IS NULL
  `).catch(() => undefined);

  await pool.query(`
    UPDATE organizations SET subscription_status = 'trial' WHERE subscription_status IS NULL
  `).catch(() => undefined);

  await pool.query(`
    UPDATE organizations SET stripe_status = 'active' WHERE stripe_status IS NULL
  `).catch(() => undefined);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS "Professional_RegistrationID" TEXT,
      ADD COLUMN IF NOT EXISTS profile_picture_path TEXT,
      ADD COLUMN IF NOT EXISTS department TEXT,
      ADD COLUMN IF NOT EXISTS medical_specialty_category TEXT,
      ADD COLUMN IF NOT EXISTS sub_specialty TEXT,
      ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS is_saas_owner BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS date_of_birth TEXT,
      ADD COLUMN IF NOT EXISTS gender_at_birth TEXT
  `);

  await pool.query(`
    ALTER TABLE patients
      ADD COLUMN IF NOT EXISTS relation TEXT
  `);

  await pool.query(`
    ALTER TABLE patients
      ALTER COLUMN gender_at_birth TYPE text USING gender_at_birth::text
  `).catch(() => undefined);

  await pool.query(`
    ALTER TABLE patients
      ALTER COLUMN date_of_birth TYPE text USING date_of_birth::text
  `).catch(() => undefined);

  /* Encrypted SDK envelopes are JSON strings — varchar(50) truncates and breaks decrypt. */
  await pool.query(`
    ALTER TABLE patients
      ALTER COLUMN nhs_number TYPE text USING nhs_number::text,
      ALTER COLUMN phone TYPE text USING phone::text,
      ALTER COLUMN relation TYPE text USING relation::text,
      ALTER COLUMN first_name TYPE text USING first_name::text,
      ALTER COLUMN last_name TYPE text USING last_name::text,
      ALTER COLUMN email TYPE text USING email::text
  `).catch(() => undefined);

  /* Some tenant schemas never had ai_insights migrated from public; CREATE is idempotent. */
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_insights (
      id SERIAL PRIMARY KEY NOT NULL,
      organization_id INTEGER NOT NULL,
      patient_id INTEGER,
      type VARCHAR(30) NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity VARCHAR(10) NOT NULL DEFAULT 'medium',
      action_required BOOLEAN NOT NULL DEFAULT false,
      confidence VARCHAR(32),
      metadata JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      ai_status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `).catch((e) =>
    console.warn("[DB] ai_insights CREATE IF NOT EXISTS skipped:", (e as Error)?.message || e),
  );

  /* ai_insights.confidence was varchar(10); widen for normalized decimals */
  await pool.query(`
    ALTER TABLE ai_insights
      ALTER COLUMN confidence TYPE varchar(32)
  `).catch(() => undefined);

  await ensureAiInsightsIdSequence(pool, dataSchema);

  await pool.query(`
    ALTER TABLE saas_subscriptions
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly'
  `).catch(() => undefined);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_video_calls (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      participant_name TEXT NOT NULL,
      participant_email TEXT NOT NULL,
      participant_role VARCHAR(50),
      scheduled_at TIMESTAMP NOT NULL,
      duration INTEGER NOT NULL DEFAULT 30,
      call_type VARCHAR(50) NOT NULL DEFAULT 'consultation',
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      room_name TEXT,
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_video_calls_organization_id
      ON scheduled_video_calls(organization_id)
  `).catch(() => undefined);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS telemedicine_settings (
      user_id INTEGER NOT NULL,
      organization_id INTEGER NOT NULL,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      PRIMARY KEY (user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS organization_holiday_settings (
      organization_id INTEGER PRIMARY KEY NOT NULL,
      weekend_days TEXT[] NOT NULL DEFAULT ARRAY['Saturday', 'Sunday'],
      weekends_non_working BOOLEAN NOT NULL DEFAULT true,
      default_allow_shifts_on_holidays BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `).catch((e) =>
    console.warn("[DB] organization_holiday_settings CREATE skipped:", (e as Error)?.message || e),
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS organization_holidays (
      id SERIAL PRIMARY KEY NOT NULL,
      organization_id INTEGER NOT NULL,
      holiday_date DATE NOT NULL,
      name TEXT NOT NULL,
      holiday_type VARCHAR(20) NOT NULL DEFAULT 'national',
      region TEXT,
      allow_shifts BOOLEAN NOT NULL DEFAULT false,
      is_working_day BOOLEAN NOT NULL DEFAULT false,
      notes TEXT,
      created_by INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (organization_id, holiday_date, name)
    )
  `).catch((e) =>
    console.warn("[DB] organization_holidays CREATE skipped:", (e as Error)?.message || e),
  );

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_organization_holidays_org_date
      ON organization_holidays (organization_id, holiday_date)
  `).catch(() => undefined);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_tax_rates (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(20) NOT NULL,
      rate DECIMAL(5, 2) NOT NULL,
      description TEXT,
      is_default BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      applies_to VARCHAR(50) DEFAULT 'all',
      effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
      effective_to TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `).catch(() => undefined);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS organization_integrations (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      integration_type VARCHAR(50) NOT NULL,
      is_enabled BOOLEAN DEFAULT false,
      is_configured BOOLEAN DEFAULT false,
      status VARCHAR(20) DEFAULT 'disconnected',
      last_tested_at TIMESTAMP,
      last_error TEXT,
      webhook_url TEXT,
      settings JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `).catch(() => undefined);

  await fixFormForeignKeysForActiveSchema(pool, dataSchema);
  await repointFormSharePatientForeignKeys(pool, dataSchema);
  await ensureFormShareRecipientSupport(pool, dataSchema);

  console.log("✅ Core database schema synchronized (columns + scheduled_video_calls)");
  return { searchPath, dataSchema };
}
