export default function LoadingHistory() {
  return <main aria-busy="true" aria-label="Loading your workout progress" className="animate-pulse pb-28 pt-8 motion-reduce:animate-none">
    <div className="flex justify-between gap-4"><div className="h-3 w-36 rounded bg-slate-800" /><div className="h-6 w-24 rounded-full bg-slate-800" /></div>
    <div className="mt-5 h-20 w-3/4 rounded-2xl bg-slate-800/70" /><div className="mt-4 h-4 w-5/6 rounded bg-slate-800" />
    <div className="mt-7 rounded-[1.75rem] border border-slate-800 bg-slate-900/65 p-4"><div className="h-12 rounded-2xl bg-slate-800" /><div className="mx-auto mt-6 h-5 w-36 rounded bg-slate-800" /><div className="mt-7 h-14 w-24 rounded-xl bg-slate-800" /><div className="mt-6 h-40 rounded-xl bg-slate-800/40" /><div className="mt-6 h-16 rounded-2xl bg-slate-800" /></div>
    <div className="mt-3 grid grid-cols-2 gap-3"><div className="h-28 rounded-[1.75rem] bg-slate-900" /><div className="h-28 rounded-[1.75rem] bg-slate-900" /></div><span className="sr-only">Loading your workout history…</span>
  </main>;
}
