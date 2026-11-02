"use server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedWorkoutClient } from "@/lib/workouts/auth";
import { getWorkout } from "@/lib/workouts/sessions";
import { adaptationPreview, isSessionMode, type AdaptationState } from "@/lib/workouts/adaptations";
export async function adaptWorkoutAction(_previous: AdaptationState, form: FormData): Promise<AdaptationState> {
  const id=String(form.get("workoutId")??"");
  try {
    const mode=form.get("mode"); const minutes=Number(form.get("minutes")); const revision=Number(form.get("revision"));
    if(!isSessionMode(mode)||![15,20,30].includes(minutes)||!Number.isSafeInteger(revision)||revision<0) throw new Error("Invalid mode");
    const workout=await getWorkout(id); if(!workout) throw new Error("Workout missing");
    const preview=adaptationPreview(workout.gym_workout_exercises,mode,minutes);
    const {supabase}=await getAuthenticatedWorkoutClient();
    const {error}=await supabase.rpc("gym_adapt_workout",{target_workout_id:id,target_mode:mode,minutes:mode==="short"?minutes:null,expected_revision:revision,reviewed_exercises:JSON.parse(String(form.get("review"))),keep_exercise_ids:preview.keepIds});
    if(error) return {status:"error",message:"The session changed or could not be saved. Refresh and review the changes again."};
  } catch { return {status:"error",message:"Could not change this session. Refresh and try again."}; }
  revalidatePath(`/app/workout/${id}`);
  return {status:"success",message:"Session updated. Your saved routine is unchanged."};
}
