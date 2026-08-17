import { PlanGenerator } from "@/components/plans/plan-generator";
import { fallbackExercises } from "@/lib/exercises/fallback";
import { searchCatalog } from "@/lib/exercises/provider";
import { getPlans } from "@/lib/workouts/plans";
import { MUSCLE_GROUPS } from "@/types/catalog";

export default async function GeneratePlanPage() {
  const [remote, plans] = await Promise.all([Promise.all(MUSCLE_GROUPS.map((muscle) => searchCatalog({ muscle, limit: 20 }))), getPlans().catch(() => [])]);
  const merged = [...fallbackExercises, ...remote.flatMap((page) => page.exercises)]; const pool = [...new Map(merged.map((exercise) => [exercise.id, exercise])).values()];
  return <main className="pb-28 pt-10"><p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-400">Smart builder</p><h1 className="mt-3 text-3xl font-black">Generate a workout plan</h1><p className="mt-3 leading-7 text-slate-400">Choose your schedule and training emphasis. You can edit every suggestion before saving.</p><PlanGenerator hasActivePlan={plans.some((plan) => plan.isActive)} pool={pool} /></main>;
}
