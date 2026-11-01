import { localDateKey, shiftDateKey } from "../dates/local";

export type HistoryPeriod = "day" | "month" | "year";
export type HistorySession = {
  id: string;
  name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
};
export type ProgressBucket = { key: string; label: string; fullLabel: string; workouts: number; minutes: number };

export function isHistoryPeriod(value: unknown): value is HistoryPeriod {
  return value === "day" || value === "month" || value === "year";
}

export function isValidHistoryDate(value: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const date = new Date(`${value}T12:00:00Z`);
  return year >= 1000 && year <= 9998 && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function historyRange(period: HistoryPeriod, date: string) {
  if (!isValidHistoryDate(date)) throw new Error("Invalid history date");
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const start = period === "year" ? `${year}-01-01` : period === "month" ? `${date.slice(0, 7)}-01` : date;
  const end = period === "year" ? `${year + 1}-01-01`
    : period === "month" ? new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
    : shiftDateKey(date, 1);
  return { start, end };
}

/** Padding covers every IANA offset, including DST; the client filters exact local dates. */
export function historyQueryWindow(period: HistoryPeriod, date: string) {
  const { start, end } = historyRange(period, date);
  return {
    start: new Date(new Date(`${start}T00:00:00Z`).getTime() - 2 * 86400000).toISOString(),
    end: new Date(new Date(`${end}T00:00:00Z`).getTime() + 2 * 86400000).toISOString(),
  };
}

export function shiftHistoryDate(date: string, period: HistoryPeriod, amount: number) {
  if (period === "day") return shiftDateKey(date, amount);
  const [year, month, day] = date.split("-").map(Number);
  const first = new Date(Date.UTC(year + (period === "year" ? amount : 0), month - 1 + (period === "month" ? amount : 0), 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}

export function historyHref(period: HistoryPeriod, date: string, timeZone: string) {
  return `/app/history?${new URLSearchParams({ view: period, date, tz: timeZone })}`;
}

export function periodLabel(period: HistoryPeriod, date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", year: "numeric",
    ...(period !== "year" ? { month: period === "day" ? "short" : "long" } as const : {}),
    ...(period === "day" ? { day: "numeric" } as const : {}),
  }).format(new Date(`${date}T12:00:00Z`));
}

export function sessionMinutes(session: HistorySession) {
  if (!session.completed_at) return 0;
  const elapsed = (new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000;
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

export function formatTrainingTime(minutes: number) {
  if (minutes > 0 && minutes < 1) return "<1m";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ""}` : `${rounded}m`;
}

export function buildHistoryProgress(sessions: HistorySession[], period: HistoryPeriod, date: string, timeZone: string) {
  const { start, end } = historyRange(period, date);
  const buckets: ProgressBucket[] = [];
  if (period === "day") {
    for (let hour = 0; hour < 24; hour += 1) {
      const label = hour === 0 ? "12a" : hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`;
      buckets.push({ key: String(hour), label, fullLabel: `${label.replace("a", " am").replace("p", " pm")} local time`, workouts: 0, minutes: 0 });
    }
  } else if (period === "month") {
    for (let key = start; key < end; key = shiftDateKey(key, 1)) {
      buckets.push({ key, label: String(Number(key.slice(8))), fullLabel: periodLabel("day", key), workouts: 0, minutes: 0 });
    }
  } else {
    for (let month = 1; month <= 12; month += 1) {
      const key = `${date.slice(0, 4)}-${String(month).padStart(2, "0")}-01`;
      buckets.push({ key, label: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)), fullLabel: periodLabel("month", key), workouts: 0, minutes: 0 });
    }
  }
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const hourFormatter = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" });
  const visibleSessions = sessions.filter((session) => {
    if (session.status !== "completed" || !session.completed_at || !Number.isFinite(new Date(session.completed_at).getTime())) return false;
    const key = localDateKey(session.completed_at, timeZone);
    return key >= start && key < end;
  }).sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime() || a.id.localeCompare(b.id));
  const activeDates = new Set<string>();
  let minutes = 0;
  for (const session of visibleSessions) {
    const localDate = localDateKey(session.completed_at!, timeZone);
    const key = period === "year" ? `${localDate.slice(0, 7)}-01` : period === "month" ? localDate : String(Number(hourFormatter.format(new Date(session.completed_at!))));
    const bucket = byKey.get(key);
    const duration = sessionMinutes(session);
    if (bucket) { bucket.workouts += 1; bucket.minutes += duration; }
    activeDates.add(localDate);
    minutes += duration;
  }
  return { buckets, sessions: visibleSessions, workouts: visibleSessions.length, minutes, activeDays: activeDates.size };
}
