"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { updateCookingTimeAction, type CookingTimeState } from "@/app/app/nutrition/cooking-actions";
import type { NutritionPreferences } from "@/lib/nutrition/types";
import { latestPreferences } from "@/lib/nutrition/draft-models";
import { publishNutritionChange, useNutritionOwner } from "./draft-session";
export type CookingTimeAction=(previous:CookingTimeState,form:FormData)=>Promise<CookingTimeState>;
export function CookingTimeNotice({minutes,preferences,onChanged,action=updateCookingTimeAction}:{minutes:number;preferences:NutritionPreferences|null|undefined;onChanged:(preferences:NutritionPreferences)=>void;action?:CookingTimeAction}) {
 const owner=useNutritionOwner();const [state,setState]=useState<CookingTimeState>({status:"idle"});const [pending,start]=useTransition();
 const current=latestPreferences(preferences??null,state.preferences??null);
 if(!current)return null;
 if(current.onboarding_status!=="completed")return <p className="text-sm text-slate-400">Complete <Link className="text-accent-300 underline" href="/app/nutrition/setup">food preferences</Link> to set your cooking limit. Your meal draft stays in this tab.</p>;
 const exceeds=minutes>current.cooking_minutes;
 if(!exceeds&&!state.message)return <p className="text-xs text-slate-400">Your saved cooking limit is {current.cooking_minutes} minutes.</p>;
 return <aside className="rounded-xl border border-amber-300/30 bg-amber-400/5 p-4"><p role="status" className="text-sm leading-6 text-amber-200">{exceeds?`This meal takes ${minutes} minutes, longer than your ${current.cooking_minutes}-minute cooking limit. It can be logged, but won’t be used in plans at this limit.`:`Your cooking limit is ${current.cooking_minutes} minutes.`}</p>{exceeds?<button type="button" disabled={pending||!Number.isInteger(minutes)||minutes<5||minutes>180} onClick={()=>start(async()=>{const form=new FormData();form.set("minutes",String(minutes));form.set("revision",String(current.revision));let result:CookingTimeState;try{result=await action(state,form);}catch{result={status:"error",message:"Couldn’t update the limit. Your meal stays here; try again."};}setState(result);if(result.preferences)onChanged(result.preferences);if(result.status==="success")publishNutritionChange(owner);})} className="mt-3 min-h-12 w-full rounded-xl border border-accent-400/50 px-3 text-sm font-semibold text-accent-300 disabled:opacity-40 sm:w-auto">{pending?"Updating limit…":`Update my cooking limit to ${minutes} minutes`}</button>:null}{state.message?<p role={state.status==="error"?"alert":"status"} className="mt-3 text-sm leading-6 text-slate-300">{state.message}</p>:null}</aside>;
}
