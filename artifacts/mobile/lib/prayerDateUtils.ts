const MS_PER_DAY = 1000 * 60 * 60 * 24;

const DAY_ABBREVS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_ABBREVS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function startOfDayLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseEventDate(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  )
    return null;
  return dt;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function addOneMonth(base: Date): Date {
  const d = new Date(base);
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() !== originalDay) {
    d.setDate(0);
  }
  return d;
}

export function daysUntil(iso: string): number {
  const event = parseEventDate(iso);
  if (!event) return NaN;
  const today = startOfDayLocal(new Date());
  const eventLocal = new Date(event.getUTCFullYear(), event.getUTCMonth(), event.getUTCDate());
  return Math.round((eventLocal.getTime() - today.getTime()) / MS_PER_DAY);
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

  const event = parseEventDate(iso);
  if (!event) return "";

  const today = new Date();
  const sameYear = event.getUTCFullYear() === today.getFullYear();

  if (days > 1 && days <= 7) {
    const dayName = DAY_ABBREVS[new Date(event.getUTCFullYear(), event.getUTCMonth(), event.getUTCDate()).getDay()];
    return `${dayName} ${event.getUTCDate()} ${MONTH_ABBREVS[event.getUTCMonth()]}`;
  }

  if (sameYear) {
    return `${event.getUTCDate()} ${MONTH_ABBREVS[event.getUTCMonth()]}`;
  }
  return `${event.getUTCDate()} ${MONTH_ABBREVS[event.getUTCMonth()]} ${event.getUTCFullYear()}`;
}

export function formatPrayerDateFeed(iso: string): string {
  const days = daysUntil(iso);
  if (isNaN(days) || days < 0) return "";
  if (days === 0) return "Prayer needed today";
  if (days === 1) return "Prayer needed tomorrow";

  const event = parseEventDate(iso);
  if (!event) return "";

  const today = new Date();
  const sameYear = event.getUTCFullYear() === today.getFullYear();

  if (days <= 7) {
    const dayName = DAY_ABBREVS[new Date(event.getUTCFullYear(), event.getUTCMonth(), event.getUTCDate()).getDay()];
    return `Prayer needed ${dayName} ${event.getUTCDate()} ${MONTH_ABBREVS[event.getUTCMonth()]}`;
  }

  if (sameYear) {
    return `Prayer needed ${event.getUTCDate()} ${MONTH_ABBREVS[event.getUTCMonth()]}`;
  }
  return `Prayer needed ${event.getUTCDate()} ${MONTH_ABBREVS[event.getUTCMonth()]} ${event.getUTCFullYear()}`;
}

export function formatPrayerDateLabel(iso: string): string {
  return formatPrayerDateFeed(iso);
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
  )
    return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export interface QuickDateOption {
  key: string;
  label: string;
  sublabel?: string;
  iso: string | null;
  isCustom?: boolean;
}

export function generateQuickDateOptions(from?: Date): QuickDateOption[] {
  const base = startOfDayLocal(from ?? new Date());
  const options: QuickDateOption[] = [];

  options.push({ key: "today", label: "Today", iso: toIso(base) });
  options.push({ key: "tomorrow", label: "Tomorrow", iso: toIso(addDays(base, 1)) });

  for (let i = 2; i <= 4; i++) {
    const d = addDays(base, i);
    const dayName = DAY_ABBREVS[d.getDay()];
    const dateStr = `${d.getDate()} ${MONTH_ABBREVS[d.getMonth()]}`;
    options.push({ key: `day_${i}`, label: `${dayName} ${dateStr}`, iso: toIso(d) });
  }

  options.push({ key: "2_weeks", label: "In 2 weeks", iso: toIso(addDays(base, 14)) });
  options.push({ key: "3_weeks", label: "In 3 weeks", iso: toIso(addDays(base, 21)) });
  options.push({ key: "1_month", label: "In 1 month", iso: toIso(addOneMonth(base)) });
  options.push({ key: "custom", label: "Set a date", iso: null, isCustom: true });

  return options;
}
