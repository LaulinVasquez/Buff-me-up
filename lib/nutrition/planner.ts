import { FOOD_GROUPS, type FoodLog, type MealSlot, type NutritionPreferences, type SavedMeal } from "./types";
import { nutrientSummary, shiftDay, validLocalDate } from "./meals";
export const GUIDANCE_VERSION = "dga-2025-2030-app-v1";
export const AI_CONSENT_VERSION = "nutrition-choices-v1";
export const GUIDANCE_SOURCE = "https://cdn.realfood.gov/DGA.pdf";
export const MAIN_SLOTS = ["breakfast","lunch","dinner"] as const;
export type PlanEntry = { day: number; slot: MealSlot; meal_id: string; meal_revision: number; portions: number };
export type MealPlanDraft = { start_date: string; preference_revision: number; guidance_version: string; entries: PlanEntry[] };
export type PlanSnapshotEntry = PlanEntry & { meal: Pick<SavedMeal,"id"|"name"|"details"|"nutrients"|"revision"> };
export type SavedMealPlan = { id: string; user_id: string; name: string; start_date: string; preference_revision: number; guidance_version: string; draft: MealPlanDraft; snapshot: { entries: PlanSnapshotEntry[]; preferences: Pick<NutritionPreferences,"diet"|"allergens"|"avoid_foods"|"calorie_target"|"cooking_minutes"|"budget"> }; request_id: string; created_at: string };
const costRank = { low:0, moderate:1, flexible:2 };
export function mealEligibility(meal: Pick<SavedMeal,"archived"|"details"|"name">, p: NutritionPreferences): string | null {
  const d=meal.details;
  if(meal.archived)return "Archived meal";
  if(!d.reviewed)return "Ingredient review needed";
  if(p.allergens.some(item=>d.allergens.includes(item)))return "Contains an excluded allergen";
  const text=[meal.name,d.ingredient_notes,...d.ingredients.map(item=>item.name)].join(" ").toLowerCase();
  if(p.avoid_foods.some(item=>text.includes(item.toLowerCase())))return "Contains a food you avoid";
  const tags=p.diet==="vegan"?["vegan"]:p.diet==="vegetarian"?["vegetarian","vegan"]:p.diet==="pescatarian"?["pescatarian","vegetarian","vegan"]:[];
  if(tags.length&&!tags.some(tag=>d.diet_tags.includes(tag as NutritionPreferences["diet"])))return "Doesn’t match your eating preference";
  if(d.cooking_minutes>p.cooking_minutes)return "Exceeds your cooking time";
  if(costRank[d.budget]>costRank[p.budget])return "Exceeds your selected budget";
  return null;
}
export function habitCounts(logs: FoodLog[], now = new Date()) {
  const today=now.toISOString().slice(0,10);const since=shiftDay(today,-28);const result=new Map<string,number>();
  for(const log of logs)if(validLocalDate(log.log_date)&&log.log_date>=since&&log.log_date<=today)result.set(log.meal_id,(result.get(log.meal_id)??0)+1);
  return result;
}
export function generateMealPlan(meals: SavedMeal[], p: NutritionPreferences, logs: FoodLog[], start: string, includeSnack=false, seed=0): MealPlanDraft {
  if(p.onboarding_status!=="completed")throw new Error("Complete your food preferences before creating a plan.");
  if(!validLocalDate(start)||!Number.isSafeInteger(seed))throw new Error("Choose a valid start date.");
  const eligible=meals.filter(meal=>!mealEligibility(meal,p));const slots:MealSlot[]=[...MAIN_SLOTS,...(includeSnack?["snack" as const]:[])];
  const missing=slots.filter(slot=>!eligible.some(meal=>meal.details.slot===slot));
  if(missing.length)throw new Error(`Save and review an eligible ${missing.join(", ")} meal, or adjust your food preferences. Each meal must fit your exclusions, time and budget.`);
  const habits=habitCounts(logs);const counts=new Map<string,number>();const entries:PlanEntry[]=[];
  const usual=p.usual_foods.toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>3);
  for(let day=0;day<7;day++){
    const covered=new Set<string>();
    for(const [slotIndex,slot]of slots.entries()){
      const candidates=eligible.filter(meal=>meal.details.slot===slot).sort((a,b)=>a.id.localeCompare(b.id));
      const score=(meal:SavedMeal,index:number)=>meal.details.food_groups.filter(group=>!covered.has(group)).length*4+Math.min(5,habits.get(meal.id)??0)*0.4+Math.min(3,usual.filter(word=>meal.name.toLowerCase().includes(word)).length)-(counts.get(meal.id)??0)*2-((index-day-slotIndex-seed)%candidates.length+candidates.length)%candidates.length*0.2;
      const picked=candidates.map((meal,index)=>({meal,score:score(meal,index)})).sort((a,b)=>b.score-a.score||a.meal.id.localeCompare(b.meal.id))[0].meal;
      entries.push({day,slot,meal_id:picked.id,meal_revision:picked.revision,portions:1});counts.set(picked.id,(counts.get(picked.id)??0)+1);picked.details.food_groups.forEach(group=>covered.add(group));
    }
  }
  return {start_date:start,preference_revision:p.revision,guidance_version:GUIDANCE_VERSION,entries};
}
export function validateMealPlan(value: unknown, meals: SavedMeal[], p: NutritionPreferences): value is MealPlanDraft {
 if(!value||typeof value!=="object"||Array.isArray(value))return false;const draft=value as MealPlanDraft;
 if(Object.keys(draft).sort().join()!==["start_date","preference_revision","guidance_version","entries"].sort().join()||!validLocalDate(draft.start_date)||draft.preference_revision!==p.revision||draft.guidance_version!==GUIDANCE_VERSION||p.onboarding_status!=="completed"||!Array.isArray(draft.entries)||draft.entries.length<21||draft.entries.length>28)return false;
 const seen=new Set<string>();
 for(const entry of draft.entries){
  if(!entry||Object.keys(entry).sort().join()!==["day","slot","meal_id","meal_revision","portions"].sort().join()||!Number.isInteger(entry.day)||entry.day<0||entry.day>6||![...MAIN_SLOTS,"snack"].includes(entry.slot)||typeof entry.portions!=="number"||!Number.isFinite(entry.portions)||entry.portions<0.5||entry.portions>3||!Number.isInteger(entry.portions*2))return false;
  const key=`${entry.day}:${entry.slot}`;if(seen.has(key))return false;seen.add(key);
  const meal=meals.find(item=>item.id===entry.meal_id);if(!meal||meal.revision!==entry.meal_revision||meal.details.slot!==entry.slot||mealEligibility(meal,p))return false;
 }
 return Array.from({length:7},(_,day)=>MAIN_SLOTS.every(slot=>seen.has(`${day}:${slot}`))).every(Boolean);
}
export function planDayReview(entries: PlanEntry[], meals: SavedMeal[], target: number | null) {
 const selected=entries.flatMap(entry=>{const meal=meals.find(item=>item.id===entry.meal_id);return meal?[{snapshot:{name:meal.name,details:meal.details,nutrients:meal.nutrients},portions:entry.portions}]:[];});
 const groups=new Set(selected.flatMap(item=>item.snapshot.details.food_groups));
 const missing=FOOD_GROUPS.filter(group=>!groups.has(group));const nutrition=nutrientSummary(selected);const notes:string[]=[];
 if(missing.length)notes.push(`Review food-group coverage: ${missing.map(group=>group.replaceAll("_"," ")).join(", ")}.`);
 if(nutrition.calories.unknown)notes.push("Some calorie values are unknown; the total is a known subtotal.");
 if(target&&!nutrition.calories.unknown&&(nutrition.calories.known<target*0.8||nutrition.calories.known>target*1.2))notes.push("The planned total differs from your own calorie target. Review meals and portions.");
 return {nutrition,missing,notes};
}
export function groceryList(entries: PlanSnapshotEntry[]) {
 const items=new Map<string,{name:string;grams:number;source:string}>();const manual=new Map<string,number>();
 for(const entry of entries){const d=entry.meal.details;if(d.mode==="label"){manual.set(entry.meal.name,(manual.get(entry.meal.name)??0)+entry.portions);continue;}for(const ingredient of d.ingredients){const key=ingredient.fdc_id?`usda:${ingredient.fdc_id}`:`manual:${ingredient.name.trim().toLowerCase()}`;const grams=ingredient.grams/d.recipe_servings*entry.portions;const existing=items.get(key);items.set(key,{name:ingredient.name,grams:(existing?.grams??0)+grams,source:ingredient.source});}}
 return {ingredients:[...items.values()].map(item=>({...item,grams:Math.round(item.grams*100)/100})),manualMeals:[...manual].map(([name,servings])=>({name,servings}))};
}
