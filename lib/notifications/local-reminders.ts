import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativeApp } from "@/lib/capacitor/runtime";
import { parseReminderTimeParts, type WorkoutReminder } from "@/lib/workouts/reminders";

const REMINDER_ID_BASE = 1000;

export type ApplyLocalReminderResult =
  | { status: "skipped" }
  | { status: "cancelled" }
  | { status: "scheduled"; count: number }
  | { status: "permission-denied" };

function reminderNotificationIds() {
  return Array.from({ length: 7 }, (_, day) => REMINDER_ID_BASE + day);
}

function notificationIdForDay(day: number) {
  return REMINDER_ID_BASE + day;
}

export async function cancelLocalReminders() {
  if (!isNativeApp()) return;
  await LocalNotifications.cancel({ notifications: reminderNotificationIds().map((id) => ({ id })) });
}

export async function applyLocalReminder(reminder: WorkoutReminder | null): Promise<ApplyLocalReminderResult> {
  if (!isNativeApp()) return { status: "skipped" };

  await cancelLocalReminders();

  if (!reminder || !reminder.enabled) {
    return { status: "cancelled" };
  }

  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") {
    return { status: "permission-denied" };
  }

  const { hour, minute } = parseReminderTimeParts(reminder.localTime);
  const notifications = reminder.days.map((day) => ({
    id: notificationIdForDay(day),
    title: "Time to train",
    body: "Log your workout in Buff Me Up",
    schedule: {
      on: {
        weekday: day + 1,
        hour,
        minute,
      },
      repeats: true,
      allowWhileIdle: true,
    },
  }));

  await LocalNotifications.schedule({ notifications });
  return { status: "scheduled", count: notifications.length };
}
