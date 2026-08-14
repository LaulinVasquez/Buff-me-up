import type { Database } from "@/types/database";
import type { WorkoutPlan } from "@/types/workouts";
import { getRecommendedPlan } from "@/data/recommended-plans";
import { assertNoError, getAuthenticatedWorkoutClient } from "./auth";

type PlanInsert = Database["public"]["Tables"]["gym_workout_plans"]["Insert"];
type PlanUpdate = Pick<PlanInsert, "name" | "description">;
type DayInsert = Omit<Database["public"]["Tables"]["gym_workout_days"]["Insert"], "plan_id">;
type DayUpdate = Partial<Pick<DayInsert, "name" | "day_order">>;
type ExerciseInsert = Omit<Database["public"]["Tables"]["gym_exercises"]["Insert"], "workout_day_id">;
type ExerciseUpdate = Partial<Pick<ExerciseInsert, "name" | "sets" | "target_reps" | "default_weight" | "exercise_order" | "notes">>;

export async function getPlans(): Promise<WorkoutPlan[]> {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workout_plans").select("*").order("created_at", { ascending: false });
  assertNoError(error, "Unable to load workout plans");
  return data.map(toWorkoutPlan);
}

export async function getActivePlan() {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workout_plans").select("*, gym_workout_days(*, gym_exercises(*))").eq("is_active", true).order("day_order", { referencedTable: "gym_workout_days" }).maybeSingle();
  assertNoError(error, "Unable to load the active plan");
  return data;
}

export async function getPlan(id: string) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workout_plans").select("*, gym_workout_days(*, gym_exercises(*))").eq("id", id).single();
  assertNoError(error, "Unable to load workout plan");
  return data;
}

export async function createPlan(input: PlanUpdate) {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workout_plans").insert({ ...input, user_id: userId, source: "custom" }).select().single();
  assertNoError(error, "Unable to create workout plan");
  return toWorkoutPlan(data);
}

export async function updatePlan(id: string, input: Partial<PlanUpdate>) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workout_plans").update(input).eq("id", id).select().single();
  assertNoError(error, "Unable to update workout plan");
  return toWorkoutPlan(data);
}

export async function deletePlan(id: string) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { error } = await supabase.from("gym_workout_plans").delete().eq("id", id);
  assertNoError(error, "Unable to delete workout plan");
}

export async function activatePlan(id: string) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { error } = await supabase.rpc("gym_activate_workout_plan", { target_plan_id: id });
  assertNoError(error, "Unable to activate workout plan");
}

export async function createPlanFromRecommendation(recommendationId: string) {
  const template = getRecommendedPlan(recommendationId);
  if (!template) throw new Error("Recommended plan not found");
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.rpc("gym_adopt_recommended_plan", { template });
  assertNoError(error, "Unable to adopt recommended plan");
  return data;
}

export async function createWorkoutDay(planId: string, input: DayInsert) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workout_days").insert({ ...input, plan_id: planId }).select().single();
  assertNoError(error, "Unable to create workout day");
  return data;
}

export async function updateWorkoutDay(id: string, input: DayUpdate) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workout_days").update(input).eq("id", id).select().single();
  assertNoError(error, "Unable to update workout day");
  return data;
}

export async function deleteWorkoutDay(id: string) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { error } = await supabase.from("gym_workout_days").delete().eq("id", id);
  assertNoError(error, "Unable to delete workout day");
}

export async function reorderWorkoutDays(ids: string[]) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  for (const [day_order, id] of ids.entries()) {
    const { error } = await supabase.from("gym_workout_days").update({ day_order }).eq("id", id);
    assertNoError(error, "Unable to reorder workout days");
  }
}

export async function createExercise(workoutDayId: string, input: ExerciseInsert) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_exercises").insert({ ...input, workout_day_id: workoutDayId }).select().single();
  assertNoError(error, "Unable to create exercise");
  return data;
}

export async function updateExercise(id: string, input: ExerciseUpdate) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_exercises").update(input).eq("id", id).select().single();
  assertNoError(error, "Unable to update exercise");
  return data;
}

export async function deleteExercise(id: string) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  const { error } = await supabase.from("gym_exercises").delete().eq("id", id);
  assertNoError(error, "Unable to delete exercise");
}

export async function reorderExercises(ids: string[]) {
  const { supabase } = await getAuthenticatedWorkoutClient();
  for (const [exercise_order, id] of ids.entries()) {
    const { error } = await supabase.from("gym_exercises").update({ exercise_order }).eq("id", id);
    assertNoError(error, "Unable to reorder exercises");
  }
}

function toWorkoutPlan(row: Database["public"]["Tables"]["gym_workout_plans"]["Row"]): WorkoutPlan {
  return { id: row.id, userId: row.user_id, name: row.name, description: row.description, isActive: row.is_active, source: row.source as WorkoutPlan["source"], createdAt: row.created_at, updatedAt: row.updated_at };
}
