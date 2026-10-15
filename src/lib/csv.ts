const q = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// BOM first so Excel reads the file as UTF-8.
export const toCsv = (rows: (string | number | null | undefined)[][]) =>
  "\uFEFF" + rows.map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";

export const pesos = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));

const p2 = (n: number) => String(n).padStart(2, "0");
export const stamp = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

// Names and numbers: stop spreadsheets from treating them as formulas or numbers.
export const text = (s: string | null) => (s === null ? "" : /^[=+\-@]/.test(s) || /^\d+$/.test(s) ? "'" + s : s);
