import { ExerciseLibrary } from "@/components/exercises/exercise-library";
import { searchCatalog } from "@/lib/exercises/provider";

export default async function ExercisesPage() {
  const initial = await searchCatalog({ limit: 30 });
  return <main className="pb-28 pt-10"><p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-400">Library</p><h1 className="mt-3 text-3xl font-black">Exercises</h1><p className="mt-3 text-slate-400">Search demonstrations and add movements to your workout plan.</p><ExerciseLibrary initial={initial} /></main>;
}
