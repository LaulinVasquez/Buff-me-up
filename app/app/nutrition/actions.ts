"use server";
import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database";
import { nutritionClient, getNutritionPreferences } from "@/lib/nutrition/service";
import { preferencesFromForm, validatePreferences } from "@/lib/nutrition/preferences";
import type { NutritionActionState } from "@/lib/nutrition/types";

export async function saveNutritionPreferencesAction(previous: NutritionActionState, form: FormData): Promise<NutritionActionState> {
  const skip = form.get("intent") === "skip";
  const input = preferencesFromForm(form);
  const rawRevision = String(form.get("revision") ?? "");
  const revision = rawRevision === "" ? null : Number(rawRevision);
  if ((!skip && !validatePreferences(input)) || (revision !== null && (!Number.isInteger(revision) || revision < 0))) return { status: "error", message: "Check the fields and enter values within the ranges shown.", revision: previous.revision };
  try {
    const { supabase } = await nutritionClient();
    const { data, error } = await supabase.rpc("gym_save_nutrition_preferences", { preferences: skip ? {} : input as unknown as Json, expected_revision: revision, skip_setup: skip });
    if(error){if(error.message?.startsWith("Nutrition preferences changed")){const latest=await getNutritionPreferences();return {status:"error",reason:"conflict",preferences:latest.preferences??undefined,message:"Preferences changed in another tab. Your answers are kept; review the latest values before saving."};}throw new Error("Preferences not saved");}
    if(!data||typeof data!=="object"||Array.isArray(data)||typeof data.revision!=="number")throw new Error("Preferences not saved");
    revalidatePath("/app", "layout");
    return { status: "success", message: skip ? "Setup skipped. You can return from Profile whenever you like." : "Nutrition preferences saved. You can update them from Profile.", revision: data.revision, preferences: data as unknown as import("@/lib/nutrition/types").NutritionPreferences };
  } catch { return { status: "error", message: "Preferences couldn’t be saved. Your answers are kept; reload saved data or retry.", revision: previous.revision }; }
}
