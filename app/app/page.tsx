import Link from "next/link";
import { LocalDate } from "@/components/local-date";
import { getActivePlan } from "@/lib/workouts/plans";

export default async function ApplicationHome() {
  const plan = await getActivePlan().catch(() => null);
  const days = plan ? [...plan.gym_workout_days].sort((a, b) => a.day_order - b.day_order) : [];
  const nextDay = days[0];
  const exercises = nextDay ? [...nextDay.gym_exercises].sort((a, b) => a.exercise_order - b.exercise_order) : [];

  return <main className="min-h-[calc(100dvh-9rem)] py-10 pb-28">
    <LocalDate className="text-sm font-bold uppercase tracking-[0.16em] text-lime-400" />
    <h1 className="mt-3 text-3xl font-black tracking-tight">{plan ? plan.name : "Ready when you are."}</h1>
    <p className="mt-2 text-slate-400">{plan ? `${days.length} workout ${days.length === 1 ? "day" : "days"} in your active plan` : "Choose a recommended plan or create your own."}</p>
    {plan ? <section className="mt-9 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your plan</p>
      {nextDay ? <><div className="mt-4 flex items-end justify-between"><h2 className="text-2xl font-bold">{nextDay.name}</h2><span className="text-sm text-slate-400">{exercises.length} exercises</span></div><ul className="mt-5 space-y-3 text-slate-300">{exercises.slice(0, 3).map((item) => <li key={item.id}>{item.name}</li>)}{exercises.length > 3 ? <li className="text-slate-500">+{exercises.length - 3} more</li> : null}</ul></> : <p className="mt-4 text-slate-400">This plan has no workout days yet.</p>}
      <Link className="mt-7 flex min-h-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-slate-950 hover:bg-lime-300" href={`/app/plan/${plan.id}`}>View plan</Link>
    </section> : <section className="mt-9 rounded-3xl border border-dashed border-slate-700 p-6"><h2 className="font-bold">No active plan</h2><p className="mt-2 text-sm leading-6 text-slate-400">Browse three ready-to-use routines or start a custom plan.</p><Link className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-slate-950" href="/app/plan">Choose a plan</Link></section>}
  </main>;
}
