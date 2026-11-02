import { exerciseKey } from "../workouts/substitutions";
export const GYM_EQUIPMENT=["Barbell","Bodyweight","Cable","Dumbbells","EZ Bar","Machine"] as const;
export type GymActionState={status:"idle"|"success"|"error";message?:string};
export type GymLocation={id:string;name:string;equipment:string[];is_active:boolean;updated_at:string};
export type GymNote={id:string;gym_id:string;exercise_key:string;exercise_name:string;machine_settings:string;notes:string;preferred_exercise_id:string|null;updated_at:string};
export function gymExerciseKey(name:string){const key=exerciseKey(name);return key.length>0&&key.length<=160?key:null;}
export function validEquipment(value:unknown):value is string[]{return Array.isArray(value)&&value.length<=GYM_EQUIPMENT.length&&new Set(value).size===value.length&&value.every(item=>GYM_EQUIPMENT.some(option=>option===item));}
