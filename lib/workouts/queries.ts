import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";

export function previousWeightQuery(supabase: SupabaseClient<Database>, exerciseId: string) {
  return supabase.from("gym_workout_exercises")
    .select("weight, gym_workouts!inner(completed_at)")
    .eq("exercise_id", exerciseId)
    .eq("deferred", false)
    .or("completed.eq.true,log_revision.gt.0")
    .eq("gym_workouts.status", "completed")
    .not("weight", "is", null)
    // Order snapshot rows by their to-one workout, before the top-level limit.
    .order("gym_workouts(completed_at)", { ascending: false })
    .order("id", { ascending: false })
    .limit(1).maybeSingle();
}
