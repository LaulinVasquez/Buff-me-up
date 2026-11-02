import { getAuthenticatedWorkoutClient, assertNoError } from "@/lib/workouts/auth";
import { isWeeklyGoal } from "./review";
export async function getProgressReviewData(){
 const {supabase,userId}=await getAuthenticatedWorkoutClient();
 const [profile,records]=await Promise.all([
  supabase.from("gym_profiles").select("weekly_goal").eq("id",userId).maybeSingle(),
  supabase.from("gym_workouts").select("id,status,completed_at,gym_workout_exercises(name,exercise_id,substitution_details,logged_sets,deferred)").eq("user_id",userId).eq("status","completed").gte("completed_at",new Date(Date.now()-90*86400000).toISOString()).order("completed_at",{ascending:false}).order("id",{ascending:false}).limit(100),
 ]);
 assertNoError(profile.error,"Unable to load weekly goal");assertNoError(records.error,"Unable to load set progress");
 return {goal:isWeeklyGoal(profile.data?.weekly_goal)?profile.data.weekly_goal:3,sessions:records.data};
}
