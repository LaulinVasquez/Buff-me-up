import { AI_CONSENT_VERSION } from "./planner";
import { ALLERGENS, DIETS, GOALS, type NutritionPreferences, type NutritionPreferencesInput } from "./types";
const optionalNumber = (value: unknown, min: number, max: number, integer = false) => value === null || (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)));
export function validatePreferences(value: unknown): value is NutritionPreferencesInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as NutritionPreferencesInput;
  return Object.keys(p).sort().join() === ["age","height_cm","weight_kg","activity","goal","diet","allergens","avoid_foods","usual_foods","cooking_minutes","budget","calorie_target","ai_consent"].sort().join()
    && optionalNumber(p.age, 18, 120, true) && optionalNumber(p.height_cm, 80, 250) && optionalNumber(p.weight_kg, 20, 400)
    && ["light","moderate","high"].includes(p.activity) && GOALS.includes(p.goal) && DIETS.includes(p.diet)
    && Array.isArray(p.allergens) && p.allergens.length <= 9 && p.allergens.every(item => ALLERGENS.includes(item as typeof ALLERGENS[number])) && new Set(p.allergens).size === p.allergens.length
    && Array.isArray(p.avoid_foods) && p.avoid_foods.length <= 20 && p.avoid_foods.every(item => typeof item === "string" && item.trim().length >= 1 && item.length <= 64)
    && typeof p.usual_foods === "string" && p.usual_foods.length <= 1500
    && Number.isInteger(p.cooking_minutes) && p.cooking_minutes >= 5 && p.cooking_minutes <= 180
    && ["flexible","moderate","low"].includes(p.budget) && optionalNumber(p.calorie_target, 1200, 6000, true) && typeof p.ai_consent === "boolean";
}
export function preferencesFromForm(form: FormData): NutritionPreferencesInput {
  const number = (key: string) => String(form.get(key) ?? "").trim() === "" ? null : Number(form.get(key));
  return { age: number("age"), height_cm: number("height_cm"), weight_kg: number("weight_kg"), activity: String(form.get("activity")) as NutritionPreferencesInput["activity"], goal: String(form.get("goal")) as NutritionPreferencesInput["goal"], diet: String(form.get("diet")) as NutritionPreferencesInput["diet"], allergens: form.getAll("allergens").map(String), avoid_foods: String(form.get("avoid_foods") ?? "").split(",").map(item => item.trim().toLowerCase()).filter(Boolean), usual_foods: String(form.get("usual_foods") ?? "").trim(), cooking_minutes: Number(form.get("cooking_minutes")), budget: String(form.get("budget")) as NutritionPreferencesInput["budget"], calorie_target: number("calorie_target"), ai_consent: form.get("ai_consent") === "on" };
}

export function preferencesInput(p:NutritionPreferences):NutritionPreferencesInput {return {age:p.age,height_cm:p.height_cm,weight_kg:p.weight_kg,activity:p.activity,goal:p.goal,diet:p.diet,allergens:p.allergens,avoid_foods:p.avoid_foods,usual_foods:p.usual_foods,cooking_minutes:p.cooking_minutes,budget:p.budget,calorie_target:p.calorie_target,ai_consent:p.ai_consent};}

export function preferencesWithCookingTime(p:NutritionPreferences,minutes:number):NutritionPreferencesInput{return {...preferencesInput(p),cooking_minutes:minutes,ai_consent:p.ai_consent&&p.ai_consent_version===AI_CONSENT_VERSION};}
