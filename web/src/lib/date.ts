export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
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
  return fromDateStr(dateStr).toLocaleDateString(undefined, { dateStyle: "medium" });
}
