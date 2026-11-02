import { exerciseCatalog } from "../../data/exercise-catalog";
import { fallbackExercises } from "../exercises/fallback";
import { normalizeMuscle } from "../exercises/normalize";
import { MUSCLE_GROUPS, type CatalogExercise, type MuscleGroup } from "../../types/catalog";
import type { Json } from "../../types/database";

export type SwapSnapshot = {
  id: string; name: string; completed: boolean; weight: number | null;
  target_sets: number | null; target_reps: string | null; updated_at: string;
  gym_exercises?: { muscle_group: string | null; equipment: string | null } | null;
  substitution_version: number; substitution_details: Json; substitution_history: Json;
};
export type SwapSource = { primaryMuscle: MuscleGroup | null; equipment?: string; mechanic?: CatalogExercise["mechanic"] };
export type SwapActionState = { error?: string };

// Map known template names only; do not infer a custom exercise's purpose from its name.
const aliases: Record<string, string> = {
  "bench press": "barbell bench press", "shoulder press": "dumbbell shoulder press",
  "squat": "back squat", "bicep curl": "dumbbell curl", "tricep pushdown": "triceps pushdown",
  "leg curl": "lying leg curl", "calf raise": "standing calf raise",
};
export function exerciseKey(name: string) {
  const key = name.trim().replace(/\s+/g, " ").toLowerCase();
  return aliases[key] ?? key;
}
export function readSubstitutionDetails(value: Json): CatalogExercise | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { id, name, primaryMuscle, equipment, instructions, mechanic } = value;
  if (typeof id !== "string" || !id || typeof name !== "string" || !name || !MUSCLE_GROUPS.includes(primaryMuscle as MuscleGroup)
    || typeof equipment !== "string" || !Array.isArray(instructions) || instructions.some(step => typeof step !== "string")) return null;
  return { id, name, primaryMuscle: primaryMuscle as MuscleGroup, equipment, instructions: instructions as string[], secondaryMuscles: [], mechanic: mechanic === "compound" || mechanic === "isolation" ? mechanic : undefined };
}
export function getSwapSource(snapshot: Pick<SwapSnapshot, "name" | "substitution_details" | "gym_exercises">): SwapSource {
  const saved = readSubstitutionDetails(snapshot.substitution_details);
  if (saved) return { primaryMuscle: saved.primaryMuscle, equipment: saved.equipment, mechanic: saved.mechanic };
  const catalog = fallbackExercises.find(item => exerciseKey(item.name) === exerciseKey(snapshot.name));
  const templateMuscle = normalizeMuscle(snapshot.gym_exercises?.muscle_group);
  if (catalog) return { primaryMuscle: templateMuscle ?? catalog.primaryMuscle, equipment: catalog.equipment, mechanic: templateMuscle && templateMuscle !== catalog.primaryMuscle ? undefined : catalog.mechanic };
  if (templateMuscle) return { primaryMuscle: templateMuscle, equipment: snapshot.gym_exercises?.equipment ?? undefined };
  const known = exerciseCatalog[snapshot.name];
  return { primaryMuscle: known ? normalizeMuscle(known.muscleGroup) : null, equipment: known?.equipment };
}
export function getSwapCandidates(source: SwapSource, snapshots: Pick<SwapSnapshot, "name" | "substitution_details">[], equipment: string[] = [], pool: CatalogExercise[] = fallbackExercises) {
  if (!source.primaryMuscle) return [];
  const usedNames = new Set(snapshots.map(item => exerciseKey(item.name)));
  const usedIds = new Set(snapshots.flatMap(item => { const details = readSubstitutionDetails(item.substitution_details); return details ? [details.id] : []; }));
  return pool.filter(item => item.primaryMuscle === source.primaryMuscle
    && (!source.mechanic || item.mechanic === source.mechanic)
    && !usedNames.has(exerciseKey(item.name)) && !usedIds.has(item.id)
    && (!equipment.length || equipment.includes(item.equipment ?? "")))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function substitutionRecords(value: Json): { name: string; weight: number | null; loggedSets?: Json }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => item && typeof item === "object" && !Array.isArray(item) && typeof item.name === "string"
    ? [{ name: item.name, ...(item.logged_sets ? { loggedSets: item.logged_sets } : {}), weight: typeof item.weight === "number" ? item.weight : null }] : []);
}
