"use server";
import { redirect } from "next/navigation";
import { createGeneratedPlan } from "@/lib/workouts/plans";
import { isValidGeneratedPlan } from "@/lib/plans/validation";

export async function saveGeneratedPlan(form: FormData) {
  try { const plan: unknown = JSON.parse(String(form.get("plan"))); if (!isValidGeneratedPlan(plan)) throw new Error("Invalid plan"); const id = await createGeneratedPlan(plan, form.get("makeActive") === "true"); redirect(`/app/plan/${id}?created=true`); }
  catch (error) { if (typeof error === "object" && error && "digest" in error) throw error; redirect("/app/plan/generate?error=save"); }
}
