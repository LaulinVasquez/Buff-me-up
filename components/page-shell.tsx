import type { ReactNode } from "react";

export function PageShell({ children }: Readonly<{ children: ReactNode }>) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-[max(1.25rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] sm:px-[max(2rem,env(safe-area-inset-left),env(safe-area-inset-right))] sm:pb-[calc(3rem+env(safe-area-inset-bottom))] sm:pt-[calc(3rem+env(safe-area-inset-top))]">{children}</main>;
}
