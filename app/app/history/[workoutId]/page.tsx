import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalDateTime } from "@/components/local-date";
import { getWorkoutDetail } from "@/lib/workouts/history";

type Props = Readonly<{ params: Promise<{ workoutId: string }> }>;

export default async function WorkoutHistoryDetail({ params }: Props) {
  const { workoutId } = await params;
  const workout = await getWorkoutDetail(workoutId).catch(() => null);
  if (!workout || !workout.completed_at) notFound();
  const exercises = [...workout.gym_workout_exercises].sort((a, b) => a.exercise_order - b.exercise_order);
  const completedCount = exercises.filter((item) => item.completed).length;
  const minutes = Math.max(1, Math.round((new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime()) / 60000));

  return <main className="pb-28 pt-8">
    <Link className="inline-flex min-h-11 items-center text-sm text-slate-400" href="/app/history">← History</Link>
    <p className="mt-5 text-sm font-bold uppercase tracking-wider text-lime-400">Completed workout</p>
    <h1 className="mt-2 text-3xl font-black">{workout.name}</h1>
    <p className="mt-3 text-slate-300"><LocalDateTime mode="date" value={workout.completed_at} /></p>
    <p className="mt-1 text-sm text-slate-500"><LocalDateTime mode="time" value={workout.started_at} /> – <LocalDateTime mode="time" value={workout.completed_at} /> · {minutes} minutes</p>

    <section className="mt-7 grid grid-cols-2 gap-3"><Stat label="Exercises" value={String(exercises.length)} /><Stat label="Completed" value={`${completedCount} / ${exercises.length}`} /></section>
    <section className="mt-9 space-y-4"><h2 className="text-xl font-bold">Exercise snapshots</h2>
      {exercises.map((exercise) => <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5" key={exercise.id}>
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{exercise.completed ? "✓ " : ""}{exercise.name}</h3><p className="mt-1 text-sm text-slate-500">{exercise.target_sets ?? "—"} sets × {exercise.target_reps ?? "—"}</p></div><strong className="text-lime-400">{exercise.weight !== null ? `${exercise.weight} lb` : "No weight"}</strong></div>
      </article>)}
    </section>
  </main>;
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="rounded-2xl bg-slate-900 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>; }
