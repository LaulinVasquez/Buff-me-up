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

export async function getNutritionDashboard() {
  const { supabase, userId } = await nutritionClient();
  const since = new Date(); since.setUTCDate(since.getUTCDate() - 91);
  const [meals, logs, preferences] = await Promise.all([
    supabase.from("gym_meals").select("*").eq("user_id", userId).order("archived").order("created_at", { ascending: false }).limit(200),
    supabase.from("gym_food_logs").select("*").eq("user_id", userId).gte("log_date", since.toISOString().slice(0, 10)).order("log_date", { ascending: false }).order("created_at", { ascending: false }).limit(1000),
    getNutritionPreferences(),
  ]);
  if (meals.error || logs.error) throw new Error("Meals are unavailable. Verify the meals migration, then reload.");
  return { meals: meals.data as unknown as import("./types").SavedMeal[], logs: logs.data as unknown as import("./types").FoodLog[], truncated: logs.data.length === 1000, ...preferences };
}

export async function getMealPlans() {
  const { supabase, userId } = await nutritionClient();
  const { data, error } = await supabase.from("gym_meal_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Saved meal plans couldn’t load.");
  return data as unknown as import("./planner").SavedMealPlan[];
}
