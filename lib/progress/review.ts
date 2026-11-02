import { localDateKey, shiftDateKey, startOfWeekKey } from "../dates/local";
import { readSets } from "../workouts/sets";
export type ProgressSession = {id:string;status:string;completed_at:string|null;gym_workout_exercises:{name:string;exercise_id:string|null;substitution_details:unknown;logged_sets:unknown;deferred:boolean}[]};
export type GoalState={status:"idle"|"success"|"error";message?:string};
export function isWeeklyGoal(value:unknown):value is number{return typeof value==="number"&&Number.isInteger(value)&&value>=1&&value<=7;}
export function weeklyAttendance(timestamps:readonly string[],timeZone:string,goal:number,now=new Date()){
  const today=localDateKey(now,timeZone);const start=startOfWeekKey(today);const previousStart=shiftDateKey(start,-7);
  const days=new Set(timestamps.filter(value=>Number.isFinite(Date.parse(value))&&Date.parse(value)<=now.getTime()).map(value=>localDateKey(value,timeZone)));
  const current=[...days].filter(day=>day>=start&&day<=today).length;
  const previous=[...days].filter(day=>day>=previousStart&&day<start).length;
  return {current,previous,remaining:Math.max(0,goal-current),goalMet:current>=goal,days:Array.from({length:7},(_,i)=>{const key=shiftDateKey(start,i);return {key,done:days.has(key),future:key>today};})};
}
function identity(exercise:ProgressSession["gym_workout_exercises"][number]){
  const details=exercise.substitution_details;
  const replacement=details&&typeof details==="object"&&"id" in details&&typeof details.id==="string"?details.id:null;
  const stable=exercise.exercise_id?`template:${exercise.exercise_id}`:replacement?`catalog:${replacement}`:null;
  return stable?`${stable}:${exercise.name.trim().toLowerCase()}`:null;
}
export function explainProgress(sessions:readonly ProgressSession[],now=new Date()){
  const cutoff=now.getTime()-90*86400000;
  const ordered=sessions.filter(session=>session.status==="completed"&&session.completed_at&&Number.isFinite(Date.parse(session.completed_at))&&Date.parse(session.completed_at)>=cutoff&&Date.parse(session.completed_at)<=now.getTime()).sort((a,b)=>Date.parse(b.completed_at!)-Date.parse(a.completed_at!)||b.id.localeCompare(a.id)).slice(0,100);
  const groups=new Map<string,{id:string;name:string;at:string;best:Map<number,number>}[]>();
  for(const session of ordered){for(const exercise of session.gym_workout_exercises){
    if(exercise.deferred)continue;const key=identity(exercise);if(!key)continue;
    const sets=readSets(exercise.logged_sets).filter(set=>set.completed&&set.reps!==null&&set.weight!==null);
    if(!sets.length)continue;const records=groups.get(key)??[];let record=records.find(item=>item.id===session.id);
    if(!record){record={id:session.id,name:exercise.name,at:session.completed_at!,best:new Map()};records.push(record);}
    for(const set of sets)record.best.set(set.weight!,Math.max(record.best.get(set.weight!)??0,set.reps!));groups.set(key,records);
  }}
  const insights:{key:string;name:string;text:string;kind:"reps"|"load"|"baseline";at:string}[]=[];
  for(const [key,records]of groups){const latest=records[0];const previous=records[1];
    const increases=previous?[...latest.best].filter(([weight,reps])=>previous.best.has(weight)&&reps>previous.best.get(weight)!).sort((a,b)=>b[1]-previous.best.get(b[0])!-(a[1]-previous.best.get(a[0])!)):[];
    if(increases.length){const [weight,reps]=increases[0];insights.push({key,name:latest.name,kind:"reps",at:latest.at,text:`Best set at ${weight} lb: ${previous.best.get(weight)} → ${reps} reps across your latest two comparable sessions.`});continue;}
    const highest=Math.max(...latest.best.keys());const prior=records.slice(1).flatMap(item=>[...item.best.keys()]);
    if(prior.length&&highest>Math.max(...prior)){insights.push({key,name:latest.name,kind:"load",at:latest.at,text:`Your highest recorded load in this 90-day review: ${highest} lb. Earlier best: ${Math.max(...prior)} lb. Reps may differ.`});continue;}
    insights.push({key,name:latest.name,kind:"baseline",at:latest.at,text:previous?"Recent sets are recorded. Keep logging the same exercise and load to compare your best-set reps.":"Your first weighted set record in this review is saved. A later comparable session will make progress easier to see."});
  }
  return insights.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||a.key.localeCompare(b.key)).slice(0,3);
}
