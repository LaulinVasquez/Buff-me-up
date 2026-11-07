"use server";
import { mealSaveError } from "@/lib/nutrition/save-errors";
import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database";
import { nutritionClient } from "@/lib/nutrition/service";
import { validateMeal, validLocalDate } from "@/lib/nutrition/meals";
import type { FoodLog, MealActionState, SavedMeal } from "@/lib/nutrition/types";
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const readRevision = (form: FormData) => String(form.get("revision") ?? "") === "" ? null : Number(form.get("revision"));
const validRevision = (revision: number | null) => revision === null || (Number.isInteger(revision) && revision >= 0);
export async function saveMealAction(_previous: MealActionState, form: FormData): Promise<MealActionState> {
  const id = String(form.get("id") ?? ""); const revision = readRevision(form); const archive = form.get("intent") === "archive"; const token = String(form.get("requestToken") ?? "");
  let meal: unknown = null;
  try { const raw = String(form.get("meal") ?? "null"); if (raw.length > 60000) throw new Error(); meal = JSON.parse(raw); } catch { return { status: "error", message: "Check the meal details and try again." }; }
  if ((id && !uuid(id)) || !validRevision(revision) || (!archive && !validateMeal(meal)) || (!id && !uuid(token))) return { status: "error", message: "Check the meal name, ingredients, portions and nutrition values." };
  try {
    const { supabase } = await nutritionClient();
    const { data, error } = await supabase.rpc("gym_save_meal_with_request", { target_meal_id: id || null, expected_revision: revision, meal: archive ? null : meal as Json, archive, request_token: uuid(token) ? token : "00000000-0000-0000-0000-000000000000" });
    if(error){const failure=mealSaveError(error);let latestMeal:SavedMeal|undefined;if(failure.reason==="conflict"&&id){const latest=await supabase.from("gym_meals").select("*").eq("id",id).maybeSingle();if(latest.data)latestMeal=latest.data as unknown as SavedMeal;}return {status:"error",...failure,latestMeal};}
    if(!data)throw new Error();
    revalidatePath("/app/nutrition");
    return { status: "success", message: archive ? "Meal archived. Past logs are unchanged." : "Meal saved. Past logs are unchanged.", meal: data as unknown as SavedMeal };
  } catch { return { status: "error", message: "Meal couldn’t reach the server. Your draft is kept; retry or reload saved data." }; }
}
export async function logMealAction(_previous: MealActionState, form: FormData): Promise<MealActionState> {
  const id = String(form.get("mealId") ?? ""); const revision = readRevision(form); const portions = Number(form.get("portions")); const date = String(form.get("date") ?? ""); const slot = String(form.get("slot") ?? ""); const timezone = String(form.get("timezone") ?? ""); const token = String(form.get("requestToken") ?? "");
  if (!uuid(id) || !uuid(token) || !validRevision(revision) || revision === null || !Number.isFinite(portions) || portions < 0.1 || portions > 10 || Math.abs(portions * 1000 - Math.round(portions * 1000)) > 0.000001 || !validLocalDate(date) || !["breakfast","lunch","dinner","snack"].includes(slot) || timezone.length > 80) return { status: "error", message: "Choose a meal, date, meal type and 0.1–10 portions." };
  try {
    const { supabase } = await nutritionClient();
    const { data, error } = await supabase.rpc("gym_log_meal", { target_meal_id: id, expected_revision: revision, servings: portions, consumed_on: date, slot, client_timezone: timezone, request_token: token });
    if (error || !data) throw new Error();
    revalidatePath("/app/nutrition");
    return { status: "success", message: "Meal logged.", log: data as unknown as FoodLog };
  } catch { return { status: "error", message: "Meal wasn’t logged. Retry without changing this form to avoid duplicates, or reload to check for newer meal changes." }; }
}
export async function removeFoodLogAction(_previous: MealActionState, form: FormData): Promise<MealActionState> {
  const id = String(form.get("logId") ?? ""); if (!uuid(id)) return { status: "error", message: "Choose a valid logged meal." };
  try {
    const { supabase, userId } = await nutritionClient();
    const { error } = await supabase.from("gym_food_logs").delete().eq("id", id).eq("user_id", userId);
    if (error) throw new Error();
    revalidatePath("/app/nutrition"); return { status: "success", message: "Log removed." };
  } catch { return { status: "error", message: "Log couldn’t be removed. Try again." }; }
}
