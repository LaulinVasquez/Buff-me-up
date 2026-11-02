import type { ReactNode } from "react";
import { AppNavigation } from "@/components/navigation/app-navigation";

export function ApplicationShell({ children, userMenu }: Readonly<{ children: ReactNode; userMenu: ReactNode }>) {
  return <div className="min-h-dvh lg:pl-60">
    <a className="sr-only z-50 rounded-xl bg-accent-400 p-3 font-bold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#main-content">Skip to content</a>
    <AppNavigation />
    <div className="mx-auto w-full max-w-3xl px-[max(1.25rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-[max(2rem,env(safe-area-inset-left),env(safe-area-inset-right))] lg:max-w-7xl lg:px-8 xl:px-12">
      <header className="flex min-h-14 items-center justify-between gap-4 border-slate-800/70 lg:border-b lg:pb-5">
        <p className="shrink-0 text-sm font-bold uppercase tracking-[0.2em] text-accent-400 lg:hidden">Buff Me Up</p>
        <p className="hidden text-sm text-slate-400 lg:block">Make time for progress.</p>
        {userMenu}
      </header>
      <div id="main-content" tabIndex={-1}>{children}</div>
    </div>
  </div>;
}
