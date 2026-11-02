import { readSets } from "./sets";
export type SessionMode = "full" | "short" | "comeback";
export type AdaptableExercise = { id: string; name: string; exercise_order: number; target_sets: number | null; completed: boolean; logged_sets: unknown; deferred: boolean; updated_at: string };
export type AdaptationState = { status: "idle" | "success" | "error"; message?: string };
export function isSessionMode(value: unknown): value is SessionMode { return value === "full" || value === "short" || value === "comeback"; }
export function adaptationPreview(exercises: readonly AdaptableExercise[], mode: SessionMode, minutes = 20) {
  const ordered = [...exercises].sort((a,b) => a.exercise_order-b.exercise_order || a.id.localeCompare(b.id));
  const protectedIds = new Set(ordered.filter(item => item.completed || readSets(item.logged_sets).length > 0).map(item => item.id));
  const untouched = ordered.filter(item => !protectedIds.has(item.id));
  const keepIds = new Set(protectedIds);
  let estimate = 3; // Planning estimate: 3-minute preparation plus 2 min/set and 1 min/setup.
  let selected = 0;
  for (const item of untouched) {
    const cost = Math.min(100, Math.max(1,item.target_sets ?? 3))*2+1;
    const keep = mode === "full" || (mode === "comeback" ? selected < Math.max(1, Math.ceil(untouched.length/2)) : selected === 0 || estimate+cost <= minutes);
    if (keep) { keepIds.add(item.id); estimate += cost; selected++; }
  }
  const keep = ordered.filter(item => keepIds.has(item.id));
  const deferred = ordered.filter(item => !keepIds.has(item.id));
  return { keep, deferred, keepIds: [...keepIds], estimatedMinutes: selected ? estimate : 0, protectedCount: protectedIds.size };
}
