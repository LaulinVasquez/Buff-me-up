import { PageShell } from "@/components/page-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type HomeProps = Readonly<{ searchParams: Promise<{ error?: string }> }>;

export default async function Home({ searchParams }: HomeProps) {
  const { error } = await searchParams;
  return <PageShell>
    <section className="flex flex-1 flex-col justify-center py-12">
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-lime-400">Buff Me Up</p>
      <h1 className="max-w-md text-4xl font-black tracking-tight text-balance sm:text-5xl">Your workouts.<br />Your progress.<br /><span className="text-lime-400">No clutter.</span></h1>
      <p className="mt-5 max-w-md text-lg leading-8 text-slate-400">Track your workouts and stay consistent with a gym companion built for your phone.</p>
      {error ? <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200" role="alert"><strong className="block text-red-100">We couldn&apos;t sign you in.</strong>Please try again. If the problem continues, contact the site owner.</div> : null}
      <GoogleSignInButton />
    </section>
    <footer className="text-sm text-slate-500">Built for consistency.</footer>
  </PageShell>;
}
