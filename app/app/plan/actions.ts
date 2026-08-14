"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { activatePlan, createExercise, createPlan, createPlanFromRecommendation, createWorkoutDay, deleteExercise, deletePlan, deleteWorkoutDay, getPlan, reorderExercises, reorderWorkoutDays, updateExercise, updatePlan, updateWorkoutDay } from "@/lib/workouts/plans";

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${key}`);
  return value.trim();
};
const optionalText = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};
const path = (id: string, error?: string) => `/app/plan/${id}${error ? `?error=${error}` : ""}`;

export async function adoptRecommendedPlan(form: FormData) {
  try {
    const id = await createPlanFromRecommendation(text(form, "recommendationId"));
    revalidatePath("/app");
    redirect(`${path(id)}?created=true`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect("/app/plan?error=adoption_failed");
  }
}

export async function createCustomPlan(form: FormData) {
  try {
    const plan = await createPlan({ name: text(form, "name"), description: optionalText(form, "description") });
    revalidatePath("/app/plan");
    redirect(`${path(plan.id)}?created=true`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect("/app/plan?error=create_failed");
  }
}

export async function renamePlan(form: FormData) {
  const id = text(form, "planId");
  try { await updatePlan(id, { name: text(form, "name"), description: optionalText(form, "description") }); }
  catch { redirect(path(id, "plan_update")); }
  revalidatePath(path(id));
}

export async function activatePlanAction(form: FormData) {
  const id = text(form, "planId");
  try { await activatePlan(id); } catch { redirect(path(id, "activation")); }
  revalidatePath("/app");
  redirect(`${path(id)}?activated=true`);
}

export async function deletePlanAction(form: FormData) {
  try { await deletePlan(text(form, "planId")); } catch { redirect("/app/plan?error=delete_failed"); }
  revalidatePath("/app");
  redirect("/app/plan?deleted=true");
}

export async function addWorkoutDay(form: FormData) {
  const planId = text(form, "planId");
  try {
    const plan = await getPlan(planId);
    await createWorkoutDay(planId, { name: text(form, "name"), day_order: plan.gym_workout_days.length });
  } catch { redirect(path(planId, "day_create")); }
  revalidatePath(path(planId));
}

export async function renameWorkoutDay(form: FormData) {
  const planId = text(form, "planId");
  try { await updateWorkoutDay(text(form, "dayId"), { name: text(form, "name") }); }
  catch { redirect(path(planId, "day_update")); }
  revalidatePath(path(planId));
}

export async function deleteWorkoutDayAction(form: FormData) {
  const planId = text(form, "planId");
  try { await deleteWorkoutDay(text(form, "dayId")); } catch { redirect(path(planId, "day_delete")); }
  revalidatePath(path(planId));
}

export async function moveWorkoutDay(form: FormData) {
  const planId = text(form, "planId");
  try {
    const plan = await getPlan(planId);
    const ids = [...plan.gym_workout_days].sort((a, b) => a.day_order - b.day_order).map((day) => day.id);
    move(ids, text(form, "dayId"), text(form, "direction"));
    await reorderWorkoutDays(ids);
  } catch { redirect(path(planId, "day_reorder")); }
  revalidatePath(path(planId));
}

export async function addExercise(form: FormData) {
  const planId = text(form, "planId");
  const dayId = text(form, "dayId");
  try {
    const plan = await getPlan(planId);
    const day = plan.gym_workout_days.find((item) => item.id === dayId);
    await createExercise(dayId, { name: text(form, "name"), sets: positiveInteger(form, "sets"), target_reps: text(form, "targetReps"), default_weight: weight(form), notes: optionalText(form, "notes"), exercise_order: day?.gym_exercises.length ?? 0 });
  } catch { redirect(path(planId, "exercise_create")); }
  revalidatePath(path(planId));
}

export async function editExercise(form: FormData) {
  const planId = text(form, "planId");
  try {
    await updateExercise(text(form, "exerciseId"), { name: text(form, "name"), sets: positiveInteger(form, "sets"), target_reps: text(form, "targetReps"), default_weight: weight(form), notes: optionalText(form, "notes") });
  } catch { redirect(path(planId, "exercise_update")); }
  revalidatePath(path(planId));
}

export async function deleteExerciseAction(form: FormData) {
  const planId = text(form, "planId");
  try { await deleteExercise(text(form, "exerciseId")); } catch { redirect(path(planId, "exercise_delete")); }
  revalidatePath(path(planId));
}

export async function moveExercise(form: FormData) {
  const planId = text(form, "planId");
  try {
    const plan = await getPlan(planId);
    const day = plan.gym_workout_days.find((item) => item.id === text(form, "dayId"));
    if (!day) throw new Error("Day not found");
    const ids = [...day.gym_exercises].sort((a, b) => a.exercise_order - b.exercise_order).map((item) => item.id);
    move(ids, text(form, "exerciseId"), text(form, "direction"));
    await reorderExercises(ids);
  } catch { redirect(path(planId, "exercise_reorder")); }
  revalidatePath(path(planId));
}

function positiveInteger(form: FormData, key: string) {
  const value = Number(text(form, key));
  if (!Number.isInteger(value) || value <= 0) throw new Error("Invalid number");
  return value;
}
function weight(form: FormData) {
  const raw = form.get("defaultWeight");
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid weight");
  return value;
}
function move(ids: string[], id: string, direction: string) {
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from >= 0 && to >= 0 && to < ids.length) [ids[from], ids[to]] = [ids[to], ids[from]];
}
function isRedirect(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
