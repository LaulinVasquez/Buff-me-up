"use client";
import { useEffect, useRef, useState } from "react";
import { mealPlanReview } from "@/lib/nutrition/plan-review";
import { mealEligibility, type MealPlanDraft, type PlanEntry } from "@/lib/nutrition/planner";
import { shiftDay } from "@/lib/nutrition/meals";
import type { NutritionPreferences, SavedMeal } from "@/lib/nutrition/types";
import { nutritionInputClass } from "./meal-editor";

export function MealPlanReview({draft,meals,preferences,disabled,onChange}:{draft:MealPlanDraft;meals:SavedMeal[];preferences:NutritionPreferences;disabled:boolean;onChange:(index:number,patch:Partial<PlanEntry>)=>void}) {
  const [day,setDay]=useState(0);const [all,setAll]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null);
  const lastDay=useRef(0);
  useEffect(()=>{if(lastDay.current!==day){lastDay.current=day;heading.current?.focus();}},[day]);
  const summary=mealPlanReview(draft,meals,preferences.calorie_target);
  const eligible=meals.filter(meal=>!mealEligibility(meal,preferences));
  return <>
    <div aria-label="Weekly plan summary" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:col-span-1"><p className="text-xs text-slate-400">Seven-day calorie {summary.nutrition.calories.unknown?"subtotal":"total"}</p><p className="mt-2 text-lg font-bold text-accent-300">{summary.nutrition.calories.known.toLocaleString()} kcal</p>{summary.nutrition.calories.unknown?<p className="mt-1 text-xs text-amber-200">{summary.nutrition.calories.unknown} planned {summary.nutrition.calories.unknown===1?"meal has":"meals have"} unknown calories.</p>:null}</div>
      <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4"><p className="text-xs text-slate-400">Different meals</p><p className="mt-2 text-lg font-bold">{summary.uniqueMeals}</p><p className="mt-1 text-xs text-slate-400">More saved choices add variety.</p></div>
      <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4"><p className="text-xs text-slate-400">Planned meals</p><p className="mt-2 text-lg font-bold">{summary.mealCount}</p><p className="mt-1 text-xs text-slate-400">Log them when you eat.</p></div>
    </div>
    {summary.unresolved?<p role="alert" className="mt-4 text-sm text-red-300">Some meals are no longer available. Regenerate before saving or using the shopping preview.</p>:null}
    <fieldset disabled={disabled} className="mt-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">Choose a day to review</p><button type="button" aria-pressed={all} onClick={()=>setAll(value=>!value)} className="min-h-11 rounded-xl border border-slate-700 px-3 text-sm text-accent-300">{all?"Show one day":"Show all days"}</button></div>
      <nav aria-label="Meal plan days" className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">{Array.from({length:7},(_,index)=><button type="button" key={index} aria-label={`Review day ${index+1}`} aria-pressed={!all&&day===index} onClick={()=>{setAll(false);setDay(index);}} className={`min-h-16 min-w-0 rounded-xl border px-2 py-3 text-left ${!all&&day===index?"border-accent-400 bg-accent-400/10 text-accent-300":"border-slate-700 bg-slate-900 text-slate-300"}`}><span className="block text-xs font-bold">Day {index+1}</span><span className="mt-1 block text-[11px]">{shiftDay(draft.start_date,index).slice(5).replace("-","/")}</span></button>)}</nav>
      <h3 ref={heading} tabIndex={-1} className="mt-5 text-lg font-bold outline-none">{all?"Your seven days":`Day ${day+1} · ${shiftDay(draft.start_date,day)}`}</h3>
      <div className={`mt-3 grid min-w-0 items-start gap-5 ${all?"lg:grid-cols-2":"xl:grid-cols-[minmax(0,1fr)_20rem]"}`}>
        <div className={all?"contents":"min-w-0"}>{Array.from({length:7},(_,index)=>index).filter(index=>all||index===day).map(current=>{
          const entries=draft.entries.filter(entry=>entry.day===current);const review=summary.days[current];
          return <article aria-label={`Day ${current+1} meals`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5" key={current}><h4 className="font-bold">Day {current+1} · {shiftDay(draft.start_date,current)}</h4><p className="mt-2 text-sm text-accent-300">{review.nutrition.calories.known} {review.nutrition.calories.unknown?"known kcal + unknown values":"planned kcal"}</p><div className="mt-4 space-y-4">{entries.map(entry=>{const index=draft.entries.indexOf(entry);return <div key={entry.slot} className="rounded-xl bg-slate-950 p-3"><label className="block text-xs capitalize">{entry.slot}<select className={nutritionInputClass} aria-label={`Day ${current+1} ${entry.slot}`} value={entry.meal_id} onChange={event=>{const meal=eligible.find(item=>item.id===event.target.value);if(meal)onChange(index,{meal_id:meal.id,meal_revision:meal.revision});}}>{eligible.filter(meal=>meal.details.slot===entry.slot).map(meal=><option key={meal.id} value={meal.id}>{meal.name}</option>)}</select></label><label className="mt-3 flex items-center justify-between gap-3 text-xs">Servings<input aria-label={`Day ${current+1} ${entry.slot} servings`} className="min-h-11 w-24 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 text-base" type="number" min={0.5} max={3} step={0.5} value={entry.portions} onChange={event=>onChange(index,{portions:Number(event.target.value)})}/></label></div>;})}</div>{review.notes.length?<ul className="mt-4 space-y-2 text-xs leading-5 text-amber-200">{review.notes.map(note=><li key={note}>{note}</li>)}</ul>:<p className="mt-4 text-xs text-slate-400">Your tags cover the tracked food groups for this day.</p>}</article>;
        })}</div>
        <aside className={`min-w-0 rounded-2xl border border-slate-700 p-4 sm:p-5 ${all?"lg:col-span-2":""}`}><h3 className="font-bold">Shopping preview</h3><p className="mt-2 text-xs leading-6 text-slate-400">Quantities update with your meal swaps and servings. Check what you already have and keep cooked/raw forms as listed.</p><details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-accent-300">View shopping quantities</summary><ul className="mt-3 space-y-3 text-sm">{summary.shopping.ingredients.map((item,index)=><li className="break-words" key={`${item.source}-${item.name}-${index}`}>{item.name} · {item.grams} g</li>)}{summary.shopping.manualMeals.map(item=><li className="break-words" key={item.name}>{item.name} · {item.servings} servings <span className="block text-xs leading-5 text-slate-400">Check your ingredient list or package.</span></li>)}</ul></details></aside>
      </div>
    </fieldset>
  </>;
}
