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
  assert.equal(captured?.searchParams.get("weight"), "not.is.null");
  assert.equal(captured?.searchParams.get("exercise_id"), "eq.exercise-template");
});
