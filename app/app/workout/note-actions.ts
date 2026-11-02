"use server";
import {revalidatePath} from "next/cache";
import {getAuthenticatedWorkoutClient} from "@/lib/workouts/auth";
import {getWorkout} from "@/lib/workouts/sessions";
import {gymExerciseKey,type GymActionState} from "@/lib/gyms/preferences";
import {fallbackExercises} from "@/lib/exercises/fallback";
export async function saveGymNoteAction(_previous:GymActionState,form:FormData):Promise<GymActionState>{
 const workoutId=String(form.get("workoutId")??"");
 try{const workout=await getWorkout(workoutId);const exercise=workout?.gym_workout_exercises.find(item=>item.id===form.get("exerciseId"));if(!exercise)throw new Error("Exercise missing");const key=gymExerciseKey(exercise.name);const settings=String(form.get("settings")??"").trim();const notes=String(form.get("notes")??"").trim();const preferred=String(form.get("preferred")??"")||null;if(!key||exercise.name.length>160||settings.length>1000||notes.length>2000||(preferred&&!fallbackExercises.some(item=>item.id===preferred)))throw new Error("Invalid notes");
 const {supabase}=await getAuthenticatedWorkoutClient();const {error}=await supabase.rpc("gym_save_exercise_note",{target_gym_id:String(form.get("gymId")),target_key:key,display_name:exercise.name,settings,note_text:notes,preferred_id:preferred,expected_updated_at:String(form.get("updatedAt")??"")||null});if(error)throw error;}
 catch{return {status:"error",message:"Notes were not saved. They may have changed elsewhere; refresh and review before trying again."};}
 revalidatePath(`/app/workout/${workoutId}`);return {status:"success",message:"Gym notes saved for your next visit."};
}
