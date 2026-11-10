"use client";
import Link from "next/link";
import { MeasurementFields } from "./measurement-fields";
import { ProcedureProgress, useFormProcedure } from "./form-procedure";
import { createContext, useContext, useActionState } from "react";
import { useRouter } from "next/navigation";
import { DraftStatus, discardNutritionDraft, useNutritionDraft, useNutritionOwner, publishNutritionChange } from "./draft-session";
import { latestPreferences } from "@/lib/nutrition/draft-models";
import { isPreferencesDraft, preferenceDraft, preferenceFields, reconcilePreferenceFields, type PreferenceFields } from "@/lib/nutrition/preference-drafts";
import { ALLERGENS, DEFAULT_PREFERENCES, type NutritionActionState, type NutritionPreferences } from "@/lib/nutrition/types";

const FieldContext=createContext<{fields:PreferenceFields;setField:(key:string,value:string|string[])=>void}|null>(null);
type Action = (previous: NutritionActionState, form: FormData) => Promise<NutritionActionState>;
const inputClass = "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base";
export function NutritionPreferencesForm({ preferences, action, onboarding = false, guided = false }: { preferences: NutritionPreferences | null; action: Action; onboarding?: boolean; guided?: boolean }) {
  const owner=useNutritionOwner();const router=useRouter();
  const [state, submit, pending] = useActionState(async (previous: NutritionActionState, form: FormData): Promise<NutritionActionState> => { try {const result=await action(previous,form);if(result.status==="success"){discardNutritionDraft(owner,"preferences");publishNutritionChange(owner);if(!guided)router.refresh();}return result;} catch { return { status: "error", message: "Couldn’t reach the server. Your answers are kept. Retry or reload saved data.", revision: previous.revision }; } }, { status: "idle" });
  const currentPreferences=latestPreferences(preferences,state.preferences??null);
  const p=currentPreferences??DEFAULT_PREFERENCES;
  const [draft,setDraft,clearDraft,draftMeta]=useNutritionDraft("preferences",preferenceDraft(currentPreferences),isPreferencesDraft);
  const {fields}=draft;
  const setField=(key:string,value:string|string[])=>setDraft(current=>({...current,fields:{...current.fields,[key]:value}}));
  const {step,form:formRef,heading:headingRef,back,onSubmit:onProcedureSubmit}=useFormProcedure(guided,3,{step:draft.step,setStep:step=>setDraft(current=>({...current,step}))});
  const changed=draft.baseRevision!==(currentPreferences?.revision??null);
  const latest=preferenceFields(p,currentPreferences?.ai_consent_version);
  const comparison=reconcilePreferenceFields(draft.baseline,fields,latest);
  return <FieldContext.Provider value={{fields,setField}}><section id="nutrition-preferences" className="mt-7 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
    <h2 className="text-xl font-bold">{onboarding ? "Make meals fit your life" : "Nutrition preferences"}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-400">{guided?"A few answers help us organize meals you enjoy. Your answers are saved together at the end.":"Tell us what you enjoy and what fits your schedule. Measurements are optional. These settings support general meal planning."}</p>
    <DraftStatus {...draftMeta}/>{changed?<div role="alert" className="mt-4 rounded-xl border border-amber-300/30 p-4 text-sm"><p>Saved preferences changed in another tab. Your unfinished answers are kept. Latest cooking limit: {p.cooking_minutes} minutes.</p>{comparison.conflicts.length?<p className="mt-2">Both versions changed: {comparison.conflicts.map(key=>key.replaceAll("_"," ")).join(", ")}. Choosing below keeps your edits to those fields.</p>:null}<button type="button" className="mt-3 min-h-11 text-accent-300 underline" onClick={()=>setDraft(current=>({...current,fields:comparison.fields,baseline:latest,baseRevision:currentPreferences?.revision??null}))}>Keep my edits and use latest values for unchanged fields</button><button type="button" className="mt-2 block min-h-11 text-slate-300 underline" onClick={clearDraft}>Discard my edits and load saved preferences</button></div>:null}{guided?<ProcedureProgress labels={["Food choices","Your routine","Optional details"]} step={step} heading={headingRef}/>:null}
    <form ref={formRef} action={submit} noValidate={guided} onSubmit={event=>{if(changed){event.preventDefault();return;}onProcedureSubmit(event);}} onReset={event => event.preventDefault()} className="mt-5">
      <input type="hidden" name="revision" value={draft.baseRevision??""} />
      <fieldset disabled={pending||!draftMeta.ready} className="min-w-0 space-y-5">
        <div data-procedure-step="0" hidden={guided&&step!==0} className="space-y-5">
          <Select label="Eating preference" name="diet" value={p.diet} options={[["omnivore","No specific pattern"],["vegetarian","Vegetarian"],["vegan","Vegan"],["pescatarian","Pescatarian"]]} />
          <fieldset className="min-w-0"><legend className="text-sm font-semibold">Food allergens to exclude from suggestions</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{ALLERGENS.map(item => <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 p-3 text-sm" key={item}><input type="checkbox" name="allergens" value={item} checked={Array.isArray(fields.allergens)&&fields.allergens.includes(item)} onChange={event=>setField("allergens",event.target.checked?[...(fields.allergens as string[]),item]:(fields.allergens as string[]).filter(value=>value!==item))} />{item.replaceAll("_", " ")}</label>)}</div></fieldset>
          <label className="block text-sm font-semibold">Other foods you avoid<input className={inputClass} name="avoid_foods" maxLength={1300} value={String(fields.avoid_foods)} onChange={event=>setField("avoid_foods",event.target.value)} placeholder="Mushrooms, olives… separate with commas" /><span className="mt-1 block text-xs font-normal text-slate-400">Up to 20 foods, 64 characters each. Review ingredients and package labels for allergens.</span></label>
        </div>
        <div data-procedure-step="1" hidden={guided&&step!==1} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Your focus" name="goal" value={p.goal} options={[["support_training","Support my training"],["eat_consistently","Eat more consistently"],["maintain_energy","Support everyday energy"]]} />
            <Select label="Activity level" name="activity" value={p.activity} options={[["light","Mostly sitting / light activity"],["moderate","Some regular activity"],["high","Very active"]]} />
            <Select label="Typical food budget" name="budget" value={p.budget} options={[["low","Keep costs low"],["moderate","Moderate"],["flexible","Flexible"]]} />
            <NumberField label="Cooking time per meal (minutes)" name="cooking_minutes" value={p.cooking_minutes} min={5} max={180} required />
          </div>
          <label className="block text-sm font-semibold">What do you usually eat?<textarea className={`${inputClass} min-h-28 py-3`} name="usual_foods" maxLength={1500} value={String(fields.usual_foods)} onChange={event=>setField("usual_foods",event.target.value)} placeholder="Oatmeal for breakfast, rice bowls for lunch…" /><span className="mt-1 block text-xs font-normal text-slate-400">Your saved meals and food logs help keep some choices familiar alongside new recipe ideas.</span></label>
        </div>
        <div data-procedure-step="2" hidden={guided&&step!==2} className="space-y-5">
          <p className="text-sm leading-6 text-slate-400">Measurements and a calorie target are optional. Leave them blank to organize meals without them.</p>
          <details className="rounded-xl border border-slate-700 p-4"><summary className="min-h-7 cursor-pointer text-sm font-semibold">Optional measurements</summary><div className="mt-4 max-w-xs"><NumberField label="Age (adults 18–120)" name="age" value={p.age} min={18} max={120} /></div><MeasurementFields heightCm={p.height_cm} weight={p.weight_kg} draftFields={fields} onDraftChange={values=>setDraft(current=>({...current,fields:{...current.fields,...values}}))}/></details>
          <NumberField label="Daily calorie target (optional)" name="calorie_target" value={p.calorie_target} min={1200} max={6000} />
          <p className="text-xs leading-5 text-slate-400">A calorie target is one you choose or receive from a qualified professional. Leaving it blank keeps tracking neutral; this app does not calculate an energy deficit or subtract workout calories.</p>
          <label className="flex items-start gap-3 rounded-xl border border-slate-700 p-4 text-sm"><input className="mt-1" type="checkbox" name="ai_consent" checked={fields.ai_consent==="on"} onChange={event=>setField("ai_consent",event.target.checked?"on":"")} /><span><strong className="block">Allow optional AI meal suggestions</strong><span className="mt-1 block leading-6 text-slate-400">When you explicitly request an AI plan, share your reviewed meal names, meal types, food-group tags, how often you log those meals, eating preferences, chosen meal style and cooking/budget settings with OpenAI. AI can arrange recipe ideas and choose preparation priorities; the app provides recipe directions and calculates nutrition. Your name, email, measurements and raw food diary are excluded. You can turn this off here at any time. The regular planner works without AI.</span></span></label>
        </div>
        <div className="flex flex-wrap gap-3">{guided&&step>0?<button type="button" onClick={back} className="min-h-12 rounded-xl border border-slate-700 px-5 font-semibold">Back</button>:null}<button className="min-h-12 flex-1 rounded-xl bg-accent-400 px-5 font-bold text-slate-950 disabled:opacity-40" name="intent" value="save" disabled={changed}>{pending ? "Saving…" : guided&&step<2 ? "Continue" : "Save nutrition preferences"}</button>{onboarding ? <button className="min-h-12 rounded-xl border border-slate-700 px-5 font-semibold" formNoValidate name="intent" value="skip">Skip for now</button> : null}</div>
      </fieldset>
      {draftMeta.hasDraft?<button type="button" className="mt-3 min-h-11 text-xs text-slate-400 underline" onClick={clearDraft}>Discard unsaved preferences</button>:null}
      {state.message ? <p className={`mt-4 text-sm ${state.status === "error" ? "text-red-300" : "text-success-300"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}{state.status==="error"?<button type="button" className="mt-2 min-h-11 text-sm text-accent-300 underline" onClick={()=>router.refresh()}>Reload saved data and keep my answers</button>:null}
      {state.status === "success" && onboarding ? <Link className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-slate-700 font-semibold" href="/app/nutrition">Continue to Meals</Link> : null}
    </form>
  </section></FieldContext.Provider>;
}
function NumberField({ label, name, value, min, max, step = "1", required = false }: { label: string; name: string; value: number | null; min: number; max: number; step?: string; required?: boolean }) { const context=useContext(FieldContext);return <label className="block min-w-0 text-sm font-semibold">{label}<input className={inputClass} name={name} type="number" inputMode={step === "1" ? "numeric" : "decimal"} min={min} max={max} step={step} required={required} value={context?String(context.fields[name]??""):value??""} onChange={event=>context?.setField(name,event.target.value)} /></label>; }
function Select({ label, name, value, options }: { label: string; name: string; value: string; options: string[][] }) { const context=useContext(FieldContext);return <label className="block min-w-0 text-sm font-semibold">{label}<select className={inputClass} name={name} value={context?String(context.fields[name]??""):value} onChange={event=>context?.setField(name,event.target.value)}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>; }
