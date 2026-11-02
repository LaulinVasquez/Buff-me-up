"use server";
import {revalidatePath} from "next/cache";
import {getAuthenticatedWorkoutClient} from "@/lib/workouts/auth";
import {validEquipment,type GymActionState} from "@/lib/gyms/preferences";
export async function saveGymAction(_previous:GymActionState,form:FormData):Promise<GymActionState>{
 const name=String(form.get("name")??"").trim();const equipment=form.getAll("equipment");
 if(!name||name.length>80||!validEquipment(equipment))return {status:"error",message:"Enter a gym name up to 80 characters and choose supported equipment."};
 try{const {supabase}=await getAuthenticatedWorkoutClient();const {error}=await supabase.rpc("gym_save_location",{target_gym_id:String(form.get("gymId")??"")||null,expected_updated_at:String(form.get("updatedAt")??"")||null,gym_name:name,available_equipment:equipment});if(error)throw error;}
 catch{return {status:"error",message:"Gym was not saved. Refresh to check for changes, then try again. You can save up to ten gyms."};}
 revalidatePath("/app","layout");return {status:"success",message:"Gym saved. Choose Use this gym to apply its setup."};
}
export async function selectGymAction(_previous:GymActionState,form:FormData):Promise<GymActionState>{
 try{const {supabase}=await getAuthenticatedWorkoutClient();const {error}=await supabase.rpc("gym_select_location",{target_gym_id:String(form.get("gymId")??"")||null});if(error)throw error;}
 catch{return {status:"error",message:"Could not select that gym. Refresh and try again."};}
 revalidatePath("/app","layout");return {status:"success",message:"Gym selection saved. Your workout will use this setup on its next load."};
}
