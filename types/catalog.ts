export const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves", "Abs/Core"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type CatalogExercise = {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment?: string;
  instructions: string[];
  videoUrl?: string;
  imageUrl?: string;
  difficulty?: string;
  mechanic?: "compound" | "isolation";
};

export type CatalogPage = { exercises: CatalogExercise[]; total: number; limit: number; offset: number; source: "musclewiki" | "fallback" };
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type GeneratedExercise = Pick<CatalogExercise, "id" | "name" | "primaryMuscle" | "equipment"> & { sets: number; reps: string };
export type GeneratedDay = { name: string; muscles: MuscleGroup[]; exercises: GeneratedExercise[] };
export type GeneratedPlan = { name: string; description: string; days: GeneratedDay[]; seed: number };
