"use server";
import { revalidatePath } from "next/cache";
import { nutritionClient } from "@/lib/nutrition/service";
import { preferencesWithCookingTime } from "@/lib/nutrition/preferences";
import type { NutritionPreferences } from "@/lib/nutrition/types";
export type CookingTimeState={status:"idle"|"success"|"error";message?:string;preferences?:NutritionPreferences;conflict?:boolean};
export async function updateCookingTimeAction(_previous:CookingTimeState,form:FormData):Promise<CookingTimeState> {
 const minutes=Number(form.get("minutes"));const revision=Number(form.get("revision"));
 if(!Number.isInteger(minutes)||minutes<5||minutes>180||form.get("revision")==null||!Number.isInteger(revision)||revision<0)return {status:"error",message:"Choose a cooking limit between 5 and 180 minutes."};
 try{
  const {supabase,userId}=await nutritionClient();const {data,error}=await supabase.from("gym_nutrition_preferences").select("*").eq("user_id",userId).maybeSingle();
  if(error||!data)return {status:"error",message:"Food preferences couldn’t load. Keep your meal here and reload saved data."};
  if(data.onboarding_status!=="completed")return {status:"error",message:"Complete your food preferences before changing this saved cooking limit. Your meal draft is kept."};
  if(data.cooking_minutes===minutes)return {status:"success",preferences:data,message:"Your saved cooking limit already matches this time."};
  if(data.revision!==revision)return {status:"error",conflict:true,preferences:data,message:"Your preferences changed in another tab. The latest limit is shown; review it before updating again."};
  const {data:saved,error:saveError}=await supabase.rpc("gym_save_nutrition_preferences",{preferences:preferencesWithCookingTime(data,minutes),expected_revision:revision,skip_setup:false});
  if(saveError?.message?.startsWith("Nutrition preferences changed")){const latest=await supabase.from("gym_nutrition_preferences").select("*").eq("user_id",userId).maybeSingle();return {status:"error",conflict:true,preferences:latest.data??undefined,message:"Your preferences changed while updating. Review the latest saved values and try again."};}
  if(saveError||!saved)return {status:"error",message:"The limit wasn’t changed. Reload saved preferences and try again; your meal stays here."};
  revalidatePath("/app","layout");return {status:"success",preferences:saved as unknown as NutritionPreferences,message:`Cooking limit updated to ${minutes} minutes. Your meal is still a draft.`};
 }catch{return {status:"error",message:"Couldn’t reach your saved preferences. Your meal draft is kept; try again."};}
}
