import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PREFERENCES } from "../lib/nutrition/types";
import { preferencesFromForm, validatePreferences } from "../lib/nutrition/preferences";
test("nutrition preferences keep measurements optional and reject invalid or elevated fields", () => {
 assert(validatePreferences(DEFAULT_PREFERENCES));
 for(const patch of [{age:17},{age:18.5},{weight_kg:Infinity},{calorie_target:500},{diet:"unknown"},{allergens:["invalid"]},{avoid_foods:[""]},{ai_consent:"true"},{user_id:"someone-else"}]) assert.equal(validatePreferences({...DEFAULT_PREFERENCES,...patch}),false);
 assert(validatePreferences({...DEFAULT_PREFERENCES,age:35,height_cm:175,weight_kg:80,allergens:["milk"],avoid_foods:["olives"],ai_consent:true}));
});
test("preference form leaves blank numbers unknown and normalizes food exclusions", () => {
 const form=new FormData();for(const [key,value]of Object.entries(DEFAULT_PREFERENCES))if(!Array.isArray(value)&&value!==null&&typeof value!=="boolean")form.set(key,String(value));
 form.set("avoid_foods","  Olives, Mushrooms , ");form.set("ai_consent","on");
 const value=preferencesFromForm(form);assert.equal(value.age,null);assert.equal(value.weight_kg,null);assert.equal(value.calorie_target,null);assert.deepEqual(value.avoid_foods,["olives","mushrooms"]);assert.equal(value.ai_consent,true);assert(validatePreferences(value));
});

import { EMPTY_NUTRIENTS, type MealInput } from "../lib/nutrition/types";
import { mealNutrients, nutrientSummary, scaleNutrients, validateMeal, validLocalDate } from "../lib/nutrition/meals";
import { adaptUsdaFood, createUsdaClient } from "../lib/nutrition/usda";
const sampleMeal = (): MealInput => ({name:"Usual bowl",slot:"lunch",mode:"label",recipe_servings:1,ingredients:[],nutrients:{calories:500,protein:30,carbs:60,fat:15,fiber:null,sodium:null},ingredient_notes:"Rice and beans",food_groups:["protein","whole_grains"],diet_tags:["vegan"],allergens:[],reviewed:true,cooking_minutes:20,budget:"low",notes:""});
test("meal validation and quantity scaling preserve unknown values instead of inventing zeros",()=>{
 const meal=sampleMeal();assert(validateMeal(meal));assert.deepEqual(scaleNutrients(mealNutrients(meal),1.5),{calories:750,protein:45,carbs:90,fat:22.5,fiber:null,sodium:null});
 for(const patch of [{name:""},{nutrients:{...meal.nutrients,calories:-1}},{recipe_servings:1.5},{ingredients:[{}]},{food_groups:["invented"]},{reviewed:"yes"},{user_id:"other"}])assert.equal(validateMeal({...meal,...patch}),false);
 const summary=nutrientSummary([{snapshot:{name:"Known",details:meal,nutrients:meal.nutrients},portions:2},{snapshot:{name:"Unknown",details:meal,nutrients:{...EMPTY_NUTRIENTS}},portions:1}]);assert.deepEqual(summary.calories,{known:1000,unknown:1});assert.deepEqual(summary.fiber,{known:0,unknown:2});
});
test("recipe nutrients scale gram quantities across recipe servings with null propagation",()=>{
 const meal=sampleMeal();meal.mode="recipe";meal.recipe_servings=2;meal.ingredients=[{name:"Ingredient A",grams:150,per100g:{calories:200,protein:10,carbs:20,fat:4,fiber:2,sodium:null},source:"manual",fdc_id:null,retrieved_at:null},{name:"Ingredient B",grams:50,per100g:{calories:100,protein:4,carbs:10,fat:2,fiber:null,sodium:4},source:"manual",fdc_id:null,retrieved_at:null}];assert(validateMeal(meal));assert.deepEqual(mealNutrients(meal),{calories:175,protein:8.5,carbs:17.5,fat:3.5,fiber:null,sodium:null});
 assert(!validLocalDate("2026-02-30"));assert(validLocalDate("2026-11-04"));
});
test("USDA adapter handles detail/search nutrients and ignores unavailable or wrong-unit amounts",()=>{
 const detail=adaptUsdaFood({fdcId:123,description:"Synthetic rice",servingSize:1,servingSizeUnit:"cup",foodNutrients:[{nutrient:{id:1008,unitName:"kcal"},amount:130},{nutrient:{id:1003,unitName:"g"},amount:2.7},{nutrient:{id:1093,unitName:"g"},amount:2}]},new Date("2026-11-04T00:00:00Z"));assert.equal(detail.grams,100);assert.equal(detail.per100g.calories,130);assert.equal(detail.per100g.protein,2.7);assert.equal(detail.per100g.sodium,null);assert.equal(detail.per100g.carbs,null);assert.equal(detail.fdc_id,123);
 const search=adaptUsdaFood({fdcId:124,description:"Synthetic beans",foodNutrients:[{nutrientId:1008,unitName:"KCAL",value:0},{nutrientId:1003,unitName:"G",value:Infinity}]});assert.equal(search.per100g.calories,0);assert.equal(search.per100g.protein,null);
 assert.throws(()=>adaptUsdaFood({fdcId:1,description:"Incomplete"}),/Invalid/);
});
test("USDA client keeps its API key in server requests and handles limits/provider failures",async()=>{
 const seen:URL[]=[];const client=createUsdaClient("synthetic-key",async(input)=>{const url=new URL(String(input));seen.push(url);return new Response(JSON.stringify({foods:[{fdcId:123,description:"Rice",brandOwner:"Example"}],totalPages:200}),{headers:{"Content-Type":"application/json"}});});
 const result=await client.search("rice",2);assert.equal(result.totalPages,50);assert.equal(result.foods[0].id,123);assert(!JSON.stringify(result).includes("synthetic-key"));assert.equal(seen[0].searchParams.get("api_key"),"synthetic-key");assert.equal(seen[0].searchParams.get("pageSize"),"12");assert.equal(seen[0].searchParams.get("pageNumber"),"2");
 await assert.rejects(createUsdaClient("test",async()=>new Response("",{status:429})).search("rice"),/busy/);
 await assert.rejects(createUsdaClient("").search("rice"),/not configured/);
});
