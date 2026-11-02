import { MUSCLE_GROUPS } from "../../types/catalog";
import type { CatalogExercise, ExperienceLevel, GeneratedDay, GeneratedPlan, MuscleGroup } from "@/types/catalog";

const legs: MuscleGroup[] = ["Quadriceps", "Hamstrings", "Glutes", "Calves"];
const push: MuscleGroup[] = ["Chest", "Shoulders", "Triceps"];
const pull: MuscleGroup[] = ["Back", "Biceps"];

export function expandSelections(values: string[]): MuscleGroup[] { return [...new Set(values.flatMap((value) => value === "Legs" ? legs : MUSCLE_GROUPS.includes(value as MuscleGroup) ? [value as MuscleGroup] : []))]; }

export function generatePlan(pool: CatalogExercise[], dayCount: number, selected: MuscleGroup[], experience: ExperienceLevel, seed = Date.now()): GeneratedPlan {
  if (!Number.isInteger(dayCount) || dayCount < 3 || dayCount > 6) throw new Error("Workout days must be between 3 and 6");
  if (!selected.length || selected.some(muscle => !MUSCLE_GROUPS.includes(muscle))) throw new Error("Select at least one supported muscle group");
  if (!["beginner", "intermediate", "advanced"].includes(experience) || !Number.isSafeInteger(seed)) throw new Error("Choose a valid experience and seed");
  selected = [...new Set(selected)];
  const ids = new Set<string>(); const names = new Set<string>();
  const uniquePool = pool.filter(exercise => {
    const name = exercise.name.trim().replace(/\s+/g," ").toLowerCase();
    if (!exercise.id || exercise.id.length > 160 || !name || exercise.name.length > 160 || (exercise.equipment?.length ?? 0) > 120 || ids.has(exercise.id) || names.has(name)) return false;
    ids.add(exercise.id); names.add(name); return true;
  });
  const missing = selected.filter(muscle => !uniquePool.some(exercise => exercise.primaryMuscle === muscle));
  if (missing.length) throw new Error(`No exercises are available for ${missing.join(", ")}. Change your selection or try the catalog again.`);
  const templates = split(dayCount, selected); const perDay = experience === "beginner" ? 4 : experience === "intermediate" ? 5 : 6;
  let previous = new Set<string>();
  const days: GeneratedDay[] = templates.map((template, dayIndex) => {
    const desired = template.muscles.filter((m) => selected.includes(m)); const targets = desired.length ? desired : selected;
    const candidates = uniquePool.filter((e) => targets.includes(e.primaryMuscle)).sort((a, b) => score(a, seed + dayIndex) - score(b, seed + dayIndex) || a.id.localeCompare(b.id));
    const chosen: CatalogExercise[] = [];
    const focusedTargets = targets.length > perDay ? [...targets.slice((dayIndex * perDay) % targets.length), ...targets.slice(0, (dayIndex * perDay) % targets.length)] : targets;
    for (const muscle of focusedTargets) { if (chosen.length >= perDay) break; const candidate = candidates.find((e) => e.primaryMuscle === muscle && !previous.has(e.id) && !chosen.some((x) => x.id === e.id)); if (candidate) chosen.push(candidate); }
    for (const candidate of candidates) if (chosen.length < perDay && !chosen.some((x) => x.id === candidate.id) && !previous.has(candidate.id)) chosen.push(candidate);
    for (const candidate of candidates) if (chosen.length < perDay && !chosen.some((x) => x.id === candidate.id)) chosen.push(candidate);
    if (!chosen.length) throw new Error(`No matching exercises for ${template.name}. Change your selection.`);
    chosen.sort((a, b) => (a.mechanic === "compound" ? 0 : 1) - (b.mechanic === "compound" ? 0 : 1)); previous = new Set(chosen.map((e) => e.id));
    return { name: template.name, muscles: targets, exercises: chosen.map((e) => ({ id: e.id, name: e.name, primaryMuscle: e.primaryMuscle, equipment: e.equipment, sets: e.mechanic === "compound" ? (experience === "advanced" ? 4 : 3) : 3, reps: e.primaryMuscle === "Calves" || e.primaryMuscle === "Abs/Core" ? "12-20" : e.mechanic === "compound" ? "6-10" : "10-15" })) };
  });
  return { name: `Suggested ${dayCount}-Day Plan`, description: `${experience[0].toUpperCase() + experience.slice(1)} routine emphasizing ${selected.join(", ")}.`, days, seed };
}

function score(exercise: CatalogExercise, seed: number) { let hash = seed; for (const char of exercise.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return hash >>> 0; }
function split(count: number, selected: MuscleGroup[]): Array<{ name: string; muscles: MuscleGroup[] }> {
  const hasAll = push.some((m) => selected.includes(m)) && pull.some((m) => selected.includes(m)) && legs.some((m) => selected.includes(m));
  if (count === 3 && hasAll) return [{ name: "Push", muscles: [...push, "Abs/Core"] }, { name: "Pull", muscles: pull }, { name: "Legs", muscles: legs }];
  if (count === 3) return [1, 2, 3].map((n) => ({ name: `Full Body ${String.fromCharCode(64 + n)}`, muscles: selected }));
  if (count === 4) return [{ name: "Upper A", muscles: [...push, ...pull] }, { name: "Lower A", muscles: [...legs, "Abs/Core"] }, { name: "Upper B", muscles: [...push, ...pull] }, { name: "Lower B", muscles: [...legs, "Abs/Core"] }];
  if (count === 5) return [{ name: "Chest + Triceps", muscles: ["Chest", "Triceps"] }, { name: "Back + Biceps", muscles: ["Back", "Biceps"] }, { name: "Legs", muscles: legs }, { name: "Shoulders + Arms", muscles: ["Shoulders", "Biceps", "Triceps", "Abs/Core"] }, { name: "Upper Body", muscles: [...push, ...pull] }];
  return [{ name: "Push A", muscles: [...push, "Abs/Core"] }, { name: "Pull A", muscles: pull }, { name: "Legs A", muscles: legs }, { name: "Push B", muscles: [...push, "Abs/Core"] }, { name: "Pull B", muscles: pull }, { name: "Legs B", muscles: legs }];
}
