import { assertNoError, getAuthenticatedWorkoutClient } from "./auth";
import { getActivePlan } from "./plans";

export async function getCurrentWorkout() {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase
    .from("gym_workouts")
    .select("*, gym_workout_exercises(*)")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  assertNoError(error, "Unable to load current workout");
  return data;
}

export async function getNextWorkoutDay() {
  const currentWorkout = await getCurrentWorkout();
  if (currentWorkout) return { plan: null, day: null, currentWorkout };
  const plan = await getActivePlan();
  if (!plan) return { plan: null, day: null, currentWorkout };

  const days = [...plan.gym_workout_days].sort((a, b) => a.day_order - b.day_order);
  if (!days.length) return { plan, day: null, currentWorkout };

  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data: latest, error } = await supabase
    .from("gym_workouts")
    .select("workout_day_id")
    .eq("plan_id", plan.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  assertNoError(error, "Unable to determine the next workout");

  const previousIndex = latest?.workout_day_id
    ? days.findIndex((day) => day.id === latest.workout_day_id)
    : -1;
  const day = days[(previousIndex + 1) % days.length];
  return { plan, day, currentWorkout };
}

export async function startNextWorkout() {
  const selection = await getNextWorkoutDay();
  if (selection.currentWorkout) return selection.currentWorkout.id;
  if (!selection.day) throw new Error("No workout day available");

  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.rpc("gym_start_workout", { target_day_id: selection.day.id });
  assertNoError(error, "Unable to start workout");
  return data;
}

export async function getWorkout(id: string) {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase
    .from("gym_workouts")
    .select("*, gym_workout_exercises(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  assertNoError(error, "Unable to load workout");
  return data;
}

export async function updateWorkoutExercise(workoutId: string, exerciseId: string, input: { weight?: number | null; completed?: boolean }) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase
    .from("gym_workout_exercises")
    .update(input)
    .eq("id", exerciseId)
    .eq("workout_id", workoutId)
    .select()
    .maybeSingle();
  assertNoError(error, "Unable to update exercise");
  if (!data) throw new Error("Exercise not found");
  return data;
}

export async function finishWorkout(id: string) {
  return setWorkoutStatus(id, "completed");
}

export async function cancelWorkout(id: string) {
  return setWorkoutStatus(id, "cancelled");
}

async function setWorkoutStatus(id: string, status: "completed" | "cancelled") {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase
    .from("gym_workouts")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .select()
    .maybeSingle();
  assertNoError(error, `Unable to mark workout ${status}`);
  if (!data) throw new Error("Active workout not found");
  return data;
}

export async function getPreviousExerciseWeight(exerciseId: string | null) {
  if (!exerciseId) return null;
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase
    .from("gym_workout_exercises")
    .select("weight, gym_workouts!inner(completed_at)")
    .eq("exercise_id", exerciseId)
    .eq("gym_workouts.status", "completed")
    .not("weight", "is", null)
    .order("completed_at", { referencedTable: "gym_workouts", ascending: false })
    .limit(1)
    .maybeSingle();
  assertNoError(error, "Unable to load previous weight");
  return data?.weight ?? null;
}

export async function getLatestCompletedWorkout() {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase
    .from("gym_workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  assertNoError(error, "Unable to load completed workout");
  return data;
}
