"use server";
import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database";
import { AI_CONSENT_VERSION, generateMealPlan, type MealPlanDraft, type SavedMealPlan } from "@/lib/nutrition/planner";
import { assistMealPlan } from "@/lib/nutrition/agent";
import { getNutritionDashboard, getNutritionPreferences, nutritionClient } from "@/lib/nutrition/service";
import { plannerReadiness, mealPlanFlowHref } from "@/lib/nutrition/planner-setup";
import { validLocalDate } from "@/lib/nutrition/meals";
export type PlanActionState = { status: "idle" | "success" | "error"; message?: string; setupHref?: string; draft?: MealPlanDraft; engine?: "regular" | "ai"; plan?: SavedMealPlan };
export async function previewMealPlanAction(_previous: PlanActionState, form: FormData): Promise<PlanActionState> {
  const start = String(form.get("start") ?? ""); const snack = form.get("snack") === "on"; const useAI = form.get("ai") === "on"; const seed = Number(form.get("seed") ?? 0);
  if (!validLocalDate(start) || !Number.isSafeInteger(seed) || Math.abs(seed) > 100000) return { status: "error", message: "Choose a valid start date and try again." };
  try {
    const dashboard = await getNutritionDashboard(); const p = dashboard.preferences;
    if (!dashboard.available) return { status: "error", message: "Food preferences are unavailable. Please reload and try again." };
    if (!p || !plannerReadiness(dashboard.meals,p,snack).ready) return { status: "idle", setupHref: mealPlanFlowHref("setup",start,snack) };
    const baseline = generateMealPlan(dashboard.meals, p, dashboard.logs, start, snack, seed);
    if (!useAI) return { status: "success", draft: baseline, engine: "regular", message: "A plan based on your familiar meals is ready to review." };
    if (!p.ai_consent || p.ai_consent_version !== AI_CONSENT_VERSION) return { status: "error", message: "Review and enable AI sharing in your food preferences first." };
    const key = process.env.OPENAI_API_KEY; const model = process.env.OPENAI_NUTRITION_MODEL;
    if (!key || !model) return { status: "success", draft: baseline, engine: "regular", message: "AI assistance is unavailable. A regular plan is ready to review." };
    const { supabase } = await nutritionClient(); const { data: allowed, error } = await supabase.rpc("gym_consume_nutrition_request", { request_kind: "ai" });
    if (error || !allowed) return { status: "success", draft: baseline, engine: "regular", message: "AI assistance is unavailable or its daily limit was reached. A regular plan is ready to review." };
    const latest = await getNutritionPreferences();
    if (!latest.preferences?.ai_consent || latest.preferences.ai_consent_version !== AI_CONSENT_VERSION || latest.preferences.revision !== p.revision) return { status: "error", message: "Your food preferences changed. Reload before requesting a plan." };
    try {
      const draft = await assistMealPlan({ meals: dashboard.meals, preferences: p, logs: dashboard.logs, baseline, key, model });
      return { status: "success", draft, engine: "ai", message: "AI-assisted choices are ready. Review meals, portions and food-group coverage before saving." };
    } catch { return { status: "success", draft: baseline, engine: "regular", message: "AI assistance couldn’t complete. A regular plan is ready to review." }; }
  } catch { return { status: "error", message: "A plan couldn’t be prepared. Check your saved meals and try again." }; }
}
export async function saveMealPlanAction(_previous: PlanActionState, form: FormData): Promise<PlanActionState> {
  const name = String(form.get("name") ?? "").trim(); const token = String(form.get("requestToken") ?? "");
  if (name.length < 1 || name.length > 120 || form.get("reviewed") !== "on" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return { status: "error", message: "Name the plan and confirm you reviewed its meals and portions." };
  let draft: unknown;
  try { const raw = String(form.get("draft") ?? ""); if (raw.length > 30000) throw new Error(); draft = JSON.parse(raw); if (!draft || typeof draft !== "object" || Array.isArray(draft)) throw new Error(); }
  catch { return { status: "error", message: "The plan couldn’t be read. Generate it again." }; }
  try {
    const { supabase } = await nutritionClient();
    const { data, error } = await supabase.rpc("gym_save_meal_plan", { plan_name: name, plan: draft as Json, request_token: token });
    if (error || !data) throw new Error();
    revalidatePath("/app/nutrition/plan");return { status: "success", message: "Reviewed meal plan saved. Meals are logged separately when you eat them.", plan: data as unknown as SavedMealPlan };
  } catch { return { status: "error", message: "Plan wasn’t saved. Retry this unchanged review, or reload and regenerate if meals or preferences changed." }; }
}
export async function removeMealPlanAction(_previous: PlanActionState, form: FormData): Promise<PlanActionState> {
  const id = String(form.get("planId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Choose a saved plan." };
  try { const { supabase, userId } = await nutritionClient(); const { error } = await supabase.from("gym_meal_plans").delete().eq("id", id).eq("user_id", userId); if (error) throw new Error();revalidatePath("/app/nutrition/plan");return { status: "success", message: "Saved plan removed. Food logs are unchanged." }; }
  catch { return { status: "error", message: "Plan couldn’t be removed. Try again." }; }
}
