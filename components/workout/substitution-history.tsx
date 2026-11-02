import { substitutionRecords } from "@/lib/workouts/substitutions";
import type { Json } from "@/types/database";

export function SubstitutionHistory({ history }: Readonly<{ history: Json }>) {
  const records = substitutionRecords(history);
  if (!records.length) return null;
  return <div aria-label="Exercise swap history" role="status" className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/5 p-3">
    <p className="text-xs font-bold text-sky-300">Swapped for this session</p>
    <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-400">{records.map((record, index) => <li key={index}>Previously: {record.name}{record.weight !== null ? ` · saved weight ${record.weight} lb` : ""}</li>)}</ul>
    <p className="mt-2 text-xs text-slate-500">Your saved plan is unchanged.</p>
  </div>;
}
