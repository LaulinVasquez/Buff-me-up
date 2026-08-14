"use client";

import { useState } from "react";

export function LocalDate({ className }: Readonly<{ className?: string }>) {
  const [label] = useState(() =>
    new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()),
  );
  return <p className={className} suppressHydrationWarning>{label}</p>;
}

export function LocalDateTime({ value, mode, className }: Readonly<{ value: string; mode: "date" | "time"; className?: string }>) {
  const [label] = useState(() => new Intl.DateTimeFormat(undefined, mode === "date"
    ? { weekday: "long", month: "long", day: "numeric" }
    : { hour: "numeric", minute: "2-digit" }).format(new Date(value)));
  return <span className={className} suppressHydrationWarning>{label}</span>;
}
