/** Escape a value for use inside a PostgreSQL single-quoted string literal. */
export function sqlQuoteString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  if (value instanceof Date) return sqlQuoteString(value.toISOString());
  if (Array.isArray(value)) {
    if (value.length === 0) return "ARRAY[]::text[]";
    return `ARRAY[${value.map((item) => sqlLiteral(item)).join(", ")}]`;
  }
  if (typeof value === "object") {
    const json = JSON.stringify(value);
    return `${sqlQuoteString(json)}::jsonb`;
  }
  return sqlQuoteString(String(value));
}

/** Plain literals for import-compatible SQL (no ::jsonb / ARRAY casts). */
export function sqlImportLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  return sqlQuoteString(String(value));
}

export type SqlLiteralFn = (value: unknown) => string;

const INSERT_BATCH_SIZE = 50;

export function buildInsertStatements(
  tableName: string,
  columns: string[],
  rows: unknown[][],
  literalFn: SqlLiteralFn = sqlLiteral,
): string {
  if (rows.length === 0) {
    return `-- No rows to export for ${tableName}\n`;
  }

  const lines: string[] = [];
  const columnList = columns.join(", ");

  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
    const valueTuples = batch
      .map((row) => `  (${row.map((cell) => literalFn(cell)).join(", ")})`)
      .join(",\n");
    lines.push(`INSERT INTO ${tableName} (${columnList}) VALUES\n${valueTuples};`);
  }

  return `${lines.join("\n\n")}\n`;
}

/** INSERT statements using plain quoted strings (matches migration upload templates). */
export function buildImportInsertStatements(
  tableName: string,
  columns: string[],
  rows: unknown[][],
): string {
  return buildInsertStatements(tableName, columns, rows, sqlImportLiteral);
}
