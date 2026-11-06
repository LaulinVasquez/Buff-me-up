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
import { addFoodIngredient, mealNutrients, nutrientSummary, scaleNutrients, validateMeal, validLocalDate } from "../lib/nutrition/meals";
import { adaptUsdaFood, adaptUsdaProduct, createUsdaClient } from "../lib/nutrition/usda";
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

import { agentContext, assistMealPlan } from "../lib/nutrition/agent";
import { AI_CONSENT_VERSION, generateMealPlan, groceryList, mealEligibility, planDayReview, validateMealPlan } from "../lib/nutrition/planner";
import type { NutritionPreferences, SavedMeal } from "../lib/nutrition/types";
function preferencesFixture():NutritionPreferences{return {...DEFAULT_PREFERENCES,age:38,height_cm:175,weight_kg:80,user_id:"private-user",revision:2,onboarding_status:"completed",ai_consent:true,ai_consent_version:AI_CONSENT_VERSION,created_at:"2026-11-04T00:00:00Z",updated_at:"2026-11-04T00:00:00Z"};}
function mealsFixture():SavedMeal[]{return ["breakfast","lunch","dinner"].flatMap((slot,index)=>[0,1].map(variant=>{const details={...sampleMeal(),name:`Synthetic ${slot} ${variant}`,slot:slot as MealInput["slot"],food_groups:variant?["vegetables","protein"]:["whole_grains","fruit","dairy_or_fortified_alternative"]};return {id:`10000000-0000-0000-0000-00000000000${index*2+variant+1}`,user_id:"private-user",name:details.name,details,nutrients:details.nutrients,archived:false,revision:0,created_at:"2026-11-04T00:00:00Z",updated_at:"2026-11-04T00:00:00Z"};}));}
test("seven-day planner uses reviewed eligible familiar meals and covers all required slots",()=>{
 const meals=mealsFixture();const p=preferencesFixture();const draft=generateMealPlan(meals,p,[],"2026-11-04");assert.equal(draft.entries.length,21);assert(validateMealPlan(draft,meals,p));assert.deepEqual(generateMealPlan(meals,p,[],"2026-11-04"),draft);assert(new Set(draft.entries.map(entry=>entry.meal_id)).size>3);
 assert.throws(()=>generateMealPlan(meals,p,[],"2026-11-04",true),/snack/);
 const changed=structuredClone(draft);changed.entries[0].meal_revision=9;assert.equal(validateMealPlan(changed,meals,p),false);changed.entries[0]={...draft.entries[1]};assert.equal(validateMealPlan(changed,meals,p),false);
 assert(!validateMealPlan({...draft,preference_revision:99},meals,p));
});
test("planner excludes declared allergens, avoided ingredients, unreviewed, expensive or slow meals",()=>{
 const meal=mealsFixture()[0];const p=preferencesFixture();assert.equal(mealEligibility(meal,p),null);
 for(const details of [{...meal.details,reviewed:false},{...meal.details,allergens:["milk"]},{...meal.details,cooking_minutes:100},{...meal.details,budget:"flexible" as const},{...meal.details,ingredient_notes:"Contains OLIVES"}])assert(mealEligibility({...meal,details},{...p,allergens:["milk"],avoid_foods:["olives"],budget:"low"}));
 assert(mealEligibility({...meal,details:{...meal.details,diet_tags:["omnivore"]}},{...p,diet:"vegan"}));
 assert.throws(()=>generateMealPlan(mealsFixture().filter(item=>item.details.slot!=="dinner"),p,[],"2026-11-04"),/dinner/);
});
test("plan reviews report unknown subtotals and grocery quantities use saved recipe portions",()=>{
 const meals=mealsFixture();const draft=generateMealPlan(meals,preferencesFixture(),[],"2026-11-04");const review=planDayReview(draft.entries.filter(entry=>entry.day===0),meals,2500);assert(review.notes.some(note=>note.includes("target")));assert(review.missing.length===0);
 const recipe={...meals[0],details:{...meals[0].details,mode:"recipe" as const,recipe_servings:2,ingredients:[{name:"Oats",grams:100,per100g:{...EMPTY_NUTRIENTS,calories:380},source:"manual" as const,fdc_id:null,retrieved_at:null}]}};
 const list=groceryList([{...draft.entries[0],portions:2,meal:recipe},{...draft.entries[0],day:1,portions:1,meal:recipe}]);assert.equal(list.ingredients[0].grams,150);assert.equal(list.manualMeals.length,0);
});
test("AI context minimizes data and valid structured choices retain local nutrient authority",async()=>{
 const meals=mealsFixture(),preferences=preferencesFixture(),baseline=generateMealPlan(meals,preferences,[],"2026-11-04");const {context,aliases}=agentContext(meals,preferences,[],baseline);const serialized=JSON.stringify(context);for(const name of ["private-user","height_cm","weight_kg","age","allergens","ingredient_notes","calories"])assert(!serialized.includes(`"${name}"`),name);
 const reverse=new Map([...aliases].map(([alias,meal])=>[meal.id,alias]));const output={entries:baseline.entries.map(entry=>({day:entry.day,slot:entry.slot,meal:reverse.get(entry.meal_id),portions:1}))};let body:Record<string,unknown>={};
 const draft=await assistMealPlan({meals,preferences,logs:[],baseline,key:"synthetic-ai-key",model:"configured-test-model",fetcher:async(_url,init)=>{body=JSON.parse(String(init?.body));return new Response(JSON.stringify({status:"completed",output:[{content:[{type:"output_text",text:JSON.stringify(output)}]}]}),{headers:{"Content-Type":"application/json"}});}});assert(validateMealPlan(draft,meals,preferences));assert.equal(body.store,false);assert.equal(body.model,"configured-test-model");assert.equal(body.max_output_tokens,3000);assert(!JSON.stringify(body).includes("synthetic-ai-key"));
});
test("AI rejects unknown choices, refusals, incomplete output and absent scoped consent",async()=>{
 const meals=mealsFixture(),preferences=preferencesFixture(),baseline=generateMealPlan(meals,preferences,[],"2026-11-04");const run=(payload:unknown,p=preferences)=>assistMealPlan({meals,preferences:p,logs:[],baseline,key:"test",model:"test",fetcher:async()=>new Response(JSON.stringify(payload))});
 await assert.rejects(run({status:"incomplete",output:[]}),/incomplete/);await assert.rejects(run({status:"completed",output:[{content:[{type:"refusal"}]}]}),/refused/);
 const unknown={entries:baseline.entries.map(entry=>({day:entry.day,slot:entry.slot,meal:"unknown",portions:1}))};await assert.rejects(run({status:"completed",output:[{content:[{type:"output_text",text:JSON.stringify(unknown)}]}]}),/Unknown AI meal/);
 await assert.rejects(run({}, {...preferences,ai_consent:false}),/consent/);await assert.rejects(run({}, {...preferences,ai_consent_version:""}),/consent/);
});

