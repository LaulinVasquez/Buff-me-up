import data from "./recipe-data.json";
import { EMPTY_NUTRIENTS, type FoodIngredient, type MealInput, type NutritionPreferences, type SavedMeal } from "./types";
import { mealNutrients } from "./meals";
import { mealEligibility } from "./planner";
import { DEFAULT_PLANNING_OPTIONS, containsMeat, isSuggestion, matchesPlanStyle, styleConflict, type PlanningOptions } from "./plan-options";
export const RECIPE_VERSION=data.version;
export type RecipeFoodKey=keyof typeof data.foods;
export const RECIPE_FOODS=data.foods;
export const RECIPES=data.recipes;
export function suggestionEligibility(meal:SavedMeal,p:NutritionPreferences){return mealEligibility(isSuggestion(meal)?{...meal,details:{...meal.details,reviewed:true}}:meal,p);}
export function recipeId(meal:SavedMeal){return isSuggestion(meal)?meal.id.slice(11):RECIPES.find(r=>meal.details.notes.split("\n")[0]===`Recipe idea: ${r.name}`)?.id??null;}
export function recipeSteps(meal:Pick<SavedMeal,"details">){return meal.details.notes.split("\n").filter(line=>/^\d+\. /.test(line)).map(line=>line.replace(/^\d+\. /,""));}
export function recipeDetails(id:string,foods:Partial<Record<RecipeFoodKey,FoodIngredient>>={}):MealInput {
 const recipe=RECIPES.find(r=>r.id===id);if(!recipe)throw new Error("Unknown recipe suggestion");
 const ingredients=recipe.ingredients.map(i=>{const key=i.food as RecipeFoodKey;const found=foods[key];return {...(found??{name:RECIPE_FOODS[key].name,grams:100,per100g:{...EMPTY_NUTRIENTS},source:"manual" as const,fdc_id:null,retrieved_at:null}),grams:i.grams*2};});
 return {name:recipe.name,slot:recipe.slot as MealInput["slot"],mode:"recipe",recipe_servings:2,ingredients,nutrients:{...EMPTY_NUTRIENTS},ingredient_notes:ingredients.map(i=>i.name).join("; ")+". Check package ingredients, labels and cross-contact. Gram weights use the cooked/raw/drained forms shown.",food_groups:recipe.groups,diet_tags:[recipe.diet as MealInput["diet_tags"][number]],allergens:recipe.allergens,reviewed:false,cooking_minutes:recipe.minutes,budget:recipe.budget as MealInput["budget"],notes:`Recipe idea: ${recipe.name}\n${recipe.ready||`${recipe.minutes} minutes estimated active time; start with the prepared ingredients listed.`}\n${recipe.steps.map((step,i)=>`${i+1}. ${step}`).join("\n")}\nIngredient weights make two servings. Cooking time and cost are estimates; cooked grains/legumes require advance preparation or a suitable ready-cooked product.`.slice(0,1500)};
}
export function catalogMeals(p:NutritionPreferences,options:PlanningOptions=DEFAULT_PLANNING_OPTIONS,foods:Partial<Record<RecipeFoodKey,FoodIngredient>>={}):SavedMeal[]{
 if(styleConflict(p,options.style)||options.source==="saved")return [];
 return RECIPES.map(recipe=>{const details=recipeDetails(recipe.id,foods);return {id:`suggestion:${recipe.id}`,user_id:p.user_id,name:details.name,details,nutrients:mealNutrients(details),archived:false,revision:0,created_at:"",updated_at:""};}).filter(meal=>!suggestionEligibility(meal,p)&&matchesPlanStyle(meal,options.style));
}
export function planningMeals(saved:SavedMeal[],p:NutritionPreferences,options:PlanningOptions,proposals?:SavedMeal[],retainedSuggestions:ReadonlySet<string>=new Set()) {
 if(styleConflict(p,options.style))return [];
 const approved=saved.filter(m=>!mealEligibility(m,p)&&matchesPlanStyle(m,options.style)&&(options.source!=="suggestions"||recipeId(m)!==null));
 const ideas=(proposals??catalogMeals(p,options)).filter(m=>isSuggestion(m)&&!suggestionEligibility(m,p)&&matchesPlanStyle(m,options.style));
 const ownedSources=new Set(approved.map(recipeId).filter(Boolean));
 const pool=[...approved,...ideas.filter(m=>(!ownedSources.has(recipeId(m))||retainedSuggestions.has(m.id)))];
 return pool.sort((a,b)=>options.style==="meat_lovers"?Number(containsMeat(b))-Number(containsMeat(a))||a.id.localeCompare(b.id):a.id.localeCompare(b.id));
}
