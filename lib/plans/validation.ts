import { MUSCLE_GROUPS, type GeneratedPlan } from "../../types/catalog";
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const text=(value:unknown,max:number)=>typeof value==="string"&&value.trim().length>0&&value.length<=max;
export function isValidGeneratedPlan(value:unknown):value is GeneratedPlan{
 if(!object(value)||!text(value.name,120)||typeof value.description!=="string"||value.description.length>500||!Number.isSafeInteger(value.seed)||!Array.isArray(value.days)||value.days.length<3||value.days.length>6)return false;
 return value.days.every(day=>{
  if(!object(day)||!text(day.name,120)||!Array.isArray(day.muscles)||!day.muscles.length||day.muscles.some(muscle=>!MUSCLE_GROUPS.includes(muscle))||!Array.isArray(day.exercises)||day.exercises.length<1||day.exercises.length>7)return false;
  const ids=new Set<string>();const names=new Set<string>();
  return day.exercises.every(exercise=>{
   if(!object(exercise)||!text(exercise.id,160)||!text(exercise.name,160)||typeof exercise.sets!=="number"||!Number.isInteger(exercise.sets)||exercise.sets<1||exercise.sets>10||!text(exercise.reps,40)||!MUSCLE_GROUPS.includes(exercise.primaryMuscle as typeof MUSCLE_GROUPS[number])||(exercise.equipment!==undefined&&(typeof exercise.equipment!=="string"||exercise.equipment.length>120)))return false;
   const id=exercise.id as string;const name=(exercise.name as string).trim().replace(/\s+/g," ").toLowerCase();if(ids.has(id)||names.has(name))return false;ids.add(id);names.add(name);return true;
  });
 });
}
