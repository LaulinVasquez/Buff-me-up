export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Relationship = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };
type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: Relationship[] };
type RelatedTable<Row, Insert, Update, Relations extends Relationship[]> = Omit<Table<Row, Insert, Update>, "Relationships"> & { Relationships: Relations };

type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
type PlanRow = { id: string; user_id: string; name: string; description: string | null; is_active: boolean; source: string; created_at: string; updated_at: string };
type DayRow = { id: string; plan_id: string; name: string; day_order: number; created_at: string; updated_at: string };
type ExerciseRow = { id: string; workout_day_id: string; name: string; sets: number; target_reps: string; default_weight: number | null; exercise_order: number; notes: string | null; external_exercise_id: string | null; exercise_provider: string | null; muscle_group: string | null; equipment: string | null; created_at: string; updated_at: string };
type WorkoutRow = { id: string; user_id: string; workout_day_id: string | null; plan_id: string | null; name: string; status: string; started_at: string; completed_at: string | null; created_at: string; updated_at: string };
type WorkoutExerciseRow = { id: string; workout_id: string; exercise_id: string | null; name: string; target_sets: number | null; target_reps: string | null; weight: number | null; completed: boolean; exercise_order: number; created_at: string; updated_at: string };
type ReminderRow = { user_id: string; enabled: boolean; days: number[]; local_time: string; created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      gym_profiles: Table<ProfileRow, { id: string; full_name?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string }, Partial<ProfileRow>>;
      gym_reminders: Table<ReminderRow, { user_id: string; enabled?: boolean; days: number[]; local_time: string; created_at?: string; updated_at?: string }, Partial<ReminderRow>>;
      gym_workout_plans: Table<PlanRow, { id?: string; user_id: string; name: string; description?: string | null; is_active?: boolean; source?: string; created_at?: string; updated_at?: string }, Partial<PlanRow>>;
      gym_workout_days: RelatedTable<DayRow, { id?: string; plan_id: string; name: string; day_order: number; created_at?: string; updated_at?: string }, Partial<DayRow>, [{ foreignKeyName: "gym_workout_days_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "gym_workout_plans"; referencedColumns: ["id"] }]>;
      gym_exercises: RelatedTable<ExerciseRow, { id?: string; workout_day_id: string; name: string; sets: number; target_reps: string; default_weight?: number | null; exercise_order: number; notes?: string | null; external_exercise_id?: string | null; exercise_provider?: string | null; muscle_group?: string | null; equipment?: string | null; created_at?: string; updated_at?: string }, Partial<ExerciseRow>, [{ foreignKeyName: "gym_exercises_workout_day_id_fkey"; columns: ["workout_day_id"]; isOneToOne: false; referencedRelation: "gym_workout_days"; referencedColumns: ["id"] }]>;
      gym_workouts: RelatedTable<WorkoutRow, { id?: string; user_id: string; workout_day_id?: string | null; plan_id?: string | null; name: string; status?: string; started_at?: string; completed_at?: string | null; created_at?: string; updated_at?: string }, Partial<WorkoutRow>, [
        { foreignKeyName: "gym_workouts_workout_day_id_fkey"; columns: ["workout_day_id"]; isOneToOne: false; referencedRelation: "gym_workout_days"; referencedColumns: ["id"] },
        { foreignKeyName: "gym_workouts_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "gym_workout_plans"; referencedColumns: ["id"] }
      ]>;
      gym_workout_exercises: RelatedTable<WorkoutExerciseRow, { id?: string; workout_id: string; exercise_id?: string | null; name: string; target_sets?: number | null; target_reps?: string | null; weight?: number | null; completed?: boolean; exercise_order: number; created_at?: string; updated_at?: string }, Partial<WorkoutExerciseRow>, [
        { foreignKeyName: "gym_workout_exercises_workout_id_fkey"; columns: ["workout_id"]; isOneToOne: false; referencedRelation: "gym_workouts"; referencedColumns: ["id"] },
        { foreignKeyName: "gym_workout_exercises_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "gym_exercises"; referencedColumns: ["id"] }
      ]>;
    };
    Views: Record<never, never>;
    Functions: {
      gym_activate_workout_plan: { Args: { target_plan_id: string }; Returns: undefined };
      gym_adopt_recommended_plan: { Args: { template: Json }; Returns: string };
      gym_start_workout: { Args: { target_day_id: string }; Returns: string };
      gym_save_generated_plan: { Args: { template: Json; make_active: boolean }; Returns: string };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
