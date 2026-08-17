export type WorkoutPlanSource = "custom" | "recommended" | "generated";
export type WorkoutStatus = "in_progress" | "completed" | "cancelled";

export type WorkoutPlan = {
  id: string; userId: string; name: string; description: string | null;
  isActive: boolean; source: WorkoutPlanSource; createdAt: string; updatedAt: string;
};
export type WorkoutDay = {
  id: string; planId: string; name: string; order: number; createdAt: string; updatedAt: string;
};
export type Exercise = {
  id: string; workoutDayId: string; name: string; sets: number; targetReps: string;
  defaultWeight: number | null; order: number; notes: string | null; createdAt: string; updatedAt: string;
};
export type Workout = {
  id: string; userId: string; workoutDayId: string | null; planId: string | null; name: string;
  status: WorkoutStatus; startedAt: string; completedAt: string | null; createdAt: string; updatedAt: string;
};
export type WorkoutExercise = {
  id: string; workoutId: string; exerciseId: string | null; name: string; targetSets: number | null;
  targetReps: string | null; weight: number | null; completed: boolean; order: number; createdAt: string; updatedAt: string;
};
export type RecommendedExercise = {
  name: string; sets: number; targetReps: string; defaultWeight?: number; notes?: string; order: number;
  muscleGroup: string; equipment: string; instructions: string[]; secondaryMuscles?: string[];
  imageUrl?: string; videoUrl?: string; externalExerciseId?: string;
};
export type RecommendedWorkoutDay = { name: string; order: number; exercises: RecommendedExercise[] };
export type RecommendedWorkoutPlan = {
  id: string; name: string; description: string; days: RecommendedWorkoutDay[];
};
