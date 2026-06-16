const FORBIDDEN_SQL_PATTERNS =
  /\b(DROP|DELETE|TRUNCATE|ALTER|EXEC|EXECUTE|CREATE\s+LOGIN|CREATE\s+USER|GRANT|REVOKE|UPDATE|MERGE)\b/i;

const INSERT_PATTERN =
  /INSERT\s+INTO\s+[`"[]?patients[`"\]]?\s*\(([^)]+)\)\s*VALUES\s*\(([^;]+)\)/gi;

const COLUMN_ALIASES: Record<string, string> = {
  fullname: "fullName",
  full_name: "fullName",
  name: "fullName",
  patientname: "fullName",
  patient_name: "fullName",
  firstname: "firstName",
  first_name: "firstName",
  lastname: "lastName",
  last_name: "lastName",
  cnic: "cnic",
  nic: "cnic",
  nationalid: "cnic",
  national_id: "cnic",
  nhsnumber: "cnic",
  nhs_number: "cnic",
  phone: "phone",
  phonenumber: "phone",
  phone_number: "phone",
  mobile: "phone",
  email: "email",
  emailaddress: "email",
  email_address: "email",
  dateofbirth: "dateOfBirth",
  date_of_birth: "dateOfBirth",
  dob: "dateOfBirth",
  gender: "gender",
  genderatbirth: "gender",
  gender_at_birth: "gender",
  sex: "gender",
  address: "address",
  streetaddress: "address",
  homeaddress: "address",
};

export type ParsedLegacyPatientRow = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  cnic?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
};

function normalizeColumnName(raw: string): string {
  const key = raw.trim().replace(/[`"[\]]/g, "").toLowerCase();
  return COLUMN_ALIASES[key] || key;
}

function splitSqlValues(valuesSegment: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuote: "'" | '"' | null = null;
  let depth = 0;

  for (let i = 0; i < valuesSegment.length; i++) {
    const ch = valuesSegment[i];
    const next = valuesSegment[i + 1];

    if (inQuote) {
      current += ch;
      if (ch === inQuote && next === inQuote) {
        current += next;
        i++;
        continue;
      }
      if (ch === inQuote) {
        inQuote = null;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      inQuote = ch;
      current += ch;
      continue;
    }

    if (ch === "(") {
      depth++;
      current += ch;
      continue;
    }

    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      current += ch;
      continue;
    }

    if (ch === "," && depth === 0) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    values.push(current.trim());
  }

  return values;
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

function buildRow(columns: string[], values: string[]): ParsedLegacyPatientRow {
  const row: ParsedLegacyPatientRow = {};
  const count = Math.min(columns.length, values.length);

  for (let i = 0; i < count; i++) {
    const field = normalizeColumnName(columns[i]);
    const value = unquoteSqlValue(values[i]);
    if (value == null || value === "") continue;

    if (field === "fullName") row.fullName = value;
    else if (field === "firstName") row.firstName = value;
    else if (field === "lastName") row.lastName = value;
    else if (field === "cnic") row.cnic = value;
    else if (field === "phone") row.phone = value;
    else if (field === "email") row.email = value;
    else if (field === "dateOfBirth") row.dateOfBirth = value;
    else if (field === "gender") row.gender = value;
    else if (field === "address") row.address = value;
  }

  if (!row.fullName && (row.firstName || row.lastName)) {
    row.fullName = `${row.firstName || ""} ${row.lastName || ""}`.trim();
  }

  return row;
}

export function assertSafeLegacySql(content: string): void {
  if (FORBIDDEN_SQL_PATTERNS.test(content)) {
    throw new Error(
      "Uploaded SQL contains forbidden statements. Only INSERT INTO Patients data is allowed.",
    );
  }
}

export function parseLegacyPatientSql(content: string): ParsedLegacyPatientRow[] {
  assertSafeLegacySql(content);

  const rows: ParsedLegacyPatientRow[] = [];
  let match: RegExpExecArray | null;
  const pattern = new RegExp(INSERT_PATTERN.source, INSERT_PATTERN.flags);

  while ((match = pattern.exec(content)) !== null) {
    const columns = match[1].split(",").map((c) => c.trim());
    const values = splitSqlValues(match[2]);
    const row = buildRow(columns, values);
    if (row.fullName || row.cnic || row.phone || row.email) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    throw new Error(
      "No patient INSERT records found. Expected INSERT INTO Patients (...) VALUES (...);",
    );
  }

  return rows;
}
