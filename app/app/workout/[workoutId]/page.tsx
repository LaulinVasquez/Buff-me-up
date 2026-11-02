import { getActiveGymSetup } from "@/lib/gyms/service";
import { gymExerciseKey } from "@/lib/gyms/preferences";
import { ExerciseGymNotes } from "@/components/gyms/exercise-notes";
import { saveGymNoteAction } from "../note-actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { SubmitButton } from "@/components/forms/submit-button";
import { LocalDate, LocalDateTime } from "@/components/local-date";
import { exerciseCatalog } from "@/data/exercise-catalog";
import { getPreviousExerciseWeight, getWorkout } from "@/lib/workouts/sessions";
import { cancelWorkoutAction, finishWorkoutAction } from "../actions";
import { WorkoutLayout } from "@/components/workout/workout-layout";
import { ExerciseSwap } from "@/components/workout/exercise-swap";
import { SubstitutionHistory } from "@/components/workout/substitution-history";
import { getSwapSource, readSubstitutionDetails } from "@/lib/workouts/substitutions";
import { swapExerciseAction } from "../substitution-actions";
import { SetLogger } from "@/components/workout/set-logger";
import { SessionAdaptations } from "@/components/workout/session-adaptations";
import { adaptWorkoutAction } from "../adaptation-actions";
import { RestTimer } from "@/components/workout/rest-timer";
import { UnsavedWorkoutGuard } from "@/components/workout/unsaved-guard";
import { saveSetsAction } from "../set-actions";

type Props = Readonly<{ params: Promise<{ workoutId: string }>; searchParams: Promise<{ error?: string }> }>;

