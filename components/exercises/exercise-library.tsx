"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogPage } from "@/types/catalog";
import { MUSCLE_GROUPS } from "@/types/catalog";
import { expandSearch, catalogEquipmentOptions } from "@/lib/exercises/search";

const requestKey = (query: string, muscle: string, equipment: string, cursor?: string, direction = "after") => JSON.stringify([expandSearch(query), muscle, equipment, cursor ?? "", direction]);

export function ExerciseLibrary({ initial, equipmentOptions = [] }: Readonly<{ initial: CatalogPage; equipmentOptions?: string[] }>) {
  const initialKey = requestKey("", "", "");
  const [result, setResult] = useState({ key: initialKey, page: initial });
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [direction, setDirection] = useState<"after" | "before">("after");
  const [failure, setFailure] = useState<{ key: string; message: string }>();
  const [retry, setRetry] = useState(0);
  const cache = useRef(new Map([[initialKey, initial]]));
  const key = requestKey(query, muscle, equipment, cursor, direction);
  const error = failure?.key === key ? failure.message : undefined;
  const loading = result.key !== key && !error;
  const data = result.page;
  const options = useMemo(() => catalogEquipmentOptions([...equipmentOptions, ...initial.exercises.flatMap(item => item.equipment?.split(",") ?? [])]), [equipmentOptions, initial]);

  useEffect(() => {
    const controller = new AbortController();
    const [name, target, gear, pageCursor, pageDirection] = JSON.parse(key) as string[];
    const cached = cache.current.get(key);
    const timer = setTimeout(async () => {
      if (cached) { setResult({ key, page: cached }); setFailure(undefined); return; }
      try {
        const params = new URLSearchParams({ q: name, muscle: target, equipment: gear, limit: "20", direction: pageDirection });
        if (pageCursor) params.set("cursor", pageCursor);
        const response = await fetch(`/api/exercises?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search request failed");
        const page = await response.json() as CatalogPage;
        if (!Array.isArray(page.exercises) || typeof page.total !== "number") throw new Error("Invalid search response");
        if (controller.signal.aborted) return;
        // Don't retain temporary provider outages in the browser cache.
        if (page.source === "exercisedb") {
          if (cache.current.size >= 30) cache.current.delete(cache.current.keys().next().value!);
          cache.current.set(key, page);
        }
        setFailure(undefined);
        setResult({ key, page });
      } catch {
        if (!controller.signal.aborted) setFailure({ key, message: "Search couldn’t load. Check your connection and try again." });
      }
    }, cached ? 0 : 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, retry]);

  const resetPage = (change: () => void) => { setCursor(undefined); setDirection("after"); setFailure(undefined); change(); };
  const reset = () => resetPage(() => { setQuery(""); setMuscle(""); setEquipment(""); });
  const retrySearch = () => { cache.current.delete(key); setFailure(undefined); setResult(current => ({ ...current, key: "" })); setRetry(value => value + 1); };
  const active = Boolean(query || muscle || equipment);
  return <>
    <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-2 md:items-end">
        <div className="min-w-0 text-sm font-semibold"><label htmlFor="exercise-search">Find an exercise</label>
          <div className="relative mt-2"><input id="exercise-search" aria-controls="exercise-results" autoCapitalize="none" autoComplete="off" className="min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 pl-4 pr-16 text-base focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/25" maxLength={120} onChange={event => resetPage(() => setQuery(event.target.value))} placeholder="Bench press, DB curl, RDL…" spellCheck={false} type="search" value={query} />{query ? <button aria-label="Clear search" className="absolute inset-y-0 right-1 min-w-12 rounded-lg text-xs font-semibold text-slate-300" onClick={() => resetPage(() => setQuery(""))} type="button">Clear</button> : null}</div>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3"><Select label="Muscle" value={muscle} onChange={value => resetPage(() => setMuscle(value))} options={[...MUSCLE_GROUPS]} /><Select label="Equipment" value={equipment} onChange={value => resetPage(() => setEquipment(value))} options={options} /></div>
      </div>
      <p className="mt-2 text-xs text-slate-400">Try a movement name. DB = dumbbell · BB = barbell · RDL = Romanian deadlift.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Quick muscle filters">{["Chest", "Back", "Shoulders", "Abs/Core"].map(value => <button aria-pressed={muscle === value} className={`min-h-11 rounded-full border px-4 text-xs font-semibold ${muscle === value ? "border-accent-400 bg-accent-400/10 text-accent-300" : "border-slate-700 text-slate-300"}`} key={value} onClick={() => resetPage(() => setMuscle(muscle === value ? "" : value))} type="button">{value}</button>)}{active ? <button className="min-h-11 px-2 text-xs font-semibold text-accent-300" onClick={reset} type="button">Reset all</button> : null}</div>
    </div>
    <p role="status" className="mt-5 text-sm text-slate-400">{error ? "Search unavailable" : loading ? "Searching…" : `${data.total} ${data.source === "fallback" ? "built-in " : ""}${data.total === 1 ? "exercise" : "exercises"}${query.trim() ? ` matching “${query.trim()}”` : ""}`}</p>
    {error ? <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4"><p role="alert" className="text-sm text-amber-200">{error}</p><button className="mt-3 min-h-11 rounded-lg border border-amber-300/40 px-4 text-sm font-semibold" onClick={retrySearch} type="button">Try again</button></div> : null}
    <section aria-label="Exercise results" aria-busy={loading} id="exercise-results">
      {loading ? <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">{[1, 2, 3].map(value => <div className="h-36 rounded-2xl border border-slate-800 bg-slate-900/70 motion-safe:animate-pulse" key={value} />)}</div> : !error ? <>
        {data.source === "fallback" ? <div className="mt-3 rounded-xl bg-amber-400/10 p-4 text-sm text-amber-200"><p>The full library is unavailable. Showing matches from the limited built-in catalog.</p><button className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={retrySearch} type="button">Retry full library</button></div> : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.exercises.map(exercise => <article className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-5" key={exercise.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-bold">{exercise.name}</h2><p className="mt-1 text-sm text-accent-400">{exercise.primaryMuscle}</p><p className="text-sm text-slate-400">{exercise.equipment || "Equipment not listed"}</p></div><Link aria-label={`View ${exercise.name}`} className="flex min-h-11 shrink-0 items-center rounded-lg bg-slate-800 px-3 text-sm font-semibold" href={`/app/exercises/${encodeURIComponent(exercise.id)}?name=${encodeURIComponent(exercise.name)}`} prefetch={false}>View</Link></div></article>)}</div>
        {!data.exercises.length ? <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-5"><p className="font-semibold">No matching exercises</p><p className="mt-2 text-sm text-slate-400">Try a shorter name or remove a muscle or equipment filter.</p><button className="mt-3 min-h-11 text-sm font-semibold text-accent-300" onClick={reset} type="button">Clear search and filters</button></div> : null}
        {data.nextCursor || data.previousCursor ? <nav aria-label="Exercise result pages" className="mt-6 grid max-w-md grid-cols-2 gap-3"><button className="min-h-12 rounded-xl border border-slate-700 font-semibold disabled:opacity-30" disabled={!data.previousCursor} onClick={() => { setDirection("before"); setCursor(data.previousCursor); }} type="button">Previous</button><button className="min-h-12 rounded-xl border border-slate-700 font-semibold disabled:opacity-30" disabled={!data.nextCursor} onClick={() => { setDirection("after"); setCursor(data.nextCursor); }} type="button">Next</button></nav> : null}
      </> : null}
    </section>
    <p className="mt-6 text-xs text-slate-500">Exercise data by <a className="underline underline-offset-4" href="https://ascendapi.com/" rel="noreferrer" target="_blank">AscendAPI / ExerciseDB</a>.</p>
  </>;
}

function Select({ label, value, onChange, options }: Readonly<{ label: string; value: string; onChange: (value: string) => void; options: string[] }>) {
  return <label className="min-w-0 text-sm font-semibold">{label}<select className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base" onChange={event => onChange(event.target.value)} value={value}><option value="">All</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
}
