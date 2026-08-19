"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWorkoutReminder } from "@/app/app/profile/actions";
import { applyLocalReminder } from "@/lib/notifications/local-reminders";
import { isNativeApp } from "@/lib/capacitor/runtime";
import {
  formatReminderDays,
  formatReminderTime,
  type WorkoutReminder,
} from "@/lib/workouts/reminders";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

const DEFAULT_DAYS = [1, 2, 3, 4, 5];
const DEFAULT_TIME = "18:00";

type ReminderCardProps = Readonly<{
  initialReminder: WorkoutReminder | null;
}>;

export function ReminderCard({ initialReminder }: ReminderCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(!initialReminder);
  const [reminder, setReminder] = useState(initialReminder);
  const [selectedDays, setSelectedDays] = useState<number[]>(initialReminder?.days ?? DEFAULT_DAYS);
  const [localTime, setLocalTime] = useState(initialReminder?.localTime ?? DEFAULT_TIME);
  const [enabled, setEnabled] = useState(initialReminder?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm(next: WorkoutReminder | null) {
    setSelectedDays(next?.days ?? DEFAULT_DAYS);
    setLocalTime(next?.localTime ?? DEFAULT_TIME);
    setEnabled(next?.enabled ?? true);
  }

  function toggleDay(day: number) {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        if (current.length === 1) return current;
        return current.filter((value) => value !== day);
      }
      return [...current, day].sort((a, b) => a - b);
    });
  }

  function handleEdit() {
    setError(null);
    setNotice(null);
    resetForm(reminder);
    setEditing(true);
  }

  function handleCancel() {
    setError(null);
    setNotice(null);
    resetForm(reminder);
    setEditing(reminder === null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const formData = new FormData();
    formData.set("days", selectedDays.join(","));
    formData.set("localTime", localTime);
    if (enabled) formData.set("enabled", "on");

    startTransition(async () => {
      const result = await saveWorkoutReminder(formData);
      if (!result.ok) {
        setError("Could not save your reminder. Try again.");
        return;
      }

      setReminder(result.reminder);
      setEditing(false);

      const applyResult = await applyLocalReminder(result.reminder);
      if (applyResult.status === "permission-denied") {
        setNotice("Reminder saved, but notifications are off for Buff Me Up on this phone.");
      } else if (isNativeApp() && result.reminder.enabled && applyResult.status === "scheduled") {
        setNotice("Reminder saved and scheduled on this phone.");
      } else if (!isNativeApp()) {
        setNotice("Reminder saved. Notifications fire in the iOS app.");
      }

      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Workout reminder</p>
          {!editing && reminder ? (
            <p className="mt-2 text-sm text-slate-200">
              {formatReminderDays(reminder.days)} at {formatReminderTime(reminder.localTime)}
            </p>
          ) : !editing ? (
            <p className="mt-2 text-sm text-slate-400">Get a nudge to log your workout.</p>
          ) : null}
          {!editing && reminder ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-lime-400">
              {reminder.enabled ? "On" : "Off"}
            </p>
          ) : null}
        </div>
        {!editing ? (
          <button
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
            onClick={handleEdit}
            type="button"
          >
            {reminder ? "Edit" : "Set reminder"}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-lime-300">{notice}</p> : null}

      {editing ? (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Days</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const active = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    className={`min-h-10 rounded-full px-3 text-sm font-semibold ${
                      active
                        ? "bg-lime-400 text-slate-950"
                        : "border border-slate-700 text-slate-300"
                    }`}
                    onClick={() => toggleDay(day.value)}
                    type="button"
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-500">Time</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100"
              onChange={(event) => setLocalTime(event.target.value)}
              required
              type="time"
              value={localTime}
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3">
            <input
              checked={enabled}
              className="size-4 accent-lime-400"
              onChange={(event) => setEnabled(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-medium text-slate-200">Reminder enabled</span>
          </label>

          {!isNativeApp() ? (
            <p className="text-xs text-slate-500">Local notifications are available in the iOS app.</p>
          ) : null}

          <div className="flex gap-2">
            <button
              className="min-h-11 flex-1 rounded-xl bg-lime-400 font-semibold text-slate-950 disabled:opacity-60"
              disabled={pending || selectedDays.length === 0}
              type="submit"
            >
              {pending ? "Saving..." : "Save reminder"}
            </button>
            {reminder ? (
              <button
                className="min-h-11 rounded-xl border border-slate-700 px-4 font-semibold text-slate-200"
                disabled={pending}
                onClick={handleCancel}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
