"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelWorkout, finishWorkout, startNextWorkout, updateWorkoutExercise } from "@/lib/workouts/sessions";

export async function startWorkoutAction() {
  try {
    const id = await startNextWorkout();
    redirect(`/app/workout/${id}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect("/app?error=start_failed");
  }
}

export async function saveWeightAction(form: FormData) {
  const workoutId = value(form, "workoutId");
  try {
    const raw = value(form, "weight", true);
    const weight = raw ? Number(raw) : null;
    if (weight !== null && (!Number.isFinite(weight) || weight < 0)) throw new Error("Invalid weight");
    await updateWorkoutExercise(workoutId, value(form, "exerciseId"), { weight });
  } catch { redirect(`/app/workout/${workoutId}?error=weight`); }
  revalidatePath(`/app/workout/${workoutId}`);
}

export async function toggleExerciseAction(form: FormData) {
  const workoutId = value(form, "workoutId");
  try {
    await updateWorkoutExercise(workoutId, value(form, "exerciseId"), { completed: value(form, "completed") !== "true" });
  } catch { redirect(`/app/workout/${workoutId}?error=exercise`); }
  revalidatePath(`/app/workout/${workoutId}`);
}

export async function finishWorkoutAction(form: FormData) {
  const workoutId = value(form, "workoutId");
  try { await finishWorkout(workoutId); } catch { redirect(`/app/workout/${workoutId}?error=finish`); }
  revalidatePath("/app");
  redirect(`/app/workout/${workoutId}?completed=true`);
}

export async function cancelWorkoutAction(form: FormData) {
  const workoutId = value(form, "workoutId");
  try { await cancelWorkout(workoutId); } catch { redirect(`/app/workout/${workoutId}?error=cancel`); }
  revalidatePath("/app");
  redirect("/app?cancelled=true");
}

function value(form: FormData, key: string, optional = false) {
  const item = form.get(key);
  if (typeof item !== "string" || (!optional && !item)) throw new Error(`Missing ${key}`);
  return item;
}
function isRedirect(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
