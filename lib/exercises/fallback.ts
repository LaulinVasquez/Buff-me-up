import type { CatalogExercise, MuscleGroup } from "@/types/catalog";

const make = (id: string, name: string, primaryMuscle: MuscleGroup, equipment: string, mechanic: "compound" | "isolation", secondaryMuscles: MuscleGroup[] = []): CatalogExercise => ({
  id: `fallback-${id}`, name, primaryMuscle, secondaryMuscles, equipment, mechanic, difficulty: mechanic === "compound" ? "Intermediate" : "Beginner",
  instructions: [`Set up for ${name} with a stable position and a manageable load.`, "Move through a comfortable range with controlled tempo.", "Return to the start under control and repeat."],
});

export const fallbackExercises: CatalogExercise[] = [
  make("bench", "Barbell Bench Press", "Chest", "Barbell", "compound", ["Triceps", "Shoulders"]), make("incline", "Incline Dumbbell Press", "Chest", "Dumbbells", "compound", ["Triceps", "Shoulders"]), make("fly", "Cable Fly", "Chest", "Cable", "isolation"),
  make("pulldown", "Lat Pulldown", "Back", "Cable", "compound", ["Biceps"]), make("row", "Barbell Row", "Back", "Barbell", "compound", ["Biceps"]), make("cable-row", "Seated Cable Row", "Back", "Cable", "compound", ["Biceps"]),
  make("ohp", "Dumbbell Shoulder Press", "Shoulders", "Dumbbells", "compound", ["Triceps"]), make("lateral", "Lateral Raise", "Shoulders", "Dumbbells", "isolation"), make("facepull", "Face Pull", "Shoulders", "Cable", "isolation", ["Back"]),
  make("curl", "Dumbbell Curl", "Biceps", "Dumbbells", "isolation"), make("hammer", "Hammer Curl", "Biceps", "Dumbbells", "isolation"), make("preacher", "Preacher Curl", "Biceps", "Machine", "isolation"),
  make("pushdown", "Triceps Pushdown", "Triceps", "Cable", "isolation"), make("skull", "Skull Crusher", "Triceps", "EZ Bar", "isolation"), make("dip", "Assisted Dip", "Triceps", "Machine", "compound", ["Chest"]),
  make("squat", "Back Squat", "Quadriceps", "Barbell", "compound", ["Glutes"]), make("legpress", "Leg Press", "Quadriceps", "Machine", "compound", ["Glutes"]), make("extension", "Leg Extension", "Quadriceps", "Machine", "isolation"),
  make("rdl", "Romanian Deadlift", "Hamstrings", "Barbell", "compound", ["Glutes", "Back"]), make("legcurl", "Lying Leg Curl", "Hamstrings", "Machine", "isolation"), make("goodmorning", "Good Morning", "Hamstrings", "Barbell", "compound", ["Glutes"]),
  make("hipthrust", "Hip Thrust", "Glutes", "Barbell", "compound", ["Hamstrings"]), make("split", "Bulgarian Split Squat", "Glutes", "Dumbbells", "compound", ["Quadriceps"]), make("kickback", "Cable Glute Kickback", "Glutes", "Cable", "isolation"),
  make("calf", "Standing Calf Raise", "Calves", "Machine", "isolation"), make("seated-calf", "Seated Calf Raise", "Calves", "Machine", "isolation"),
  make("crunch", "Cable Crunch", "Abs/Core", "Cable", "isolation"), make("raise", "Hanging Knee Raise", "Abs/Core", "Bodyweight", "isolation"), make("plank", "Plank", "Abs/Core", "Bodyweight", "isolation"),
];
