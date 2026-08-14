import type { ReactNode } from "react";

export function PageShell({ children }: Readonly<{ children: ReactNode }>) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8 sm:px-8 sm:py-12">{children}</main>;
}
