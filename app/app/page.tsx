export default function ApplicationHome() {
  return <main className="flex min-h-[calc(100dvh-9rem)] items-center py-10 pb-24">
    <section className="w-full rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
      <span className="inline-flex rounded-full bg-lime-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-lime-400">Authenticated</span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight">You&apos;re signed in.</h1>
      <p className="mt-3 leading-7 text-slate-400">Your secure application shell is ready. Workout functionality arrives in a later milestone.</p>
    </section>
  </main>;
}
