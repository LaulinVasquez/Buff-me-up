export type LoggedSet = { set: number; reps: number | null; weight: number | null; completed: boolean };
export type SetSaveState = { status: "idle" | "success" | "error"; message?: string };

export function validateSets(value: unknown): value is LoggedSet[] {
  if (!Array.isArray(value) || value.length > 100) return false;
  const seen = new Set<number>();
  return value.every(item => {
    if (!item || typeof item !== "object" || Object.keys(item).sort().join() !== "completed,reps,set,weight") return false;
    const valid = Number.isInteger(item.set) && item.set >= 1 && item.set <= 100 && !seen.has(item.set)
      && typeof item.completed === "boolean"
      && (item.reps === null || (Number.isInteger(item.reps) && item.reps >= 0 && item.reps <= 1000))
      && (!item.completed || (item.reps !== null && item.reps > 0))
      && (item.weight === null || (typeof item.weight === "number" && Number.isFinite(item.weight) && item.weight >= 0 && item.weight <= 100000));
    seen.add(item.set); return valid;
  });
}
export function readSets(value: unknown): LoggedSet[] {
  return validateSets(value) ? [...value].sort((a,b) => a.set-b.set) : [];
}
export function setVolume(sets: readonly LoggedSet[]): number {
  return sets.reduce((sum, set) => sum + (set.completed && set.reps !== null && set.weight !== null ? set.reps * set.weight : 0), 0);
}
export function initialSets(value: unknown, target: number | null): LoggedSet[] {
  const saved = readSets(value);
  return saved.length ? saved : Array.from({ length: Math.min(100, Math.max(1, target ?? 3)) }, (_, i) => ({ set: i+1, reps: null, weight: null, completed: false }));
}
