import type { PrepPriority } from "@/lib/nutrition/plan-options";
import type { SavedMeal } from "@/lib/nutrition/types";
import { shiftDay } from "@/lib/nutrition/meals";
const tips:Record<PrepPriority,{title:string;text:string}>={
 wash_produce:{title:"Get produce ready",text:"Wash produce and portion what you need for the next few days. Keep ready-to-eat produce separate from raw meat and its utensils."},
 batch_grains:{title:"Prepare your grain bases",text:"Cook the rice or quinoa listed as cooked, or use a compatible ready-cooked product. Cool and refrigerate promptly; freeze portions needed later in the week."},
 portion_ingredients:{title:"Portion before the busy days",text:"Weigh ingredients using the raw, cooked or drained form listed in each recipe. Scale the two-serving recipes to the servings in your plan."},
 midweek_refresh:{title:"Make a midweek refresh",text:"Prepare a second batch midway through the week instead of keeping a full seven days of cooked meals refrigerated."},
 freeze_later_portions:{title:"Freeze the later portions",text:"Refrigerated leftovers generally keep for 3–4 days. Freeze portions you will eat later and thaw safely before use."},
};
export function MealPreparation({start,meals,priorities=[],mealPrep=false,ai=false}:{start:string;meals:SavedMeal[];priorities?:PrepPriority[];mealPrep?:boolean;ai?:boolean}){
 const hasGrains=meals.some(m=>m.details.ingredients.some(i=>/\b(rice|quinoa|pasta)\b/i.test(i.name)));
 const defaults:PrepPriority[]=["wash_produce",...(hasGrains?["batch_grains" as const]:[]),"portion_ingredients","midweek_refresh"];
 const selected=[...new Set([...priorities,...defaults])];
 return <section aria-label="Meal preparation guide" className="mt-7 min-w-0 rounded-3xl border border-slate-800 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">Make the week easier</h3><span className="text-xs text-accent-300">{ai?"AI-selected prep priorities":mealPrep?"Prepare once, enjoy twice":"Preparation checklist"}</span></div><p className="mt-2 text-sm leading-6 text-slate-400">Before {start}, get your first meals ready. Refresh your preparation around {shiftDay(start,3)}; use each recipe’s ingredient forms and directions.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{selected.map(key=><article key={key} className="rounded-2xl bg-slate-900 p-4"><h4 className="text-sm font-bold">{tips[key].title}</h4><p className="mt-2 text-xs leading-6 text-slate-400">{tips[key].text}</p></article>)}</div><p className="mt-4 text-xs leading-6 text-slate-400">Refrigerate perishable cooked food within two hours, or one hour above 90°F / 32°C. Reheat leftovers to 165°F / 74°C using a food thermometer. <a className="text-accent-300 underline" href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety" target="_blank" rel="noreferrer">USDA storage guidance</a> · <a className="text-accent-300 underline" href="https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures" target="_blank" rel="noreferrer">Cooking temperatures</a></p></section>;
}
