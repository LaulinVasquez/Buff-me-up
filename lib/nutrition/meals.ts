import { ALLERGENS, DIETS, FOOD_GROUPS, SLOTS, EMPTY_NUTRIENTS, type FoodIngredient, type FoodLog, type MealInput, type Nutrients } from "./types";
export const NUTRIENT_KEYS = Object.keys(EMPTY_NUTRIENTS) as (keyof Nutrients)[];
export function validNutrients(value: unknown): value is Nutrients {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const nutrients = value as Nutrients;
  return Object.keys(nutrients).sort().join() === [...NUTRIENT_KEYS].sort().join() && NUTRIENT_KEYS.every(key => nutrients[key] === null || (typeof nutrients[key] === "number" && Number.isFinite(nutrients[key]) && nutrients[key]! >= 0 && nutrients[key]! <= (key === "calories" ? 10000 : 100000)));
}
const stringsFrom = (value: unknown, options: readonly string[]) => Array.isArray(value) && value.length <= options.length && value.every(item => typeof item === "string" && options.includes(item)) && new Set(value).size === value.length;
export function validateMeal(value: unknown): value is MealInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const meal = value as MealInput;
  const keys = ["name","slot","mode","recipe_servings","ingredients","nutrients","ingredient_notes","food_groups","diet_tags","allergens","reviewed","cooking_minutes","budget","notes"];
  return Object.keys(meal).sort().join() === keys.sort().join()
    && typeof meal.name === "string" && meal.name.trim().length >= 1 && meal.name.length <= 120 && SLOTS.includes(meal.slot)
    && ["label","recipe"].includes(meal.mode) && Number.isInteger(meal.recipe_servings) && meal.recipe_servings >= 1 && meal.recipe_servings <= 100
    && validNutrients(meal.nutrients) && Array.isArray(meal.ingredients) && meal.ingredients.length <= 40 && (meal.mode === "recipe" ? meal.ingredients.length >= 1 : meal.ingredients.length === 0)
    && meal.ingredients.every(item => item && Object.keys(item).sort().join() === ["name","grams","per100g","source","fdc_id","retrieved_at"].sort().join() && typeof item.name === "string" && item.name.trim().length >= 1 && item.name.length <= 200 && typeof item.grams === "number" && Number.isFinite(item.grams) && item.grams > 0 && item.grams <= 10000 && validNutrients(item.per100g) && ["manual","usda"].includes(item.source) && (item.source === "usda" ? Number.isSafeInteger(item.fdc_id) && item.fdc_id! > 0 && typeof item.retrieved_at === "string" && Number.isFinite(Date.parse(item.retrieved_at)) : item.fdc_id === null && item.retrieved_at === null))
    && typeof meal.ingredient_notes === "string" && meal.ingredient_notes.length <= 2500 && typeof meal.notes === "string" && meal.notes.length <= 1500
    && stringsFrom(meal.food_groups, FOOD_GROUPS) && stringsFrom(meal.diet_tags, DIETS) && stringsFrom(meal.allergens, ALLERGENS) && typeof meal.reviewed === "boolean"
    && Number.isInteger(meal.cooking_minutes) && meal.cooking_minutes >= 0 && meal.cooking_minutes <= 180 && ["low","moderate","flexible"].includes(meal.budget);
}
export const roundNutrient = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function mealNutrients(meal: MealInput): Nutrients {
  if (meal.mode === "label") return { ...meal.nutrients };
  return Object.fromEntries(NUTRIENT_KEYS.map(key => [key, meal.ingredients.some(item => item.per100g[key] === null) ? null : roundNutrient(meal.ingredients.reduce((sum, item) => sum + item.per100g[key]! * item.grams / 100, 0) / meal.recipe_servings)])) as Nutrients;
}
export function scaleNutrients(nutrients: Nutrients, portions: number): Nutrients { return Object.fromEntries(NUTRIENT_KEYS.map(key => [key, nutrients[key] === null ? null : roundNutrient(nutrients[key]! * portions)])) as Nutrients; }
export function nutrientSummary(logs: Pick<FoodLog,"snapshot"|"portions">[]) {
  return Object.fromEntries(NUTRIENT_KEYS.map(key => [key, { known: roundNutrient(logs.reduce((sum,item) => sum + (item.snapshot.nutrients[key] ?? 0) * item.portions, 0)), unknown: logs.filter(item => item.snapshot.nutrients[key] === null).length }])) as Record<keyof Nutrients,{known:number;unknown:number}>;
}
export function validLocalDate(value: string) { if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false; const date=new Date(`${value}T12:00:00Z`);return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value; }
export function shiftDay(value: string, days: number) { const date=new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10); }

// Keep imported package ingredients in the existing saved notes/snapshot field.
// Never truncate them silently: exclusions also inspect this text when planning.
export function addFoodIngredient(meal: MealInput, ingredient: FoodIngredient, packageIngredients: string | null = null): MealInput {
  if (meal.ingredients.length >= 40) throw new Error("This recipe already has 40 ingredients.");
  const block = packageIngredients?.trim() ? `USDA ${ingredient.fdc_id} · ${ingredient.name}: ${packageIngredients.trim()}` : "";
  const notes = block && !meal.ingredient_notes.includes(block) ? [meal.ingredient_notes, block].filter(Boolean).join("\n\n") : meal.ingredient_notes;
  if (notes.length > 2500) throw new Error("The full package ingredients won’t fit in the meal’s 2,500-character notes. Shorten your existing notes or enter this item manually from its label; no ingredients were added.");
  return { ...meal, mode: "recipe", ingredients: [...meal.ingredients, ingredient], ingredient_notes: notes, reviewed: false };
}
