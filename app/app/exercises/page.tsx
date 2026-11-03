import { ExerciseLibrary } from "@/components/exercises/exercise-library";
import { getCatalogEquipment, searchCatalog } from "@/lib/exercises/provider";

export default async function ExercisesPage() {
  const [initial, equipmentOptions] = await Promise.all([searchCatalog({ limit: 20 }), getCatalogEquipment()]);
  return <main className="pb-28 pt-10 lg:pb-8"><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent-400">Library</p><h1 className="mt-3 text-3xl font-black">Exercises</h1><p className="mt-3 text-slate-400">Search demonstrations and add movements to your workout plan.</p><ExerciseLibrary initial={initial} equipmentOptions={equipmentOptions} /></main>;
}
