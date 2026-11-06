import { MAIN_SLOTS, mealEligibility } from "./planner";
import { validLocalDate } from "./meals";
import type { MealSlot, NutritionPreferences, SavedMeal } from "./types";
export function plannerReadiness(meals: SavedMeal[], preferences: NutritionPreferences | null, snack = false) {
  const needsPreferences = !preferences || preferences.onboarding_status !== "completed";
  const slots: MealSlot[] = [...MAIN_SLOTS, ...(snack ? ["snack" as const] : [])];
  const coverage = slots.map(slot => {
    const saved = meals.filter(meal => !meal.archived && meal.details.slot === slot);
    const eligible = needsPreferences ? [] : saved.filter(meal => !mealEligibility(meal, preferences!));
    const blocked = needsPreferences ? [] : saved.flatMap(meal => { const reason=mealEligibility(meal,preferences!);return reason?[{meal,reason}]:[]; });
    return {slot, eligible, blocked};
  });
  const missing = coverage.filter(item => !item.eligible.length).map(item => item.slot);
  return {needsPreferences,coverage,missing,ready:!needsPreferences && missing.length===0};
}
export function mealPlanFlowHref(page:"setup"|"plan", start:string, snack=false, generate=false) {
  const query=new URLSearchParams();
  if(validLocalDate(start))query.set("start",start);
  if(snack)query.set("snack","1");
  if(page==="plan"&&generate)query.set("generate","1");
  const suffix=query.toString();
  return `/app/nutrition/plan${page==="setup"?"/setup":""}${suffix?`?${suffix}`:""}`;
}
