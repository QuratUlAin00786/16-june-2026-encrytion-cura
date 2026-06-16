/**
 * Shared DB settings for Node scripts — reads project root .env file on disk (same as server).
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const ENV_FILE = path.join(__dirname, "..", ".env");
const fileEnv = {};

function normalizeKey(key) {
  return key.trim().replace(/^\uFEFF/, "");
}

if (fs.existsSync(ENV_FILE)) {
  const parsed = dotenv.parse(fs.readFileSync(ENV_FILE, "utf8"));
  for (const [rawKey, value] of Object.entries(parsed)) {
    const key = normalizeKey(rawKey);
    const v = String(value).replace(/^["']|["']$/g, "").trim();
    fileEnv[key] = v;
    process.env[key] = v;
  }
}

function env(key) {
  if (fileEnv[key]) return fileEnv[key];
  const v = process.env[key]?.trim();
  return v ? v.replace(/^["']|["']$/g, "") : undefined;
}

function stripSchemaQueryParam(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("schema");
    return parsed.toString();
  } catch {
    return url.replace(/[?&]schema=[^&]*/gi, "");
  }
}

function getDatabaseConnectionString() {
  const host = env("DB_HOST");
  const port = env("DB_PORT") || "5432";
  const database = env("DB_NAME");
  let user = env("DB_USER");
  const password = env("DB_PASSWORD") ?? "";
  if (user === "cura_user") {
    const urlUser = (() => {
      try {
        return decodeURIComponent(new URL(env("DATABASE_URL") || "").username);
      } catch {
        return "";
      }
    })();
    user = urlUser === "curauser24nov25" ? urlUser : "curauser24nov25";
  }

  if (host && database && user) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }

  const rawUrl = env("DATABASE_URL");
  if (rawUrl) {
    let url = stripSchemaQueryParam(rawUrl);
    const envUser = env("DB_USER");
    if (envUser) {
      try {
        const parsed = new URL(url);
        parsed.username = encodeURIComponent(envUser);
        if (password) parsed.password = encodeURIComponent(password);
        url = parsed.toString();
      } catch {
        /* keep url */
      }
    }
    return url;
  }

  throw new Error(`Set DB_HOST, DB_NAME, DB_USER in ${ENV_FILE}`);
}

function getDatabaseSchema() {
  const fromSchema = env("DB_SCHEMA");
  if (fromSchema) return fromSchema;
  const fromData = env("DB_DATA_SCHEMA");
  if (fromData) return fromData;
  const raw = env("DATABASE_URL");
  if (raw) {
    try {
      const q = new URL(raw).searchParams.get("schema");
      if (q?.trim()) return q.trim();
    } catch {
      /* ignore */
    }
  }
  return "encryption_cura";
}

module.exports = {
  getDatabaseConnectionString,
  getDatabaseSchema,
  ENV_FILE,
};
