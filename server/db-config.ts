import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Absolute path to project root .env — same file you edit locally. */
export const PROJECT_ENV_FILE = path.resolve(__dirname, "..", ".env");

/** Values read from .env file on disk (not shell). Used for DB credentials. */
const fileEnv: Record<string, string> = {};

function normalizeEnvKey(key: string): string {
  return key.trim().replace(/^\uFEFF/, "");
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "").trim();
}

/**
 * Load project .env into process.env. File values always win over shell / systemd.
 */
function loadProjectDotEnv(): void {
  if (!fs.existsSync(PROJECT_ENV_FILE)) {
    console.warn(`[DB] .env not found at ${PROJECT_ENV_FILE}`);
    return;
  }

  const parsed = dotenv.parse(fs.readFileSync(PROJECT_ENV_FILE, "utf8"));
  for (const [rawKey, value] of Object.entries(parsed)) {
    const key = normalizeEnvKey(rawKey);
    const v = stripQuotes(value);
    fileEnv[key] = v;
    // Keep NODE_ENV from npm scripts (e.g. cross-env NODE_ENV=development for `npm run dev`)
    if (key === "NODE_ENV" && process.env.NODE_ENV) {
      continue;
    }
    process.env[key] = v;
  }
}

loadProjectDotEnv();

/** Prefer .env file on disk, then process.env. */
function env(key: string): string | undefined {
  const fromFile = fileEnv[key];
  if (fromFile !== undefined && fromFile !== "") {
    return fromFile;
  }
  const fromProcess = process.env[key]?.trim();
  return fromProcess ? stripQuotes(fromProcess) : undefined;
}

function usernameFromDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return decodeURIComponent(new URL(stripSchemaQueryParam(url)).username);
  } catch {
    return undefined;
  }
}

/** Resolve DB user: .env file, then DATABASE_URL, fix common cura_user typo. */
function resolveDbUser(): string | undefined {
  const fromFile = env("DB_USER");
  const fromUrl = usernameFromDatabaseUrl(env("DATABASE_URL"));

  if (fromFile === "cura_user" && fromUrl === "curauser24nov25") {
    console.warn(
      `[DB] DB_USER was "cura_user" (shell or bad key); using "curauser24nov25" from DATABASE_URL in ${PROJECT_ENV_FILE}`,
    );
    return fromUrl;
  }

  if (fromFile === "cura_user") {
    console.warn(
      `[DB] DB_USER is "cura_user" — use "curauser24nov25" in ${PROJECT_ENV_FILE}. Attempting curauser24nov25.`,
    );
    return "curauser24nov25";
  }

  if (fromFile) return fromFile;
  if (fromUrl && fromUrl !== "cura_user") return fromUrl;
  return undefined;
}

export type DatabaseConfig = {
  connectionString: string;
  schema: string;
  host: string;
  port: number;
  database: string;
  user: string;
};

function stripSchemaQueryParam(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("schema");
    return parsed.toString();
  } catch {
    return url.replace(/[?&]schema=[^&]*/gi, "");
  }
}

function buildUrlFromDbVars(): string | null {
  const host = env("DB_HOST");
  const port = env("DB_PORT") || "5432";
  const database = env("DB_NAME");
  const user = resolveDbUser();
  const password = env("DB_PASSWORD") ?? "";

  if (!host || !database || !user) {
    return null;
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function getDatabaseConnectionString(): string {
  const fromVars = buildUrlFromDbVars();
  if (fromVars) {
    return fromVars;
  }

  const rawUrl = env("DATABASE_URL");
  if (rawUrl) {
    return stripSchemaQueryParam(rawUrl);
  }

  throw new Error(
    `Database not configured. Set DB_HOST, DB_NAME, DB_USER in ${PROJECT_ENV_FILE}, or set DATABASE_URL.`,
  );
}

/** Default PostgreSQL schema when no env / URL override is set. */
const DEFAULT_DB_SCHEMA = "encryption_cura";

/**
 * Active data schema: prefer project .env / process.env.
 * Order: `DB_SCHEMA` → `DB_DATA_SCHEMA` → `?schema=` on DATABASE_URL → default `encryption_cura`.
 */
export function getDatabaseSchema(): string {
  const fromDbSchema = env("DB_SCHEMA")?.trim();
  if (fromDbSchema) return fromDbSchema;

  const fromDataSchema = env("DB_DATA_SCHEMA")?.trim();
  if (fromDataSchema) return fromDataSchema;

  const raw = env("DATABASE_URL");
  if (raw) {
    try {
      const fromQuery = new URL(raw).searchParams.get("schema");
      if (fromQuery?.trim()) return fromQuery.trim();
    } catch {
      /* ignore */
    }
  }

  return DEFAULT_DB_SCHEMA;
}

export function getDatabaseConfig(): DatabaseConfig {
  const connectionString = getDatabaseConnectionString();
  const schema = getDatabaseSchema();

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid DB_SCHEMA: ${schema}`);
  }

  let host = env("DB_HOST") ?? "";
  let port = Number(env("DB_PORT") ?? 5432);
  let database = env("DB_NAME") ?? "";
  let user = resolveDbUser() ?? "";

  try {
    const parsed = new URL(connectionString);
    host = parsed.hostname || host;
    port = parsed.port ? Number(parsed.port) : port;
    database = parsed.pathname.replace(/^\//, "") || database;
    if (!user) {
      user = decodeURIComponent(parsed.username);
    }
  } catch {
    /* keep env fallbacks */
  }

  return {
    connectionString,
    schema,
    host,
    port,
    database,
    user,
  };
}

export function formatDatabaseConfigLog(config: DatabaseConfig): string {
  return `[DB] envFile=${PROJECT_ENV_FILE} host=${config.host} port=${config.port} database=${config.database} user=${config.user} schema=${config.schema}`;
}
