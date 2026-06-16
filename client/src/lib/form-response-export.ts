import {
  formatSignatureExportLabel,
  isSignatureStrokeData,
  signatureValueToDataUrl,
} from "@/lib/signature-export";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const formatFormResponseScalar = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (isSignatureStrokeData(value)) return formatSignatureExportLabel(value) || "Signed";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const resolveSignatureDataUrl = (value: unknown): string | null =>
  signatureValueToDataUrl(value);

export type FormResponseExportRow = {
  cells: string[];
  signatureCells: Map<number, string>;
};

export const buildFormResponseExportRows = (
  baseCells: string[],
  fieldValues: unknown[],
): FormResponseExportRow => {
  const cells = [...baseCells];
  const signatureCells = new Map<number, string>();

  fieldValues.forEach((value) => {
    const columnIndex = cells.length;
    const dataUrl = resolveSignatureDataUrl(value);
    if (dataUrl) {
      signatureCells.set(columnIndex, dataUrl);
      cells.push("Signed");
      return;
    }
    cells.push(formatFormResponseScalar(value));
  });

  return { cells, signatureCells };
};

export const buildExcelHtmlTable = (
  title: string,
  headers: string[],
  rows: FormResponseExportRow[],
): string => {
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyHtml = rows
    .map(({ cells, signatureCells }) => {
      const rowHtml = cells
        .map((cell, columnIndex) => {
          const image = signatureCells.get(columnIndex);
          if (image) {
            return `<td style="vertical-align:middle;text-align:center;padding:8px;"><img src="${image}" alt="Signature" width="180" height="60" style="display:block;margin:0 auto;border:1px solid #d1d5db;background:#fff;" /></td>`;
          }
          return `<td style="vertical-align:top;padding:8px;">${escapeHtml(cell)}</td>`;
        })
        .join("");
      return `<tr>${rowHtml}</tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Responses</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; }
    th { background: #f3f4f6; font-weight: 600; padding: 8px; }
  </style>
</head>
<body>
  <h2>${escapeHtml(title)}</h2>
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
</body>
</html>`;
};

export const downloadExcelHtml = (filename: string, html: string) => {
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