test("USDA product details retain brand and package ingredients without inventing gram conversions", () => {
 const food = { fdcId: 321, description: "Synthetic breakfast cereal", brandOwner: "Synthetic brand", ingredients: "WHOLE OATS, MILK, OLIVES.", servingSize: 30, servingSizeUnit: "g", foodNutrients: [{nutrient:{id:1008,unitName:"kcal"},amount:270}] };
 const product = adaptUsdaProduct(food);
 assert.equal(product.ingredient.name,"Synthetic breakfast cereal · Synthetic brand");
 assert.equal(product.packageIngredients,food.ingredients);
 assert.equal(product.servingGrams,30);
 assert.equal(product.ingredient.grams,100);
 assert.equal(product.ingredient.per100g.calories,270);
 assert.equal(product.ingredient.per100g.protein,null);
 for (const servingSizeUnit of ["ml","cup","oz",undefined]) assert.equal(adaptUsdaProduct({...food,servingSizeUnit}).servingGrams,null);
 for (const servingSize of [0,-1,Infinity,10001]) assert.equal(adaptUsdaProduct({...food,servingSize}).servingGrams,null);
 const generic = adaptUsdaProduct({fdcId:322,description:"Synthetic rice",foodNutrients:[]});
 assert.equal(generic.brand,null);assert.equal(generic.packageIngredients,null);assert.equal(generic.servingGrams,null);
});
test("searched and manual ingredients persist package notes, scale servings and respect food exclusions", () => {
 const product = adaptUsdaProduct({fdcId:321,description:"Synthetic oats",brandOwner:"Synthetic brand",ingredients:"OATS, OLIVES.",foodNutrients:[{nutrient:{id:1008,unitName:"kcal"},amount:270}]});
 const initial = {...sampleMeal(),mode:"recipe" as const,recipe_servings:2,ingredients:[]};
 const imported = addFoodIngredient(initial,{...product.ingredient,grams:50},product.packageIngredients);
 assert(validateMeal(imported));assert.equal(imported.reviewed,false);assert.equal(initial.ingredients.length,0);
 assert(imported.ingredient_notes.includes("OATS, OLIVES."));
 const combined = addFoodIngredient(imported,{name:"Manual ingredient",grams:100,per100g:{...EMPTY_NUTRIENTS,calories:100},source:"manual",fdc_id:null,retrieved_at:null});
 assert(validateMeal(combined));assert.equal(mealNutrients(combined).calories,117.5);assert.equal(mealNutrients(combined).protein,null);
 const saved = {...mealsFixture()[0],name:combined.name,details:{...combined,reviewed:true}};
 assert.equal(mealEligibility(saved,{...preferencesFixture(),avoid_foods:["olives"]}),"Contains a food you avoid");
 const duplicate = addFoodIngredient(imported,product.ingredient,product.packageIngredients);
 assert.equal(duplicate.ingredient_notes,imported.ingredient_notes);assert.equal(duplicate.ingredients.length,2);
 assert.throws(()=>addFoodIngredient({...initial,ingredient_notes:"x".repeat(2500)},product.ingredient,product.packageIngredients),/won’t fit/);
 assert.throws(()=>addFoodIngredient(initial,product.ingredient,"x".repeat(2501)),/won’t fit/);
 assert.throws(()=>addFoodIngredient({...initial,ingredients:Array(40).fill(product.ingredient)},product.ingredient),/40 ingredients/);
 assert.equal(initial.ingredient_notes,"Rice and beans");
});
test("USDA client details return preview metadata and only saved ingredient fields are persisted", async () => {
 const client=createUsdaClient("synthetic-key",async()=>new Response(JSON.stringify({fdcId:321,description:"Synthetic oats",ingredients:"OATS.",servingSize:40,servingSizeUnit:"g",foodNutrients:[{nutrient:{id:1008,unitName:"kcal"},amount:380}]})));
 const product=await client.details(321);assert.equal(product.servingGrams,40);assert.equal(product.packageIngredients,"OATS.");
 const meal=addFoodIngredient(sampleMeal(),product.ingredient,product.packageIngredients);
 assert(validateMeal(meal));assert(!JSON.stringify(meal).includes("synthetic-key"));assert.equal(meal.mode,"recipe");
 assert.deepEqual(Object.keys(meal.ingredients[0]).sort(),["name","grams","per100g","source","fdc_id","retrieved_at"].sort());
});

