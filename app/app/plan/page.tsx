import Link from "next/link";
import { recommendedPlans } from "@/data/recommended-plans";
import { getPlans } from "@/lib/workouts/plans";
import { SubmitButton } from "@/components/forms/submit-button";
import { adoptRecommendedPlan, createCustomPlan } from "./actions";

type Props = Readonly<{ searchParams: Promise<{ deleted?: string; error?: string }> }>;

export default async function PlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const plans = await getPlans().catch(() => []);
  const activePlan = plans.find((plan) => plan.isActive);
  const inactivePlans = plans.filter((plan) => !plan.isActive);

  return <main className="pb-28 pt-10">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-400">Plan</p>
    <h1 className="mt-3 text-3xl font-black tracking-tight">Build your routine.</h1>
    <p className="mt-3 leading-7 text-slate-400">Use a proven template or create a plan that is entirely yours.</p>
    {params.deleted ? <Notice tone="success">Plan deleted.</Notice> : null}
    {params.error ? <Notice tone="error">That change could not be saved. Please try again.</Notice> : null}

    <section className="mt-10">
      <h2 className="text-xl font-bold">Active plan</h2>
      <div className="mt-4 space-y-3">
        {activePlan ? <PlanLink plan={activePlan} /> : <p className="rounded-2xl border border-dashed border-slate-700 p-5 text-slate-400">No active plan. Open one of your plans below to activate it.</p>}
      </div>
    </section>

    {inactivePlans.length ? <section className="mt-8"><h2 className="text-lg font-bold">Other plans</h2><p className="mt-1 text-sm text-slate-500">Custom and adopted plans that are not currently active.</p><div className="mt-4 space-y-3">{inactivePlans.map((plan) => <PlanLink key={plan.id} plan={plan} />)}</div></section> : null}

    <details className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <summary className="min-h-10 cursor-pointer font-bold">+ Create custom plan</summary>
      <form action={createCustomPlan} className="mt-5 space-y-4">
        <Field label="Plan name" name="name" placeholder="My 5-Day Split" required />
        <Field label="Description" name="description" placeholder="Optional goal or focus" />
        <SubmitButton className="min-h-12 w-full rounded-xl bg-lime-400 font-bold text-slate-950 disabled:opacity-60">Create plan</SubmitButton>
      </form>
    </details>

    <section className="mt-12 space-y-5">
      <div><h2 className="text-xl font-bold">Recommended plans</h2><p className="mt-1 text-sm text-slate-400">Preview every workout and exercise before choosing.</p></div>
      {recommendedPlans.map((plan) => <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5" key={plan.id}>
        <div className="flex items-start justify-between gap-4">
          <div><h3 className="text-lg font-bold">{plan.name}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{plan.description}</p></div>
          <span className="shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-xs">{plan.days.length} days</span>
        </div>
        <details className="mt-5">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-lime-400">Preview workouts</summary>
          <div className="space-y-4 pt-3">
            {plan.days.map((day) => <div className="rounded-xl bg-slate-950/60 p-4" key={day.name}>
              <h4 className="font-bold">{day.name}</h4>
              <div className="mt-3 space-y-2">{day.exercises.map((exercise) => <details className="group" key={exercise.name}>
                <summary className="flex min-h-10 cursor-pointer items-center justify-between text-sm"><span>{exercise.name}</span><span className="text-slate-500">{exercise.sets} × {exercise.targetReps}</span></summary>
                <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
                  <p className="font-semibold text-lime-400">{exercise.muscleGroup} · {exercise.equipment}</p>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-300">{exercise.instructions.map((step) => <li key={step}>{step}</li>)}</ol>
                  <p className="mt-3 text-xs text-slate-500">General guidance only; use qualified coaching when needed.</p>
                </div>
              </details>)}</div>
            </div>)}
          </div>
        </details>
        <form action={adoptRecommendedPlan} className="mt-5">
          <input name="recommendationId" type="hidden" value={plan.id} />
          <SubmitButton className="min-h-12 w-full rounded-xl bg-lime-400 px-5 font-bold text-slate-950 hover:bg-lime-300 disabled:opacity-60" pendingLabel="Creating plan...">Use this plan</SubmitButton>
        </form>
      </article>)}
    </section>
  </main>;
}

function Field({ label, ...props }: Readonly<{ label: string; name: string; placeholder?: string; required?: boolean }>) {
  return <label className="block text-sm font-semibold">{label}<input className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 font-normal outline-none focus:border-lime-400" {...props} /></label>;
}
function Notice({ children, tone }: Readonly<{ children: React.ReactNode; tone: "success" | "error" }>) {
  return <p className={`mt-5 rounded-xl p-4 text-sm ${tone === "success" ? "bg-lime-400/10 text-lime-300" : "bg-red-400/10 text-red-200"}`}>{children}</p>;
}
function PlanLink({ plan }: Readonly<{ plan: Awaited<ReturnType<typeof getPlans>>[number] }>) {
  return <Link className={`flex min-h-16 items-center justify-between rounded-2xl border p-4 hover:border-slate-600 ${plan.isActive ? "border-lime-400/30 bg-lime-400/10" : "border-slate-800 bg-slate-900/70"}`} href={`/app/plan/${plan.id}`}><span><strong className="block">{plan.name}</strong><span className="text-sm capitalize text-slate-500">{plan.source} plan</span></span><span className={`rounded-full px-3 py-1 text-xs font-bold ${plan.isActive ? "bg-lime-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>{plan.isActive ? "Active" : "Manage"}</span></Link>;
}
