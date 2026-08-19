import { assertNoError, getAuthenticatedWorkoutClient } from "./auth";

export type WorkoutReminder = {
  userId: string;
  enabled: boolean;
  days: number[];
  localTime: string;
  updatedAt: string;
};

export type UpsertReminderInput = {
  enabled: boolean;
  days: number[];
  localTime: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseReminderDays(raw: string): number[] {
  const days = raw
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

export function validateReminderInput(input: UpsertReminderInput): UpsertReminderInput {
  if (!TIME_PATTERN.test(input.localTime)) {
    throw new Error("Invalid reminder time");
  }
  const days = [...new Set(input.days)].sort((a, b) => a - b);
  if (days.length < 1 || days.length > 7 || days.some((day) => day < 0 || day > 6)) {
    throw new Error("Select at least one weekday");
  }
  return { enabled: input.enabled, days, localTime: input.localTime };
}

export function formatReminderDays(days: number[]): string {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return "Every day";
  return sorted.map((day) => labels[day]).join(", ");
}

export function formatReminderTime(localTime: string): string {
  const match = localTime.match(/^(\d{2}):(\d{2})/);
  if (!match) return localTime;
  const hour = Number.parseInt(match[1], 10);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

export function parseReminderTimeParts(localTime: string) {
  const match = localTime.match(/^(\d{2}):(\d{2})/);
  if (!match) throw new Error("Invalid reminder time");
  return {
    hour: Number.parseInt(match[1], 10),
    minute: Number.parseInt(match[2], 10),
  };
}

function toWorkoutReminder(row: {
  user_id: string;
  enabled: boolean;
  days: number[];
  local_time: string;
  updated_at: string;
}): WorkoutReminder {
  return {
    userId: row.user_id,
    enabled: row.enabled,
    days: [...row.days].sort((a, b) => a - b),
    localTime: row.local_time.slice(0, 5),
    updatedAt: row.updated_at,
  };
}

export async function getReminder(): Promise<WorkoutReminder | null> {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase
    .from("gym_reminders")
    .select("user_id, enabled, days, local_time, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  assertNoError(error, "Unable to load workout reminder");
  return data ? toWorkoutReminder(data) : null;
}

export async function upsertReminder(input: UpsertReminderInput): Promise<WorkoutReminder> {
  const validated = validateReminderInput(input);
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase
    .from("gym_reminders")
    .upsert(
      {
        user_id: userId,
        enabled: validated.enabled,
        days: validated.days,
        local_time: `${validated.localTime}:00`,
      },
      { onConflict: "user_id" },
    )
    .select("user_id, enabled, days, local_time, updated_at")
    .single();
  assertNoError(error, "Unable to save workout reminder");
  return toWorkoutReminder(data);
}
