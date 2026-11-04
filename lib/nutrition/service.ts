import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NutritionPreferences } from "./types";

export async function nutritionClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sign in required");
  return { supabase, userId: user.id };
}
export async function getNutritionPreferences(): Promise<{ preferences: NutritionPreferences | null; available: boolean }> {
  try {
    const { supabase, userId } = await nutritionClient();
    const { data, error } = await supabase.from("gym_nutrition_preferences").select("*").eq("user_id", userId).maybeSingle();
    if (error) return { preferences: null, available: false };
    return { preferences: data, available: true };
  } catch { return { preferences: null, available: false }; }
}
