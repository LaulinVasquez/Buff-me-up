"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Home", href: "/app" },
  { label: "Plan", href: "/app/plan" },
  { label: "Exercises", href: "/app/exercises" },
  { label: "History", href: "/app/history" },
  { label: "Profile", href: "/app/profile" },
] as const;

export function AppNavigation() {
  const pathname = usePathname();
  if (pathname.startsWith("/app/workout/")) return null;
  return <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-20 mx-auto flex min-h-16 max-w-lg items-center justify-around border-t border-slate-800 bg-slate-950/95 px-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] backdrop-blur">
    {items.map((item) => {
      const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
      return <Link aria-current={active ? "page" : undefined} className={`flex min-h-12 min-w-16 items-center justify-center text-sm font-semibold ${active ? "text-lime-400" : "text-slate-400"}`} href={item.href} key={item.href}>{item.label}</Link>;
    })}
  </nav>;
}
