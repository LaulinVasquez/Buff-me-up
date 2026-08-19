"use client";

import { useTransition } from "react";
import { signOut } from "@/app/app/actions";
import { cancelLocalReminders } from "@/lib/notifications/local-reminders";
import { isNativeApp } from "@/lib/capacitor/runtime";

export function SignOutForm() {
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      if (isNativeApp()) {
        await cancelLocalReminders();
      }
      await signOut();
    });
  }

  return (
    <button
      className="min-h-12 w-full rounded-xl border border-slate-700 font-semibold text-slate-200 disabled:opacity-60"
      disabled={pending}
      onClick={handleSignOut}
      type="button"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
