// Simple ISO → human-readable RU formatter.
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return String(value);
  }
}
