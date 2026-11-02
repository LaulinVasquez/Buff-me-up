import test from "node:test";
import assert from "node:assert/strict";
import {generatePlan,expandSelections} from "../lib/plans/generator";
import {isValidGeneratedPlan} from "../lib/plans/validation";
import {fallbackExercises} from "../lib/exercises/fallback";
import {MUSCLE_GROUPS} from "../types/catalog";
test("3/4/5/6-day schedules are deterministic, populated and valid at every experience",()=>{
 for(const days of [3,4,5,6])for(const experience of ["beginner","intermediate","advanced"] as const){const plan=generatePlan(fallbackExercises,days,[...MUSCLE_GROUPS],experience,42);assert.equal(plan.days.length,days);assert(isValidGeneratedPlan(plan));assert.deepEqual([...new Set(plan.days.flatMap(day=>day.exercises.map(item=>item.primaryMuscle)))].sort(),[...MUSCLE_GROUPS].sort());assert.deepEqual(plan,generatePlan(fallbackExercises,days,[...MUSCLE_GROUPS],experience,42));for(const day of plan.days){assert(day.exercises.length>0&&day.exercises.length<=7);assert.equal(new Set(day.exercises.map(item=>item.id)).size,day.exercises.length);}}
});
test("sparse catalogs repeat between days when necessary without duplicating within a day",()=>{
 const only=fallbackExercises.filter(item=>item.id==="fallback-bench");const plan=generatePlan([...only,...only,{...only[0],id:"same-name"}],4,["Chest"],"beginner",1);assert(plan.days.every(day=>day.exercises.length===1));assert(isValidGeneratedPlan(plan));
 assert.throws(()=>generatePlan(only,4,["Chest","Back"],"beginner",1),/No exercises.*Back/);
 assert.throws(()=>generatePlan([],4,["Chest"],"beginner",1),/No exercises/);
});
test("invalid schedules and edited empty/duplicate/fractional plans cannot save",()=>{
 assert.throws(()=>generatePlan(fallbackExercises,3.5,["Chest"],"beginner",1),/days/);
 assert.throws(()=>generatePlan(fallbackExercises,2,["Chest"],"beginner",1),/days/);
 assert.deepEqual(expandSelections(["Legs","Quadriceps","Unknown"]),["Quadriceps","Hamstrings","Glutes","Calves"]);
 const plan=generatePlan(fallbackExercises,4,[...MUSCLE_GROUPS],"beginner",1);
 for(const bad of [null,{}, {...plan,days:[]},{...plan,seed:NaN}])assert.equal(isValidGeneratedPlan(bad),false);
 const empty=structuredClone(plan);empty.days[0].exercises=[];assert.equal(isValidGeneratedPlan(empty),false);
 const duplicate=structuredClone(plan);duplicate.days[0].exercises.push({...duplicate.days[0].exercises[0]});assert.equal(isValidGeneratedPlan(duplicate),false);
 const fractional=structuredClone(plan);fractional.days[0].exercises[0].sets=1.5;assert.equal(isValidGeneratedPlan(fractional),false);
});

test("broad full-body selections rotate focus instead of dropping late-selected muscles",()=>{
 const selected=expandSelections(["Chest","Shoulders","Triceps","Legs","Abs/Core"]);const plan=generatePlan(fallbackExercises,3,selected,"beginner",3);
 assert.deepEqual([...new Set(plan.days.flatMap(day=>day.exercises.map(item=>item.primaryMuscle)))].sort(),selected.sort());
 assert(plan.days.every(day=>day.exercises.length<=4));
});
