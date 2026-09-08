export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateStr(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== "string") return new Date();
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDaysStr(dateStr: string, days: number): string {
  const date = fromDateStr(dateStr);
  date.setDate(date.getDate() + days);
  return toDateStr(date);
}

export function formatDateStr(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr || "";
  }
  const date = fromDateStr(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}
