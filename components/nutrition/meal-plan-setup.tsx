"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { mergeSavedRecords } from "@/lib/nutrition/drafts";
import { isSetupDraft, latestPreferences, type SetupDraft } from "@/lib/nutrition/draft-models";
import { useNutritionDraft } from "./draft-session";
import type { CookingTimeAction } from "./cooking-time-notice";
import { plannerReadiness, mealPlanFlowHref } from "@/lib/nutrition/planner-setup";
import { mealEligibility } from "@/lib/nutrition/planner";
import type { MealSlot, NutritionActionState, NutritionPreferences, SavedMeal } from "@/lib/nutrition/types";
import { NutritionPreferencesForm } from "./preferences-form";
import { MealEditor, type MealAction } from "./meal-editor";
type PreferencesAction=(previous:NutritionActionState,form:FormData)=>Promise<NutritionActionState>;
export function MealPlanSetup({initialMeals,preferences,start,snack,editPreferences=false,preferencesAction,mealAction,cookingAction}:{initialMeals:SavedMeal[];preferences:NutritionPreferences|null;start:string;snack:boolean;editPreferences?:boolean;preferencesAction:PreferencesAction;mealAction:MealAction;cookingAction?:CookingTimeAction}) {
  const router=useRouter();const [localMeals,setLocalMeals]=useState<SavedMeal[]>([]);const meals=mergeSavedRecords(initialMeals,localMeals);
  const [changedPreferences,setChangedPreferences]=useState<NutritionPreferences|null>(null);const currentPreferences=latestPreferences(preferences,changedPreferences);
  const readiness=plannerReadiness(meals,currentPreferences,snack);
  const [setup,setSetup,,setupMeta]=useNutritionDraft<SetupDraft>("setup/view",{slot:null,editor:null},isSetupDraft);
  const slot=setup.slot??readiness.missing[0]??"breakfast";
  const editor=setup.editor==="new"?"new":meals.find(meal=>meal.id===setup.editor)??null;
  const setSlot=(slot:MealSlot)=>setSetup(current=>({...current,slot}));
  const setEditor=(editor:SavedMeal|"new"|null)=>setSetup(current=>({...current,slot,editor:editor===null?null:editor==="new"?"new":editor.id}));
  const setupHref=mealPlanFlowHref("setup",start,snack);
  if(readiness.needsPreferences||editPreferences)return <>
    <p className="mt-4 text-sm leading-6 text-slate-400">First, what foods fit your preferences, schedule and budget? Measurements are optional.</p>
    <p className="mt-5 text-xs font-semibold text-accent-300">Step 1 of 2 · Your preferences</p>
    <NutritionPreferencesForm guided preferences={currentPreferences} action={async(previous,form)=>{const result=await preferencesAction(previous,form);if(result.status==="success"){router.replace(setupHref);router.refresh();}return result;}}/>
  </>;
  const active=meals.filter(meal=>!meal.archived&&meal.details.slot===slot);
  const onSaved=(meal:SavedMeal)=>{
    const next=[meal,...meals.filter(item=>item.id!==meal.id)];setLocalMeals(current=>[meal,...current.filter(item=>item.id!==meal.id)]);setEditor(null);
    const status=plannerReadiness(next,currentPreferences,snack);
    if(status.ready)router.replace(mealPlanFlowHref("plan",start,snack,true));else setSlot(status.missing[0]);
  };
  return <>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold text-accent-300">Step 2 of 2 · Your meal choices</p><Link className="inline-flex min-h-11 items-center text-sm text-accent-300 underline" href={`${setupHref}${setupHref.includes("?")?"&":"?"}step=preferences`}>Review food preferences</Link></div>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">What do you usually eat? Add or review at least one meal for each type below. Your plan is created once the meals fit your preferences. More choices give your week more variety.</p>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Meal setup progress">{readiness.coverage.map(item=><button key={item.slot} type="button" aria-pressed={item.slot===slot} disabled={!!editor||!setupMeta.ready} onClick={()=>setSlot(item.slot)} className={`min-h-20 min-w-0 rounded-2xl border p-3 text-left disabled:opacity-50 ${item.slot===slot?"border-accent-400 bg-accent-400/10":"border-slate-700 bg-slate-900"}`}><span className="block text-sm font-bold capitalize">{item.slot}</span><span className={`mt-2 block text-xs ${item.eligible.length?"text-accent-300":"text-slate-400"}`}>{item.eligible.length?`${item.eligible.length} ready`:"Needs a meal"}</span></button>)}</div>
    {readiness.ready&&!editor?<section className="mt-6 rounded-3xl border border-accent-400/30 p-5"><h2 className="text-xl font-bold">Your meals are ready.</h2><p className="mt-2 text-sm text-slate-400">Create your seven-day draft, then review meals and portions before saving.</p><button type="button" onClick={()=>router.replace(mealPlanFlowHref("plan",start,snack,true))} className="mt-4 min-h-12 w-full rounded-xl bg-accent-400 px-4 font-bold text-slate-950 sm:w-auto">Create my plan</button></section>:null}
    <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">What do you like {slot==="snack"?"as a snack":`for ${slot}`}?</h2><button type="button" disabled={!!editor||!setupMeta.ready} onClick={()=>setEditor("new")} className="min-h-12 rounded-xl bg-accent-400 px-4 text-sm font-bold text-slate-950 disabled:opacity-40">Add {slot} meal</button></div>
      {editor?<MealEditor guided draftScope="setup" cookingAction={cookingAction} onPreferencesChanged={setChangedPreferences} preferences={currentPreferences} key={editor==="new"?`new-${slot}`:editor.id} meal={editor==="new"?undefined:editor} initialSlot={slot} action={mealAction} onSaved={onSaved} onCancel={()=>setEditor(null)}/>:null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">{active.map(meal=>{const reason=mealEligibility(meal,currentPreferences!);return <article className="min-w-0 rounded-2xl border border-slate-700 p-4" key={meal.id}><h3 className="break-words font-semibold">{meal.name}</h3><p className={`mt-2 text-sm ${reason?"text-amber-200":"text-accent-300"}`}>{reason??"Ready for your plan"}</p><button type="button" disabled={!!editor||!setupMeta.ready} className="mt-3 min-h-11 text-sm font-semibold text-accent-300 underline disabled:opacity-40" onClick={()=>setEditor(meal)}>Review or edit meal</button></article>;})}</div>
      {!active.length&&!editor?<p className="mt-4 text-sm leading-6 text-slate-400">Search for the foods you use, enter their quantities, and review the meal’s ingredients, eating patterns, time and cost. Manual entry is available too.</p>:null}
    </section>
  </>;
}
