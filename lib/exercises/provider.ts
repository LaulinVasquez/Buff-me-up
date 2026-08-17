import "server-only";
import { unstable_cache } from "next/cache";
import type { CatalogExercise, CatalogPage, MuscleGroup } from "@/types/catalog";
import { fallbackExercises } from "./fallback";
import { normalizeMuscle } from "./normalize";

const BASE_URL = process.env.EXERCISEDB_BASE_URL || "https://oss.exercisedb.dev/api/v1";
type RemoteExercise = { exerciseId: string; name: string; gifUrl?: string; targetMuscles?: string[]; bodyParts?: string[]; secondaryMuscles?: string[]; equipments?: string[]; instructions?: string[] };
type RemotePage = { success: boolean; meta: { total: number; hasNextPage: boolean; hasPreviousPage: boolean; nextCursor?: string | null; previousCursor?: string | null }; data: RemoteExercise[] };

function adapt(item: RemoteExercise): CatalogExercise | null {
  const primaryMuscle = [...(item.targetMuscles ?? []), ...(item.bodyParts ?? [])].map(normalizeMuscle).find(Boolean);
  if (!primaryMuscle) return null;
  return {
    id: item.exerciseId,
    name: item.name.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    primaryMuscle,
    secondaryMuscles: [...new Set((item.secondaryMuscles ?? []).map(normalizeMuscle).filter((value) => value !== null))],
    equipment: item.equipments?.join(", "),
    instructions: (item.instructions ?? []).map((step) => step.replace(/^Step:\s*\d+\s*/i, "")),
    imageUrl: item.gifUrl,
    mechanic: (item.secondaryMuscles?.length ?? 0) >= 2 ? "compound" : "isolation",
  };
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 3600, tags: ["exercise-catalog"] } });
  if (!response.ok) throw new Error(`ExerciseDB returned ${response.status}`);
  return response.json() as Promise<T>;
}

const providerMuscle: Partial<Record<MuscleGroup, string>> = { Chest: "pectorals", Back: "lats", Shoulders: "delts", Biceps: "biceps", Triceps: "triceps", Quadriceps: "quads", Hamstrings: "hamstrings", Glutes: "glutes", Calves: "calves", "Abs/Core": "abs" };

export async function searchCatalog({ query = "", muscle, equipment, limit = 20, cursor, direction = "after" }: { query?: string; muscle?: string; equipment?: string; limit?: number; cursor?: string; direction?: "after" | "before" }): Promise<CatalogPage> {
  const safeLimit = Math.min(50, Math.max(1, limit));
  try {
    const params = new URLSearchParams({ limit: String(safeLimit) });
    if (query.trim()) params.set("search", query.trim());
    if (muscle && providerMuscle[muscle as MuscleGroup]) params.set("targetMuscles", providerMuscle[muscle as MuscleGroup]!);
    if (equipment) params.set("equipments", equipment);
    if (cursor) params.set(direction, cursor);
    const payload = await request<RemotePage>(`/exercises?${params}`);
    let exercises = payload.data.map(adapt).filter((value): value is CatalogExercise => Boolean(value));
    if (muscle) exercises = exercises.filter((exercise) => exercise.primaryMuscle === muscle);
    return { exercises, total: payload.meta.total, limit: safeLimit, source: "exercisedb", nextCursor: payload.meta.nextCursor ?? undefined, previousCursor: payload.meta.previousCursor ?? undefined };
  } catch {
    const q = query.toLowerCase();
    const filtered = fallbackExercises.filter((exercise) => (!q || exercise.name.toLowerCase().includes(q)) && (!muscle || exercise.primaryMuscle === muscle) && (!equipment || exercise.equipment?.toLowerCase() === equipment.toLowerCase()));
    return { exercises: filtered.slice(0, safeLimit), total: filtered.length, limit: safeLimit, source: "fallback", fallbackReason: "provider_error" };
  }
}

export const getCatalogExercise = unstable_cache(async (id: string, name?: string) => {
  const local = fallbackExercises.find((exercise) => exercise.id === id);
  if (local) return local;
  try {
    const payload = await request<RemoteExercise | { data: RemoteExercise }>(`/exercises/${encodeURIComponent(id)}`);
    const adapted = adapt("data" in payload ? payload.data : payload);
    if (adapted) return adapted;
  } catch { /* The free API may not expose a single-record endpoint. */ }
  if (!name) return null;
  const page = await searchCatalog({ query: name, limit: 20 });
  return page.exercises.find((exercise) => exercise.id === id) ?? page.exercises.find((exercise) => exercise.name.toLowerCase() === name.toLowerCase()) ?? null;
}, ["catalog-exercise"], { revalidate: 3600 });
