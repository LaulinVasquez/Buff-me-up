"use server";

import { revalidatePath } from "next/cache";
import { parseReminderDays, upsertReminder, type WorkoutReminder } from "@/lib/workouts/reminders";

export async function saveWorkoutReminder(form: FormData): Promise<
  | { ok: true; reminder: WorkoutReminder }
  | { ok: false; error: "reminder_save_failed" }
> {
  try {
    const enabled = form.get("enabled") === "on";
    const days = parseReminderDays(String(form.get("days") ?? ""));
    const localTime = String(form.get("localTime") ?? "").trim();
    const reminder = await upsertReminder({ enabled, days, localTime });
    revalidatePath("/app/profile");
    return { ok: true, reminder };
  } catch {
    return { ok: false, error: "reminder_save_failed" };
  }
}

export async function loadWorkoutReminder() {
  const { getReminder } = await import("@/lib/workouts/reminders");
  return getReminder();
}
