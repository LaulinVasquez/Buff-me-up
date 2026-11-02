import { assertNoError, getAuthenticatedWorkoutClient } from "./auth";
import { getWorkout } from "./sessions";
import { getSwapCandidates, getSwapSource } from "./substitutions";
import type { MuscleGroup } from "@/types/catalog";

export async function swapWorkoutExercise(input: {
  workoutId: string; exerciseId: string; version: number; updatedAt: string; muscle: MuscleGroup; replacementId: string;
}) {
  const workout = await getWorkout(input.workoutId);
  const snapshot = workout?.gym_workout_exercises.find(item => item.id === input.exerciseId);
  if (!workout || workout.status !== "in_progress" || !snapshot || snapshot.completed) throw new Error("Exercise is unavailable");
  const source = getSwapSource(snapshot);
  if (source.primaryMuscle && source.primaryMuscle !== input.muscle) throw new Error("Muscle group changed");
  const candidate = getSwapCandidates({ ...source, primaryMuscle: input.muscle }, workout.gym_workout_exercises)
    .find(item => item.id === input.replacementId);
  if (!candidate) throw new Error("Replacement is unavailable");
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { error } = await supabase.rpc("gym_swap_workout_exercise", {
    target_workout_id: input.workoutId, target_exercise_id: input.exerciseId,
    expected_version: input.version, expected_updated_at: input.updatedAt, source_muscle: input.muscle,
    replacement: { id: candidate.id, name: candidate.name, primaryMuscle: candidate.primaryMuscle,
      equipment: candidate.equipment ?? "", instructions: candidate.instructions, mechanic: candidate.mechanic ?? null },
  });
  assertNoError(error, "Unable to replace exercise");
}
