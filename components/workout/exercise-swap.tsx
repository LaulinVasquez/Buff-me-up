"use client";

import { useActionState, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/types/catalog";
import { getSwapCandidates, getSwapSource, type SwapActionState, type SwapSnapshot } from "@/lib/workouts/substitutions";

const control = "min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent-400";
type Props = Readonly<{
  workoutId: string; exercise: SwapSnapshot;
  exercises: Pick<SwapSnapshot, "name" | "substitution_details">[];
  action: (previous: SwapActionState, form: FormData) => Promise<SwapActionState>;
}>;

export function ExerciseSwap({ workoutId, exercise, exercises, action }: Props) {
  const source = getSwapSource(exercise);
  const [open, setOpen] = useState(false);
  const [muscle, setMuscle] = useState<MuscleGroup | "">(source.primaryMuscle ?? "");
  const [equipment, setEquipment] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [state, submit, pending] = useActionState(action, {});
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  if (exercise.completed) return null;
  const selectedSource = { ...source, primaryMuscle: muscle || null };
  const allCandidates = getSwapCandidates(selectedSource, exercises);
  const equipmentOptions = [...new Set(allCandidates.flatMap(item => item.equipment ? [item.equipment] : []))].sort();
  const candidates = getSwapCandidates(selectedSource, exercises, equipment ? [equipment] : []);
  const selected = candidates.find(item => item.id === selectedId);
  const close = () => { setOpen(false); setSelectedId(""); trigger.current?.focus(); };

  return <div className="mt-4 border-t border-slate-700/60 pt-3">
    <button aria-controls={id} aria-expanded={open} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-2 text-left text-sm font-bold text-sky-300 hover:bg-slate-800/60 focus-visible:outline-2 focus-visible:outline-accent-400 disabled:opacity-50" disabled={pending} onClick={() => open ? close() : setOpen(true)} ref={trigger} type="button"><span>Equipment busy? Swap exercise</span><span aria-hidden="true">{open ? "−" : "↔"}</span></button>
    {open ? <form data-leaves-workout="true" action={submit} className="mt-3 min-w-0 rounded-2xl border border-sky-300/20 bg-slate-950/60 p-4" id={id}>
      <input name="workoutId" type="hidden" value={workoutId} /><input name="exerciseId" type="hidden" value={exercise.id} />
      <input name="version" type="hidden" value={exercise.substitution_version} /><input name="updatedAt" type="hidden" value={exercise.updated_at} />
      <input name="muscle" type="hidden" value={muscle} />
      <p className="text-xs font-bold uppercase tracking-wider text-sky-300">Gym is packed</p>
      <h3 className="mt-2 text-lg font-bold">Keep your session moving.</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">Replace <strong className="text-slate-200">{exercise.name}</strong> for this session. Your saved plan and other exercises stay the same.</p>
      <fieldset className="mt-4 min-w-0 space-y-4" disabled={pending}>
        {!source.primaryMuscle ? <label className="block text-sm font-semibold">What does this exercise train?<select className={`${control} mt-2`} onChange={event => { setMuscle(event.target.value as MuscleGroup | ""); setEquipment(""); setSelectedId(""); }} required value={muscle}><option value="">Choose its primary muscle</option>{MUSCLE_GROUPS.map(item => <option key={item}>{item}</option>)}</select><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Choose the focus for this custom exercise so we can show relevant alternatives.</span></label> : <p className="text-xs text-slate-400">Primary muscle: <strong className="text-slate-200">{source.primaryMuscle}</strong></p>}
        {muscle ? <>
          <label className="block text-sm font-semibold">What equipment is free?<select className={`${control} mt-2`} onChange={event => { setEquipment(event.target.value); setSelectedId(""); }} value={equipment}><option value="">Any equipment</option>{equipmentOptions.map(item => <option key={item}>{item}</option>)}</select></label>
          <fieldset className="min-w-0"><legend className="text-sm font-bold">Choose an alternative</legend><p className="mt-1 text-xs leading-5 text-slate-500">Same primary muscle{source.mechanic ? ` and ${source.mechanic} movement type` : ""}. Review the movement and targets before switching.</p>
            <div className="mt-3 space-y-2">{candidates.map(item => <label className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border p-3 ${selectedId === item.id ? "border-accent-400/60 bg-accent-400/10" : "border-slate-700 bg-slate-900/60"}`} key={item.id}><input checked={selectedId === item.id} className="mt-1 size-4 shrink-0 accent-accent-400" name="replacementId" onChange={() => setSelectedId(item.id)} required type="radio" value={item.id} /><span className="min-w-0"><strong className="block text-sm">{item.name}</strong><span className="mt-1 block text-xs text-slate-400">{item.equipment} · {item.primaryMuscle}</span></span></label>)}</div>
            {!candidates.length ? <p className="mt-3 rounded-xl border border-dashed border-slate-700 p-4 text-sm leading-6 text-slate-400">{equipment ? "No matching alternatives are available with this equipment. Try another equipment option or keep the original exercise." : "No matching alternative is available for this exercise. Keep the original exercise."}</p> : null}
          </fieldset>
        </> : null}
        {selected ? <section aria-label="Review exercise swap" className="rounded-xl border border-accent-400/20 bg-accent-400/5 p-3">
          <h4 className="text-sm font-bold text-accent-300">{exercise.name} → {selected.name}</h4>
          <p className="mt-2 text-sm text-slate-300">Keep {exercise.target_sets ?? "—"} sets × {exercise.target_reps ?? "—"} reps.</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">Start with a blank weight for the replacement. {exercise.weight !== null ? `The saved ${exercise.weight} lb stays in your swap history. ` : ""}Unsaved edits in this exercise card will be discarded.</p>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-5 text-slate-400">{selected.instructions.map((step, index) => <li key={index}>{step}</li>)}</ol>
        </section> : null}
        <button className="min-h-12 w-full rounded-xl bg-accent-400 px-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled={!selected || pending} type="submit">{pending ? "Swapping…" : "Use for this session"}</button>
        <button className="min-h-11 w-full rounded-xl border border-slate-700 text-sm font-semibold text-slate-300" onClick={close} type="button">Keep original exercise</button>
      </fieldset>
      {state.error ? <div className="mt-4"><p className="text-sm leading-6 text-red-200" role="alert">{state.error}</p><button className="mt-2 min-h-11 rounded-lg px-3 text-sm font-bold text-sky-300 underline" onClick={() => router.refresh()} type="button">Refresh workout</button></div> : null}
    </form> : null}
  </div>;
}
