"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { isNativeApp } from "@/lib/capacitor/runtime";
import { applyLocalReminder } from "@/lib/notifications/local-reminders";
import { loadWorkoutReminder } from "@/app/app/profile/actions";

export function NativeReminderSync() {
  useEffect(() => {
    if (!isNativeApp()) return;

    let active = true;

    async function syncReminder() {
      try {
        const reminder = await loadWorkoutReminder();
        if (!active) return;
        await applyLocalReminder(reminder);
      } catch {
        // Ignore sync failures; the profile card can retry on save.
      }
    }

    void syncReminder();

    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void syncReminder();
    });

    return () => {
      active = false;
      void listener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
