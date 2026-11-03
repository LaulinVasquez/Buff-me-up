import type { CatalogExercise, CatalogPage, MuscleGroup } from "@/types/catalog";

export type CatalogSearch = { query?: string; muscle?: string; equipment?: string; limit?: number; cursor?: string; direction?: "after" | "before" };
export const normalizeSearch = (text: string) => text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
export function expandSearch(text: string) {
  return normalizeSearch(text).replace(/\bdb\b/g, "dumbbell").replace(/\bbb\b/g, "barbell").replace(/\brdl\b/g, "romanian deadlift").replace(/\bpull down\b/g, "pulldown").replace(/\bpush down\b/g, "pushdown");
}
const equipmentKey = (text: string) => normalizeSearch(text).replace(/\bdumbbells\b/g, "dumbbell").replace(/\bbody weight\b/g, "bodyweight");
export function catalogEquipmentOptions(names: string[]) {
  const unique = new Map<string, string>();
  for (const raw of names) { const name = raw.trim(); if (name && !unique.has(equipmentKey(name))) unique.set(equipmentKey(name), name); }
  return [...unique.values()].sort((a, b) => a.localeCompare(b));
}
const providerMuscle: Partial<Record<MuscleGroup, string>> = { Chest: "pectorals", Back: "lats", Shoulders: "delts", Biceps: "biceps", Triceps: "triceps", Quadriceps: "quads", Hamstrings: "hamstrings", Glutes: "glutes", Calves: "calves", "Abs/Core": "abs" };
export function catalogRequest(options: CatalogSearch) {
  const limit = Number.isFinite(options.limit) ? Math.min(25, Math.max(1, Math.floor(options.limit!))) : 20;
  const params = new URLSearchParams({ limit: String(limit) });
  const query = expandSearch((options.query ?? "").slice(0, 120));
  if (query) params.set("name", query);
  if (options.muscle && providerMuscle[options.muscle as MuscleGroup]) params.set("targetMuscles", providerMuscle[options.muscle as MuscleGroup]!);
  if (options.equipment) params.set("equipments", options.equipment);
  if (options.cursor) params.set(options.direction === "before" ? "before" : "after", options.cursor);
  return { limit, path: `/exercises?${params}` };
}

// A single insertion, deletion or substitution for words of at least four letters.
function nearWord(a: string, b: string) {
  if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
export function searchLocalCatalog(pool: CatalogExercise[], options: CatalogSearch): CatalogPage {
  const { limit } = catalogRequest(options);
  const query = expandSearch((options.query ?? "").slice(0, 120));
  const tokens = query.split(" ").filter(Boolean);
  const ranked = pool.flatMap(exercise => {
    if (options.muscle && exercise.primaryMuscle !== options.muscle) return [];
    if (options.equipment && !exercise.equipment?.split(",").some(value => equipmentKey(value) === equipmentKey(options.equipment!))) return [];
    const name = expandSearch(exercise.name);
    const words = name.split(" ");
    if (!tokens.every(token => words.some(word => word.startsWith(token) || nearWord(token, word)))) return [];
    const score = name === query ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : 3;
    return [{ exercise, score }];
  }).sort((a, b) => a.score - b.score || a.exercise.name.localeCompare(b.exercise.name) || a.exercise.id.localeCompare(b.exercise.id));
  const offset = options.cursor?.match(/^local:(\d+)$/)?.[1];
  const start = offset ? Math.min(Number(offset), Math.max(0, Math.floor((ranked.length - 1) / limit) * limit)) : 0;
  return { exercises: ranked.slice(start, start + limit).map(item => item.exercise), total: ranked.length, limit, source: "fallback", fallbackReason: "provider_error", nextCursor: start + limit < ranked.length ? `local:${start + limit}` : undefined, previousCursor: start > 0 ? `local:${Math.max(0, start - limit)}` : undefined };
}
