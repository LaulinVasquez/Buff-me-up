import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function Home() {
  return <PageShell>
    <section className="flex flex-1 flex-col justify-center py-12">
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-lime-400">Buff Me Up</p>
      <h1 className="max-w-md text-4xl font-black tracking-tight text-balance sm:text-5xl">Your workout, ready when you are.</h1>
      <p className="mt-5 max-w-md text-lg leading-8 text-slate-400">A focused gym tracker built for fast, one-handed use. Secure sign-in is coming next.</p>
      <Link className="mt-9 flex min-h-14 w-full items-center justify-center rounded-2xl bg-lime-400 px-6 font-bold text-slate-950 hover:bg-lime-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-400" href="/app">Preview app shell</Link>
    </section>
    <footer className="text-sm text-slate-500">Foundation milestone</footer>
  </PageShell>;
}
