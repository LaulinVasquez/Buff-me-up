import type { NutritionPreferences, NutritionPreferencesInput, SavedMeal, FoodLog } from "./../lib/nutrition/types";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Relationship = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };
type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: Relationship[] };
type RelatedTable<Row, Insert, Update, Relations extends Relationship[]> = Omit<Table<Row, Insert, Update>, "Relationships"> & { Relationships: Relations };

type ProfileRow = { weekly_goal: number; accent_theme: string; id: string; full_name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
type PlanRow = { id: string; user_id: string; name: string; description: string | null; is_active: boolean; source: string; created_at: string; updated_at: string };
type DayRow = { id: string; plan_id: string; name: string; day_order: number; created_at: string; updated_at: string };
type ExerciseRow = { id: string; workout_day_id: string; name: string; sets: number; target_reps: string; default_weight: number | null; exercise_order: number; notes: string | null; external_exercise_id: string | null; exercise_provider: string | null; muscle_group: string | null; equipment: string | null; created_at: string; updated_at: string };
type WorkoutRow = { session_mode: string; mode_minutes: number | null; mode_revision: number; session_adaptations: Json; id: string; user_id: string; workout_day_id: string | null; plan_id: string | null; name: string; status: string; started_at: string; completed_at: string | null; created_at: string; updated_at: string };
type WorkoutExerciseRow = { deferred: boolean; logged_sets: Json; log_revision: number; substitution_version: number; substitution_details: Json; substitution_history: Json; id: string; workout_id: string; exercise_id: string | null; name: string; target_sets: number | null; target_reps: string | null; weight: number | null; completed: boolean; exercise_order: number; created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      gym_meals: Table<Omit<SavedMeal,"details"|"nutrients"> & {details:Json;nutrients:Json}, {user_id:string;details:Json;id?:string;archived?:boolean}, {details?:Json;archived?:boolean}>;
      gym_food_logs: Table<Omit<FoodLog,"snapshot"> & {snapshot:Json}, {user_id:string;meal_id:string;portions:number;log_date:string;meal_slot:string;request_id:string}, Record<never,never>>;
      gym_nutrition_requests: Table<{user_id:string;kind:string;window_start:string;used:number}, Record<never,never>, Record<never,never>>;
      gym_nutrition_preferences: Table<NutritionPreferences, NutritionPreferencesInput & {user_id:string;onboarding_status?:"completed"|"skipped"}, Partial<NutritionPreferencesInput>>;
      gym_locations: Table<{id:string;user_id:string;name:string;equipment:string[];is_active:boolean;created_at:string;updated_at:string},{id?:string;user_id:string;name:string;equipment?:string[];is_active?:boolean;created_at?:string;updated_at?:string},{name?:string;equipment?:string[];is_active?:boolean;updated_at?:string}>;
      gym_exercise_notes: Table<{id:string;user_id:string;gym_id:string;exercise_key:string;exercise_name:string;machine_settings:string;notes:string;preferred_exercise_id:string|null;created_at:string;updated_at:string},{id?:string;user_id:string;gym_id:string;exercise_key:string;exercise_name:string;machine_settings?:string;notes?:string;preferred_exercise_id?:string|null;created_at?:string;updated_at?:string},{exercise_name?:string;machine_settings?:string;notes?:string;preferred_exercise_id?:string|null;updated_at?:string}>;
      gym_profiles: Table<ProfileRow, { weekly_goal?: number; accent_theme?: string; id: string; full_name?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string }, Partial<ProfileRow>>;
      gym_workout_plans: Table<PlanRow, { id?: string; user_id: string; name: string; description?: string | null; is_active?: boolean; source?: string; created_at?: string; updated_at?: string }, Partial<PlanRow>>;
      gym_workout_days: RelatedTable<DayRow, { id?: string; plan_id: string; name: string; day_order: number; created_at?: string; updated_at?: string }, Partial<DayRow>, [{ foreignKeyName: "gym_workout_days_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "gym_workout_plans"; referencedColumns: ["id"] }]>;
      gym_exercises: RelatedTable<ExerciseRow, { id?: string; workout_day_id: string; name: string; sets: number; target_reps: string; default_weight?: number | null; exercise_order: number; notes?: string | null; external_exercise_id?: string | null; exercise_provider?: string | null; muscle_group?: string | null; equipment?: string | null; created_at?: string; updated_at?: string }, Partial<ExerciseRow>, [{ foreignKeyName: "gym_exercises_workout_day_id_fkey"; columns: ["workout_day_id"]; isOneToOne: false; referencedRelation: "gym_workout_days"; referencedColumns: ["id"] }]>;
      gym_workouts: RelatedTable<WorkoutRow, { session_mode?: string; mode_minutes?: number | null; mode_revision?: number; session_adaptations?: Json; id?: string; user_id: string; workout_day_id?: string | null; plan_id?: string | null; name: string; status?: string; started_at?: string; completed_at?: string | null; created_at?: string; updated_at?: string }, Partial<WorkoutRow>, [
        { foreignKeyName: "gym_workouts_workout_day_id_fkey"; columns: ["workout_day_id"]; isOneToOne: false; referencedRelation: "gym_workout_days"; referencedColumns: ["id"] },
        { foreignKeyName: "gym_workouts_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "gym_workout_plans"; referencedColumns: ["id"] }
      ]>;
      gym_workout_exercises: RelatedTable<WorkoutExerciseRow, { deferred?: boolean; logged_sets?: Json; log_revision?: number; substitution_version?: number; substitution_details?: Json; substitution_history?: Json; id?: string; workout_id: string; exercise_id?: string | null; name: string; target_sets?: number | null; target_reps?: string | null; weight?: number | null; completed?: boolean; exercise_order: number; created_at?: string; updated_at?: string }, Partial<WorkoutExerciseRow>, [
        { foreignKeyName: "gym_workout_exercises_workout_id_fkey"; columns: ["workout_id"]; isOneToOne: false; referencedRelation: "gym_workouts"; referencedColumns: ["id"] },
        { foreignKeyName: "gym_workout_exercises_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "gym_exercises"; referencedColumns: ["id"] }
      ]>;
    };
    Views: Record<never, never>;
    Functions: {
      gym_save_meal: {Args:{target_meal_id:string|null;expected_revision:number|null;meal:Json|null;archive?:boolean};Returns:Json};
      gym_log_meal: {Args:{target_meal_id:string;expected_revision:number;servings:number;consumed_on:string;slot:string;client_timezone:string;request_token:string};Returns:Json};
      gym_consume_nutrition_request: {Args:{request_kind:"food"|"ai"};Returns:boolean};
      gym_save_nutrition_preferences: {Args:{preferences:Json;expected_revision:number|null;skip_setup?:boolean};Returns:Json};
      gym_save_location: {Args:{target_gym_id:string|null;expected_updated_at:string|null;gym_name:string;available_equipment:string[]};Returns:string};
      gym_select_location: {Args:{target_gym_id:string|null};Returns:undefined};
      gym_save_exercise_note: {Args:{target_gym_id:string;target_key:string;display_name:string;settings:string;note_text:string;preferred_id:string|null;expected_updated_at:string|null};Returns:string};
      gym_activate_workout_plan: { Args: { target_plan_id: string }; Returns: undefined };
      gym_adopt_recommended_plan: { Args: { template: Json }; Returns: string };
      gym_start_workout: { Args: { target_day_id: string }; Returns: string };
      gym_set_workout_status: { Args: { target_workout_id: string; target_status: "completed" | "cancelled" }; Returns: string };
      gym_adapt_workout: { Args: { target_workout_id: string; target_mode: string; minutes: number | null; expected_revision: number; reviewed_exercises: Json; keep_exercise_ids: string[] }; Returns: string };
      gym_save_workout_sets: { Args: { target_workout_id: string; target_exercise_id: string; expected_version: number; expected_revision: number; sets: Json }; Returns: string };
      gym_update_workout_progress: { Args: { target_workout_id: string; target_exercise_id: string; expected_version: number; changes: Json }; Returns: string };
      gym_swap_workout_exercise: { Args: { target_workout_id: string; target_exercise_id: string; expected_version: number; expected_updated_at: string; source_muscle: string; replacement: Json }; Returns: string };
      gym_save_generated_plan: { Args: { template: Json; make_active: boolean }; Returns: string };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
