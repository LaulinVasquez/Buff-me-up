"use client";
import { useActionState, useState } from "react";
import type { GoalState } from "@/lib/progress/review";
export function GoalSettings({goal,action}:{goal:number;action:(previous:GoalState,form:FormData)=>Promise<GoalState>}){
 const [selected,setSelected]=useState(goal);
 const [state,submit,pending]=useActionState(action,{status:"idle"});
 return <section id="weekly-goal" className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6"><h2 className="text-xl font-bold">A goal that fits your week</h2><p className="mt-2 text-sm leading-6 text-slate-400">Choose attendance days per week. Multiple workouts on one day count as one day. Rest days do not erase your progress.</p><form action={submit} onReset={event=>event.preventDefault()} className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm">Days per week<select name="goal" value={selected} onChange={event=>setSelected(Number(event.target.value))} disabled={pending} className="mt-2 block min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4">{[1,2,3,4,5,6,7].map(value=><option key={value} value={value}>{value} {value===1?"day":"days"}</option>)}</select></label><button disabled={pending} className="min-h-12 rounded-xl bg-accent-400 px-5 font-bold text-slate-950 disabled:opacity-40">{pending?"Saving…":"Save weekly goal"}</button></form>{state.message?<p role={state.status==="error"?"alert":"status"} className={`mt-3 text-sm ${state.status==="error"?"text-red-300":"text-success-300"}`}>{state.message}</p>:null}</section>;
}
