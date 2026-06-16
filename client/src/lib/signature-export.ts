export type SignatureStrokePoint = {
  command?: string;
  x: number;
  y: number;
};

const isPoint = (value: unknown): value is SignatureStrokePoint =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as SignatureStrokePoint).x === "number" &&
  typeof (value as SignatureStrokePoint).y === "number";

export const isDataUrlImage = (value: string): boolean =>
  /^data:image\/[a-zA-Z+]+;base64,/.test(value.trim());

export const isSignatureStrokeData = (value: unknown): boolean => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (isDataUrlImage(trimmed)) return true;
    if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return false;
    try {
      return isSignatureStrokeData(JSON.parse(trimmed));
    } catch {
      return false;
    }
  }

  if (!Array.isArray(value) || value.length === 0) return false;

  if (value.every(isPoint)) return true;

  return value.some((entry) => Array.isArray(entry) && entry.length > 0 && entry.every(isPoint));
};

const flattenStrokePoints = (value: unknown): SignatureStrokePoint[] => {
  if (!Array.isArray(value)) return [];
  if (value.every(isPoint)) return value as SignatureStrokePoint[];
  return value.flatMap((entry) => (Array.isArray(entry) ? entry.filter(isPoint) : []));
};

const parseSignatureValue = (value: unknown): SignatureStrokePoint[] | string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (isDataUrlImage(trimmed)) return trimmed;
    try {
      const parsed = JSON.parse(trimmed);
      if (isSignatureStrokeData(parsed)) {
        const points = flattenStrokePoints(parsed);
        return points.length > 0 ? points : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  if (isSignatureStrokeData(value)) {
    const points = flattenStrokePoints(value);
    return points.length > 0 ? points : null;
  }

  return null;
};

export const signatureValueToDataUrl = (
  value: unknown,
  width = 420,
  height = 140,
): string | null => {
  const parsed = parseSignatureValue(value);
  if (!parsed) return null;
  if (typeof parsed === "string") return parsed;

  const points = parsed;
  if (points.length === 0) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(maxX - minX, 1);
  const rangeY = Math.max(maxY - minY, 1);
  const padding = 12;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  const scale = Math.min(drawWidth / rangeX, drawHeight / rangeY);
  const offsetX = padding + (drawWidth - rangeX * scale) / 2;
  const offsetY = padding + (drawHeight - rangeY * scale) / 2;

  const mapPoint = (point: SignatureStrokePoint) => ({
    x: offsetX + (point.x - minX) * scale,
    y: offsetY + (point.y - minY) * scale,
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let hasDrawn = false;
  points.forEach((point, index) => {
    const mapped = mapPoint(point);
    const command = (point.command || (index === 0 ? "M" : "L")).toUpperCase();
    if (command === "M" || index === 0) {
      ctx.beginPath();
      ctx.moveTo(mapped.x, mapped.y);
    } else {
      ctx.lineTo(mapped.x, mapped.y);
      hasDrawn = true;
    }
  });
  ctx.stroke();

  if (!hasDrawn && points.length > 0) {
    const mapped = mapPoint(points[0]);
    ctx.beginPath();
    ctx.arc(mapped.x, mapped.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL("image/png");
};

export const formatSignatureExportLabel = (value: unknown): string => {
  if (!isSignatureStrokeData(value)) return "";
  return "Signed";
};
