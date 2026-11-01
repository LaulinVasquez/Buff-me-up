"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { localDateKey } from "@/lib/dates/local";
import { historyHref } from "@/lib/history/progress";
import LoadingHistory from "@/app/app/history/loading";

export function HistoryBootstrap() {
  const router = useRouter();
  useEffect(() => {
    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    router.replace(historyHref("month", localDateKey(now, timeZone), timeZone));
  }, [router]);
  return <LoadingHistory />;
}
