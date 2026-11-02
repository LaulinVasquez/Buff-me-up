import test from "node:test";
import assert from "node:assert/strict";
import { exerciseKey, getSwapCandidates, getSwapSource, readSubstitutionDetails, substitutionRecords } from "../lib/workouts/substitutions";
import { fallbackExercises } from "../lib/exercises/fallback";

const snapshot = (name: string) => ({ name, substitution_details: null });

test("known template aliases identify the same exercise and keep its movement type", () => {
  assert.equal(exerciseKey("  BENCH   PRESS "), exerciseKey("Barbell Bench Press"));
  const source = getSwapSource(snapshot("Bench Press"));
  assert.equal(source.primaryMuscle, "Chest");
  const choices = getSwapCandidates(source, [snapshot("Bench Press")]);
  assert.deepEqual(choices.map(item => item.name), ["Incline Dumbbell Press"]);
  assert(choices.every(item => item.mechanic === "compound"));
});
test("equipment filtering never leaks a different primary muscle or used exercise", () => {
  const source = getSwapSource(snapshot("Lat Pulldown"));
  const choices = getSwapCandidates(source, [snapshot("Lat Pulldown"), snapshot("Seated Cable Row")], ["Barbell"]);
  assert.deepEqual(choices.map(item => item.name), ["Barbell Row"]);
  assert.deepEqual(getSwapCandidates(source, [snapshot("Lat Pulldown")], ["Dumbbells"]), []);
});
test("completed and unfinished exercises are both excluded from alternatives", () => {
  const source = getSwapSource(snapshot("Bicep Curl"));
  assert.deepEqual(getSwapCandidates(source, [snapshot("Dumbbell Curl"), snapshot("Hammer Curl"), snapshot("Preacher Curl")]), []);
});
test("unclassified custom moves require a selected muscle rather than a name guess", () => {
  const source = getSwapSource(snapshot("My special chest movement"));
  assert.equal(source.primaryMuscle, null);
  assert.deepEqual(getSwapCandidates(source, []), []);
  const choices = getSwapCandidates({ ...source, primaryMuscle: "Biceps" }, []);
  assert(choices.length > 0);
  assert(choices.every(item => item.primaryMuscle === "Biceps"));
});
test("saved catalog metadata supports custom names; replacement metadata stays authoritative", () => {
  assert.equal(getSwapSource({ ...snapshot("Custom move"), gym_exercises: { muscle_group: "Back", equipment: "Machine" } }).primaryMuscle, "Back");
  const details = fallbackExercises.find(item => item.id === "fallback-hammer")!;
  const saved = JSON.parse(JSON.stringify(details));
  const source = getSwapSource({ name: "Hammer Curl", substitution_details: saved, gym_exercises: { muscle_group: "Chest", equipment: "Barbell" } });
  assert.equal(source.primaryMuscle, "Biceps");
  assert.equal(source.mechanic, "isolation");
  assert(!getSwapCandidates(source, [{ name: "Custom label", substitution_details: saved }]).some(item => item.id === details.id));
});
test("missing and malformed snapshot metadata is handled without crashing", () => {
  for (const value of [null, [], "bad", { id: "x", name: "X", primaryMuscle: "Biceps", equipment: "Dumbbells", instructions: [123] }]) {
    assert.equal(readSubstitutionDetails(value), null);
  }
  assert.deepEqual(substitutionRecords([null, "bad", { name: "Original", weight: 25 }, { name: "Another", weight: null }]), [{ name: "Original", weight: 25 }, { name: "Another", weight: null }]);
});
test("candidate calculation does not mutate the pool or workout snapshots", () => {
  const pool = structuredClone(fallbackExercises);
  const snapshots = [snapshot("Dumbbell Curl")];
  const before = JSON.stringify({ pool, snapshots });
  getSwapCandidates(getSwapSource(snapshots[0]), snapshots, [], pool);
  assert.equal(JSON.stringify({ pool, snapshots }), before);
});
