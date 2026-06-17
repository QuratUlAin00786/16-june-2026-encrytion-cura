import {
  assertSafeLegacySql,
  readInsertValuesSection,
  splitSqlValues,
} from "./legacy-sql-parser";

const INSERT_USERS_HEAD_PATTERN =
  /INSERT\s+INTO\s+(?:[`"]?[\w]+[`"]?\.)?[`"[]?users[`"\]]?\s*\(([^)]+)\)\s*VALUES\s*/gi;

const USER_COLUMN_ALIASES: Record<string, string> = {
  organizationid: "organizationId",
  organization_id: "organizationId",
  email: "email",
  username: "username",
  passwordhash: "passwordHash",
  password_hash: "passwordHash",
  firstname: "firstName",
  first_name: "firstName",
  lastname: "lastName",
  last_name: "lastName",
  role: "role",
  isactive: "isActive",
  is_active: "isActive",
  dateofbirth: "dateOfBirth",
  date_of_birth: "dateOfBirth",
  genderatbirth: "genderAtBirth",
  gender_at_birth: "genderAtBirth",
};

export type ParsedLegacyUserRow = {
  organizationId?: number;
  email?: string;
  username?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  dateOfBirth?: string;
  genderAtBirth?: string;
};

function normalizeUserColumnName(raw: string): string {
  const key = raw.trim().replace(/[`"[\]]/g, "").toLowerCase();
  return USER_COLUMN_ALIASES[key] || key;
}

function unquoteSqlValue(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^NULL$/i.test(trimmed)) return null;
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed
      .slice(1, -1)
      .replace(/''/g, "'")
      .replace(/""/g, '"')
      .trim();
  }
  return trimmed;
}

function buildUserRow(columns: string[], values: string[]): ParsedLegacyUserRow {
  const row: ParsedLegacyUserRow = {};
  const count = Math.min(columns.length, values.length);

  for (let i = 0; i < count; i++) {
    const field = normalizeUserColumnName(columns[i]);
    const raw = values[i]?.trim();
    if (!raw) continue;
    const value = unquoteSqlValue(raw);
    if (value == null) continue;

    if (field === "organizationId") row.organizationId = Number(value) || undefined;
    else if (field === "email") row.email = value;
    else if (field === "username") row.username = value;
    else if (field === "passwordHash") row.passwordHash = value;
    else if (field === "firstName") row.firstName = value;
    else if (field === "lastName") row.lastName = value;
    else if (field === "role") row.role = value;
    else if (field === "isActive") row.isActive = /^true$/i.test(value) || value === "1";
    else if (field === "dateOfBirth") row.dateOfBirth = value;
    else if (field === "genderAtBirth") row.genderAtBirth = value;
  }

  return row;
}

function parseInsertUserBlocks(content: string): ParsedLegacyUserRow[] {
  const rows: ParsedLegacyUserRow[] = [];
  const pattern = new RegExp(INSERT_USERS_HEAD_PATTERN.source, INSERT_USERS_HEAD_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const columns = match[1].split(",").map((c) => c.trim());
    const valuesStart = match.index + match[0].length;
    const { tuples } = readInsertValuesSection(content, valuesStart);

    for (const tuple of tuples) {
      const values = splitSqlValues(tuple);
      const row = buildUserRow(columns, values);
      if (row.email?.trim()) {
        rows.push(row);
      }
    }
  }

  return rows;
}

export function parseLegacyUserSql(content: string): ParsedLegacyUserRow[] {
  assertSafeLegacySql(content);
  const rows = parseInsertUserBlocks(content);
  if (rows.length === 0) {
    throw new Error(
      "No user records found. Expected INSERT INTO users (...) VALUES (...)[, (...)];",
    );
  }
  return rows;
}

export function extractLegacyUserInsertStatements(content: string): string[] {
  assertSafeLegacySql(content);
  const statements: string[] = [];
  const pattern = new RegExp(INSERT_USERS_HEAD_PATTERN.source, INSERT_USERS_HEAD_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const valuesStart = match.index + match[0].length;
    const { endIndex } = readInsertValuesSection(content, valuesStart);
    const statement = content.slice(match.index, endIndex).trim();
    statements.push(statement.endsWith(";") ? statement : `${statement};`);
  }

  return statements;
}

/** Column order used by Legacy Patient Migration import parsers. */
export const LEGACY_USER_IMPORT_COLUMNS = [
  "organization_id",
  "email",
  "username",
  "password_hash",
  "first_name",
  "last_name",
  "role",
  "is_active",
] as const;

export const LEGACY_PATIENT_IMPORT_COLUMNS = [
  "first_name",
  "last_name",
  "date_of_birth",
  "gender_at_birth",
  "email",
  "phone",
  "nhs_number",
  "address",
  "organization_id",
] as const;

/** Example INSERT templates for admin UI (not executed). */
export const LEGACY_USER_SQL_TEMPLATE = `INSERT INTO users (
  organization_id, email, username, password_hash,
  first_name, last_name, role, is_active
) VALUES
  (20, 'patient.one@example.com', 'patient.one@example.com', NULL, 'Hassan', 'One', 'patient', true),
  (20, 'patient.two@example.com', 'patient.two@example.com', NULL, 'Sara', 'Two', 'patient', true);`;

export const LEGACY_USER_PATIENT_SQL_TEMPLATE = `INSERT INTO patients (
  first_name, last_name, date_of_birth, gender_at_birth,
  email, phone, nhs_number, address, organization_id
) VALUES
  ('Hassan', 'One', '1990-01-15', 'male', 'patient.one@example.com', '+92 3001111111', NULL, '{"street":"Main St","city":"Islamabad","country":"Pakistan"}', 20),
  ('Sara', 'Two', '1992-06-20', 'female', 'patient.two@example.com', '+92 3002222222', NULL, '{"street":"Park Rd","city":"Lahore","country":"Pakistan"}', 20);`;
