import { readSets, setVolume } from "@/lib/workouts/sets";
export function SetSummary({ value }: { value: unknown }) {
  const sets = readSets(value);
  if (!sets.length) return <p className="mt-3 text-xs text-slate-500">Individual sets were not recorded.</p>;
  return <div className="mt-4"><ul className="space-y-1 text-sm text-slate-300">{sets.map(set => <li key={set.set}>Set {set.set}: {set.reps ?? "—"} reps · {set.weight === null ? "unweighted / unspecified" : `${set.weight} lb`} · {set.completed ? "done" : "incomplete"}</li>)}</ul>{setVolume(sets) > 0 ? <p className="mt-2 text-xs text-accent-300">Recorded volume: {setVolume(sets).toLocaleString()} lb × reps</p> : null}</div>;
}
