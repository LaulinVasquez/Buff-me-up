"use client";

import { useSyncExternalStore } from "react";
import { localDateKey } from "@/lib/dates/local";

export function CompletedTodayBanner({ name, startedAt, completedAt }: Readonly<{ name: string; startedAt: string; completedAt: string }>) {
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  if (!hydrated) return null;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  if (localDateKey(completedAt, timeZone) !== localDateKey(new Date(), timeZone)) return null;
  const minutes = Math.max(1, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000));
  return <section className="mt-6 rounded-2xl border border-lime-400/30 bg-lime-400/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-lime-400">Workout complete ✓</p><div className="mt-2 flex items-center justify-between"><strong>{name}</strong><span className="text-sm text-slate-300">{minutes} min</span></div></section>;
}

function emptySubscribe() { return () => undefined; }
