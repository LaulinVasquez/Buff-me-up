"use client";

import { useState } from "react";

export function LocalGreeting() {
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  });
  return <p className="mt-3 text-sm font-semibold text-slate-400" suppressHydrationWarning>{greeting}</p>;
}
