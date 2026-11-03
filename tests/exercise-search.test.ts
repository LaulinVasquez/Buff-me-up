import test from "node:test";
import assert from "node:assert/strict";
import { catalogEquipmentOptions, catalogRequest, expandSearch, searchLocalCatalog } from "../lib/exercises/search";
import { fallbackExercises } from "../lib/exercises/fallback";

test("provider contract sends name, supported limits and opaque cursor with combined filters", () => {
  const request = catalogRequest({ query: "  DB   curl ", muscle: "Biceps", equipment: "Dumbbell", limit: 50, cursor: "opaque + /?=", direction: "before" });
  const url = new URL(request.path, "https://provider.example");
  assert.equal(url.pathname, "/exercises");
  assert.equal(url.searchParams.get("name"), "dumbbell curl");
  assert.equal(url.searchParams.has("search"), false);
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("targetMuscles"), "biceps");
  assert.equal(url.searchParams.get("equipments"), "Dumbbell");
  assert.equal(url.searchParams.get("before"), "opaque + /?=");
  assert.equal(url.searchParams.has("after"), false);
  for (const value of [NaN, Infinity]) assert.equal(catalogRequest({ limit: value }).limit, 20);
  assert.equal(catalogRequest({ limit: -1 }).limit, 1);
  assert.equal(catalogRequest({ limit: 3.9 }).limit, 3);
});

test("built-in search handles shorthand, spacing, reordered words, prefixes and modest typos", () => {
  for (const [query, id] of [["  DB   curl ", "curl"], ["BB bench", "bench"], ["RDL", "rdl"], ["press bench", "bench"], ["bench pres", "bench"], ["bench prsss", "bench"], ["lat pull-down", "pulldown"]]) {
    assert(searchLocalCatalog(fallbackExercises, { query }).exercises.some(exercise => exercise.id === `fallback-${id}`), query);
  }
  assert.equal(expandSearch("  RDL  "), "romanian deadlift");
  assert.equal(searchLocalCatalog(fallbackExercises, { query: "completely unrelated" }).total, 0);
  assert.equal(searchLocalCatalog(fallbackExercises, { query: "xb" }).total, 0);
});

test("equipment aliases and combined filters do not leak unrelated matches", () => {
  const page = searchLocalCatalog(fallbackExercises, { query: "press", muscle: "Chest", equipment: "dumbbell" });
  assert.deepEqual(page.exercises.map(item => item.id), ["fallback-incline"]);
  assert.equal(searchLocalCatalog(fallbackExercises, { query: "press", muscle: "Chest", equipment: "Cable" }).total, 0);
  assert(searchLocalCatalog(fallbackExercises, { equipment: "body weight" }).exercises.some(item => item.name === "Plank"));
});

test("built-in catalog pagination reaches every result in both directions", () => {
  const first = searchLocalCatalog(fallbackExercises, { limit: 20 });
  const second = searchLocalCatalog(fallbackExercises, { limit: 20, cursor: first.nextCursor });
  assert.equal(first.exercises.length, 20);
  assert.equal(second.exercises.length, 9);
  assert.equal(new Set([...first.exercises, ...second.exercises].map(item => item.id)).size, 29);
  assert.equal(second.nextCursor, undefined);
  assert.deepEqual(searchLocalCatalog(fallbackExercises, { limit: 20, cursor: second.previousCursor, direction: "before" }).exercises, first.exercises);
  assert.equal(searchLocalCatalog(fallbackExercises, { cursor: "provider-cursor" }).exercises.length, 20);
});

test("equipment choices retain provider values without duplicate aliases", () => {
 assert.deepEqual(catalogEquipmentOptions(["Dumbbell", "Dumbbells", "Body weight", "Bodyweight", " Cable ", ""]), ["Body weight", "Cable", "Dumbbell"]);
});
