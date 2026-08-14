import type { Database } from "@/types/database";
import { assertNoError, getAuthenticatedWorkoutClient } from "./auth";

type WorkoutInsert = Omit<Database["public"]["Tables"]["gym_workouts"]["Insert"], "user_id">;
type WorkoutExerciseInsert = Omit<Database["public"]["Tables"]["gym_workout_exercises"]["Insert"], "workout_id">;

export async function createWorkout(input: WorkoutInsert, exercises: WorkoutExerciseInsert[] = []) {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data: workout, error } = await supabase.from("gym_workouts").insert({ ...input, user_id: userId }).select().single();
  assertNoError(error, "Unable to create workout");
  if (exercises.length) {
    const { error: exerciseError } = await supabase.from("gym_workout_exercises").insert(exercises.map((item) => ({ ...item, workout_id: workout.id })));
    if (exerciseError) {
      await supabase.from("gym_workouts").delete().eq("id", workout.id);
      throw new Error("Unable to create workout exercises", { cause: exerciseError });
    }
  }
  return workout;
}

export async function updateWorkoutStatus(id: string, status: "in_progress" | "completed" | "cancelled") {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const completed_at = status === "completed" ? new Date().toISOString() : null;
  const { data, error } = await supabase.from("gym_workouts").update({ status, completed_at }).eq("id", id).select().single();
  assertNoError(error, "Unable to update workout");
  return data;
}
