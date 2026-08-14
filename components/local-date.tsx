"use client";

import { useState } from "react";

export function LocalDate({ className }: Readonly<{ className?: string }>) {
  const [label] = useState(() =>
    new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()),
  );
  return <p className={className} suppressHydrationWarning>{label}</p>;
}
