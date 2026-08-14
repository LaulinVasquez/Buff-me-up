import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { SubmitButton } from "@/components/forms/submit-button";
import { LocalDate, LocalDateTime } from "@/components/local-date";
import { exerciseCatalog } from "@/data/exercise-catalog";
import { getPreviousExerciseWeight, getWorkout } from "@/lib/workouts/sessions";
import { cancelWorkoutAction, finishWorkoutAction, saveWeightAction, toggleExerciseAction } from "../actions";

type Props = Readonly<{ params: Promise<{ workoutId: string }>; searchParams: Promise<{ error?: string }> }>;

export default async function WorkoutPage({ params, searchParams }: Props) {
  const { workoutId } = await params;
  const query = await searchParams;
  const workout = await getWorkout(workoutId).catch(() => null);
  if (!workout) notFound();

  const exercises = [...workout.gym_workout_exercises].sort((a, b) => a.exercise_order - b.exercise_order);
  const previousWeights = await Promise.all(exercises.map((item) => getPreviousExerciseWeight(item.exercise_id).catch(() => null)));
  const completeCount = exercises.filter((item) => item.completed).length;
  const percent = exercises.length ? Math.round((completeCount / exercises.length) * 100) : 0;

  if (workout.status === "completed") return <CompletedWorkout workout={workout} exerciseCount={exercises.length} />;
  if (workout.status === "cancelled") return <StatusMessage title="Workout cancelled" message="This session remains saved but does not advance your plan." />;

  return <main className="pb-40">
    <header className="sticky top-0 z-10 -mx-5 border-b border-slate-800 bg-slate-950/95 px-5 pb-4 pt-5 backdrop-blur sm:-mx-8 sm:px-8">
      <LocalDate className="text-xs font-bold uppercase tracking-[0.16em] text-lime-400" />
      <div className="mt-2 flex items-end justify-between gap-4"><div><p className="text-xs text-slate-500">Workout in progress</p><h1 className="text-2xl font-black">{workout.name}</h1></div><p className="text-sm font-semibold">{completeCount} / {exercises.length}</p></div>
      <div aria-label={`${percent}% complete`} className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-lime-400 transition-[width]" style={{ width: `${percent}%` }} /></div>
    </header>

    {query.error ? <p className="mt-5 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">That update did not save. Please try again.</p> : null}
    {!exercises.length ? <section className="mt-8 rounded-3xl border border-dashed border-slate-700 p-6"><h2 className="font-bold">No exercises in this workout.</h2><p className="mt-2 text-sm text-slate-400">You can finish or cancel this session, then add exercises to the plan.</p></section> : null}

    <section className="mt-6 space-y-5">
      {exercises.map((exercise, index) => {
        const metadata = exerciseCatalog[exercise.name];
        return <article className={`rounded-3xl border p-5 transition-colors ${exercise.completed ? "border-lime-400/30 bg-lime-400/10" : "border-slate-800 bg-slate-900/80"}`} key={exercise.id}>
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{exercise.completed ? "✓ " : ""}{exercise.name}</h2><p className="mt-1 text-sm text-slate-400">{exercise.target_sets ?? "—"} sets × {exercise.target_reps ?? "—"}</p></div><span className="rounded-full bg-slate-950/60 px-2.5 py-1 text-xs text-slate-400">{index + 1}/{exercises.length}</span></div>
          {previousWeights[index] !== null ? <p className="mt-4 text-sm text-slate-400">Last time: <strong className="text-slate-200">{previousWeights[index]} lb</strong></p> : null}
          <form action={saveWeightAction} className="mt-4"><input name="workoutId" type="hidden" value={workout.id} /><input name="exerciseId" type="hidden" value={exercise.id} />
            <label className="text-sm font-semibold text-slate-300">Weight used<div className="mt-2 flex items-center gap-3"><input className="min-h-14 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 text-center text-xl font-bold outline-none focus:border-lime-400" defaultValue={exercise.weight ?? ""} inputMode="decimal" min="0" name="weight" step="0.25" type="number" /><span className="font-semibold text-slate-400">lb</span><SubmitButton className="min-h-14 rounded-xl bg-slate-800 px-4 font-semibold">Save</SubmitButton></div></label>
          </form>
          <form action={toggleExerciseAction} className="mt-4"><input name="workoutId" type="hidden" value={workout.id} /><input name="exerciseId" type="hidden" value={exercise.id} /><input name="completed" type="hidden" value={String(exercise.completed)} /><SubmitButton className={`min-h-14 w-full rounded-xl text-base font-bold ${exercise.completed ? "bg-slate-800 text-slate-200" : "bg-lime-400 text-slate-950"}`} pendingLabel="Saving...">{exercise.completed ? "Mark incomplete" : "✓ Complete exercise"}</SubmitButton></form>
          {metadata ? <details className="mt-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-400">Exercise details</summary><div className="rounded-xl bg-slate-950/60 p-4 text-sm"><p className="font-semibold text-lime-400">{metadata.muscleGroup} · {metadata.equipment}</p><ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-300">{metadata.instructions.map((step) => <li key={step}>{step}</li>)}</ol></div></details> : null}
        </article>;
      })}
    </section>

    <section className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-slate-800 bg-slate-950/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
      <form action={finishWorkoutAction}><input name="workoutId" type="hidden" value={workout.id} />{completeCount < exercises.length ? <ConfirmSubmitButton className="min-h-14 w-full rounded-xl bg-lime-400 font-black text-slate-950" message={`${exercises.length - completeCount} exercises are incomplete. Finish anyway?`}>Finish workout</ConfirmSubmitButton> : <SubmitButton className="min-h-14 w-full rounded-xl bg-lime-400 font-black text-slate-950">Finish workout</SubmitButton>}</form>
      <form action={cancelWorkoutAction} className="mt-2"><input name="workoutId" type="hidden" value={workout.id} /><ConfirmSubmitButton className="min-h-11 w-full text-sm font-semibold text-red-300" message="Cancel this workout? Progress stays saved, but it will not count as completed.">Cancel workout</ConfirmSubmitButton></form>
    </section>
  </main>;
}

function CompletedWorkout({ workout, exerciseCount }: Readonly<{ workout: { name: string; started_at: string; completed_at: string | null }; exerciseCount: number }>) {
  const minutes = workout.completed_at ? Math.max(1, Math.round((new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime()) / 60000)) : null;
  return <main className="flex min-h-[75dvh] items-center py-10"><section className="w-full rounded-3xl border border-lime-400/20 bg-lime-400/10 p-7 text-center"><p className="text-4xl">💪</p><h1 className="mt-4 text-3xl font-black">Workout complete</h1><p className="mt-2 text-xl font-bold text-lime-400">{workout.name}</p><p className="mt-4 text-sm text-slate-300">{workout.completed_at ? <LocalDateTime mode="date" value={workout.completed_at} /> : null} · {exerciseCount} exercises{minutes ? ` · ${minutes} min` : ""}</p><Link className="mt-7 flex min-h-14 items-center justify-center rounded-xl bg-lime-400 font-bold text-slate-950" href="/app">Back to home</Link></section></main>;
}
function StatusMessage({ title, message }: Readonly<{ title: string; message: string }>) {
  return <main className="flex min-h-[75dvh] items-center"><section className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-6"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-400">{message}</p><Link className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-950" href="/app">Back to home</Link></section></main>;
}
