import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "../../types/database";
export const EXPORT_TABLES=["gym_profiles","gym_workout_plans","gym_workout_days","gym_exercises","gym_workouts","gym_workout_exercises","gym_locations","gym_exercise_notes","gym_nutrition_preferences","gym_meals","gym_food_logs","gym_meal_plans"] as const;
export type ExportTable=typeof EXPORT_TABLES[number];
export async function exportAccount(client:SupabaseClient<Database>,accountId:string,now=new Date()){
 const startedAt=now.toISOString();const tables={} as Record<ExportTable,unknown[]>;
 // The request's authenticated client and owner RLS scope every table, including nested days/exercises.
 for(const table of EXPORT_TABLES){const key=table==="gym_nutrition_preferences"?"user_id":"id";const rows:unknown[]=[];let after:string|null=null;
  for(;;){let query=client.from(table).select("*").lte("created_at",startedAt).order(key,{ascending:true}).limit(500);if(after)query=query.gt(key,after);const {data,error}=await query;if(error||!data)throw new Error("Export could not be completed");rows.push(...data);if(data.length<500)break;const last=(data.at(-1) as {id?:string;user_id?:string}|undefined)?.[key];if(!last||last===after)throw new Error("Export could not be completed");after=last;}
  tables[table]=rows;
 }
 return {format:"buff-me-up-account",version:1,exportedAt:startedAt,accountId,weightUnit:"lb",workoutWeightUnit:"lb",nutritionMeasurementUnits:{height:"cm",weight:"kg"},notes:"Owner-scoped records read during export. Concurrent edits may affect consistency. Nutrition measurements use kg/cm; workout weights use lb. No sign-in tokens, provider secrets or operational rate counters are included.",tables};
}
