"use server";
import { redirect } from "next/navigation";
import { createExercise, getDayExerciseCount } from "@/lib/workouts/plans";

export async function addCatalogExercise(form: FormData) {
  const get = (key: string) => String(form.get(key) ?? "").trim(); const exerciseId = get("exerciseId");
  try { const dayId = get("dayId"); await createExercise(dayId, { name: get("name"), sets: Number(get("sets")), target_reps: get("targetReps"), default_weight: get("defaultWeight") ? Number(get("defaultWeight")) : null, exercise_order: await getDayExerciseCount(dayId), external_exercise_id: exerciseId, exercise_provider: exerciseId.startsWith("fallback-") ? "buff-me-up" : "musclewiki", muscle_group: get("muscleGroup"), equipment: get("equipment") || null }); }
  catch { redirect(`/app/exercises/${encodeURIComponent(exerciseId)}?error=add`); }
  redirect(`/app/exercises/${encodeURIComponent(exerciseId)}?added=true`);
}
