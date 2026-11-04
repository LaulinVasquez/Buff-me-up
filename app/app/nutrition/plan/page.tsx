import Link from "next/link";
import { MealPlanner } from "@/components/nutrition/meal-planner";
import { getMealPlans, getNutritionDashboard } from "@/lib/nutrition/service";
import { previewMealPlanAction, removeMealPlanAction, saveMealPlanAction } from "./actions";
export default async function MealPlanPage() {
 let dashboard:Awaited<ReturnType<typeof getNutritionDashboard>>|null=null;let plans:Awaited<ReturnType<typeof getMealPlans>>=[];
 try { [dashboard,plans]=await Promise.all([getNutritionDashboard(),getMealPlans()]); } catch { dashboard=null;plans=[]; }
 return <main className="pb-28 pt-8 lg:pb-8"><Link className="text-sm text-accent-300" href="/app/nutrition">← Meals & diary</Link><p className="mt-6 text-sm font-bold uppercase tracking-widest text-accent-400">Your meal week</p><h1 className="mt-3 text-3xl font-black">Familiar meals. A little more structure.</h1>{dashboard?<MealPlanner meals={dashboard.meals} preferences={dashboard.preferences} initialPlans={plans} aiAvailable={Boolean(process.env.OPENAI_API_KEY&&process.env.OPENAI_NUTRITION_MODEL)} previewAction={previewMealPlanAction} saveAction={saveMealPlanAction} removeAction={removeMealPlanAction}/>:<p role="alert" className="mt-6 rounded-xl bg-amber-400/10 p-4 text-sm text-amber-200">Meal plans couldn’t load. Try again after checking that nutrition is set up.</p>}</main>;
}
