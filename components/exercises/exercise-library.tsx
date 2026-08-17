"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CatalogPage } from "@/types/catalog";
import { MUSCLE_GROUPS } from "@/types/catalog";

export function ExerciseLibrary({ initial }: Readonly<{ initial: CatalogPage }>) {
  const [data, setData] = useState(initial); const [query, setQuery] = useState(""); const [muscle, setMuscle] = useState(""); const [equipment, setEquipment] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(async () => { setLoading(true); try { const p = new URLSearchParams({ q: query, muscle, equipment }); const response = await fetch(`/api/exercises?${p}`, { signal: controller.signal }); if (response.ok) setData(await response.json() as CatalogPage); } finally { setLoading(false); } }, 300); return () => { clearTimeout(timer); controller.abort(); }; }, [query, muscle, equipment]);
  const equipmentOptions = [...new Set(initial.exercises.map((item) => item.equipment).filter(Boolean))] as string[];
  return <>
    <div className="mt-7 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <label className="block text-sm font-semibold">Search<input className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4" onChange={(e) => setQuery(e.target.value)} placeholder="Bench press..." type="search" value={query} /></label>
      <div className="grid grid-cols-2 gap-3"><Select label="Muscle" value={muscle} onChange={setMuscle} options={[...MUSCLE_GROUPS]} /><Select label="Equipment" value={equipment} onChange={setEquipment} options={equipmentOptions} /></div>
    </div>
    {data.source === "fallback" ? <p className="mt-4 rounded-xl bg-amber-400/10 p-4 text-sm text-amber-200">Exercise library is temporarily unavailable. A limited built-in catalog is shown; your saved workouts are still available.</p> : null}
    <p className="mt-5 text-sm text-slate-500">{loading ? "Searching…" : `${data.total} exercises`}</p>
    <div className="mt-3 space-y-3">{data.exercises.map((exercise) => <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5" key={exercise.id}><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{exercise.name}</h2><p className="mt-1 text-sm text-lime-400">{exercise.primaryMuscle}</p><p className="text-sm text-slate-500">{exercise.equipment || "Equipment not listed"}</p></div><Link className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold" href={`/app/exercises/${encodeURIComponent(exercise.id)}`}>View</Link></div></article>)}</div>
    {!data.exercises.length ? <p className="mt-5 rounded-2xl border border-dashed border-slate-700 p-5 text-slate-400">No exercises match those filters.</p> : null}
  </>;
}

function Select({ label, value, onChange, options }: Readonly<{ label: string; value: string; onChange: (value: string) => void; options: string[] }>) { return <label className="text-sm font-semibold">{label}<select className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3" onChange={(e) => onChange(e.target.value)} value={value}><option value="">All</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
