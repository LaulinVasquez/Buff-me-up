import Link from "next/link";
import { NutritionPreferencesForm } from "@/components/nutrition/preferences-form";
import { getNutritionPreferences } from "@/lib/nutrition/service";
import { saveNutritionPreferencesAction } from "../actions";
export default async function NutritionSetupPage() {
  const { preferences, available } = await getNutritionPreferences();
  return <main className="pb-28 pt-8 lg:pb-8"><Link href="/app" className="text-sm text-accent-300">← Home</Link><p className="mt-6 text-sm font-bold uppercase tracking-widest text-accent-400">Meals & habits</p><h1 className="mt-3 text-3xl font-black">Your food, your routine.</h1>{available ? <NutritionPreferencesForm preferences={preferences} action={saveNutritionPreferencesAction} onboarding /> : <p role="alert" className="mt-5 rounded-xl bg-amber-400/10 p-4 text-sm text-amber-200">Nutrition setup is unavailable. Please try again; your workouts remain available.</p>}</main>;
}
