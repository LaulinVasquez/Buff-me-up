import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PREFERENCES } from "../lib/nutrition/types";
import { preferencesFromForm, validatePreferences } from "../lib/nutrition/preferences";
test("nutrition preferences keep measurements optional and reject invalid or elevated fields", () => {
 assert(validatePreferences(DEFAULT_PREFERENCES));
 for(const patch of [{age:17},{age:18.5},{weight_kg:Infinity},{calorie_target:500},{diet:"unknown"},{allergens:["invalid"]},{avoid_foods:[""]},{ai_consent:"true"},{user_id:"someone-else"}]) assert.equal(validatePreferences({...DEFAULT_PREFERENCES,...patch}),false);
 assert(validatePreferences({...DEFAULT_PREFERENCES,age:35,height_cm:175,weight_kg:80,allergens:["milk"],avoid_foods:["olives"],ai_consent:true}));
});
test("preference form leaves blank numbers unknown and normalizes food exclusions", () => {
 const form=new FormData();for(const [key,value]of Object.entries(DEFAULT_PREFERENCES))if(!Array.isArray(value)&&value!==null&&typeof value!=="boolean")form.set(key,String(value));
 form.set("avoid_foods","  Olives, Mushrooms , ");form.set("ai_consent","on");
 const value=preferencesFromForm(form);assert.equal(value.age,null);assert.equal(value.weight_kg,null);assert.equal(value.calorie_target,null);assert.deepEqual(value.avoid_foods,["olives","mushrooms"]);assert.equal(value.ai_consent,true);assert(validatePreferences(value));
});
