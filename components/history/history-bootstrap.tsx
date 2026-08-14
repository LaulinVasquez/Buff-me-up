"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function HistoryBootstrap() {
  const router = useRouter();
  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    router.replace(`/app/history?month=${month}&tz=${encodeURIComponent(timeZone)}`);
  }, [router]);
  return <main className="pb-28 pt-10"><p className="text-sm font-bold uppercase tracking-wider text-lime-400">History</p><div className="mt-6 h-64 animate-pulse rounded-3xl bg-slate-900" /></main>;
}
