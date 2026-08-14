"use client";

export default function HistoryError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return <main className="flex min-h-[70dvh] items-center"><section className="w-full rounded-3xl border border-red-400/20 bg-red-400/10 p-6"><h1 className="text-xl font-bold">We couldn&apos;t load your history.</h1><p className="mt-2 text-sm text-red-100/70">Check your connection and try again.</p><button className="mt-5 min-h-12 w-full rounded-xl bg-white font-bold text-slate-950" onClick={reset}>Try again</button></section></main>;
}
