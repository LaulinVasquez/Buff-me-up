"use client";

export default function ApplicationError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return <main className="flex min-h-[70dvh] items-center"><section className="w-full rounded-3xl border border-red-400/20 bg-red-400/10 p-6"><h1 className="text-xl font-bold">Something didn&apos;t load.</h1><p className="mt-2 text-sm leading-6 text-red-100/70">Your data is still safe. Check your connection and try again.</p><button className="mt-5 min-h-12 w-full rounded-xl bg-white font-bold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-400" onClick={reset} type="button">Try again</button></section></main>;
}
