type ExerciseMetadata = {
  muscleGroup: string;
  equipment: string;
  instructions: string[];
  secondaryMuscles?: string[];
};

const steps = (setup: string, movement: string, finish: string) => [
  setup,
  movement,
  finish,
  "Use a controlled range of motion and stop if you feel sharp pain.",
];

export const exerciseCatalog: Record<string, ExerciseMetadata> = {
  "Bench Press": { muscleGroup: "Chest", equipment: "Barbell and bench", secondaryMuscles: ["Triceps", "Shoulders"], instructions: steps("Lie down with your feet planted and grip slightly wider than shoulder width.", "Lower the bar toward your mid-chest under control.", "Press the bar upward until your arms are extended.") },
  "Incline Dumbbell Press": { muscleGroup: "Chest", equipment: "Dumbbells and incline bench", secondaryMuscles: ["Shoulders", "Triceps"], instructions: steps("Set the bench to a moderate incline and hold the dumbbells above your chest.", "Lower both dumbbells beside your upper chest.", "Press upward without letting the weights collide.") },
  "Shoulder Press": { muscleGroup: "Shoulders", equipment: "Dumbbells", secondaryMuscles: ["Triceps"], instructions: steps("Sit tall with the weights at shoulder height.", "Press the weights overhead while keeping your ribs down.", "Lower slowly to shoulder height.") },
  "Lateral Raise": { muscleGroup: "Shoulders", equipment: "Dumbbells", instructions: steps("Stand tall with light dumbbells at your sides.", "Raise your arms outward with softly bent elbows.", "Stop near shoulder height and lower slowly.") },
  "Tricep Pushdown": { muscleGroup: "Triceps", equipment: "Cable machine", instructions: steps("Stand close to the cable with elbows tucked at your sides.", "Extend your elbows and move the handle toward your thighs.", "Return until your forearms are near parallel to the floor.") },
  "Lat Pulldown": { muscleGroup: "Back", equipment: "Cable machine", secondaryMuscles: ["Biceps"], instructions: steps("Sit securely and grip the bar wider than shoulder width.", "Pull the bar toward your upper chest while driving elbows down.", "Return overhead under control without shrugging.") },
  "Barbell Row": { muscleGroup: "Back", equipment: "Barbell", secondaryMuscles: ["Biceps", "Hamstrings"], instructions: steps("Hinge at the hips with a neutral spine and hold the bar below your knees.", "Pull the bar toward your lower ribs.", "Lower until your arms are extended while maintaining the hinge.") },
  "Seated Cable Row": { muscleGroup: "Back", equipment: "Cable machine", secondaryMuscles: ["Biceps"], instructions: steps("Sit tall with arms extended and knees softly bent.", "Pull the handle toward your torso while keeping shoulders down.", "Extend your arms without rounding your lower back.") },
  "Seated Row": { muscleGroup: "Back", equipment: "Row machine", secondaryMuscles: ["Biceps"], instructions: steps("Set the seat so the handles align with your mid-torso.", "Pull the handles back and squeeze your shoulder blades.", "Return under control without reaching excessively.") },
  "Face Pull": { muscleGroup: "Rear shoulders", equipment: "Cable rope", secondaryMuscles: ["Upper back"], instructions: steps("Set the rope near face height and step back with arms extended.", "Pull toward your face while separating the rope ends.", "Return slowly with shoulders kept down.") },
  "Bicep Curl": { muscleGroup: "Biceps", equipment: "Dumbbells", instructions: steps("Stand tall with weights at your sides and palms forward.", "Bend your elbows without swinging your upper arms.", "Lower fully under control.") },
  "Squat": { muscleGroup: "Quadriceps", equipment: "Barbell and rack", secondaryMuscles: ["Glutes", "Core"], instructions: steps("Set the bar securely, brace, and stand with a comfortable stance.", "Sit down and between your hips while keeping your feet planted.", "Drive through the floor to stand tall.") },
  "Romanian Deadlift": { muscleGroup: "Hamstrings", equipment: "Barbell", secondaryMuscles: ["Glutes", "Back"], instructions: steps("Stand tall holding the bar close to your thighs.", "Push your hips back with soft knees and keep the bar close.", "Squeeze your glutes to return to standing.") },
  "Leg Press": { muscleGroup: "Quadriceps", equipment: "Leg press machine", secondaryMuscles: ["Glutes"], instructions: steps("Place your feet securely on the platform and keep your back supported.", "Lower the platform as far as you can control without your hips lifting.", "Press through your whole foot without locking your knees forcefully.") },
  "Leg Curl": { muscleGroup: "Hamstrings", equipment: "Leg curl machine", instructions: steps("Adjust the machine so its pivot aligns with your knee.", "Curl the pad by bending your knees.", "Return slowly without letting the weight stack slam.") },
  "Calf Raise": { muscleGroup: "Calves", equipment: "Calf raise machine", instructions: steps("Position the balls of your feet on the platform with heels free.", "Rise onto your toes as high as comfortable.", "Lower into a controlled stretch.") },
  "Goblet Squat": { muscleGroup: "Quadriceps", equipment: "Dumbbell", secondaryMuscles: ["Glutes", "Core"], instructions: steps("Hold one dumbbell close to your chest and set a comfortable stance.", "Squat between your hips while keeping the weight close.", "Drive through your feet to stand.") },
  "Cable Crunch": { muscleGroup: "Core", equipment: "Cable rope", instructions: steps("Kneel facing the cable and hold the rope beside your head.", "Curl your ribs toward your pelvis without pulling with your arms.", "Return slowly while keeping your hips stable.") },
};

export function getExerciseMetadata(name: string): ExerciseMetadata {
  return exerciseCatalog[name] ?? {
    muscleGroup: "Full body",
    equipment: "Gym equipment",
    instructions: steps("Set up the equipment securely and choose a manageable load.", "Perform the movement through a comfortable range.", "Return to the starting position under control."),
  };
}
