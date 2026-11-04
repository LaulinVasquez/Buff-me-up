export const DIETS = ["omnivore", "vegetarian", "vegan", "pescatarian"] as const;
export const GOALS = ["eat_consistently", "support_training", "maintain_energy"] as const;
export const ALLERGENS = ["milk", "egg", "fish", "shellfish", "tree_nut", "peanut", "wheat", "soy", "sesame"] as const;
export const FOOD_GROUPS = ["vegetables", "fruit", "whole_grains", "protein", "dairy_or_fortified_alternative"] as const;
export const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = typeof SLOTS[number];
export type Diet = typeof DIETS[number];
export type Nutrients = { calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; sodium: number | null };
export type NutritionPreferencesInput = {
  age: number | null; height_cm: number | null; weight_kg: number | null;
  activity: "light" | "moderate" | "high"; goal: typeof GOALS[number]; diet: Diet;
  allergens: string[]; avoid_foods: string[]; usual_foods: string;
  cooking_minutes: number; budget: "flexible" | "moderate" | "low";
  calorie_target: number | null; ai_consent: boolean;
};
export type NutritionPreferences = NutritionPreferencesInput & { user_id: string; onboarding_status: "completed" | "skipped"; revision: number; created_at: string; updated_at: string };
export type NutritionActionState = { status: "idle" | "success" | "error"; message?: string; revision?: number };
export const DEFAULT_PREFERENCES: NutritionPreferencesInput = { age: null, height_cm: null, weight_kg: null, activity: "moderate", goal: "support_training", diet: "omnivore", allergens: [], avoid_foods: [], usual_foods: "", cooking_minutes: 30, budget: "moderate", calorie_target: null, ai_consent: false };
