"use client";

import { useMemo, useState } from "react";
import { saveGeneratedPlan } from "@/app/app/plan/generate/actions";
import { expandSelections, generatePlan } from "@/lib/plans/generator";
import type { CatalogExercise, ExperienceLevel, GeneratedExercise, GeneratedPlan } from "@/types/catalog";

const choices = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Abs/Core"];

export function PlanGenerator({ pool, hasActivePlan }: Readonly<{ pool: CatalogExercise[]; hasActivePlan: boolean }>) {
  const [days, setDays] = useState(3);
  const [selected, setSelected] = useState<string[]>(["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs"]);
  const [experience, setExperience] = useState<ExperienceLevel>("beginner");
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [makeActive, setMakeActive] = useState(!hasActivePlan);
  const muscles = useMemo(() => expandSelections(selected), [selected]);
  const build = (regenerate = false) => setPlan(generatePlan(pool, days, muscles, experience, regenerate ? (plan?.seed ?? Date.now()) + 1 : Date.now()));

  const changeExercise = (dayIndex: number, exerciseIndex: number, update: (exercise: GeneratedExercise) => GeneratedExercise) => {
    setPlan((current) => current && ({ ...current, days: current.days.map((day, di) => di !== dayIndex ? day : { ...day, exercises: day.exercises.map((exercise, ei) => ei !== exerciseIndex ? exercise : update(exercise)) }) }));
  };
  const remove = (dayIndex: number, exerciseIndex: number) => setPlan((current) => current && ({ ...current, days: current.days.map((day, di) => di !== dayIndex ? day : { ...day, exercises: day.exercises.filter((_, ei) => ei !== exerciseIndex) }) }));
  const replace = (dayIndex: number, exerciseIndex: number, replacementId: string) => {
    const replacement = pool.find((exercise) => exercise.id === replacementId);
    if (!replacement) return;
    changeExercise(dayIndex, exerciseIndex, (current) => ({ ...current, id: replacement.id, name: replacement.name, primaryMuscle: replacement.primaryMuscle, equipment: replacement.equipment, reps: replacement.mechanic === "compound" ? "6-10" : replacement.primaryMuscle === "Calves" || replacement.primaryMuscle === "Abs/Core" ? "12-20" : "10-15" }));
  };

  if (!plan) return <div className="mt-8 space-y-7">
    <fieldset><legend className="font-bold">Workout days</legend><div className="mt-3 grid grid-cols-4 gap-2">{[3, 4, 5, 6].map((count) => <button className={`min-h-12 rounded-xl border font-bold ${days === count ? "border-lime-400 bg-lime-400 text-slate-950" : "border-slate-700"}`} key={count} onClick={() => setDays(count)} type="button">{count}</button>)}</div></fieldset>
    <fieldset><legend className="font-bold">What do you want to train?</legend><div className="mt-3 grid grid-cols-2 gap-2">{choices.map((choice) => <label className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 ${selected.includes(choice) ? "border-lime-400/60 bg-lime-400/10" : "border-slate-700"}`} key={choice}><input checked={selected.includes(choice)} onChange={() => setSelected((current) => current.includes(choice) ? current.filter((value) => value !== choice) : [...current, choice])} type="checkbox" />{choice}</label>)}</div></fieldset>
    <fieldset><legend className="font-bold">Experience</legend><div className="mt-3 grid grid-cols-3 gap-2">{(["beginner", "intermediate", "advanced"] as ExperienceLevel[]).map((level) => <button className={`min-h-12 rounded-xl border text-sm capitalize ${experience === level ? "border-lime-400 bg-lime-400 text-slate-950" : "border-slate-700"}`} key={level} onClick={() => setExperience(level)} type="button">{level}</button>)}</div></fieldset>
    <button className="min-h-12 w-full rounded-xl bg-lime-400 font-bold text-slate-950 disabled:opacity-40" disabled={!muscles.length} onClick={() => build()} type="button">Generate my plan</button>
  </div>;

  return <div className="mt-8"><h2 className="text-2xl font-black">{plan.name}</h2><p className="mt-2 text-slate-400">{plan.description}</p>
    <div className="mt-6 space-y-5">{plan.days.map((day, dayIndex) => <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5" key={`${day.name}-${dayIndex}`}><p className="text-xs font-bold uppercase text-lime-400">Day {dayIndex + 1}</p><h3 className="mt-1 text-lg font-bold">{day.name}</h3>
      <div className="mt-4 space-y-3">{day.exercises.map((exercise, exerciseIndex) => {
        const replacements = pool.filter((candidate) => candidate.primaryMuscle === exercise.primaryMuscle && candidate.id !== exercise.id && !day.exercises.some((used) => used.id === candidate.id));
        return <div className="rounded-xl bg-slate-950/70 p-3" key={`${exercise.id}-${exerciseIndex}`}><div className="flex justify-between gap-3"><div><strong>{exercise.name}</strong><p className="text-xs text-slate-500">{exercise.primaryMuscle} · {exercise.equipment}</p></div><button className="text-sm text-red-300" onClick={() => remove(dayIndex, exerciseIndex)} type="button">Remove</button></div>
          <label className="mt-3 block text-xs text-slate-400">Replace exercise<select className="mt-1 min-h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-slate-100" onChange={(event) => replace(dayIndex, exerciseIndex, event.target.value)} value=""><option value="">Choose another {exercise.primaryMuscle} exercise</option>{replacements.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
          <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Sets<input className="mt-1 min-h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3" min="1" onChange={(event) => changeExercise(dayIndex, exerciseIndex, (current) => ({ ...current, sets: Math.max(1, Number(event.target.value)) }))} type="number" value={exercise.sets} /></label><label className="text-xs text-slate-400">Reps<input className="mt-1 min-h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3" onChange={(event) => changeExercise(dayIndex, exerciseIndex, (current) => ({ ...current, reps: event.target.value }))} value={exercise.reps} /></label></div>
        </div>;
      })}</div></article>)}</div>
    {hasActivePlan ? <label className="mt-6 flex items-start gap-3 rounded-xl border border-slate-700 p-4"><input checked={makeActive} className="mt-1" onChange={(event) => setMakeActive(event.target.checked)} type="checkbox" /><span><strong className="block">Make this your active plan?</strong><span className="text-sm text-slate-400">Your current plan will remain saved.</span></span></label> : null}
    <div className="mt-6 grid grid-cols-2 gap-3"><button className="min-h-12 rounded-xl border border-slate-700 font-bold" onClick={() => build(true)} type="button">Regenerate</button><button className="min-h-12 rounded-xl border border-slate-700 font-bold" onClick={() => setPlan(null)} type="button">Start over</button></div>
    <form action={saveGeneratedPlan} className="mt-3"><input name="plan" type="hidden" value={JSON.stringify(plan)} /><input name="makeActive" type="hidden" value={String(makeActive)} /><button className="min-h-12 w-full rounded-xl bg-lime-400 font-bold text-slate-950">Use this plan</button></form>
  </div>;
}
