import {

  getDatabaseConfig,

  formatDatabaseConfigLog,

} from "./db-config";

import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "@shared/schema";

import { retryDatabaseOperation } from "./db-utils";

import { ensureDatabaseSchema } from "./ensure-db-schema";

import pkg from "pg";

const { Pool } = pkg;



const databaseConfig = getDatabaseConfig();

console.log(formatDatabaseConfigLog(databaseConfig));



/** Active PostgreSQL schema for qualified SQL (e.g. sequences). Updated after bootstrap. */

export let activeDbSchema = databaseConfig.schema;



let searchPath = databaseConfig.schema;



export const pool = new Pool({

  connectionString: databaseConfig.connectionString,

  max: 10,

  connectionTimeoutMillis: 5000,

  idleTimeoutMillis: 10000,

  query_timeout: 30000,

  maxUses: 7500,

  allowExitOnIdle: false,

  options: `-c search_path=${databaseConfig.schema}`,

});



pool.on("connect", (client: any) => {

  client.query(`SET search_path TO ${searchPath}`);

  client.query("SET statement_timeout TO 35000");

});



export const dbReady = ensureDatabaseSchema(pool, databaseConfig.schema).then(

  async (result) => {

    searchPath = result.searchPath;

    activeDbSchema = result.dataSchema;

    try {

      const { ensureSystemRolesForAllOrganizations } = await import(

        "./default-system-roles.js",

      );

      const roleSummary = await ensureSystemRolesForAllOrganizations();

      if (roleSummary.created > 0) {

        console.log(

          `[DB] System roles: ${roleSummary.created} role(s) added across ${roleSummary.organizations} organization(s) (${roleSummary.expectedPerOrg} per org)`,

        );

      }

    } catch (roleErr: unknown) {

      console.warn(

        "[DB] System role bootstrap skipped:",

        roleErr instanceof Error ? roleErr.message : roleErr,

      );

    }

    return result;

  },

);



void dbReady.then(async () => {

  try {

    await pool.query(`

      ALTER TABLE message_campaigns 

      ADD COLUMN IF NOT EXISTS recipients JSONB DEFAULT '[]'::jsonb

    `);

    console.log("✅ Database migration: recipients column ensured in message_campaigns");

  } catch (err: any) {

    console.warn("⚠️ Migration warning (recipients column):", err?.message || err);

  }

});



const originalQuery = pool.query.bind(pool);

pool.query = ((...args: any[]) => {

  return retryDatabaseOperation(() => originalQuery(...args), "SQL query");

}) as typeof pool.query;



pool.on("error", (err: any) => {

  console.warn("[DB_POOL_ERROR]", err?.code || err?.message || "Unknown pool error");

});



process.on("unhandledRejection", (reason: any) => {

  console.error("[UNHANDLED_REJECTION]", reason?.message || reason);

});



export const db = drizzle({ client: pool, schema });



export {

  getDatabaseConfig,

  getDatabaseConnectionString,

  getDatabaseSchema,

} from "./db-config";



void dbReady.then(async () => {

  const q = (table: string) => `"${activeDbSchema}"."${table}"`;



  try {

    await pool.query(`

      CREATE TABLE IF NOT EXISTS ${q("treatments")} (

        id SERIAL PRIMARY KEY,

        organization_id INTEGER NOT NULL REFERENCES ${q("organizations")}(id),

        name TEXT NOT NULL,

        color_code VARCHAR(7) NOT NULL DEFAULT '#2563eb',

        base_price NUMERIC(10,2) NOT NULL DEFAULT 0,

        currency VARCHAR(3) NOT NULL DEFAULT 'GBP',

        version INTEGER NOT NULL DEFAULT 1,

        is_active BOOLEAN NOT NULL DEFAULT TRUE,

        created_by INTEGER NOT NULL REFERENCES ${q("users")}(id),

        notes TEXT,

        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL

      );

    `);

    console.log("✅ Ensured treatments table exists");

  } catch (error: any) {

    console.warn("⚠️ Unable to ensure treatments table:", error?.message || error);

  }

});



void dbReady.then(async () => {

  try {

    await pool.query(`

      ALTER TABLE treatments_info

      ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) DEFAULT 1,

      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),

      ADD COLUMN IF NOT EXISTS treatment_id INTEGER

    `);

    await pool.query(`

      UPDATE treatments_info

      SET organization_id = 1

      WHERE organization_id IS NULL

    `);

    await pool.query(`

      ALTER TABLE treatments_info

      ALTER COLUMN organization_id SET NOT NULL

    `);

    await pool.query(`

      ALTER TABLE treatments_info

      ALTER COLUMN treatment_id DROP NOT NULL

    `);

    console.log("✅ Ensured treatments_info schema columns exist");

  } catch (error: any) {

    console.warn("⚠️ Unable to ensure treatments_info schema columns:", error?.message || error);

  }

});



void dbReady.then(async () => {

  try {

    await pool.query(`

      ALTER TABLE appointments

      ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(20) NOT NULL DEFAULT 'consultation',

      ADD COLUMN IF NOT EXISTS treatment_id INTEGER,

      ADD COLUMN IF NOT EXISTS consultation_id INTEGER

    `);

    console.log(

      "✅ Ensured appointments columns appointment_type, treatment_id, consultation_id exist",

    );



    await pool.query(`

      CREATE INDEX IF NOT EXISTS idx_appointments_org_scheduled_at

      ON appointments (organization_id, scheduled_at)

    `);

    await pool.query(`

      CREATE INDEX IF NOT EXISTS idx_appointments_org_appointment_type

      ON appointments (organization_id, appointment_type)

    `);

    await pool.query(`

      CREATE INDEX IF NOT EXISTS idx_appointments_org_type_sched_treatment

      ON appointments (organization_id, appointment_type, scheduled_at, treatment_id)

    `);

    console.log("✅ Ensured appointments analytics indexes exist");

  } catch (error: any) {

    console.warn("⚠️ Unable to ensure appointments columns:", error?.message || error);

  }

});



void dbReady.then(async () => {

  try {

    await pool.query(`

      ALTER TABLE treatments

      ADD COLUMN IF NOT EXISTS notes TEXT,

      ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb

    `);

    console.log("✅ Ensured treatments columns notes + metadata exist");

  } catch (error: any) {

    console.warn("⚠️ Unable to ensure treatments columns:", error?.message || error);

  }

});



void dbReady.then(async () => {

  try {

    await pool.query(`

      CREATE TABLE IF NOT EXISTS "${activeDbSchema}".telemedicine_settings (

        user_id INTEGER NOT NULL,

        organization_id INTEGER NOT NULL,

        settings JSONB NOT NULL DEFAULT '{}'::jsonb,

        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

        PRIMARY KEY (user_id)

      )

    `);

    console.log("✅ Ensured telemedicine_settings table exists");

  } catch (error: any) {

    console.warn("⚠️ Unable to ensure telemedicine_settings table:", error?.message || error);

  }

});


