import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { SubmitButton } from "@/components/forms/submit-button";
import { getPlan } from "@/lib/workouts/plans";
import { activatePlanAction, addExercise, addWorkoutDay, deleteExerciseAction, deletePlanAction, deleteWorkoutDayAction, editExercise, moveExercise, moveWorkoutDay, renamePlan, renameWorkoutDay } from "../actions";

type Props = Readonly<{
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ activated?: string; created?: string; error?: string }>;
}>;

export default async function PlanDetailPage({ params, searchParams }: Props) {
  const { planId } = await params;
  const query = await searchParams;
  const plan = await getPlan(planId).catch(() => null);
  if (!plan) notFound();
  const days = [...plan.gym_workout_days].sort((a, b) => a.day_order - b.day_order);

  return <main className="pb-28 pt-8">
    <Link className="inline-flex min-h-11 items-center text-sm text-slate-400 hover:text-white" href="/app/plan">← All plans</Link>
    <div className="mt-3 flex items-start justify-between gap-4">
      <div><p className="text-sm font-bold uppercase tracking-wider text-lime-400">{plan.source} plan</p><h1 className="mt-2 text-3xl font-black">{plan.name}</h1><p className="mt-2 text-slate-400">{plan.description || "No description"}</p></div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${plan.is_active ? "bg-lime-400/10 text-lime-400" : "bg-slate-800 text-slate-400"}`}>{plan.is_active ? "Active" : "Inactive"}</span>
    </div>
    {query.created ? <Notice>Plan created. Add or adjust anything you need.</Notice> : null}
    {query.activated ? <Notice>This is now your active plan.</Notice> : null}
    {query.error ? <p className="mt-5 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">That update failed. Check your entries and try again.</p> : null}

    <div className="mt-7 flex gap-3">
      {!plan.is_active ? <form action={activatePlanAction} className="flex-1"><Hidden name="planId" value={plan.id} /><SubmitButton className="min-h-12 w-full rounded-xl bg-lime-400 px-4 font-bold text-slate-950">Make active</SubmitButton></form> : null}
      <details className="flex-1 rounded-xl border border-slate-700">
        <summary className="flex min-h-12 cursor-pointer items-center justify-center font-semibold">Edit plan</summary>
        <form action={renamePlan} className="space-y-3 border-t border-slate-800 p-4">
          <Hidden name="planId" value={plan.id} /><Input label="Name" name="name" defaultValue={plan.name} required /><Input label="Description" name="description" defaultValue={plan.description ?? ""} />
          <SubmitButton className="min-h-11 w-full rounded-lg bg-slate-100 font-bold text-slate-950">Save</SubmitButton>
        </form>
      </details>
    </div>

    <section className="mt-10">
      <div className="flex items-end justify-between"><div><h2 className="text-xl font-bold">Workout days</h2><p className="mt-1 text-sm text-slate-500">Sequence-based, not tied to weekdays.</p></div><span className="text-sm text-slate-500">{days.length} total</span></div>
      {!days.length ? <p className="mt-5 rounded-2xl border border-dashed border-slate-700 p-5 text-slate-400">No workout days. Add your first day below.</p> : null}
      <div className="mt-5 space-y-5">
        {days.map((day, dayIndex) => {
          const exercises = [...day.gym_exercises].sort((a, b) => a.exercise_order - b.exercise_order);
          return <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5" key={day.id}>
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-500">Day {dayIndex + 1}</p><h3 className="mt-1 text-lg font-bold">{day.name}</h3></div><OrderButtons action={moveWorkoutDay} idName="dayId" id={day.id} parentId={plan.id} first={dayIndex === 0} last={dayIndex === days.length - 1} /></div>
            <details className="mt-3"><summary className="flex min-h-10 cursor-pointer items-center text-sm font-semibold text-slate-400">Rename or delete day</summary>
              <form action={renameWorkoutDay} className="space-y-3 pt-3"><Hidden name="planId" value={plan.id} /><Hidden name="dayId" value={day.id} /><Input label="Day name" name="name" defaultValue={day.name} required /><SubmitButton className="min-h-11 w-full rounded-lg bg-slate-100 font-bold text-slate-950">Rename day</SubmitButton></form>
              <form action={deleteWorkoutDayAction} className="mt-3"><Hidden name="planId" value={plan.id} /><Hidden name="dayId" value={day.id} /><ConfirmSubmitButton className="min-h-11 w-full rounded-lg border border-red-400/30 text-sm font-semibold text-red-300" message={`Delete ${day.name} and all its exercises?`}>Delete day</ConfirmSubmitButton></form>
            </details>

            <div className="mt-5 space-y-3">{exercises.length ? exercises.map((exercise, index) => <details className="rounded-xl border border-slate-800 bg-slate-950/50 p-4" key={exercise.id}>
              <summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-3"><span><strong className="block">{exercise.name}</strong><span className="text-sm text-slate-500">{exercise.sets} sets · {exercise.target_reps}{exercise.default_weight !== null ? ` · ${exercise.default_weight} lb` : ""}</span></span><span className="text-slate-500">Edit</span></div></summary>
              <div className="mt-4 border-t border-slate-800 pt-4">
                <OrderButtons action={moveExercise} idName="exerciseId" id={exercise.id} parentId={plan.id} dayId={day.id} first={index === 0} last={index === exercises.length - 1} />
                <form action={editExercise} className="mt-4 grid grid-cols-2 gap-3"><Hidden name="planId" value={plan.id} /><Hidden name="exerciseId" value={exercise.id} />
                  <div className="col-span-2"><Input label="Exercise name" name="name" defaultValue={exercise.name} required /></div>
                  <Input label="Sets" name="sets" type="number" min="1" defaultValue={String(exercise.sets)} required /><Input label="Target reps" name="targetReps" defaultValue={exercise.target_reps} required />
                  <div className="col-span-2"><Input label="Default weight (lb)" name="defaultWeight" type="number" min="0" step="0.25" defaultValue={exercise.default_weight?.toString() ?? ""} /></div>
                  <div className="col-span-2"><Input label="Notes" name="notes" defaultValue={exercise.notes ?? ""} /></div>
                  <SubmitButton className="col-span-2 min-h-11 rounded-lg bg-slate-100 font-bold text-slate-950">Save exercise</SubmitButton>
                </form>
                <form action={deleteExerciseAction} className="mt-3"><Hidden name="planId" value={plan.id} /><Hidden name="exerciseId" value={exercise.id} /><ConfirmSubmitButton className="min-h-11 w-full rounded-lg text-sm font-semibold text-red-300" message={`Delete ${exercise.name}?`}>Delete exercise</ConfirmSubmitButton></form>
              </div>
            </details>) : <p className="text-sm text-slate-500">No exercises yet.</p>}</div>

            <details className="mt-4 rounded-xl border border-dashed border-slate-700 p-3"><summary className="flex min-h-10 cursor-pointer items-center font-semibold text-lime-400">+ Add exercise</summary>
              <form action={addExercise} className="mt-3 grid grid-cols-2 gap-3"><Hidden name="planId" value={plan.id} /><Hidden name="dayId" value={day.id} />
                <div className="col-span-2"><Input label="Exercise name" name="name" required /></div><Input label="Sets" name="sets" type="number" min="1" defaultValue="3" required /><Input label="Target reps" name="targetReps" placeholder="8-12" required />
                <div className="col-span-2"><Input label="Default weight (lb)" name="defaultWeight" type="number" min="0" step="0.25" /></div><div className="col-span-2"><Input label="Notes" name="notes" /></div>
                <SubmitButton className="col-span-2 min-h-11 rounded-lg bg-lime-400 font-bold text-slate-950">Add exercise</SubmitButton>
              </form>
            </details>
          </article>;
        })}
      </div>
      <details className="mt-5 rounded-2xl border border-dashed border-slate-700 p-4"><summary className="flex min-h-11 cursor-pointer items-center font-bold text-lime-400">+ Add workout day</summary><form action={addWorkoutDay} className="mt-4 space-y-3"><Hidden name="planId" value={plan.id} /><Input label="Day name" name="name" placeholder="Push" required /><SubmitButton className="min-h-11 w-full rounded-lg bg-lime-400 font-bold text-slate-950">Add day</SubmitButton></form></details>
    </section>

    <form action={deletePlanAction} className="mt-12 border-t border-slate-800 pt-8"><Hidden name="planId" value={plan.id} /><ConfirmSubmitButton className="min-h-12 w-full rounded-xl border border-red-400/30 font-semibold text-red-300" message={`Delete ${plan.name}? This also deletes its days and exercises.`}>Delete plan</ConfirmSubmitButton></form>
  </main>;
}

function Hidden({ name, value }: Readonly<{ name: string; value: string }>) { return <input name={name} type="hidden" value={value} />; }
function Input({ label, ...props }: Readonly<{ label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; type?: string; min?: string; step?: string }>) { return <label className="block text-xs font-semibold text-slate-400">{label}<input className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 outline-none focus:border-lime-400" {...props} /></label>; }
function Notice({ children }: Readonly<{ children: React.ReactNode }>) { return <p className="mt-5 rounded-xl bg-lime-400/10 p-4 text-sm text-lime-300">{children}</p>; }
function OrderButtons({ action, idName, id, parentId, dayId, first, last }: Readonly<{ action: (form: FormData) => Promise<void>; idName: string; id: string; parentId: string; dayId?: string; first: boolean; last: boolean }>) {
  return <div className="flex gap-2"><form action={action}><Hidden name="planId" value={parentId} /><Hidden name={idName} value={id} />{dayId ? <Hidden name="dayId" value={dayId} /> : null}<Hidden name="direction" value="up" /><button aria-label="Move up" className="min-h-10 min-w-10 rounded-lg bg-slate-800 disabled:opacity-30" disabled={first}>↑</button></form><form action={action}><Hidden name="planId" value={parentId} /><Hidden name={idName} value={id} />{dayId ? <Hidden name="dayId" value={dayId} /> : null}<Hidden name="direction" value="down" /><button aria-label="Move down" className="min-h-10 min-w-10 rounded-lg bg-slate-800 disabled:opacity-30" disabled={last}>↓</button></form></div>;
}
