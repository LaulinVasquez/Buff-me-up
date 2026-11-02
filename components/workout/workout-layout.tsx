import type { ReactNode } from "react";

export function WorkoutLayout({ children, actions }: Readonly<{ children: ReactNode; actions: ReactNode }>) {
  return <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
    <section aria-label="Workout exercises" className="grid min-w-0 items-start gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{children}</section>
    <section aria-label="Workout actions" className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-3xl border-t border-slate-800 bg-slate-950/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur lg:sticky lg:top-6 lg:mx-0 lg:max-w-none lg:rounded-3xl lg:border lg:p-5">{actions}</section>
  </div>;
}
