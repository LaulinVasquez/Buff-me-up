import { recommendedPlans } from "@/data/recommended-plans";
import { getActivePlan } from "@/lib/workouts/plans";
import { adoptRecommendedPlan } from "./actions";

type PlanPageProps = Readonly<{ searchParams: Promise<{ created?: string; error?: string }> }>;

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const params = await searchParams;
  const activePlan = await getActivePlan().catch(() => null);

  return <main className="pb-28 pt-10">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-400">Your plan</p>
    <h1 className="mt-3 text-3xl font-black tracking-tight">{activePlan ? activePlan.name : "No workout plan yet."}</h1>
    <p className="mt-3 leading-7 text-slate-400">{activePlan ? "This is your active training plan." : "Choose a recommended plan now. You can build a custom plan in the next milestone."}</p>
    {params.created ? <p className="mt-5 rounded-xl bg-lime-400/10 p-4 text-sm text-lime-300">Your plan is ready and active.</p> : null}
    {params.error ? <p className="mt-5 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">We couldn&apos;t create that plan. Confirm the Milestone 2 migration is applied, then try again.</p> : null}

    <section className="mt-10 space-y-4">
      <h2 className="text-lg font-bold">Recommended plans</h2>
      {recommendedPlans.map((plan) => <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5" key={plan.id}>
        <div className="flex items-start justify-between gap-4">
          <div><h3 className="font-bold text-slate-100">{plan.name}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{plan.description}</p></div>
          <span className="shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">{plan.days.length} days</span>
        </div>
        <p className="mt-4 text-sm text-slate-500">{plan.days.map((day) => day.name).join(" · ")}</p>
        <form action={adoptRecommendedPlan} className="mt-5">
          <input name="recommendationId" type="hidden" value={plan.id} />
          <button className="min-h-12 w-full rounded-xl bg-lime-400 px-5 font-bold text-slate-950 hover:bg-lime-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-400" type="submit">
            Use this plan
          </button>
        </form>
      </article>)}
    </section>
  </main>;
}
