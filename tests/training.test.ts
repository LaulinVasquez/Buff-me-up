import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { nextOrder } from "../lib/workouts/ordering";
import { previousWeightQuery } from "../lib/workouts/queries";

test("append remains after the last day/exercise following middle or first deletion", () => {
  assert.equal(nextOrder([]), 0);
  assert.equal(nextOrder([0, 2]), 3);
  assert.equal(nextOrder([2, 5]), 6);
  assert.equal(nextOrder([4, 0, 2]), 5);
});

test("previous weight orders parent snapshots by completion before limiting", async () => {
  let captured: URL | undefined;
  const client = createClient<Database>("http://127.0.0.1:55999", "synthetic-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      captured = new URL(String(input));
      return new Response(JSON.stringify([{ weight: 45, gym_workouts: { completed_at: "2026-11-01T12:00:00Z" } }]), { headers: { "Content-Type": "application/json" } });
    } },
  });
  const { data, error } = await previousWeightQuery(client, "exercise-template");
  assert.equal(error, null);
  assert.equal(data?.weight, 45);
  assert.equal(captured?.searchParams.get("order"), "gym_workouts(completed_at).desc,id.desc");
  assert.equal(captured?.searchParams.get("gym_workouts.order"), null);
  assert.equal(captured?.searchParams.get("limit"), "1");
  assert.equal(captured?.searchParams.get("gym_workouts.status"), "eq.completed");
  assert.equal(captured?.searchParams.get("deferred"), "eq.false");
  assert.equal(captured?.searchParams.get("or"), "(completed.eq.true,log_revision.gt.0)");
  assert.equal(captured?.searchParams.get("weight"), "not.is.null");
  assert.equal(captured?.searchParams.get("exercise_id"), "eq.exercise-template");
});

import { initialSets, readSets, setVolume, validateSets } from "../lib/workouts/sets";
test("actual set records validate reps/weight/completion without inventing historical reps", () => {
  assert.deepEqual(initialSets([], 2), [{set:1,reps:null,weight:null,completed:false},{set:2,reps:null,weight:null,completed:false}]);
  assert.equal(validateSets([{set:1,reps:null,weight:25,completed:true}]),false);
  assert.equal(validateSets([{set:1,reps:8.5,weight:25,completed:true}]),false);
  assert.equal(validateSets([{set:1,reps:8,weight:Infinity,completed:true}]),false);
  assert.equal(validateSets([{set:1,reps:8,weight:25,completed:true},{set:1,reps:8,weight:25,completed:true}]),false);
  assert.equal(validateSets([{set:1,reps:8,weight:25,completed:true,hidden:true}]),false);
  const sets = [{set:2,reps:10,weight:25,completed:true},{set:1,reps:8,weight:30,completed:true},{set:3,reps:10,weight:100,completed:false},{set:4,reps:12,weight:null,completed:true}];
  assert.equal(validateSets(sets),true);
  assert.equal(setVolume(sets),490);
  assert.deepEqual(readSets(sets).map(item=>item.set),[1,2,3,4]);
  assert.equal(initialSets([],1000).length,100);
});

import { adaptationPreview, type AdaptableExercise } from "../lib/workouts/adaptations";
const adaptable = (id:string, sets=3):AdaptableExercise => ({id,name:id,exercise_order:Number(id),target_sets:sets,completed:false,logged_sets:[],deferred:false,updated_at:"2026-11-02T12:00:00Z"});
test("short sessions retain logged work, ordered untouched exercises and original records",()=>{
 const exercises=[adaptable("1"),adaptable("2"),adaptable("3"),adaptable("4"),adaptable("5")];
 exercises[0].completed=true;exercises[1].logged_sets=[{set:1,reps:8,weight:25,completed:true}];
 const before=JSON.stringify(exercises);const short=adaptationPreview(exercises,"short",15);
 assert.deepEqual(short.keepIds,["1","2","3"]);assert.deepEqual(short.deferred.map(e=>e.id),["4","5"]);
 assert.equal(short.protectedCount,2);assert.equal(short.estimatedMinutes,10);assert.equal(JSON.stringify(exercises),before);
 assert.equal(adaptationPreview(exercises,"full").deferred.length,0);
});
test("comeback keeps half of untouched work and never drops completed or saved sets",()=>{
 const exercises=[adaptable("1"),adaptable("2"),adaptable("3"),adaptable("4"),adaptable("5")];
 exercises[0].logged_sets=[{set:1,reps:null,weight:25,completed:false}];
 assert.deepEqual(adaptationPreview(exercises,"comeback").keepIds,["1","2","3"]);
 const huge=adaptationPreview([adaptable("1",100)],"short",15);
 assert.equal(huge.keep.length,1);assert.equal(huge.estimatedMinutes,204);
 assert.equal(adaptationPreview([],"short").estimatedMinutes,0);
});
