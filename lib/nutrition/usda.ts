import { EMPTY_NUTRIENTS, type FoodIngredient, type Nutrients } from "./types";
type Nutrient = { nutrientId?: number; value?: number; unitName?: string; nutrient?: { id?: number; unitName?: string }; amount?: number };
type Food = { fdcId: number; description: string; brandOwner?: string; dataType?: string; foodNutrients?: Nutrient[]; servingSize?: number; servingSizeUnit?: string; householdServingFullText?: string };
export type FoodMatch = { id: number; name: string; brand?: string; dataType?: string };
export function adaptUsdaFood(value: unknown, now = new Date()): FoodIngredient {
  const food=value as Food;
  if(!food || !Number.isSafeInteger(food.fdcId) || food.fdcId<=0 || typeof food.description!=="string" || !Array.isArray(food.foodNutrients))throw new Error("Invalid food details");
  const idMap:Record<keyof Nutrients,number[]>={calories:[1008,2047,2048],protein:[1003],carbs:[1005],fat:[1004],fiber:[1079],sodium:[1093]};
  const per100g={...EMPTY_NUTRIENTS};
  for(const key of Object.keys(idMap) as (keyof Nutrients)[]){
    for(const id of idMap[key]){
      const found=food.foodNutrients.find(item=>(item.nutrient?.id??item.nutrientId)===id);
      const amount=found?.amount??found?.value;
      if(typeof amount!=="number"||!Number.isFinite(amount)||amount<0)continue;
      const unit=(found?.nutrient?.unitName??found?.unitName??"").toLowerCase();
      if((key==="calories"&&unit!=="kcal")||(key==="sodium"&&unit!=="mg")||(!["calories","sodium"].includes(key)&&unit!=="g"))continue;
      per100g[key]=amount;break;
    }
  }
  return {name:food.description.slice(0,200),grams:100,per100g,source:"usda",fdc_id:food.fdcId,retrieved_at:now.toISOString()};
}
export function createUsdaClient(key:string,fetcher:typeof fetch=fetch){
  async function request(path:string,params:Record<string,string>={}){
    if(!key)throw new Error("Food lookup is not configured");
    const url=new URL(`https://api.nal.usda.gov/fdc/v1/${path}`);for(const [name,value]of Object.entries(params))url.searchParams.set(name,value);url.searchParams.set("api_key",key);
    const response=await fetcher(url,{signal:AbortSignal.timeout(7000)});
    if(!response.ok)throw new Error(response.status===429?"Food lookup is busy. Try again later.":"Food lookup is unavailable. You can enter label values.");
    return response.json();
  }
  return {async search(query:string,page=1):Promise<{foods:FoodMatch[];page:number;totalPages:number}>{
    const payload=await request("foods/search",{query:query.trim().slice(0,120),pageSize:"12",pageNumber:String(Math.min(50,Math.max(1,Math.floor(page))))});
    if(!payload||!Array.isArray(payload.foods)||!Number.isFinite(payload.totalPages))throw new Error("Invalid food search response");
    return {foods:payload.foods.filter((food:Food)=>Number.isSafeInteger(food.fdcId)&&typeof food.description==="string").map((food:Food)=>({id:food.fdcId,name:food.description.slice(0,200),brand:food.brandOwner?.slice(0,100),dataType:food.dataType})),page,totalPages:Math.min(50,payload.totalPages)};
  },async details(id:number){if(!Number.isSafeInteger(id)||id<=0)throw new Error("Invalid food ID");return adaptUsdaFood(await request(`food/${id}`));}};
}
