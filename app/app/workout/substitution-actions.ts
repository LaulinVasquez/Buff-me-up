"use server";

import { revalidatePath } from "next/cache";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/types/catalog";
import { swapWorkoutExercise } from "@/lib/workouts/swap-service";
import type { SwapActionState } from "@/lib/workouts/substitutions";

export async function swapExerciseAction(_previous: SwapActionState, form: FormData): Promise<SwapActionState> {
  const workoutId = String(form.get("workoutId") ?? "");
  try {
    const exerciseId = String(form.get("exerciseId") ?? "");
    const version = String(form.get("version") ?? "");
    const updatedAt = String(form.get("updatedAt") ?? "");
    const muscle = String(form.get("muscle") ?? "") as MuscleGroup;
    const replacementId = String(form.get("replacementId") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(workoutId) || !/^[0-9a-f-]{36}$/i.test(exerciseId)
      || !/^\d+$/.test(version) || !Number.isSafeInteger(Number(version))
      || !updatedAt || !Number.isFinite(Date.parse(updatedAt)) || !MUSCLE_GROUPS.includes(muscle) || !replacementId) throw new Error("Invalid selection");
    await swapWorkoutExercise({ workoutId, exerciseId, version: Number(version), updatedAt, muscle, replacementId });
  } catch {
    return { error: "We couldn’t swap this exercise. Your workout may have changed. Refresh it and review your choice again." };
  }
  revalidatePath(`/app/workout/${workoutId}`);
  revalidatePath("/app");
  return {};
}
