import { assertNoError, getAuthenticatedWorkoutClient } from "./auth";

const HISTORY_SELECT = "*, gym_workout_exercises(*)";

export async function getWorkoutHistoryByMonth(month: string) {
  const { year, monthIndex } = parseMonth(month);
  const start = new Date(Date.UTC(year, monthIndex, 1) - 2 * 86400000).toISOString();
  const end = new Date(Date.UTC(year, monthIndex + 1, 1) + 2 * 86400000).toISOString();
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workouts").select(HISTORY_SELECT)
    .eq("user_id", userId).eq("status", "completed")
    .gte("completed_at", start).lt("completed_at", end)
    .order("completed_at", { ascending: false });
  assertNoError(error, "Unable to load monthly history");
  return data;
}

export async function getWorkoutHistory(limit = 10) {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workouts").select(HISTORY_SELECT)
    .eq("user_id", userId).eq("status", "completed")
    .order("completed_at", { ascending: false }).limit(limit);
  assertNoError(error, "Unable to load workout history");
  return data;
}

export async function getWorkoutDetail(id: string) {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workouts").select(HISTORY_SELECT)
    .eq("id", id).eq("user_id", userId).eq("status", "completed").maybeSingle();
  assertNoError(error, "Unable to load workout detail");
  return data;
}

export async function getWorkoutStatsData() {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { count, error: countError } = await supabase.from("gym_workouts")
    .select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed");
  assertNoError(countError, "Unable to count workouts");
  const attendanceTimestamps: string[] = [];
  const batchSize = 1000;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase.from("gym_workouts").select("completed_at")
      .eq("user_id", userId).eq("status", "completed").not("completed_at", "is", null)
      .order("completed_at", { ascending: false }).range(offset, offset + batchSize - 1);
    assertNoError(error, "Unable to load attendance dates");
    attendanceTimestamps.push(...data.flatMap((row) => row.completed_at ? [row.completed_at] : []));
    if (data.length < batchSize) break;
  }
  return { totalWorkouts: count ?? 0, attendanceTimestamps };
}

export async function getCurrentWorkoutSummary() {
  const { supabase, userId } = await getAuthenticatedWorkoutClient();
  const { data, error } = await supabase.from("gym_workouts").select("id, name, started_at")
    .eq("user_id", userId).eq("status", "in_progress").order("started_at", { ascending: false }).limit(1).maybeSingle();
  assertNoError(error, "Unable to load current workout");
  return data;
}

function parseMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Invalid month");
  const [year, number] = month.split("-").map(Number);
  if (number < 1 || number > 12) throw new Error("Invalid month");
  return { year, monthIndex: number - 1 };
}

export type HistoryWorkout = Awaited<ReturnType<typeof getWorkoutHistory>>[number];
