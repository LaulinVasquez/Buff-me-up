import { normalizeBarcode } from "./product-photos";
import { EMPTY_NUTRIENTS, type FoodIngredient, type Nutrients } from "./types";
type Nutrient = { nutrientId?: number; value?: number; unitName?: string; nutrient?: { id?: number; unitName?: string }; amount?: number };
type Food = { fdcId: number; description: string; brandOwner?: string; brandName?: string; gtinUpc?: string; dataType?: string; foodNutrients?: Nutrient[]; servingSize?: number; servingSizeUnit?: string; householdServingFullText?: string; ingredients?: string };
export type UsdaFoodDetails = { ingredient: FoodIngredient; brand: string | null; packageIngredients: string | null; servingGrams: number | null; servingDescription: string | null; barcode: string | null };
export type FoodMatch = { id: number; name: string; brand?: string; dataType?: string; nutrients?: Pick<Nutrients, "calories" | "protein">; barcode?: string | null };
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
export function adaptUsdaProduct(value: unknown, now = new Date()): UsdaFoodDetails {
  const ingredient = adaptUsdaFood(value, now);
  const food = value as Food;
  const brandValue=food.brandName||food.brandOwner;
  const brand=typeof brandValue==="string"&&brandValue.trim()?brandValue.trim().slice(0,100):null;
  if (brand) ingredient.name = `${ingredient.name.slice(0,197-brand.length)} · ${brand}`;
  // FDC composition is per 100 g. A volume/household serving is not a gram weight.
  const servingGrams = food.servingSizeUnit?.trim().toLowerCase() === "g" && typeof food.servingSize === "number" && Number.isFinite(food.servingSize) && food.servingSize > 0 && food.servingSize <= 10000 ? food.servingSize : null;
  return { ingredient, brand, barcode:normalizeBarcode(food.gtinUpc)?food.gtinUpc!:null, packageIngredients: typeof food.ingredients === "string" && food.ingredients.trim() ? food.ingredients.trim() : null, servingGrams, servingDescription: typeof food.householdServingFullText === "string" ? food.householdServingFullText.slice(0,200) : null };
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
    return {foods:payload.foods.filter((food:Food)=>food && Number.isSafeInteger(food.fdcId) && food.fdcId>0 && typeof food.description==="string").map((food:Food)=>{
      const values=adaptUsdaFood({...food,foodNutrients:Array.isArray(food.foodNutrients)?food.foodNutrients:[]}).per100g;
      return {id:food.fdcId,name:food.description.slice(0,200),brand:typeof food.brandName==="string"&&food.brandName.trim()?food.brandName.trim().slice(0,100):typeof food.brandOwner==="string"?food.brandOwner.trim().slice(0,100):undefined,barcode:normalizeBarcode(food.gtinUpc)?food.gtinUpc!:null,dataType:typeof food.dataType==="string"?food.dataType:undefined,nutrients:{calories:values.calories,protein:values.protein}};
    }),page,totalPages:Math.min(50,payload.totalPages)};
  },async details(id:number){if(!Number.isSafeInteger(id)||id<=0)throw new Error("Invalid food ID");return adaptUsdaProduct(await request(`food/${id}`));}};
}
