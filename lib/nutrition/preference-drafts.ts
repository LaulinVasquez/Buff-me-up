import { AI_CONSENT_VERSION } from "./planner";
import { DEFAULT_PREFERENCES, type NutritionPreferences, type NutritionPreferencesInput } from "./types";
import { heightFields, weightFields } from "./measurements";
import { object, shortString, draftStep } from "./drafts";
import { revision } from "./draft-models";
export type PreferenceFields=Record<string,string|string[]>;
export type PreferencesDraft={fields:PreferenceFields;baseline:PreferenceFields;baseRevision:number|null;step:number};
export function preferenceFields(p:NutritionPreferencesInput=DEFAULT_PREFERENCES,consentVersion=""):PreferenceFields {
 const h=heightFields(p.height_cm),w=weightFields(p.weight_kg);
 return {age:p.age===null?"":String(p.age),height_cm:h.cm,height_display_cm:h.cm,height_feet:h.feet,height_inches:h.inches,weight_kg:w.kg,weight_display_kg:w.kg,weight_lb:w.lb,activity:p.activity,goal:p.goal,diet:p.diet,allergens:p.allergens,avoid_foods:p.avoid_foods.join(", "),usual_foods:p.usual_foods,cooking_minutes:String(p.cooking_minutes),budget:p.budget,calorie_target:p.calorie_target===null?"":String(p.calorie_target),ai_consent:p.ai_consent&&consentVersion===AI_CONSENT_VERSION?"on":""};
}
const keys=Object.keys(preferenceFields());
function fields(v:unknown):v is PreferenceFields{return object(v)&&Object.keys(v).length===keys.length&&keys.every(key=>key==="allergens"?Array.isArray(v[key])&&(v[key] as unknown[]).length<=9&&(v[key] as unknown[]).every(item=>shortString(item,30)):shortString(v[key],2500));}
export function isPreferencesDraft(v:unknown):v is PreferencesDraft{return object(v)&&fields(v.fields)&&fields(v.baseline)&&revision(v.baseRevision)&&draftStep(v.step);}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function reconcilePreferenceFields(base:PreferenceFields,local:PreferenceFields,latest:PreferenceFields) {
 const merged={...latest};const conflicts:string[]=[];
 const groups=[['height_cm','height_display_cm','height_feet','height_inches'],['weight_kg','weight_display_kg','weight_lb'],...keys.filter(key=>!key.startsWith('height_')&&!key.startsWith('weight_')).map(key=>[key])];
 for(const group of groups){const changed=group.some(key=>!same(local[key],base[key]));if(!changed)continue;if(group.some(key=>!same(latest[key],base[key])&&!same(latest[key],local[key])))conflicts.push(group[0]);for(const key of group)merged[key]=local[key];}
 // Another tab's opt-out always requires a fresh affirmative choice after reconciliation.
 if(latest.ai_consent!=="on")merged.ai_consent="";
 return {fields:merged,conflicts};
}
export function preferenceDraft(p:NutritionPreferences|null):PreferencesDraft {const fields=preferenceFields(p??DEFAULT_PREFERENCES,p?.ai_consent_version);return {fields,baseline:fields,baseRevision:p?.revision??null,step:0};}
