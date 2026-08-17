"use server";
import { redirect } from "next/navigation";
import { createGeneratedPlan } from "@/lib/workouts/plans";
import type { GeneratedPlan } from "@/types/catalog";
import { MUSCLE_GROUPS } from "@/types/catalog";

export async function saveGeneratedPlan(form: FormData) {
  try { const plan = JSON.parse(String(form.get("plan"))) as GeneratedPlan; validate(plan); const id = await createGeneratedPlan(plan, form.get("makeActive") === "true"); redirect(`/app/plan/${id}?created=true`); }
  catch (error) { if (typeof error === "object" && error && "digest" in error) throw error; redirect("/app/plan/generate?error=save"); }
}
function validate(plan: GeneratedPlan) { if (!plan.name || plan.days.length < 3 || plan.days.length > 6) throw new Error("Invalid plan"); for (const day of plan.days) { if (!day.name || day.exercises.length > 7) throw new Error("Invalid day"); for (const exercise of day.exercises) if (!exercise.name || exercise.sets < 1 || exercise.sets > 10 || !exercise.reps || !MUSCLE_GROUPS.includes(exercise.primaryMuscle)) throw new Error("Invalid exercise"); } }
