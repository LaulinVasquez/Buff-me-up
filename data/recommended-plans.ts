import type { RecommendedWorkoutPlan } from "@/types/workouts";
import { getExerciseMetadata } from "./exercise-catalog";

const exercise = (name: string, sets: number, targetReps: string, order: number) => ({
  name, sets, targetReps, order, ...getExerciseMetadata(name),
});

export const recommendedPlans = [
  {
    id: "push-pull-legs", name: "Push / Pull / Legs", description: "A balanced three-day strength and hypertrophy split.",
    days: [
      { name: "Push", order: 0, exercises: [
        exercise("Bench Press", 4, "6-10", 0), exercise("Incline Dumbbell Press", 3, "8-12", 1),
        exercise("Shoulder Press", 3, "8-12", 2), exercise("Lateral Raise", 3, "12-15", 3),
        exercise("Tricep Pushdown", 3, "10-15", 4),
      ] },
      { name: "Pull", order: 1, exercises: [
        exercise("Lat Pulldown", 4, "8-12", 0), exercise("Barbell Row", 3, "6-10", 1),
        exercise("Seated Cable Row", 3, "8-12", 2), exercise("Face Pull", 3, "12-15", 3),
        exercise("Bicep Curl", 3, "10-15", 4),
      ] },
      { name: "Legs", order: 2, exercises: [
        exercise("Squat", 4, "6-10", 0), exercise("Romanian Deadlift", 3, "8-12", 1),
        exercise("Leg Press", 3, "10-15", 2), exercise("Leg Curl", 3, "10-15", 3),
        exercise("Calf Raise", 4, "10-15", 4),
      ] },
    ],
  },
  {
    id: "upper-lower", name: "Upper / Lower", description: "A repeatable two-day split for four weekly sessions.",
    days: [
      { name: "Upper", order: 0, exercises: [
        exercise("Bench Press", 4, "6-10", 0), exercise("Lat Pulldown", 4, "8-12", 1),
        exercise("Shoulder Press", 3, "8-12", 2), exercise("Seated Row", 3, "8-12", 3),
        exercise("Bicep Curl", 3, "10-15", 4), exercise("Tricep Pushdown", 3, "10-15", 5),
      ] },
      { name: "Lower", order: 1, exercises: [
        exercise("Squat", 4, "6-10", 0), exercise("Romanian Deadlift", 3, "8-12", 1),
        exercise("Leg Press", 3, "10-15", 2), exercise("Leg Curl", 3, "10-15", 3),
        exercise("Calf Raise", 4, "10-15", 4),
      ] },
    ],
  },
  {
    id: "full-body-3-day", name: "3-Day Full Body", description: "Three balanced sessions for strength and general fitness.",
    days: [
      { name: "Full Body A", order: 0, exercises: [
        exercise("Squat", 3, "6-10", 0), exercise("Bench Press", 3, "6-10", 1),
        exercise("Lat Pulldown", 3, "8-12", 2), exercise("Romanian Deadlift", 3, "8-12", 3),
        exercise("Lateral Raise", 2, "12-15", 4),
      ] },
      { name: "Full Body B", order: 1, exercises: [
        exercise("Leg Press", 3, "10-15", 0), exercise("Shoulder Press", 3, "8-12", 1),
        exercise("Seated Cable Row", 3, "8-12", 2), exercise("Leg Curl", 3, "10-15", 3),
        exercise("Bicep Curl", 2, "10-15", 4),
      ] },
      { name: "Full Body C", order: 2, exercises: [
        exercise("Romanian Deadlift", 3, "6-10", 0), exercise("Incline Dumbbell Press", 3, "8-12", 1),
        exercise("Lat Pulldown", 3, "8-12", 2), exercise("Goblet Squat", 3, "10-15", 3),
        exercise("Cable Crunch", 3, "10-15", 4),
      ] },
    ],
  },
] satisfies RecommendedWorkoutPlan[];

export function getRecommendedPlan(id: string) {
  return recommendedPlans.find((plan) => plan.id === id);
}
