import { validPhotoMetadata } from "@/lib/nutrition/photo-estimates";
import type { MealInput } from "@/lib/nutrition/types";
export function PhotoEstimateNote({meal,calories,portions=1}:{meal:MealInput;calories:number|null;portions?:number}){
 const estimate=meal.photo_estimate;if(!validPhotoMetadata(estimate))return null;
 const corrected=calories!==estimate.calories_estimate;
 return <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/5 p-3 text-xs leading-6 text-amber-100"><p className="font-semibold">Photo-assisted {corrected?"· corrected":"· rough estimate"}</p><p>Original photo range: {Math.round(estimate.calories_low*portions)}–{Math.round(estimate.calories_high*portions)} kcal{portions!==1?" for these servings":""}.{corrected?calories===null?" Calories have not been confirmed.":` You entered ${Math.round(calories*portions)} kcal.`:" This is not a measured calorie count."}</p><details><summary className="min-h-9 cursor-pointer">Why this is approximate</summary><p>{estimate.portion_description}</p><ul className="list-disc pl-4">{estimate.uncertainty.map((note,index)=><li key={index}>{note}</li>)}</ul><p>Photos cannot verify hidden ingredients or allergens. Check labels and correct the food and portion.</p></details></div>;
}
