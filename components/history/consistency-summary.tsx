"use client";

import { useSyncExternalStore } from "react";
import { calculateCurrentStreak, localDateKey, startOfWeekKey } from "@/lib/dates/local";

export function ConsistencySummary({ timestamps, compact = false }: Readonly<{ timestamps: string[]; compact?: boolean }>) {
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  if (!hydrated) return compact
    ? <div className="mt-6 h-9 w-64 animate-pulse rounded-full bg-slate-800" />
    : <div className="grid grid-cols-2 gap-3"><div className="h-24 rounded-2xl bg-slate-900" /><div className="h-24 rounded-2xl bg-slate-900" /></div>;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = timestamps.filter((value) => localDateKey(value, timeZone).startsWith(month)).length;
  const streak = calculateCurrentStreak(timestamps, timeZone, now);
  const todayKey = localDateKey(now, timeZone);
  const weekStart = startOfWeekKey(todayKey);
  const thisWeek = timestamps.filter((value) => {
    const key = localDateKey(value, timeZone);
    return key >= weekStart && key <= todayKey;
  }).length;
  if (compact) return <div className="mt-6 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-orange-400/10 px-3 py-2 text-orange-200">🔥 {streak}-day streak</span><span className="rounded-full bg-slate-800 px-3 py-2 text-slate-300">{thisWeek} this week</span><span className="rounded-full bg-slate-800 px-3 py-2 text-slate-300">{thisMonth} this month</span></div>;
  const gymDays = new Set(timestamps.map((value) => localDateKey(value, timeZone))).size;
  return <div className="grid grid-cols-2 gap-3"><Stat label="Gym days" value={String(gymDays)} /><Stat label="Current streak" value={`${streak} days`} /><div className="col-span-2"><Stat label="This week" value={`${thisWeek} workouts`} /></div></div>;
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>; }
function emptySubscribe() { return () => undefined; }
