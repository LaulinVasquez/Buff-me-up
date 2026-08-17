import "server-only";
import { unstable_cache } from "next/cache";
import type { CatalogExercise, CatalogPage } from "@/types/catalog";
import { fallbackExercises } from "./fallback";
import { normalizeMuscle } from "./normalize";

const BASE_URL = process.env.MUSCLEWIKI_BASE_URL || "https://api.musclewiki.com";
type RemoteExercise = { id: number | string; name: string; primary_muscles?: string[]; secondary_muscles?: string[]; category?: string; steps?: string[]; videos?: Array<string | { url?: string }>; difficulty?: string; mechanic?: string };

function adapt(item: RemoteExercise): CatalogExercise | null {
  const primaryMuscle = item.primary_muscles?.map(normalizeMuscle).find(Boolean);
  if (!primaryMuscle) return null;
  const videos = item.videos ?? [];
  const video = videos.map((value) => typeof value === "string" ? value : value.url).find(Boolean);
  return { id: String(item.id), name: item.name, primaryMuscle, secondaryMuscles: [...new Set((item.secondary_muscles ?? []).map(normalizeMuscle).filter((v) => v !== null))], equipment: item.category, instructions: item.steps ?? [], difficulty: item.difficulty, mechanic: /compound/i.test(item.mechanic ?? "") ? "compound" : /isolation/i.test(item.mechanic ?? "") ? "isolation" : undefined, videoUrl: video ? `/api/exercises/media?url=${encodeURIComponent(video)}` : undefined };
}

async function request(path: string) {
  const key = process.env.MUSCLEWIKI_API_KEY;
  if (!key) throw new Error("MuscleWiki is not configured");
  const response = await fetch(`${BASE_URL}${path}`, { headers: { "X-API-Key": key }, next: { revalidate: 3600, tags: ["exercise-catalog"] } });
  if (!response.ok) throw new Error(`MuscleWiki returned ${response.status}`);
  return response.json();
}

export async function searchCatalog({ query = "", muscle, equipment, limit = 20, offset = 0 }: { query?: string; muscle?: string; equipment?: string; limit?: number; offset?: number }): Promise<CatalogPage> {
  const safeLimit = Math.min(50, Math.max(1, limit));
  try {
    const params = new URLSearchParams({ limit: String(safeLimit), offset: String(Math.max(0, offset)) });
    if (query) params.set("q", query); if (muscle) params.set("muscles", muscle); if (equipment) params.set("category", equipment);
    const payload = await request(`${query ? "/search" : "/exercises"}?${params}`) as { results?: RemoteExercise[]; exercises?: RemoteExercise[]; total?: number } | RemoteExercise[];
    const raw = Array.isArray(payload) ? payload : payload.results ?? payload.exercises ?? [];
    const exercises = raw.map(adapt).filter((v): v is CatalogExercise => Boolean(v));
    return { exercises, total: Array.isArray(payload) ? exercises.length : payload.total ?? exercises.length, limit: safeLimit, offset, source: "musclewiki" };
  } catch {
    const q = query.toLowerCase(); const filtered = fallbackExercises.filter((exercise) => (!q || exercise.name.toLowerCase().includes(q)) && (!muscle || exercise.primaryMuscle === muscle) && (!equipment || exercise.equipment?.toLowerCase() === equipment.toLowerCase()));
    return { exercises: filtered.slice(offset, offset + safeLimit), total: filtered.length, limit: safeLimit, offset, source: "fallback" };
  }
}

export const getCatalogExercise = unstable_cache(async (id: string) => {
  const local = fallbackExercises.find((exercise) => exercise.id === id);
  if (local) return local;
  try { return adapt(await request(`/exercises/${encodeURIComponent(id)}`) as RemoteExercise); } catch { return null; }
}, ["catalog-exercise"], { revalidate: 86400 });
