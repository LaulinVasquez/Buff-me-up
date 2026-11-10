import { validPlanningOptions, PREP_PRIORITIES, type PlanningOptions, type PrepPriority } from "./plan-options";
import { object, shortString, draftStep, validRetryToken, type RetryToken } from "./drafts";
import { ALLERGENS, DIETS, FOOD_GROUPS, SLOTS, EMPTY_NUTRIENTS, type MealInput, type NutritionPreferences, type SavedMeal } from "./types";
import { validLocalDate } from "./meals";
import type { MealPlanDraft } from "./planner";
import type { FoodMatch, UsdaFoodDetails } from "./usda";
const finite=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=1e8;
export const revision=(v:unknown):v is number|null=>v===null||(Number.isSafeInteger(v)&&Number(v)>=0);
const tags=(v:unknown,allowed:readonly string[])=>Array.isArray(v)&&v.length<=allowed.length&&v.every(item=>typeof item==="string"&&allowed.includes(item));
const nutrients=(v:unknown)=>object(v)&&Object.keys(v).sort().join()===Object.keys(EMPTY_NUTRIENTS).sort().join()&&Object.values(v).every(item=>item===null||finite(item));
export function isDraftMealInput(v:unknown):v is MealInput {
  return object(v)&&Object.keys(v).sort().join()===["name","slot","mode","recipe_servings","ingredients","nutrients","ingredient_notes","food_groups","diet_tags","allergens","reviewed","cooking_minutes","budget","notes"].sort().join()&&shortString(v.name,120)&&SLOTS.includes(v.slot as never)&&["label","recipe"].includes(String(v.mode))&&finite(v.recipe_servings)&&finite(v.cooking_minutes)&&["low","moderate","flexible"].includes(String(v.budget))&&nutrients(v.nutrients)&&shortString(v.ingredient_notes,2500)&&shortString(v.notes,1500)&&tags(v.food_groups,FOOD_GROUPS)&&tags(v.diet_tags,DIETS)&&tags(v.allergens,ALLERGENS)&&typeof v.reviewed==="boolean"&&Array.isArray(v.ingredients)&&v.ingredients.length<=40&&v.ingredients.every(item=>object(item)&&Object.keys(item).sort().join()===["name","grams","per100g","source","fdc_id","retrieved_at"].sort().join()&&shortString(item.name,200)&&finite(item.grams)&&nutrients(item.per100g)&&["usda","manual"].includes(String(item.source))&&(item.fdc_id===null||(Number.isSafeInteger(item.fdc_id)&&Number(item.fdc_id)>0))&&(item.retrieved_at===null||shortString(item.retrieved_at,100)));
}
export type MealEditorDraft={input:MealInput;baseRevision:number|null;reviewPreferenceRevision:number|null;step:number;request:RetryToken};
export function isMealEditorDraft(v:unknown):v is MealEditorDraft{return object(v)&&isDraftMealInput(v.input)&&revision(v.baseRevision)&&revision(v.reviewPreferenceRevision)&&draftStep(v.step)&&validRetryToken(v.request);}
export type LookupDraft={query:string;page:number;totalPages:number;foods:FoodMatch[];selected:UsdaFoodDetails|null;grams:string};
export function isLookupDraft(v:unknown):v is LookupDraft {
 if(!object(v)||!shortString(v.query,120)||!finite(v.page)||!finite(v.totalPages)||!shortString(v.grams,40)||!Array.isArray(v.foods)||v.foods.length>12||!v.foods.every(item=>object(item)&&Number.isSafeInteger(item.id)&&Number(item.id)>0&&shortString(item.name,200)&&(item.brand===undefined||shortString(item.brand,100))&&(item.dataType===undefined||shortString(item.dataType,100))&&(item.barcode===undefined||item.barcode===null||shortString(item.barcode,14))&&(item.nutrients===undefined||(object(item.nutrients)&&["calories","protein"].every(key=>item.nutrients&&((item.nutrients as Record<string,unknown>)[key]===null||finite((item.nutrients as Record<string,unknown>)[key])))))))return false;
 const d=v.selected;
 return d===null||(object(d)&&object(d.ingredient)&&shortString(d.ingredient.name,200)&&d.ingredient.source==="usda"&&Number.isSafeInteger(d.ingredient.fdc_id)&&Number(d.ingredient.fdc_id)>0&&nutrients(d.ingredient.per100g)&&(d.brand===null||shortString(d.brand,100))&&(d.packageIngredients===null||shortString(d.packageIngredients,100000))&&(d.servingGrams===null||finite(d.servingGrams))&&(d.servingDescription===null||shortString(d.servingDescription,200))&&(d.barcode===null||shortString(d.barcode,14)));
}
export type SetupDraft={slot:MealInput["slot"]|null;editor:string|null};
export function isSetupDraft(v:unknown):v is SetupDraft{return object(v)&&(v.slot===null||SLOTS.includes(v.slot as never))&&(v.editor===null||shortString(v.editor,64));}
export function latestPreferences(a:NutritionPreferences|null,b:NutritionPreferences|null){return !a?b:!b?a:a.revision>=b.revision?a:b;}
export type PlannerDraft={start:string;snack:boolean;seed:number;draft:MealPlanDraft|null;name:string;reviewed:boolean;request:RetryToken;engine:"regular"|"ai";options?:PlanningOptions;suggestions?:SavedMeal[];reviewedRecipes?:string[];reviewBaseRevision?:number|null;preparation?:PrepPriority[];editing?:string|null};
export function isPlannerDraft(v:unknown):v is PlannerDraft {
 if(!object(v)||!shortString(v.start,10)||(v.start!==""&&!validLocalDate(v.start))||typeof v.snack!=="boolean"||!Number.isSafeInteger(v.seed)||!shortString(v.name,120)||typeof v.reviewed!=="boolean"||!validRetryToken(v.request)||!["regular","ai"].includes(String(v.engine)))return false;
 if(v.options!==undefined&&!validPlanningOptions(v.options))return false;
 if(v.suggestions!==undefined&&(!Array.isArray(v.suggestions)||v.suggestions.length>50||!v.suggestions.every(m=>object(m)&&shortString(m.id,64)&&String(m.id).startsWith("suggestion:")&&shortString(m.name,120)&&isDraftMealInput(m.details)&&nutrients(m.nutrients)&&m.revision===0&&m.archived===false)))return false;
 if(v.reviewedRecipes!==undefined&&(!Array.isArray(v.reviewedRecipes)||v.reviewedRecipes.length>50||!v.reviewedRecipes.every(id=>shortString(id,64))))return false;
 if(v.reviewBaseRevision!==undefined&&!revision(v.reviewBaseRevision))return false;
 if(v.preparation!==undefined&&(!Array.isArray(v.preparation)||v.preparation.length>5||!v.preparation.every(t=>PREP_PRIORITIES.includes(t))))return false;
 if(v.editing!==undefined&&v.editing!==null&&!shortString(v.editing,64))return false;
 const d=v.draft;return d===null||(object(d)&&typeof d.start_date==="string"&&validLocalDate(d.start_date)&&revision(d.preference_revision)&&shortString(d.guidance_version,100)&&Array.isArray(d.entries)&&d.entries.length>=21&&d.entries.length<=28&&d.entries.every(e=>object(e)&&Number.isInteger(e.day)&&Number(e.day)>=0&&Number(e.day)<=6&&SLOTS.includes(e.slot as never)&&shortString(e.meal_id,64)&&revision(e.meal_revision)&&finite(e.portions)));
}
