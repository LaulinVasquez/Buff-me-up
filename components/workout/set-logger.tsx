"use client";
import { useActionState, useState } from "react";
import { initialSets, validateSets, type SetSaveState } from "@/lib/workouts/sets";

type Props = { workoutId: string; exercise: { id: string; name: string; target_sets: number | null; logged_sets: unknown; log_revision: number; substitution_version: number; weight: number | null }; action: (previous: SetSaveState, form: FormData) => Promise<SetSaveState> };
export function SetLogger({ workoutId, exercise, action }: Props) {
  const [sets, setSets] = useState(() => initialSets(exercise.logged_sets, exercise.target_sets));
  const [saved, setSaved] = useState(JSON.stringify(sets));
  const [state, submit, pending] = useActionState(async (previous: SetSaveState, form: FormData) => {
    const result = await action(previous, form);
    if (result.status === "success") setSaved(String(form.get("sets")));
    return result;
  }, { status: "idle" });
  const dirty = JSON.stringify(sets) !== saved;
  const update = (index: number, patch: Partial<typeof sets[number]>) => setSets(current => current.map((set, i) => i === index ? { ...set, ...patch } : set));
  return <form action={submit} onReset={event => event.preventDefault()} className="mt-5" data-unsaved-sets={dirty} aria-label={`Log sets for ${exercise.name}`}>
    <input type="hidden" name="workoutId" value={workoutId} /><input type="hidden" name="exerciseId" value={exercise.id} /><input type="hidden" name="version" value={exercise.substitution_version} /><input type="hidden" name="revision" value={exercise.log_revision} /><input type="hidden" name="sets" value={JSON.stringify(sets)} />
    <p className="text-xs text-slate-400">Actual sets · weight in lb. Leave weight blank for unweighted work.</p>
    {exercise.weight !== null && (!Array.isArray(exercise.logged_sets) || !exercise.logged_sets.length) ? <p className="mt-2 text-xs text-slate-400">Earlier exercise weight: {exercise.weight} lb. Reps were not recorded.</p> : null}
    <fieldset disabled={pending} className="mt-3 min-w-0 space-y-2">
      <legend className="sr-only">Actual reps, weight and completion for each set</legend>
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 text-center text-xs text-slate-400"><span>Set</span><span>Reps</span><span>lb</span><span>Done</span></div>
      {sets.map((set, index) => <div key={set.set} className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2">
        <span className="text-center text-sm text-slate-400">{set.set}</span>
        <input aria-label={`Set ${set.set} reps`} type="number" inputMode="numeric" min="0" max="1000" step="1" value={set.reps ?? ""} onChange={event => update(index, { reps: event.target.value === "" ? null : Number(event.target.value) })} className="min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-2 text-center" />
        <input aria-label={`Set ${set.set} weight in pounds`} type="number" inputMode="decimal" min="0" max="100000" step="0.25" value={set.weight ?? ""} onChange={event => update(index, { weight: event.target.value === "" ? null : Number(event.target.value) })} className="min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-2 text-center" />
        <label className="flex min-h-11 items-center justify-center rounded-xl bg-slate-800"><input aria-label={`Set ${set.set} completed`} type="checkbox" checked={set.completed} onChange={event => update(index, { completed: event.target.checked })} className="size-5 accent-accent-400" /></label>
      </div>)}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={sets.length >= 100} onClick={() => setSets(current => [...current, { set: Math.max(...current.map(item => item.set), 0)+1, reps: null, weight: null, completed: false }])} className="min-h-11 rounded-xl bg-slate-800 px-3 text-sm disabled:opacity-40">+ Add set</button>{sets.length > 1 && !sets.at(-1)?.completed ? <button type="button" onClick={() => setSets(current => current.slice(0,-1))} className="min-h-11 px-3 text-sm text-slate-400">Remove last set</button> : null}</div>
      {!validateSets(sets) ? <p role="status" className="text-xs text-amber-300">Enter reps for every completed set. Reps must be whole numbers.</p> : null}
      <button type="submit" disabled={!dirty || !validateSets(sets)} className="min-h-12 w-full rounded-xl bg-accent-400 font-bold text-slate-950 disabled:opacity-40">{pending ? "Saving…" : "Save sets"}</button>
    </fieldset>
    {dirty ? <p className="mt-2 text-xs text-amber-300">Unsaved set changes</p> : null}
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`mt-2 text-sm ${state.status === "error" ? "text-red-300" : "text-success-300"}`}>{state.message}</p> : null}
  </form>;
}
