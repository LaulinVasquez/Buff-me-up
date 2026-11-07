"use client";
import { useState, useSyncExternalStore } from "react";
import { heightFields, imperialHeightCm, weightFields, weightKg, type HeightUnit, type WeightUnit } from "@/lib/nutrition/measurements";
const unitKey = "bmu-nutrition-display-units";
const unitEvent = "bmu-nutrition-display-units-changed";
let temporaryUnits = "ft-in|lb";
function readUnits() {
  try { const value=localStorage.getItem(unitKey); return ["ft-in|lb","ft-in|kg","cm|lb","cm|kg"].includes(value ?? "") ? value! : temporaryUnits; } catch { return temporaryUnits; }
}
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify); window.addEventListener(unitEvent, notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener(unitEvent, notify); };
}
function saveUnits(value: string) { temporaryUnits=value; try { localStorage.setItem(unitKey,value); } catch {} window.dispatchEvent(new Event(unitEvent)); }
const inputClass="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base";
export function MeasurementFields({heightCm,weight,draftFields,onDraftChange}: {heightCm:number|null;weight:number|null;draftFields?:Record<string,string|string[]>;onDraftChange?:(fields:Record<string,string>)=>void}) {
  const units=useSyncExternalStore(subscribe,readUnits,()=>"ft-in|lb");
  const [heightUnit,weightUnit]=units.split("|") as [HeightUnit,WeightUnit];
  const [localHeight,setLocalHeight]=useState(()=>({value:heightCm,...heightFields(heightCm)}));
  const [localMass,setLocalMass]=useState(()=>({value:weight,...weightFields(weight)}));
  const numeric=(key:string,fallback:number|null)=>draftFields?(draftFields[key]===""?null:Number(draftFields[key])):fallback;
  const height=draftFields?{value:numeric("height_cm",heightCm),cm:String(draftFields.height_display_cm??""),feet:String(draftFields.height_feet??""),inches:String(draftFields.height_inches??"")}:localHeight;
  const mass=draftFields?{value:numeric("weight_kg",weight),kg:String(draftFields.weight_display_kg??""),lb:String(draftFields.weight_lb??"")}:localMass;
  const changeHeight=(field:"cm"|"feet"|"inches",value:string)=>{
    const fields={...height,[field]:value};const cm=field==="cm"?(value.trim()===""?null:Number(value)):imperialHeightCm(fields.feet,fields.inches);
    const next={value:cm,...heightFields(cm),...(field==="cm"?{cm:value}:{feet:fields.feet,inches:fields.inches})};
    if(onDraftChange)onDraftChange({height_cm:cm===null?"":String(cm),height_display_cm:next.cm,height_feet:next.feet,height_inches:next.inches});else setLocalHeight(next);
  };
  const changeWeight=(value:string)=>{const kg=weightKg(value,weightUnit);const next={value:kg,...weightFields(kg),[weightUnit]:value};if(onDraftChange)onDraftChange({weight_kg:kg===null?"":String(kg),weight_display_kg:next.kg,weight_lb:next.lb});else setLocalMass(next);};
  return <div className="mt-4 grid min-w-0 gap-5 sm:grid-cols-2">
    <input type="hidden" name="height_cm" value={height.value===null?"":String(height.value)}/><input type="hidden" name="weight_kg" value={mass.value===null?"":String(mass.value)}/>
    <fieldset className="min-w-0"><legend className="text-sm font-semibold">Height (optional)</legend>
      <label className="mt-3 block text-xs text-slate-400">Height unit<select className={inputClass} value={heightUnit} onChange={event=>saveUnits(`${event.target.value}|${weightUnit}`)}><option value="ft-in">Feet and inches</option><option value="cm">Centimeters</option></select></label>
      {heightUnit==="cm"?<label className="mt-3 block text-sm">Height (cm)<input className={inputClass} type="number" inputMode="decimal" min={80} max={250} step="any" value={height.cm} onChange={event=>changeHeight("cm",event.target.value)}/></label>:<div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm">Feet<input className={inputClass} type="number" inputMode="numeric" min={2} max={8} step={1} required={height.inches!==""} value={height.feet} onChange={event=>changeHeight("feet",event.target.value)}/></label><label className="text-sm">Inches<input className={inputClass} type="number" inputMode="decimal" min={0} max={11.99} step="any" value={height.inches} onChange={event=>changeHeight("inches",event.target.value)}/></label></div>}
      <p className="mt-2 text-xs leading-5 text-slate-400">Leave blank to skip. Supported height range: 80–250 cm (about 2 ft 7.5 in–8 ft 2.4 in).</p>
    </fieldset>
    <fieldset className="min-w-0"><legend className="text-sm font-semibold">Weight (optional)</legend>
      <label className="mt-3 block text-xs text-slate-400">Weight unit<select className={inputClass} value={weightUnit} onChange={event=>saveUnits(`${heightUnit}|${event.target.value}`)}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label>
      <label className="mt-3 block text-sm">{weightUnit==="lb"?"Weight (lb)":"Weight (kg)"}<input className={inputClass} type="number" inputMode="decimal" min={weightUnit==="lb"?44:20} max={weightUnit==="lb"?882:400} step="any" value={mass[weightUnit]} onChange={event=>changeWeight(event.target.value)}/></label>
      <p className="mt-2 text-xs leading-5 text-slate-400">Leave blank to skip. Supported weight range: 20–400 kg (about 44.1–881.8 lb).</p>
    </fieldset>
    <p className="text-xs leading-5 text-slate-400 sm:col-span-2">Unit choices are remembered on this browser. Measurements are saved to your account when you submit and are excluded from AI requests.</p>
  </div>;
}
