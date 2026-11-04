import Link from "next/link";
import { NutritionDashboard } from "@/components/nutrition/nutrition-dashboard";
import { getNutritionDashboard } from "@/lib/nutrition/service";
import { logMealAction, removeFoodLogAction, saveMealAction } from "./meal-actions";
export default async function NutritionPage() {
  let dashboard;
  try { dashboard = await getNutritionDashboard(); } catch { dashboard = null; }
  return <main className="pb-28 pt-10 lg:pb-8"><p className="text-sm font-bold uppercase tracking-widest text-accent-400">Meals & habits</p><h1 className="mt-3 text-3xl font-black">Food that fits your routine.</h1><p className="mt-3 max-w-2xl leading-7 text-slate-400">Keep your familiar meals close. Log portions, understand your nutrition and build a routine that works for you.</p>{dashboard?<NutritionDashboard initialMeals={dashboard.meals} initialLogs={dashboard.logs} preferences={dashboard.preferences} truncated={dashboard.truncated} saveAction={saveMealAction} logAction={logMealAction} removeAction={removeFoodLogAction}/>:<section className="mt-6 rounded-2xl bg-amber-400/10 p-5"><p role="alert" className="text-sm text-amber-200">Meals couldn’t load. Check the nutrition and meals migrations, then reload. Your workout tools remain available.</p><Link className="mt-4 inline-flex min-h-11 items-center text-sm text-accent-300" href="/app">Return to workouts</Link></section>}</main>;
}
