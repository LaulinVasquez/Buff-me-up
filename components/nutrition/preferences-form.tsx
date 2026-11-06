"use client";
import Link from "next/link";
import { MeasurementFields } from "./measurement-fields";
import { ProcedureProgress, useFormProcedure } from "./form-procedure";
import { useActionState } from "react";
import { AI_CONSENT_VERSION } from "@/lib/nutrition/planner";
import { ALLERGENS, DEFAULT_PREFERENCES, type NutritionActionState, type NutritionPreferences } from "@/lib/nutrition/types";

type Action = (previous: NutritionActionState, form: FormData) => Promise<NutritionActionState>;
const inputClass = "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base";
export function NutritionPreferencesForm({ preferences, action, onboarding = false, guided = false }: { preferences: NutritionPreferences | null; action: Action; onboarding?: boolean; guided?: boolean }) {
  const p = preferences ?? DEFAULT_PREFERENCES;
  const {step,form:formRef,heading:headingRef,back,onSubmit:onProcedureSubmit} = useFormProcedure(guided, 3);
  const [state, submit, pending] = useActionState(async (previous: NutritionActionState, form: FormData): Promise<NutritionActionState> => { try { return await action(previous, form); } catch { return { status: "error", message: "Couldn’t reach the server. Your entries are still here. Retry or reload to check saved preferences.", revision: previous.revision }; } }, { status: "idle" });
  return <section id="nutrition-preferences" className="mt-7 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
    <h2 className="text-xl font-bold">{onboarding ? "Make meals fit your life" : "Nutrition preferences"}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-400">{guided?"A few answers help us organize meals you enjoy. Your answers are saved together at the end.":"Tell us what you enjoy and what fits your schedule. Measurements are optional. These settings support general meal planning."}</p>
    {guided?<ProcedureProgress labels={["Food choices","Your routine","Optional details"]} step={step} heading={headingRef}/>:null}
    <form ref={formRef} action={submit} noValidate={guided} onSubmit={onProcedureSubmit} onReset={event => event.preventDefault()} className="mt-5">
      <input type="hidden" name="revision" value={state.revision ?? preferences?.revision ?? ""} />
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        <div data-procedure-step="0" hidden={guided&&step!==0} className="space-y-5">
          <Select label="Eating preference" name="diet" value={p.diet} options={[["omnivore","No specific pattern"],["vegetarian","Vegetarian"],["vegan","Vegan"],["pescatarian","Pescatarian"]]} />
          <fieldset className="min-w-0"><legend className="text-sm font-semibold">Food allergens to exclude from suggestions</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{ALLERGENS.map(item => <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 p-3 text-sm" key={item}><input type="checkbox" name="allergens" value={item} defaultChecked={p.allergens.includes(item)} />{item.replaceAll("_", " ")}</label>)}</div></fieldset>
          <label className="block text-sm font-semibold">Other foods you avoid<input className={inputClass} name="avoid_foods" maxLength={1300} defaultValue={p.avoid_foods.join(", ")} placeholder="Mushrooms, olives… separate with commas" /><span className="mt-1 block text-xs font-normal text-slate-400">Up to 20 foods, 64 characters each. Review ingredients and package labels for allergens.</span></label>
        </div>
        <div data-procedure-step="1" hidden={guided&&step!==1} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Your focus" name="goal" value={p.goal} options={[["support_training","Support my training"],["eat_consistently","Eat more consistently"],["maintain_energy","Support everyday energy"]]} />
            <Select label="Activity level" name="activity" value={p.activity} options={[["light","Mostly sitting / light activity"],["moderate","Some regular activity"],["high","Very active"]]} />
            <Select label="Typical food budget" name="budget" value={p.budget} options={[["low","Keep costs low"],["moderate","Moderate"],["flexible","Flexible"]]} />
            <NumberField label="Cooking time per meal (minutes)" name="cooking_minutes" value={p.cooking_minutes} min={5} max={180} required />
          </div>
          <label className="block text-sm font-semibold">What do you usually eat?<textarea className={`${inputClass} min-h-28 py-3`} name="usual_foods" maxLength={1500} defaultValue={p.usual_foods} placeholder="Oatmeal for breakfast, rice bowls for lunch…" /><span className="mt-1 block text-xs font-normal text-slate-400">Your saved meals and food logs will help organize familiar choices.</span></label>
        </div>
        <div data-procedure-step="2" hidden={guided&&step!==2} className="space-y-5">
          <p className="text-sm leading-6 text-slate-400">Measurements and a calorie target are optional. Leave them blank to organize meals without them.</p>
          <details className="rounded-xl border border-slate-700 p-4"><summary className="min-h-7 cursor-pointer text-sm font-semibold">Optional measurements</summary><div className="mt-4 max-w-xs"><NumberField label="Age (adults 18–120)" name="age" value={p.age} min={18} max={120} /></div><MeasurementFields heightCm={p.height_cm} weight={p.weight_kg}/></details>
          <NumberField label="Daily calorie target (optional)" name="calorie_target" value={p.calorie_target} min={1200} max={6000} />
          <p className="text-xs leading-5 text-slate-400">A calorie target is one you choose or receive from a qualified professional. Leaving it blank keeps tracking neutral; this app does not calculate an energy deficit or subtract workout calories.</p>
          <label className="flex items-start gap-3 rounded-xl border border-slate-700 p-4 text-sm"><input className="mt-1" type="checkbox" name="ai_consent" defaultChecked={p.ai_consent && preferences?.ai_consent_version===AI_CONSENT_VERSION} /><span><strong className="block">Allow optional AI meal suggestions</strong><span className="mt-1 block leading-6 text-slate-400">When you explicitly request an AI plan, share your reviewed meal names, meal types, food-group tags, how often you log those meals, eating preferences and cooking/budget settings with OpenAI. Your name, email, measurements and raw food diary are excluded. You can turn this off here at any time. The regular planner works without AI.</span></span></label>
        </div>
        <div className="flex flex-wrap gap-3">{guided&&step>0?<button type="button" onClick={back} className="min-h-12 rounded-xl border border-slate-700 px-5 font-semibold">Back</button>:null}<button className="min-h-12 flex-1 rounded-xl bg-accent-400 px-5 font-bold text-slate-950 disabled:opacity-40" name="intent" value="save">{pending ? "Saving…" : guided&&step<2 ? "Continue" : "Save nutrition preferences"}</button>{onboarding ? <button className="min-h-12 rounded-xl border border-slate-700 px-5 font-semibold" formNoValidate name="intent" value="skip">Skip for now</button> : null}</div>
      </fieldset>
      {state.message ? <p className={`mt-4 text-sm ${state.status === "error" ? "text-red-300" : "text-success-300"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      {state.status === "success" && onboarding ? <Link className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-slate-700 font-semibold" href="/app/nutrition">Continue to Meals</Link> : null}
    </form>
  </section>;
}
function NumberField({ label, name, value, min, max, step = "1", required = false }: { label: string; name: string; value: number | null; min: number; max: number; step?: string; required?: boolean }) { return <label className="block min-w-0 text-sm font-semibold">{label}<input className={inputClass} name={name} type="number" inputMode={step === "1" ? "numeric" : "decimal"} min={min} max={max} step={step} required={required} defaultValue={value ?? ""} /></label>; }
function Select({ label, name, value, options }: { label: string; name: string; value: string; options: string[][] }) { return <label className="block min-w-0 text-sm font-semibold">{label}<select className={inputClass} name={name} defaultValue={value}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>; }
