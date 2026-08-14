export function localDateKey(value: string | Date, timeZone?: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * A current streak is consecutive local attendance days ending today or
 * yesterday. This preserves yesterday's streak throughout the current day.
 */
export function calculateCurrentStreak(timestamps: string[], timeZone: string, now = new Date()) {
  const days = new Set(timestamps.map((value) => localDateKey(value, timeZone)));
  const today = localDateKey(now, timeZone);
  const yesterday = shiftDateKey(today, -1);
  let cursor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  let streak = 0;
  while (cursor && days.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export function shiftDateKey(key: string, amount: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
