"use server";
import { DEFAULT_PLANNING_OPTIONS, PREP_PRIORITIES, validPlanningOptions, styleConflict, type PrepPriority } from "@/lib/nutrition/plan-options";
import { catalogMeals, planningMeals, RECIPES, recipeId } from "@/lib/nutrition/recipe-catalog";
import { recipeNutrition } from "@/lib/nutrition/recipe-nutrition-service";
import type { SavedMeal } from "@/lib/nutrition/types";
import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database";
import { AI_CONSENT_VERSION, generateMealPlan, type MealPlanDraft, type SavedMealPlan } from "@/lib/nutrition/planner";
import { assistMealWeek } from "@/lib/nutrition/agent";
import { getNutritionDashboard, getNutritionPreferences, nutritionClient } from "@/lib/nutrition/service";
import { plannerReadiness, mealPlanFlowHref } from "@/lib/nutrition/planner-setup";
import { validLocalDate, validateMeal } from "@/lib/nutrition/meals";
export type PlanActionState = { status: "idle" | "success" | "error"; message?: string; setupHref?: string; draft?: MealPlanDraft; engine?: "regular" | "ai"; plan?: SavedMealPlan; suggestions?:SavedMeal[]; preparation?:PrepPriority[] };
export async function previewMealPlanAction(_previous: PlanActionState, form: FormData): Promise<PlanActionState> {
  const start = String(form.get("start") ?? ""); const snack = form.get("snack") === "on"; const useAI = form.get("ai") === "on"; const seed = Number(form.get("seed") ?? 0);
  let options:unknown;try{options=JSON.parse(String(form.get("options")??JSON.stringify(DEFAULT_PLANNING_OPTIONS)));}catch{return {status:"error",message:"Choose your meal style again."};}
  if(!validPlanningOptions(options))return {status:"error",message:"Choose a valid meal style and planning mode."};
  if (!validLocalDate(start) || !Number.isSafeInteger(seed) || Math.abs(seed) > 100000) return { status: "error", message: "Choose a valid start date and try again." };
  try {
    const dashboard = await getNutritionDashboard(); const p = dashboard.preferences;
    if (!dashboard.available) return { status: "error", message: "Food preferences are unavailable. Please reload and try again." };
    if (!p || p.onboarding_status!=="completed") return { status: "idle", setupHref: mealPlanFlowHref("setup",start,snack,false,true) };
    const conflict=styleConflict(p,options.style);if(conflict)return {status:"error",message:conflict};
    if(options.source==="saved"&&!plannerReadiness(dashboard.meals,p,snack).ready)return {status:"idle",setupHref:mealPlanFlowHref("setup",start,snack)};
    let suggestions=catalogMeals(p,options);
    if(suggestions.length&&process.env.USDA_FDC_API_KEY){
      const {supabase}=await nutritionClient();const {data:allowed,error}=await supabase.rpc("gym_consume_nutrition_request",{request_kind:"food"});
      if(!error&&allowed){const foods=await recipeNutrition(suggestions.map(m=>recipeId(m)!));suggestions=catalogMeals(p,options,foods);}
    }
    const candidates=planningMeals(dashboard.meals,p,options,suggestions);
    let baseline:MealPlanDraft;try{baseline=generateMealPlan(candidates,p,dashboard.logs,start,snack,seed,options);}catch(error){return {status:"error",message:error instanceof Error?error.message:"No compatible meals are available. Try another style or review preferences."};}
    const prepared={suggestions,preparation:[] as PrepPriority[]};
    if (!useAI) return { status: "success", ...prepared, draft: baseline, engine: "regular", message: "Your varied meal week is ready. Review new recipes, ingredients and portions before saving." };
    if (!p.ai_consent || p.ai_consent_version !== AI_CONSENT_VERSION) return { status: "error", message: "Review and enable AI sharing in your food preferences first." };
    const key = process.env.OPENAI_API_KEY; const model = process.env.OPENAI_NUTRITION_MODEL;
    if (!key || !model) return { status: "success", ...prepared, draft: baseline, engine: "regular", message: "AI assistance is unavailable. A regular plan is ready to review." };
    const { supabase } = await nutritionClient(); const { data: allowed, error } = await supabase.rpc("gym_consume_nutrition_request", { request_kind: "ai" });
    if (error || !allowed) return { status: "success", ...prepared, draft: baseline, engine: "regular", message: "AI assistance is unavailable or its daily limit was reached. A regular plan is ready to review." };
    const latest = await getNutritionPreferences();
    if (!latest.preferences?.ai_consent || latest.preferences.ai_consent_version !== AI_CONSENT_VERSION || latest.preferences.revision !== p.revision) return { status: "error", message: "Your food preferences changed. Reload before requesting a plan." };
    try {
      const assisted = await assistMealWeek({ meals: candidates, preferences: p, logs: dashboard.logs, baseline, key, model, options });
      return { status: "success", ...prepared, draft:assisted.draft, preparation:assisted.preparation, engine: "ai", message: "AI-assisted choices are ready. Review meals, portions and food-group coverage before saving." };
    } catch { return { status: "success", ...prepared, draft: baseline, engine: "regular", message: "AI assistance couldn’t complete. A regular plan is ready to review." }; }
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
    let options:unknown=DEFAULT_PLANNING_OPTIONS,proposals:unknown=[],preparation:unknown=[];
    try{
      const raw=String(form.get("proposals")??"[]");if(raw.length>200000)throw new Error();
      proposals=JSON.parse(raw);options=JSON.parse(String(form.get("options")??JSON.stringify(DEFAULT_PLANNING_OPTIONS)));preparation=JSON.parse(String(form.get("preparation")??"[]"));
      if(!validPlanningOptions(options)||!Array.isArray(proposals)||proposals.length>28||!Array.isArray(preparation)||preparation.length>5||new Set(preparation).size!==preparation.length||!preparation.every(t=>PREP_PRIORITIES.includes(t)))throw new Error();
      const seen=new Set<string>();for(const value of proposals){
       if(!value||typeof value!=="object"||Object.keys(value).sort().join()!=="details,key"||typeof value.key!=="string"||!RECIPES.some(r=>`suggestion:${r.id}`===value.key)||seen.has(value.key)||!validateMeal(value.details)||!value.details.reviewed)throw new Error();seen.add(value.key);
      }
    }catch{return {status:"error",message:"Review every new recipe’s ingredients and quantities before saving. Your draft is kept."};}
    const { data, error } = await supabase.rpc("gym_save_discovery_meal_plan", { plan_name: name, plan: draft as Json, proposed_meals:proposals as Json,options:options as Json,preparation:preparation as Json,request_token:token });
    if(error){
      if(["PGRST202","42883","42703"].includes(error.code))return {status:"error",message:"Meal discovery needs a server update before saving. Your plan and recipe reviews are kept."};
      if(error.message.includes("more than 100"))return {status:"error",message:"Remove an old plan or archive unused meals before adding more. Your draft is kept; nothing from this request was saved."};
    }
    if (error || !data) throw new Error();
    revalidatePath("/app/nutrition/plan");revalidatePath("/app/nutrition");return { status: "success", message: "Reviewed recipes and meal plan saved. Meals are logged separately when you eat them.", plan: data as unknown as SavedMealPlan };
  } catch { return { status: "error", message: "Plan wasn’t saved. Retry this unchanged review, or reload and regenerate if meals or preferences changed." }; }
}
export async function removeMealPlanAction(_previous: PlanActionState, form: FormData): Promise<PlanActionState> {
  const id = String(form.get("planId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Choose a saved plan." };
  try { const { supabase, userId } = await nutritionClient(); const { error } = await supabase.from("gym_meal_plans").delete().eq("id", id).eq("user_id", userId); if (error) throw new Error();revalidatePath("/app/nutrition/plan");return { status: "success", message: "Saved plan removed. Food logs are unchanged." }; }
  catch { return { status: "error", message: "Plan couldn’t be removed. Try again." }; }
}
