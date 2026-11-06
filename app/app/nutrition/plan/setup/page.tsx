import Link from "next/link";
import { MealPlanSetup } from "@/components/nutrition/meal-plan-setup";
import { getNutritionDashboard } from "@/lib/nutrition/service";
import { validLocalDate } from "@/lib/nutrition/meals";
import { saveNutritionPreferencesAction } from "../../actions";
import { saveMealAction } from "../../meal-actions";
export default async function MealPlanSetupPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams;
  let dashboard:Awaited<ReturnType<typeof getNutritionDashboard>>|null=null;
  try { dashboard=await getNutritionDashboard(); } catch {}
  const start=typeof query.start==="string"&&validLocalDate(query.start)?query.start:"";
  return <main className="pb-28 pt-8 lg:pb-8"><Link className="text-sm text-accent-300" href="/app/nutrition/plan">← Meal plans</Link><p className="mt-6 text-sm font-bold uppercase tracking-widest text-accent-400">Let’s build your week</p><h1 className="mt-3 text-3xl font-black">A few questions, then your plan.</h1>{dashboard?.available?<MealPlanSetup initialMeals={dashboard.meals} preferences={dashboard.preferences} start={start} snack={query.snack==="1"} editPreferences={query.step==="preferences"} preferencesAction={saveNutritionPreferencesAction} mealAction={saveMealAction}/>:<p role="alert" className="mt-6 rounded-xl bg-amber-400/10 p-4 text-sm">Meal setup is unavailable. Please reload after checking nutrition is set up.</p>}</main>;
}
