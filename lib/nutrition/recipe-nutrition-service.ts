import "server-only";
import { unstable_cache } from "next/cache";
import { lookupRecipeFood } from "./recipe-nutrition";
import { RECIPES, type RecipeFoodKey } from "./recipe-catalog";
import type { FoodIngredient } from "./types";
const cachedFood=unstable_cache(async(food:RecipeFoodKey)=>{
 const found=await lookupRecipeFood(food,process.env.USDA_FDC_API_KEY??"");
 if(!found)throw new Error("No verified public ingredient match");
 return found;
},["bmu-recipe-food-v2"],{revalidate:86400});
// Bound retry pressure without caching transient failures as a full day of missing nutrition.
// Keys are the fixed public catalog only; no account, preferences or provider error is retained.
const unavailableUntil=new Map<RecipeFoodKey,number>();
export async function recipeNutrition(ids:string[]):Promise<Partial<Record<RecipeFoodKey,FoodIngredient>>>{
 if(!process.env.USDA_FDC_API_KEY)return {};
 const keys=[...new Set(RECIPES.filter(r=>ids.includes(r.id)).flatMap(r=>r.ingredients.map(i=>i.food as RecipeFoodKey)))];
 const result:Partial<Record<RecipeFoodKey,FoodIngredient>>={};let next=0;
 // Bound a preview's network work and total wait; completed cache entries can serve later requests.
 let active=true;
 const workers=Promise.all(Array.from({length:Math.min(6,keys.length)},async()=>{
  while(active&&next<keys.length){
   const key=keys[next++];if((unavailableUntil.get(key)??0)>Date.now())continue;
   try{const found=await cachedFood(key);unavailableUntil.delete(key);if(active)result[key]=found;}
   catch{unavailableUntil.set(key,Date.now()+5*60*1000);}
  }
 }));
 let timer:ReturnType<typeof setTimeout>|undefined;
 await Promise.race([workers,new Promise<void>(resolve=>{timer=setTimeout(resolve,8500);})]);active=false;if(timer)clearTimeout(timer);
 return result;
}
