const MS_PER_DAY = 1000 * 60 * 60 * 24;

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function parseEventDate(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) return null;
  return dt;
}

export function daysUntil(iso: string): number {
  const event = parseEventDate(iso);
  if (!event) return NaN;
  const today = startOfDayUtc(new Date());
  return Math.round((event.getTime() - today.getTime()) / MS_PER_DAY);
}

export function isDatePassed(iso: string): boolean {
  const days = daysUntil(iso);
  return !isNaN(days) && days < 0;
}

export function formatPrayerDate(iso: string): string {
  const days = daysUntil(iso);
  if (isNaN(days)) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days <= 6) return `In ${days} days`;
  if (days < -1 && days >= -6) return `${Math.abs(days)} days ago`;

  const event = parseEventDate(iso);
  if (!event) return "";
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date();
  const sameYear = event.getUTCFullYear() === today.getFullYear();
  if (sameYear) {
    return `${event.getUTCDate()} ${monthNames[event.getUTCMonth()]}`;
  }
  return `${event.getUTCDate()} ${monthNames[event.getUTCMonth()]} ${event.getUTCFullYear()}`;
}

export function formatPrayerDateLabel(iso: string, posterFirstName?: string): string {
  const days = daysUntil(iso);
  if (isNaN(days)) return "";
  const name = posterFirstName ? `${posterFirstName}'s` : "A";
  if (days === 0) return `${name} prayer date is today`;
  if (days === 1) return `Prayer needed tomorrow`;
  if (days > 1 && days <= 6) return `Prayer needed in ${days} days`;
  const formatted = formatPrayerDate(iso);
  if (days > 0) return `Prayer date: ${formatted}`;
  return "";
}

export function reminderDateFor(eventIso: string): string | null {
  const event = parseEventDate(eventIso);
  if (!event) return null;
  const reminder = new Date(event.getTime() - MS_PER_DAY);
  const y = reminder.getUTCFullYear();
  const m = String(reminder.getUTCMonth() + 1).padStart(2, "0");
  const d = String(reminder.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildIsoFromParts(day: string, month: string, year: string): string | null {
  if (!day || !month || year.length !== 4) return null;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
