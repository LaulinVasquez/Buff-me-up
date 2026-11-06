import { groceryList, planDayReview, type MealPlanDraft, type PlanSnapshotEntry } from "./planner";
import { nutrientSummary } from "./meals";
import type { SavedMeal } from "./types";

// Resolve only saved choices; unknown nutrition is kept as a subtotal by the shared calculator.
export function mealPlanReview(draft: MealPlanDraft, meals: SavedMeal[], target: number | null) {
  const entries: PlanSnapshotEntry[] = draft.entries.flatMap(entry => {
    const meal = meals.find(item => item.id === entry.meal_id);
    return meal ? [{ ...entry, meal }] : [];
  });
  const unresolved = draft.entries.length - entries.length;
  const nutrition = nutrientSummary(entries.map(entry => ({ snapshot: entry.meal, portions: entry.portions })));
  for (const nutrient of Object.values(nutrition)) nutrient.unknown += unresolved;
  return {
    days: Array.from({ length: 7 }, (_, day) => {
      const selected = draft.entries.filter(entry => entry.day === day);
      const missing = selected.length - entries.filter(entry => entry.day === day).length;
      const review = planDayReview(selected, meals, missing ? null : target);
      for (const nutrient of Object.values(review.nutrition)) nutrient.unknown += missing;
      if (missing) review.notes.push("Some meal choices are unavailable. Regenerate before saving.");
      return review;
    }),
    nutrition,
    uniqueMeals: new Set(entries.map(entry => entry.meal_id)).size,
    mealCount: entries.length,
    unresolved,
    shopping: groceryList(entries),
  };
}
