"use server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedWorkoutClient } from "@/lib/workouts/auth";
import { validateSets, type SetSaveState } from "@/lib/workouts/sets";

export async function saveSetsAction(_previous: SetSaveState, form: FormData): Promise<SetSaveState> {
  const workoutId = String(form.get("workoutId") ?? "");
  try {
    const sets: unknown = JSON.parse(String(form.get("sets")));
    const version = Number(form.get("version"));
    const revision = Number(form.get("revision"));
    if (!validateSets(sets) || !Number.isSafeInteger(version) || version < 0 || !Number.isSafeInteger(revision) || revision < 0) throw new Error("Invalid sets");
    const { supabase } = await getAuthenticatedWorkoutClient();
    const { error } = await supabase.rpc("gym_save_workout_sets", { target_workout_id: workoutId, target_exercise_id: String(form.get("exerciseId")), expected_version: version, expected_revision: revision, sets });
    if (error) return { status: "error", message: "Sets were not saved. Your workout may have changed in another tab. Refresh and review before trying again." };
  } catch { return { status: "error", message: "Sets were not saved. Enter valid reps and weights, then try again." }; }
  revalidatePath(`/app/workout/${workoutId}`);
  return { status: "success", message: "Sets saved." };
}
