const INSERT_HEAD_PATTERN =
  /INSERT\s+INTO\s+(?:[`"]?[\w]+[`"]?\.)?[`"[]?patients[`"\]]?\s*\(([^)]+)\)\s*VALUES\s*/gi;

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
  patientid: "patientId",
  patient_id: "patientId",
};

export type ParsedLegacyPatientRow = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  patientId?: string;
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

export function splitSqlValues(valuesSegment: string): string[] {
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

/** Split `(...), (...), (...)` value groups from a VALUES clause body. */
function splitSqlValueTuples(segment: string): string[] {
  const tuples: string[] = [];
  let depth = 0;
  let start = -1;
  let inQuote: "'" | '"' | null = null;

  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    const next = segment[i + 1];

    if (inQuote) {
      if (ch === inQuote && next === inQuote) {
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
      continue;
    }

    if (ch === "(") {
      if (depth === 0) {
        start = i + 1;
      }
      depth++;
      continue;
    }

    if (ch === ")") {
      depth--;
      if (depth === 0 && start >= 0) {
        tuples.push(segment.slice(start, i));
        start = -1;
      }
    }
  }

  return tuples;
}

export function readInsertValuesSection(
  content: string,
  startIndex: number,
): { tuples: string[]; endIndex: number; section: string } {
  let inQuote: "'" | '"' | null = null;
  let end = content.length;

  for (let i = startIndex; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuote) {
      if (ch === inQuote && next === inQuote) {
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
      continue;
    }

    if (ch === ";") {
      end = i;
      break;
    }
  }

  const section = content.slice(startIndex, end);
  let tuples = splitSqlValueTuples(section);
  if (tuples.length === 0) {
    const trimmed = section.trim();
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      tuples = [trimmed.slice(1, -1)];
    }
  }
  return { tuples, endIndex: end, section };
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

function buildRowFromValues(
  columns: string[],
  values: Array<string | null>,
): ParsedLegacyPatientRow {
  const row: ParsedLegacyPatientRow = {};
  const count = Math.min(columns.length, values.length);

  for (let i = 0; i < count; i++) {
    const field = normalizeColumnName(columns[i]);
    const value = values[i]?.trim();
    if (!value) continue;

    if (field === "fullName") row.fullName = value;
    else if (field === "firstName") row.firstName = value;
    else if (field === "lastName") row.lastName = value;
    else if (field === "patientId") row.patientId = value;
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

function buildRow(columns: string[], values: string[]): ParsedLegacyPatientRow {
  const parsed = values.map((v) => unquoteSqlValue(v));
  return buildRowFromValues(columns, parsed);
}

function parseCopyField(raw: string): string | null {
  if (raw === "\\N") return null;
  return raw.replace(/\\(.)/g, (_match, ch: string) => {
    if (ch === "n") return "\n";
    if (ch === "t") return "\t";
    if (ch === "r") return "\r";
    if (ch === "\\") return "\\";
    return ch;
  });
}

const COPY_PATTERN =
  /COPY\s+(?:[`"]?[\w]+[`"]?\.)?[`"]?patients[`"]?\s*\(([^)]+)\)\s*FROM\s+stdin\s*;?/gi;

function parseCopyPatientBlocks(content: string): ParsedLegacyPatientRow[] {
  const rows: ParsedLegacyPatientRow[] = [];
  const pattern = new RegExp(COPY_PATTERN.source, COPY_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const columns = match[1].split(",").map((c) => c.trim());
    const dataStart = match.index + match[0].length;
    const dataSection = content.slice(dataStart);

    for (const line of dataSection.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === "\\." || trimmed === "\\\\.") break;

      const fields = line.split("\t").map(parseCopyField);
      const row = buildRowFromValues(columns, fields);
      if (row.fullName || row.cnic || row.phone || row.email) {
        rows.push(row);
      }
    }
  }

  return rows;
}

function parseInsertPatientBlocks(content: string): ParsedLegacyPatientRow[] {
  const rows: ParsedLegacyPatientRow[] = [];
  const pattern = new RegExp(INSERT_HEAD_PATTERN.source, INSERT_HEAD_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const columns = match[1].split(",").map((c) => c.trim());
    const valuesStart = match.index + match[0].length;
    const { tuples } = readInsertValuesSection(content, valuesStart);

    for (const tuple of tuples) {
      const values = splitSqlValues(tuple);
      const row = buildRow(columns, values);
      if (row.fullName || row.cnic || row.phone || row.email) {
        rows.push(row);
      }
    }
  }

  return rows;
}

export function assertSafeLegacySql(content: string): void {
  const forbiddenLineStart =
    /^\s*(DROP|DELETE|TRUNCATE|ALTER|EXEC|EXECUTE|CREATE\s+(?:LOGIN|USER)|GRANT|REVOKE|UPDATE|MERGE)\b/i;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--") || trimmed === "\\.") continue;
    // Patient data rows in COPY dumps are tab-separated — skip them.
    if (trimmed.includes("\t")) continue;
    if (forbiddenLineStart.test(trimmed)) {
      throw new Error(
        "Uploaded SQL contains forbidden statements. Only patient INSERT or COPY data is allowed.",
      );
    }
  }
}

export function parseLegacyPatientSql(content: string): ParsedLegacyPatientRow[] {
  assertSafeLegacySql(content);

  const insertRows = parseInsertPatientBlocks(content);
  const copyRows = parseCopyPatientBlocks(content);
  const rows = insertRows.length > 0 ? insertRows : copyRows;

  if (rows.length === 0) {
    throw new Error(
      "No patient records found. Expected INSERT INTO patients (...) VALUES (...)[, (...)]; or PostgreSQL COPY patients (...) FROM stdin;",
    );
  }

  return rows;
}

/** Returns parsed statement summaries from the uploaded script (for review; never executed). */
export function extractLegacyInsertStatements(content: string): string[] {
  assertSafeLegacySql(content);

  const statements: string[] = [];
  const insertPattern = new RegExp(INSERT_HEAD_PATTERN.source, INSERT_HEAD_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = insertPattern.exec(content)) !== null) {
    const valuesStart = match.index + match[0].length;
    const { endIndex } = readInsertValuesSection(content, valuesStart);
    const statement = content.slice(match.index, endIndex).trim();
    statements.push(statement.endsWith(";") ? statement : `${statement};`);
  }

  const copyPattern = new RegExp(COPY_PATTERN.source, COPY_PATTERN.flags);
  while ((match = copyPattern.exec(content)) !== null) {
    statements.push(`${match[0].trim()} (COPY data parsed, not executed)`);
  }

  return statements;
}
