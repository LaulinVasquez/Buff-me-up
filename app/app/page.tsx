import Link from "next/link";
import { SubmitButton } from "@/components/forms/submit-button";
import { LocalDate, LocalDateTime } from "@/components/local-date";
import { getLatestCompletedWorkout, getNextWorkoutDay } from "@/lib/workouts/sessions";
import { getWorkoutStatsData } from "@/lib/workouts/history";
import { ConsistencySummary } from "@/components/history/consistency-summary";
import { LocalGreeting } from "@/components/local-greeting";
import { CompletedTodayBanner } from "@/components/history/completed-today-banner";
import { startWorkoutAction } from "./workout/actions";

type Props = Readonly<{ searchParams: Promise<{ cancelled?: string; error?: string }> }>;

export default async function ApplicationHome({ searchParams }: Props) {
  const query = await searchParams;
  const [selection, latest, stats] = await Promise.all([
    getNextWorkoutDay().catch(() => ({ plan: null, day: null, currentWorkout: null })),
    getLatestCompletedWorkout().catch(() => null),
    getWorkoutStatsData().catch(() => ({ totalWorkouts: 0, attendanceTimestamps: [] })),
  ]);
  const exercises = selection.day ? [...selection.day.gym_exercises].sort((a, b) => a.exercise_order - b.exercise_order) : [];
  const currentExercises = selection.currentWorkout?.gym_workout_exercises ?? [];
  const currentComplete = currentExercises.filter((item) => item.completed).length;

  return <main className="min-h-[calc(100dvh-9rem)] py-10 pb-28">
    <LocalDate className="text-sm font-bold uppercase tracking-[0.16em] text-lime-400" />
    <LocalGreeting />
    <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Today&apos;s workout</p>
    <h1 className="mt-1 text-3xl font-black tracking-tight">{selection.currentWorkout?.name ?? selection.day?.name ?? "Ready when you are."}</h1>
    {query.cancelled ? <Notice>Workout cancelled. Your plan sequence was not advanced.</Notice> : null}
    {query.error ? <p className="mt-5 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">We couldn&apos;t start that workout. Please try again.</p> : null}
    <ConsistencySummary compact timestamps={stats.attendanceTimestamps} />
    {latest?.completed_at ? <CompletedTodayBanner completedAt={latest.completed_at} name={latest.name} startedAt={latest.started_at} /> : null}

    {selection.currentWorkout ? <section className="mt-8 rounded-3xl border border-lime-400/30 bg-lime-400/10 p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-lime-400">Workout in progress</p>
      <h2 className="mt-3 text-2xl font-bold">{selection.currentWorkout.name}</h2>
      <p className="mt-2 text-sm text-slate-300">Started at <LocalDateTime mode="time" value={selection.currentWorkout.started_at} /></p>
      <p className="mt-1 text-sm text-slate-300">{currentComplete} / {currentExercises.length} exercises complete</p>
      <Link className="mt-6 flex min-h-14 items-center justify-center rounded-xl bg-lime-400 font-black text-slate-950" href={`/app/workout/${selection.currentWorkout.id}`}>Continue workout</Link>
    </section> : selection.day ? <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{selection.plan?.name}</p><h2 className="mt-2 text-2xl font-bold">{selection.day.name}</h2></div><span className="text-right text-sm text-slate-400">{exercises.length} exercises<br />About 45–60 min</span></div>
      {exercises.length ? <ul className="mt-5 space-y-3 text-slate-300">{exercises.slice(0, 4).map((item) => <li key={item.id}>{item.name}</li>)}{exercises.length > 4 ? <li className="text-slate-500">+{exercises.length - 4} more</li> : null}</ul> : <p className="mt-5 text-sm text-slate-400">Add exercises to this day before starting.</p>}
      {exercises.length ? <form action={startWorkoutAction} className="mt-7"><SubmitButton className="min-h-14 w-full rounded-xl bg-lime-400 font-black text-slate-950 hover:bg-lime-300" pendingLabel="Starting...">Start workout</SubmitButton></form> : <Link className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-950" href={`/app/plan/${selection.plan?.id}`}>Edit plan</Link>}
    </section> : <section className="mt-8 rounded-3xl border border-dashed border-slate-700 p-6"><h2 className="font-bold">{selection.plan ? "No workout days" : "No active plan"}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{selection.plan ? "Add a workout day and exercises to get started." : "Choose a recommended plan or create your own."}</p><Link className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-slate-950" href={selection.plan ? `/app/plan/${selection.plan.id}` : "/app/plan"}>{selection.plan ? "Edit plan" : "Choose a plan"}</Link></section>}

    {latest && !selection.currentWorkout ? <section className="mt-6 rounded-2xl border border-slate-800 p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Most recent</p><div className="mt-2 flex items-center justify-between"><span><strong className="block">{latest.name} ✓</strong><span className="text-sm text-slate-500">{latest.completed_at ? <LocalDateTime mode="date" value={latest.completed_at} /> : null}</span></span><span className="text-sm font-semibold text-lime-400">Complete</span></div></section> : null}
  </main>;
}

function Notice({ children }: Readonly<{ children: React.ReactNode }>) {
  return <p className="mt-5 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">{children}</p>;
}
