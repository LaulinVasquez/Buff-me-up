"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Home", href: "/app", path: "m3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7" },
  { label: "Plan", href: "/app/plan", path: "M8 5H5v16h14V5h-3M8 3h8v5H8V3Zm0 10h8m-8 4h5" },
  { label: "Exercises", href: "/app/exercises", path: "m6 8 10 10M4 10l6-6m4 16 6-6M2 8l6-6m8 20 6-6" },
  { label: "History", href: "/app/history", path: "M4 11a8 8 0 1 1 2 7M4 4v7h7m1-4v5l3 2" },
  { label: "Profile", href: "/app/profile", path: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2" },
] as const;

export function AppNavigation() {
  const pathname = usePathname();
  const inWorkout = pathname.startsWith("/app/workout/");
  return <nav aria-label="Primary" className={`${inWorkout ? "hidden" : "flex"} fixed inset-x-0 bottom-0 z-20 mx-auto min-h-16 w-full max-w-3xl items-center border-t border-slate-800 bg-slate-950/95 px-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:mx-0 lg:flex lg:w-60 lg:flex-col lg:items-stretch lg:overflow-y-auto lg:border-r lg:border-t-0 lg:px-5 lg:pb-6 lg:pt-[calc(2rem+env(safe-area-inset-top))]`}>
    <Link className="mb-12 hidden px-3 text-lg font-black uppercase tracking-[0.15em] text-lime-400 lg:block" href="/app">Buff Me Up<span className="mt-2 block text-[10px] font-medium tracking-[0.2em] text-slate-500">Your training companion</span></Link>
    {items.map((item) => {
      const active = item.href === "/app" ? pathname === "/app" || inWorkout : pathname.startsWith(item.href);
      return <Link aria-current={active ? "page" : undefined} className={`flex min-h-12 min-w-0 flex-1 items-center justify-center gap-3 rounded-xl text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-lime-400 min-[360px]:text-sm lg:mb-2 lg:flex-none lg:justify-start lg:px-4 lg:py-3 ${active ? "text-lime-400 lg:bg-lime-400/10" : "text-slate-400 hover:text-slate-100 lg:hover:bg-slate-800/60"}`} href={item.href} key={item.href}>
        <svg aria-hidden="true" className="hidden size-5 shrink-0 lg:block" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d={item.path} /></svg>
        {item.label}
      </Link>;
    })}
    <p className="mt-auto hidden px-4 pt-12 text-xs leading-6 text-slate-500 lg:block">One session at a time.<br />Keep showing up.</p>
  </nav>;
}
