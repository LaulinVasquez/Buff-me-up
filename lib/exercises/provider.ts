import "server-only";
import { unstable_cache } from "next/cache";
import type { CatalogExercise, CatalogPage } from "@/types/catalog";
import { fallbackExercises } from "./fallback";
import { normalizeMuscle } from "./normalize";
import { catalogRequest, searchLocalCatalog, type CatalogSearch } from "./search";

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
  const response = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(6000), next: { revalidate: 3600, tags: ["exercise-catalog"] } });
  if (!response.ok) throw new Error(`ExerciseDB returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function searchCatalog(options: CatalogSearch = {}): Promise<CatalogPage> {
  const { limit, path } = catalogRequest(options);
  if (options.cursor?.startsWith("local:")) return searchLocalCatalog(fallbackExercises, options);
  try {
    const payload = await request<RemotePage>(path);
    if (!payload.success || !Array.isArray(payload.data) || !payload.meta) throw new Error("Invalid exercise response");
    const exercises = payload.data.map(adapt).filter((value): value is CatalogExercise => Boolean(value));
    return { exercises, total: payload.meta.total, limit, source: "exercisedb", nextCursor: payload.meta.nextCursor ?? undefined, previousCursor: payload.meta.previousCursor ?? undefined };
  } catch {
    return searchLocalCatalog(fallbackExercises, { ...options, cursor: undefined });
  }
}

export async function getCatalogEquipment(): Promise<string[]> {
  try {
    const payload = await request<{ success: boolean; data: { name: string }[] }>("/equipments");
    if (!payload.success || !Array.isArray(payload.data)) throw new Error("Invalid equipment response");
    const names = payload.data.map(item => item.name).filter(name => typeof name === "string" && name.trim());
    if (!names.length) throw new Error("Empty equipment response");
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  } catch {
    return [...new Set(fallbackExercises.map(item => item.equipment!).filter(Boolean))].sort();
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