test("USDA search cards preview valid per-100-g values without extra detail requests or invented zeros", async () => {
 const requests:URL[]=[];
 const client=createUsdaClient("synthetic-search-key",async input=>{
  requests.push(new URL(String(input)));
  return new Response(JSON.stringify({totalPages:2,foods:[
   {fdcId:601,description:"Synthetic oats",dataType:"Branded",brandOwner:"Preview brand",foodNutrients:[{nutrientId:1008,unitName:"KCAL",value:380},{nutrientId:1003,unitName:"G",value:10}]},
   {fdcId:602,description:"Synthetic zero",foodNutrients:[{nutrientId:1008,unitName:"kcal",value:0},{nutrientId:1003,unitName:"g",value:0}]},
   {fdcId:603,description:"Synthetic unknown",foodNutrients:[{nutrientId:1008,unitName:"kJ",value:400},{nutrientId:1003,unitName:"g",value:-2}]},
   {fdcId:604,description:"Synthetic missing"},
   {fdcId:-1,description:"Invalid ID"},null
  ]}));
 });
 const result=await client.search("oats");
 assert.equal(requests.length,1);assert(requests[0].pathname.endsWith("/foods/search"));
 assert.equal(result.foods.length,4);assert.equal(result.foods[0].brand,"Preview brand");
 assert.deepEqual(result.foods.map(food=>food.nutrients),[{calories:380,protein:10},{calories:0,protein:0},{calories:null,protein:null},{calories:null,protein:null}]);
 assert.equal(JSON.stringify(result).includes("synthetic-search-key"),false);
});

