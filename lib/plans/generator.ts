import type { CatalogExercise, ExperienceLevel, GeneratedDay, GeneratedPlan, MuscleGroup } from "@/types/catalog";

const legs: MuscleGroup[] = ["Quadriceps", "Hamstrings", "Glutes", "Calves"];
const push: MuscleGroup[] = ["Chest", "Shoulders", "Triceps"];
const pull: MuscleGroup[] = ["Back", "Biceps"];

export function expandSelections(values: string[]): MuscleGroup[] { return [...new Set(values.flatMap((value) => value === "Legs" ? legs : [value as MuscleGroup]))]; }

export function generatePlan(pool: CatalogExercise[], dayCount: number, selected: MuscleGroup[], experience: ExperienceLevel, seed = Date.now()): GeneratedPlan {
  if (dayCount < 3 || dayCount > 6) throw new Error("Workout days must be between 3 and 6");
  if (!selected.length) throw new Error("Select at least one muscle group");
  const templates = split(dayCount, selected); const perDay = experience === "beginner" ? 4 : experience === "intermediate" ? 5 : 6;
  let previous = new Set<string>();
  const days: GeneratedDay[] = templates.map((template, dayIndex) => {
    const desired = template.muscles.filter((m) => selected.includes(m)); const targets = desired.length ? desired : selected;
    const candidates = pool.filter((e) => targets.includes(e.primaryMuscle)).sort((a, b) => score(a, seed + dayIndex) - score(b, seed + dayIndex));
    const chosen: CatalogExercise[] = [];
    for (const muscle of targets) { const candidate = candidates.find((e) => e.primaryMuscle === muscle && !previous.has(e.id) && !chosen.some((x) => x.id === e.id)); if (candidate) chosen.push(candidate); }
    for (const candidate of candidates) if (chosen.length < perDay && !chosen.some((x) => x.id === candidate.id) && !previous.has(candidate.id)) chosen.push(candidate);
    for (const candidate of candidates) if (chosen.length < perDay && !chosen.some((x) => x.id === candidate.id)) chosen.push(candidate);
    chosen.sort((a, b) => (a.mechanic === "compound" ? 0 : 1) - (b.mechanic === "compound" ? 0 : 1)); previous = new Set(chosen.map((e) => e.id));
    return { name: template.name, muscles: targets, exercises: chosen.map((e) => ({ id: e.id, name: e.name, primaryMuscle: e.primaryMuscle, equipment: e.equipment, sets: e.mechanic === "compound" ? (experience === "advanced" ? 4 : 3) : 3, reps: e.primaryMuscle === "Calves" || e.primaryMuscle === "Abs/Core" ? "12-20" : e.mechanic === "compound" ? "6-10" : "10-15" })) };
  });
  return { name: `Suggested ${dayCount}-Day Plan`, description: `${experience[0].toUpperCase() + experience.slice(1)} routine emphasizing ${selected.join(", ")}.`, days, seed };
}

function score(exercise: CatalogExercise, seed: number) { let hash = seed; for (const char of exercise.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return hash >>> 0; }
function split(count: number, selected: MuscleGroup[]): Array<{ name: string; muscles: MuscleGroup[] }> {
  const hasAll = push.some((m) => selected.includes(m)) && pull.some((m) => selected.includes(m)) && legs.some((m) => selected.includes(m));
  if (count === 3 && hasAll) return [{ name: "Push", muscles: push }, { name: "Pull", muscles: pull }, { name: "Legs", muscles: legs }];
  if (count === 3) return [1, 2, 3].map((n) => ({ name: `Full Body ${String.fromCharCode(64 + n)}`, muscles: selected }));
  if (count === 4) return [{ name: "Upper A", muscles: [...push, ...pull] }, { name: "Lower A", muscles: [...legs, "Abs/Core"] }, { name: "Upper B", muscles: [...push, ...pull] }, { name: "Lower B", muscles: [...legs, "Abs/Core"] }];
  if (count === 5) return [{ name: "Chest + Triceps", muscles: ["Chest", "Triceps"] }, { name: "Back + Biceps", muscles: ["Back", "Biceps"] }, { name: "Legs", muscles: legs }, { name: "Shoulders + Arms", muscles: ["Shoulders", "Biceps", "Triceps"] }, { name: "Upper Body", muscles: [...push, ...pull] }];
  return [{ name: "Push A", muscles: push }, { name: "Pull A", muscles: pull }, { name: "Legs A", muscles: legs }, { name: "Push B", muscles: push }, { name: "Pull B", muscles: pull }, { name: "Legs B", muscles: legs }];
}
