import { EMPTY_NUTRIENTS, type MealInput, type Nutrients } from "./types";
export const PHOTO_CONSENT_VERSION="meal-photo-v1";
export const PHOTO_MAX_UPLOAD_BYTES=1_000_000;
export const PHOTO_MAX_BODY_BYTES=1_400_000;
export type PhotoEstimateMetadata={version:"photo-v1";calories_low:number;calories_high:number;calories_estimate:number;portion_description:string;confidence:"low"|"medium";uncertainty:string[];estimated_at:string};
export type PhotoAnalysis={kind:"estimated";name:string;foods:string[];nutrients:Nutrients;photo_estimate:PhotoEstimateMetadata;message:string}|{kind:"not_food"|"needs_details";message:string};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const text=(v:unknown,max:number,min=1):v is string=>typeof v==="string"&&v.trim().length>=min&&v.length<=max;
const integer=(v:unknown,max=30000):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=max;
const exact=(v:object,keys:string[])=>Object.keys(v).sort().join()===keys.sort().join();
export function validPhotoMetadata(v:unknown):v is PhotoEstimateMetadata {
 if(!object(v)||!exact(v,["version","calories_low","calories_high","calories_estimate","portion_description","confidence","uncertainty","estimated_at"]))return false;
 return v.version==="photo-v1"&&integer(v.calories_low)&&integer(v.calories_high)&&integer(v.calories_estimate,10000)&&v.calories_high>v.calories_low&&v.calories_estimate>=v.calories_low&&v.calories_estimate<=v.calories_high&&text(v.portion_description,200)&&["low","medium"].includes(String(v.confidence))&&Array.isArray(v.uncertainty)&&v.uncertainty.length>=1&&v.uncertainty.length<=4&&v.uncertainty.every(s=>text(s,180))&&text(v.estimated_at,40)&&/^\d{4}-\d{2}-\d{2}T/.test(v.estimated_at)&&Number.isFinite(Date.parse(v.estimated_at))&&new Date(v.estimated_at).toISOString()===v.estimated_at;
}
export function validPhotoAnalysis(v:unknown):v is PhotoAnalysis {
 if(!object(v)||!text(v.message,300))return false;
 if(v.kind==="not_food"||v.kind==="needs_details")return exact(v,["kind","message"]);
 if(v.kind!=="estimated"||!exact(v,["kind","name","foods","nutrients","photo_estimate","message"])||!text(v.name,100)||!Array.isArray(v.foods)||v.foods.length<1||v.foods.length>8||!v.foods.every(s=>text(s,100))||!validPhotoMetadata(v.photo_estimate)||!object(v.nutrients)||!exact(v.nutrients,Object.keys(EMPTY_NUTRIENTS)))return false;
 return Object.entries(v.nutrients).every(([k,n])=>n===null||(typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=(k==="calories"?10000:k==="sodium"?100000:1000)))&&v.nutrients.calories===v.photo_estimate.calories_estimate;
}
export function parsePhotoOutput(v:unknown,now=new Date()):PhotoAnalysis {
 const keys=["kind","name","foods","portion_description","calories_low","calories_high","protein","carbs","fat","fiber","sodium","confidence","uncertainty","message"];
 if(!object(v)||!exact(v,keys))throw new Error("Invalid photo estimate");
 if(v.kind==="not_food")return {kind:"not_food",message:"I couldn’t identify a meal in this photo. Choose a clear, close-up photo of the food."};
 if(v.kind==="needs_details")return {kind:"needs_details",message:"The food or portion is unclear. Add the foods and amounts you know, or choose a closer photo, then request another estimate."};
 if(v.kind!=="estimated"||!integer(v.calories_low,10000)||!integer(v.calories_high,10000)||v.calories_high<=v.calories_low)throw new Error("Invalid calorie range");
 const low=Math.floor(v.calories_low/10)*10,high=Math.ceil(v.calories_high/10)*10,calories=Math.min(high,Math.max(low,Math.round((low+high)/20)*10));
 for(const key of ["protein","carbs","fat","fiber","sodium"]){const n=v[key];if(n!==null&&(typeof n!=="number"||!Number.isFinite(n)||n<0||n>(key==="sodium"?100000:1000)))throw new Error("Invalid nutrient estimate");}
 const nutrients={calories,...Object.fromEntries(["protein","carbs","fat","fiber","sodium"].map(k=>[k,v[k]===null?null:typeof v[k]==="number"?Math.round(v[k] as number):NaN]))} as Nutrients;
 const result={kind:"estimated",name:v.name,foods:v.foods,nutrients,photo_estimate:{version:"photo-v1",calories_low:low,calories_high:high,calories_estimate:calories,portion_description:v.portion_description,confidence:v.confidence,uncertainty:v.uncertainty,estimated_at:now.toISOString()},message:"Rough estimate for the pictured portion. Hidden ingredients and portion size can change the total."};
 if(!validPhotoAnalysis(result))throw new Error("Invalid photo estimate");return result;
}
export function scalePhotoAnalysis(value:Extract<PhotoAnalysis,{kind:"estimated"}>,factor:number):Extract<PhotoAnalysis,{kind:"estimated"}> {
 if(![0.5,1,1.5,2,2.5,3].includes(factor))throw new Error("Choose a supported pictured portion");
 const original=value.photo_estimate,low=Math.floor(original.calories_low*factor/10)*10,high=Math.ceil(original.calories_high*factor/10)*10,calories=Math.min(high,Math.max(low,Math.round(original.calories_estimate*factor/10)*10));
 const result={...value,nutrients:Object.fromEntries(Object.entries(value.nutrients).map(([k,n])=>[k,n===null?null:k==="calories"?calories:Math.round(n*factor)])) as Nutrients,photo_estimate:{...original,calories_low:low,calories_high:high,calories_estimate:calories,portion_description:factor===1?original.portion_description:`${factor} × pictured portion: ${original.portion_description}`.slice(0,200)}};
 if(!validPhotoAnalysis(result))throw new Error("This portion is too large for one meal entry");return result;
}
export function mealFromPhotoEstimate(current:MealInput,value:Extract<PhotoAnalysis,{kind:"estimated"}>):MealInput {
 if(!validPhotoAnalysis(value))throw new Error("Invalid photo estimate");
 return {...current,name:value.name,mode:"label",recipe_servings:1,ingredients:[],nutrients:{...value.nutrients},photo_estimate:value.photo_estimate,ingredient_notes:`Possible visible foods: ${value.foods.join(", ")}. Photo identification is uncertain. Add the actual ingredients, sauces and oils you know; verify allergens from labels.`,food_groups:[],diet_tags:[],allergens:[],reviewed:false,notes:"Photo-assisted estimate, not a measured or USDA nutrient calculation. Correct the foods, portion and nutrition before saving."};
}
export function withoutPhotoEstimate(meal:MealInput):MealInput {const {photo_estimate:_,...rest}=meal;void _;return rest;}

export type PhotoEstimateDraft={context:string;analysis:PhotoAnalysis|null;factor:number;calories:string|null};
export function validPhotoEstimateDraft(v:unknown):v is PhotoEstimateDraft {
 return object(v)&&exact(v,["context","analysis","factor","calories"])&&text(v.context,300,0)&&(v.analysis===null||validPhotoAnalysis(v.analysis))&&typeof v.factor==="number"&&[0.5,1,1.5,2,2.5,3].includes(v.factor)&&(v.calories===null||text(v.calories,20,0));
}