import {heightFields,imperialHeightCm,KG_PER_LB,weightFields,weightKg} from "../lib/nutrition/measurements";
import {mealPlanFlowHref,plannerReadiness} from "../lib/nutrition/planner-setup";
import {adaptProductPhoto,createProductPhotoClient,normalizeBarcode} from "../lib/nutrition/product-photos";
test("imperial measurements convert to canonical metric values and distinguish blank from invalid input",()=>{
 assert.equal(imperialHeightCm("5","10"),177.8);assert.equal(imperialHeightCm("6",""),182.88);
 assert.equal(imperialHeightCm("",""),null);assert(Number.isNaN(imperialHeightCm("","8")));
 for(const [feet,inches]of [["5.5","0"],["5","12"],["5","-1"],["Infinity","0"]])assert(Number.isNaN(imperialHeightCm(feet,inches)));
 assert.equal(weightKg("180","lb"),81.646627);assert.equal(weightKg("80","kg"),80);assert.equal(weightKg("","lb"),null);
 assert.deepEqual(heightFields(177.8),{cm:"177.8",feet:"5",inches:"10"});assert.deepEqual(weightFields(null),{kg:"",lb:""});assert.equal(KG_PER_LB,0.45359237);
 assert(validatePreferences({...DEFAULT_PREFERENCES,height_cm:imperialHeightCm("5","10"),weight_kg:weightKg("180","lb")}));
 assert(!validatePreferences({...DEFAULT_PREFERENCES,height_cm:imperialHeightCm("9","0")}));
 // Metric display retains the full canonical precision.
 assert.equal(weightFields(81.646627).kg,"81.646627");assert.equal(heightFields(175.123456).cm,"175.123456");
});
test("planner setup diagnoses missing preferences and meal slots without relaxing exclusions",()=>{
 const p=preferencesFixture(),meals=mealsFixture();assert.equal(plannerReadiness(meals,p).ready,true);
 assert.equal(plannerReadiness(meals,null).needsPreferences,true);assert.equal(plannerReadiness(meals,{...p,onboarding_status:"skipped"}).ready,false);
 const empty=plannerReadiness([],p);assert.deepEqual(empty.missing,["breakfast","lunch","dinner"]);
 const withSnack=plannerReadiness(meals,p,true);assert.deepEqual(withSnack.missing,["snack"]);
 const blocked=meals.map(meal=>meal.details.slot==="breakfast"?{...meal,details:{...meal.details,allergens:["milk"]}}:meal);
 const status=plannerReadiness(blocked,{...p,allergens:["milk"]});assert.deepEqual(status.missing,["breakfast"]);
 assert.equal(status.coverage[0].blocked.length,2);assert(status.coverage[0].blocked.every(item=>item.reason==="Contains an excluded allergen"));
 const unreviewed=meals.map(meal=>({...meal,details:{...meal.details,reviewed:false}}));assert.equal(plannerReadiness(unreviewed,p).ready,false);
 assert.equal(plannerReadiness(meals.map(meal=>({...meal,archived:true})),p).ready,false);
});
test("planner flow links preserve date/snack choices and cannot become external redirects",()=>{
 assert.equal(mealPlanFlowHref("setup","2026-11-06",true),"/app/nutrition/plan/setup?start=2026-11-06&snack=1");
 assert.equal(mealPlanFlowHref("plan","2026-11-06",false,true),"/app/nutrition/plan?start=2026-11-06&generate=1");
 assert.equal(mealPlanFlowHref("setup","https://example.com/?ai=on"),"/app/nutrition/plan/setup");
 assert(!mealPlanFlowHref("plan","2026-11-06",true,true).includes("ai"));
});
const photoFixture=()=>({product:{code:"0078742333939",product_name:"Synthetic jasmine rice",lang:"en",selected_images:{front:{display:{en:"https://images.openfoodfacts.org/images/products/007/874/233/3939/front_en.4.400.jpg"}}},images:{front_en:{imgid:1},"1":{uploader:"Synthetic contributor"}}}});
test("product photos require normalized exact barcodes, approved image origins and source attribution",()=>{
 assert.equal(normalizeBarcode("078742333939"),"0078742333939");assert.equal(normalizeBarcode("078742333939".padStart(14,"0")),"0078742333939");
 for(const code of ["078742333938","123","00000000","https://example.com/078742333939"])assert.equal(normalizeBarcode(code),null);
 const image=adaptProductPhoto(photoFixture(),"078742333939");assert(image);assert.equal(image.creator,"Synthetic contributor");assert(image.productUrl.endsWith("/0078742333939"));assert(image.licenseUrl.includes("by-sa/3.0"));
 assert.equal(adaptProductPhoto(photoFixture(),"3017620422003"),null);
 for(const imageUrl of ["http://images.openfoodfacts.org/images/products/front.jpg","https://evil.example/front.jpg","https://images.openfoodfacts.org.evil.example/images/products/front.jpg","https://images.openfoodfacts.org/images/products/front.jpg?track=1"]){const fake=photoFixture();fake.product.selected_images.front.display.en=imageUrl;assert.equal(adaptProductPhoto(fake,"078742333939"),null);}
 assert.equal(adaptProductPhoto({product:{code:"0078742333939"}},"078742333939"),null);
});
test("optional photo client uses bounded keyless requests and gracefully identifies missing or mismatched records",async context=>{
 context.mock.method(Date,"now",()=>60000);
 const seen:{url:string;options:RequestInit|undefined}[]=[];
 const lookup=createProductPhotoClient(async(url,options)=>{seen.push({url:String(url),options});return new Response(JSON.stringify(photoFixture()));});
 assert(await lookup("078742333939"));assert.equal(seen.length,1);assert(seen[0].url.includes("/api/v3.6/product/0078742333939.json"));assert(!seen[0].url.includes("api_key"));
 assert(String((seen[0].options?.headers as Record<string,string>)["User-Agent"]).includes("BuffMeUp"));assert.equal(seen[0].options?.redirect,"error");assert(seen[0].options?.signal);
 assert.equal(await lookup("invalid"),null);assert.equal(seen.length,1);
 for(let index=1;index<12;index++)await lookup("078742333939");
 await assert.rejects(lookup("078742333939"),/busy/);assert.equal(seen.length,12);
 assert.equal(await createProductPhotoClient(async()=>new Response("",{status:404}))("078742333939"),null);
 await assert.rejects(createProductPhotoClient(async()=>new Response("",{status:429}))("078742333939"),/unavailable/);
 const wrong=photoFixture();wrong.product.code="3017620422003";assert.equal(await createProductPhotoClient(async()=>new Response(JSON.stringify(wrong)))("078742333939"),null);
});
test("USDA preserves product barcodes and prefers the retail brand without changing saved ingredient fields",()=>{
 const product=adaptUsdaProduct({fdcId:123,description:"Jasmine rice",brandName:"Great Value",brandOwner:"Walmart",gtinUpc:"078742333939",foodNutrients:[]});
 assert.equal(product.barcode,"078742333939");assert.equal(product.brand,"Great Value");assert.equal(product.ingredient.name,"Jasmine rice · Great Value");
 assert.deepEqual(Object.keys(product.ingredient).sort(),["name","grams","per100g","source","fdc_id","retrieved_at"].sort());
});
