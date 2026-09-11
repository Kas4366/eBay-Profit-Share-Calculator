export function parseCurrency(value: string): number {
  if (!value || value === "--" || value.trim() === "") return 0;
  const cleaned = value.replace(/[£$€,\s]/g, "").replace(/[^\d.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseIntSafe(value: string): number {
  if (!value || value.trim() === "") return 0;
  const cleaned = value.replace(/[,\s]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        current.push(field);
        field = "";
      } else if (char === "\n") {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
      } else if (char === "\r") {
        // skip
      } else {
        field += char;
      }
    }
  }
  if (field !== "" || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows;
}

export function findColumnIndex(
  headers: string[],
  candidates: string[]
): number {
  const normalized = headers.map((h) => h.trim().toLowerCase().replace(/\s+/g, " "));
  for (const candidate of candidates) {
    const target = candidate.trim().toLowerCase().replace(/\s+/g, " ");
    const idx = normalized.findIndex((h) => h === target);
    if (idx !== -1) return idx;
  }
  // Try partial match as fallback
  for (const candidate of candidates) {
    const target = candidate.trim().toLowerCase();
    const idx = normalized.findIndex((h) => h.includes(target));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function cleanBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}
