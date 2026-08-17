import type { MuscleGroup } from "@/types/catalog";

const rules: [RegExp, MuscleGroup][] = [
  [/chest|pectoral/i, "Chest"], [/lat|back|trap|rhomboid|erector/i, "Back"], [/shoulder|deltoid/i, "Shoulders"],
  [/bicep/i, "Biceps"], [/tricep/i, "Triceps"], [/quad|adductor/i, "Quadriceps"], [/hamstring/i, "Hamstrings"],
  [/glute/i, "Glutes"], [/calf|gastrocnemius|soleus/i, "Calves"], [/ab|core|oblique/i, "Abs/Core"],
];

export function normalizeMuscle(value: unknown): MuscleGroup | null {
  const text = String(value ?? "");
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}
