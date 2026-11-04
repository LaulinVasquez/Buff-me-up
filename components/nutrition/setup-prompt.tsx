"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function NutritionSetupPrompt({ needsSetup }: Readonly<{ needsSetup: boolean }>) {
  const pathname = usePathname();
  if (!needsSetup || pathname.startsWith("/app/nutrition")) return null;
  return <aside aria-label="Nutrition setup" className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent-400/30 bg-accent-400/10 p-4"><div><p className="font-semibold">Make room for meals, too.</p><p className="mt-1 text-sm text-slate-300">Set your food preferences or skip setup for now.</p></div><Link className="flex min-h-11 items-center rounded-xl bg-accent-400 px-4 text-sm font-bold text-slate-950" href="/app/nutrition/setup">Set up nutrition</Link></aside>;
}
