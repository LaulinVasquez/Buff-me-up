import { adaptUsdaFood } from "./usda";
import { RECIPE_FOODS, type RecipeFoodKey } from "./recipe-catalog";
import { validNutrients } from "./meals";
import type { FoodIngredient } from "./types";
// Only public app-authored ingredient searches are sent. No profile/recipe/user text or identity.
export async function lookupRecipeFood(food:RecipeFoodKey,key:string,fetcher:typeof fetch=fetch,signal?:AbortSignal):Promise<FoodIngredient|null>{
 if(!key||!Object.hasOwn(RECIPE_FOODS,food))return null;
 const definition=RECIPE_FOODS[food];
 try {
  const url=new URL("https://api.nal.usda.gov/fdc/v1/foods/search");url.searchParams.set("api_key",key);
  const response=await fetcher(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:definition.query,dataType:["Foundation","SR Legacy"],pageSize:8}),signal:signal??AbortSignal.timeout(7000)});
  if(!response.ok)return null;
  const data=await response.json() as {foods?:unknown[]};if(!Array.isArray(data.foods))return null;
  for(const value of data.foods.slice(0,8)){
   if(!value||typeof value!=="object")continue;
   const item=value as {description?:unknown;dataType?:unknown};
   if(!["Foundation","SR Legacy"].includes(String(item.dataType))||typeof item.description!=="string"||(!definition.match.every(word=>item.description!.toString().toLowerCase().includes(word))||definition.reject.some(word=>item.description!.toString().toLowerCase().includes(word))))continue;
   const ingredient=adaptUsdaFood(value);if(!validNutrients(ingredient.per100g)||ingredient.per100g.calories===null)continue;
   return ingredient;
  }
 } catch { /* Unknown is preferable to a guessed or unavailable match. */ }
 return null;
}
