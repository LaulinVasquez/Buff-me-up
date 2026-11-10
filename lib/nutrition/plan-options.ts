import type { NutritionPreferences, SavedMeal } from "./types";
export const PLAN_STYLES = ["balanced", "vegan", "vegetarian", "pescatarian", "meat_lovers"] as const;
export const STYLE_LABELS = {balanced:"Balanced",vegan:"Vegan",vegetarian:"Vegetarian",pescatarian:"Pescatarian",meat_lovers:"Meat lovers"};
export const PREP_PRIORITIES = ["wash_produce", "batch_grains", "portion_ingredients", "midweek_refresh", "freeze_later_portions"] as const;
export type PrepPriority = typeof PREP_PRIORITIES[number];
export type PlanningOptions = {style:typeof PLAN_STYLES[number];mode:"variety"|"meal_prep";source:"mixed"|"suggestions"|"saved";use_target:boolean};
export const DEFAULT_PLANNING_OPTIONS:PlanningOptions = {style:"balanced",mode:"variety",source:"mixed",use_target:false};
export function validPlanningOptions(v:unknown):v is PlanningOptions {
 if(!v||typeof v!=="object"||Array.isArray(v))return false;const o=v as PlanningOptions;
 return Object.keys(o).sort().join()===["style","mode","source","use_target"].sort().join()&&PLAN_STYLES.includes(o.style)&&["variety","meal_prep"].includes(o.mode)&&["mixed","suggestions","saved"].includes(o.source)&&typeof o.use_target==="boolean";
}
export function styleConflict(p:NutritionPreferences,style:PlanningOptions["style"]):string|null {
 if(style==="meat_lovers"&&p.diet!=="omnivore")return "Meat lovers doesn’t fit your saved eating preference. Choose a compatible style or update your food preferences.";
 if(style==="pescatarian"&&["vegan","vegetarian"].includes(p.diet))return "Fish meals don’t fit your saved eating preference. Choose a compatible style or update your food preferences.";
 return null;
}
export function matchesPlanStyle(meal:SavedMeal,style:PlanningOptions["style"]):boolean {
 const tags=meal.details.diet_tags;
 if(style==="vegan")return tags.includes("vegan");
 if(style==="vegetarian")return tags.some(t=>["vegan","vegetarian"].includes(t));
 if(style==="pescatarian")return tags.some(t=>["vegan","vegetarian","pescatarian"].includes(t));
 return true;
}
export function containsMeat(meal:SavedMeal){return /\b(chicken|turkey|beef|pork|lamb)\b/i.test([meal.name,...meal.details.ingredients.map(i=>i.name)].join(" "));}
export const isSuggestion=(meal:Pick<SavedMeal,"id">)=>meal.id.startsWith("suggestion:");