export default async function WorkoutPage({ params, searchParams }: Props) {
  const { workoutId } = await params;
  const query = await searchParams;
  const workout = await getWorkout(workoutId).catch(() => null);
  if (!workout) notFound();

  const allExercises = [...workout.gym_workout_exercises].sort((a, b) => a.exercise_order - b.exercise_order);
  const exercises = allExercises.filter(item => !item.deferred);
  const deferred = allExercises.filter(item => item.deferred);
  const gymSetup = await getActiveGymSetup(allExercises.map(item => item.name)).catch(() => undefined);
  const previousWeights = await Promise.all(exercises.map((item) => getPreviousExerciseWeight(item.exercise_id).catch(() => null)));
  const completeCount = exercises.filter((item) => item.completed).length;
  const percent = exercises.length ? Math.round((completeCount / exercises.length) * 100) : 0;

  if (workout.status === "completed") return <CompletedWorkout workout={workout} exerciseCount={exercises.length} />;
  if (workout.status === "cancelled") return <StatusMessage title="Workout cancelled" message="This session remains saved but does not advance your plan." />;

  return <main className="pb-40 lg:pb-8"><UnsavedWorkoutGuard />
    <header className="sticky top-[env(safe-area-inset-top)] z-10 -mx-5 border-b border-slate-800 bg-slate-950/95 px-5 pb-4 pt-5 backdrop-blur sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:rounded-b-2xl">
      <LocalDate className="text-xs font-bold uppercase tracking-[0.16em] text-accent-400" />
      <div className="mt-2 flex items-end justify-between gap-4"><div><p className="text-xs text-slate-500">Workout in progress</p><h1 className="text-2xl font-black">{workout.name}</h1></div><p className="text-sm font-semibold">{completeCount} / {exercises.length}</p></div>
      <div aria-label={`${percent}% complete`} className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-accent-400 transition-[width]" style={{ width: `${percent}%` }} /></div>
    </header>

    {query.error ? <p className="mt-5 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">That update did not save. Please try again.</p> : null}
    {!exercises.length ? <section className="mt-8 rounded-3xl border border-dashed border-slate-700 p-6"><h2 className="font-bold">No exercises in this workout.</h2><p className="mt-2 text-sm text-slate-400">You can finish or cancel this session, then add exercises to the plan.</p></section> : null}

    <SessionAdaptations key={workout.mode_revision} action={adaptWorkoutAction} exercises={allExercises} workoutId={workout.id} mode={workout.session_mode} revision={workout.mode_revision} />
    <p className="mt-4 text-sm text-slate-400">Gym setup: {gymSetup === undefined ? "Temporarily unavailable" : gymSetup?.gym.name ?? "None selected"} · <Link className="text-accent-300" href="/app/profile#personal-gyms">Change gym</Link></p>
    <RestTimer />
    <WorkoutLayout actions={<>
      <form action={finishWorkoutAction} data-leaves-workout="true"><input name="workoutId" type="hidden" value={workout.id} />{completeCount < exercises.length ? <ConfirmSubmitButton className="min-h-14 w-full rounded-xl bg-accent-400 font-black text-slate-950" message={`${exercises.length - completeCount} exercises are incomplete. Finish anyway?`}>Finish workout</ConfirmSubmitButton> : <SubmitButton className="min-h-14 w-full rounded-xl bg-accent-400 font-black text-slate-950">Finish workout</SubmitButton>}</form>
      <form data-leaves-workout="true" action={cancelWorkoutAction} className="mt-2"><input name="workoutId" type="hidden" value={workout.id} /><ConfirmSubmitButton className="min-h-11 w-full text-sm font-semibold text-red-300" message="Cancel this workout? Progress stays saved, but it will not count as completed.">Cancel workout</ConfirmSubmitButton></form>
    </>}>
      {exercises.map((exercise, index) => {
        const replacement = readSubstitutionDetails(exercise.substitution_details);
        const metadata = replacement ? { muscleGroup: replacement.primaryMuscle, equipment: replacement.equipment, instructions: replacement.instructions } : exerciseCatalog[exercise.name];
        const source = getSwapSource(exercise);
        const gymNote = gymSetup?.notes.find(note => note.exercise_key === gymExerciseKey(exercise.name));
        return <article className={`min-w-0 rounded-3xl border p-5 transition-colors ${exercise.completed ? "border-success-400/30 bg-success-400/10" : "border-slate-800 bg-slate-900/80"}`} key={`${exercise.id}-${exercise.substitution_version}`}>
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{exercise.completed ? "✓ " : ""}{exercise.name}</h2><p className="mt-1 text-sm text-slate-400">{exercise.target_sets ?? "—"} sets × {exercise.target_reps ?? "—"}</p></div><span className="shrink-0 rounded-full bg-slate-950/60 px-2.5 py-1 text-xs text-slate-400">{index + 1}/{exercises.length}</span></div>
          {previousWeights[index] !== null ? <div className="mt-4 rounded-xl bg-slate-950/60 p-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Last time</p><p className="mt-1 font-bold text-slate-200">{previousWeights[index]} lb</p></div> : null}
          {source.equipment ? <p className="mt-3 text-xs text-slate-400">{source.equipment}</p> : null}
          <SubstitutionHistory history={exercise.substitution_history} />
          <SetLogger key={`${exercise.id}-${exercise.substitution_version}-${exercise.log_revision}`} action={saveSetsAction} exercise={exercise} workoutId={workout.id} />
          {metadata ? <details className="mt-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-400">Exercise details</summary><div className="rounded-xl bg-slate-950/60 p-4 text-sm"><p className="font-semibold text-accent-400">{metadata.muscleGroup} · {metadata.equipment}</p><ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-300">{metadata.instructions.map((step) => <li key={step}>{step}</li>)}</ol></div></details> : null}
          {gymSetup ? <ExerciseGymNotes key={`${gymSetup.gym.id}-${exercise.id}-${gymNote?.updated_at ?? "new"}`} gym={gymSetup.gym} note={gymNote} exercise={exercise} workoutId={workout.id} action={saveGymNoteAction} /> : null}
          <ExerciseSwap savedGym={gymSetup?.gym} preferredId={gymNote?.preferred_exercise_id} key={`${exercise.id}-${exercise.updated_at}`} action={swapExerciseAction} exercise={exercise} exercises={exercises} workoutId={workout.id} />
        </article>;
      })}
      {deferred.length ? <section className="rounded-2xl border border-dashed border-slate-700 p-5 md:col-span-full"><h2 className="font-bold">Set aside for this session</h2><ul className="mt-3 space-y-1 text-sm text-slate-400">{deferred.map(item => <li key={item.id}>{item.name}</li>)}</ul><p className="mt-3 text-xs text-slate-400">These are saved in History as set aside, rather than completed. Restore the full session above to include them today.</p></section> : null}
    </WorkoutLayout>
  </main>;
}

function CompletedWorkout({ workout, exerciseCount }: Readonly<{ workout: { name: string; started_at: string; completed_at: string | null }; exerciseCount: number }>) {
  const minutes = workout.completed_at ? Math.max(1, Math.round((new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime()) / 60000)) : null;
  return <main className="flex min-h-[75dvh] items-center py-10"><section className="mx-auto w-full max-w-xl rounded-3xl border border-success-400/20 bg-success-400/10 p-7 text-center"><p className="text-4xl">💪</p><h1 className="mt-4 text-3xl font-black">Workout complete</h1><p className="mt-2 text-xl font-bold text-success-400">{workout.name}</p><p className="mt-4 text-sm text-slate-300">{workout.completed_at ? <LocalDateTime mode="date" value={workout.completed_at} /> : null} · {exerciseCount} exercises{minutes ? ` · ${minutes} min` : ""}</p><Link className="mt-7 flex min-h-14 items-center justify-center rounded-xl bg-accent-400 font-bold text-slate-950" href="/app">Back to home</Link></section></main>;
}
function StatusMessage({ title, message }: Readonly<{ title: string; message: string }>) {
  return <main className="flex min-h-[75dvh] items-center"><section className="mx-auto w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-400">{message}</p><Link className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-950" href="/app">Back to home</Link></section></main>;
}
