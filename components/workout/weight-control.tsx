"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { saveWeightAction } from "@/app/app/workout/actions";

export function WeightControl({ workoutId, exerciseId, initialWeight }: Readonly<{ workoutId: string; exerciseId: string; initialWeight: number | null }>) {
  const [weight, setWeight] = useState(initialWeight?.toString() ?? "");
  const adjust = (amount: number) => {
    const current = Number(weight || 0);
    setWeight(String(Math.max(0, Math.round((current + amount) * 100) / 100)));
  };

  return <form action={saveWeightAction} className="mt-4">
    <input name="workoutId" type="hidden" value={workoutId} />
    <input name="exerciseId" type="hidden" value={exerciseId} />
    <label className="text-sm font-semibold text-slate-300">Today&apos;s weight</label>
    <div className="mt-2 grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] gap-2">
      <button aria-label="Decrease weight by 5 pounds" className="min-h-14 rounded-xl border border-slate-700 bg-slate-900 text-lg font-black" onClick={() => adjust(-5)} type="button">−5</button>
      <div className="relative"><input aria-label="Weight used in pounds" className="min-h-14 w-full rounded-xl border border-slate-700 bg-slate-950 px-8 text-center text-xl font-bold outline-none focus:border-lime-400" inputMode="decimal" min="0" name="weight" onChange={(event) => setWeight(event.target.value)} step="0.25" type="number" value={weight} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">lb</span></div>
      <button aria-label="Increase weight by 5 pounds" className="min-h-14 rounded-xl border border-slate-700 bg-slate-900 text-lg font-black" onClick={() => adjust(5)} type="button">+5</button>
    </div>
    <SubmitButton className="mt-2 min-h-11 w-full rounded-xl bg-slate-800 font-semibold" pendingLabel="Saving...">Save weight</SubmitButton>
  </form>;
}
