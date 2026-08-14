import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function ApplicationHome() {
  return <PageShell>
    <header className="flex items-center justify-between"><p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-400">Buff Me Up</p><span className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400">Preview</span></header>
    <section className="my-auto rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
      <h1 className="text-3xl font-bold tracking-tight">App shell ready</h1>
      <p className="mt-3 leading-7 text-slate-400">This route is prepared for authentication and the workout dashboard in the next milestones.</p>
      <Link className="mt-7 flex min-h-12 items-center justify-center rounded-xl border border-slate-700 px-5 font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-400" href="/">Back to home</Link>
    </section>
  </PageShell>;
}
