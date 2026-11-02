import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Always create a disposable cluster. Never read application database credentials.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const directory = mkdtempSync(join(tmpdir(), "bmu-db-"));
let started = false;
let bin;

try {
  bin = execFileSync("pg_config", ["--bindir"], { encoding: "utf8" }).trim();
  const databaseEnv = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("PG"))),
    PGHOST: directory,
    PGPORT: "55432",
    PGDATABASE: "postgres",
    PGUSER: userInfo().username,
    PGPASSWORD: "",
  };
  const sql = (source) => execFileSync(join(bin, "psql"), ["-X", "-v", "ON_ERROR_STOP=1", "-q"], {
    env: databaseEnv, input: source, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  });
  execFileSync(join(bin, "initdb"), ["-D", join(directory, "data"), "-A", "trust", "--no-locale", "-E", "UTF8"], { stdio: "pipe" });
  execFileSync(join(bin, "pg_ctl"), ["-D", join(directory, "data"), "-l", join(directory, "postgres.log"), "-o", `-F -k ${directory} -p 55432 -h ''`, "-w", "start"], { stdio: "pipe" });
  started = true;

  const runFile = (file) => execFileSync(join(bin, "psql"), ["-X", "-v", "ON_ERROR_STOP=1", "-q", "-f", join(root, file)], {
    env: databaseEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  runFile("tests/database/bootstrap.sql");
  for (const file of readdirSync(join(root, "supabase/migrations")).filter((file) => file.endsWith(".sql")).sort()) {
    runFile(`supabase/migrations/${file}`);
  }
  runFile("tests/database/workouts.sql");
  console.log("PASS: migrations, start/resume, finalization, snapshots, and two-user RLS");

  runFile("tests/database/substitutions.sql");
  console.log("PASS: session substitutions, preserved originals/plans, stale writes, validation and RLS");

  runFile("tests/database/adaptations.sql");
  console.log("PASS: reviewed session scope, retained work/plans, restore, stale review, finalization and RLS");

  runFile("tests/database/sets.sql");
  console.log("PASS: actual set persistence, validation, conflicts, substitution archives, finalization and RLS");

  runFile("tests/database/appearance.sql");
  console.log("PASS: profile accent persistence/defaults, validation, callback preservation and owner isolation");

  // Hold finalization open while a stale tab tries to save a weight.
  const firstUser = "00000000-0000-0000-0000-000000000001";
  const asUser = `set role authenticated; set request.jwt.claim.sub = '${firstUser}';`;
  const day = "20000000-0000-0000-0000-000000000001";
  const workoutId = sql(`${asUser} select public.gym_start_workout('${day}');`).trim().split("\n").find((line) => /^\s*[0-9a-f]{8}-/.test(line))?.trim();
  if (!workoutId) throw new Error("Could not create concurrency fixture");

  const runAsync = (source) => new Promise((resolve) => {
    const child = spawn(join(bin, "psql"), ["-X", "-v", "ON_ERROR_STOP=1", "-q"], { env: databaseEnv });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", (error) => resolve({ code: -1, output: error.message }));
    child.on("close", (code) => resolve({ code, output }));
    child.stdin.end(source);
  });
  const finalize = runAsync(`${asUser} begin; select public.gym_set_workout_status('${workoutId}', 'completed'); select pg_sleep(1); commit;`);
  // Wait for the finalizer's transaction to hold a row lock, rather than racing a fixed delay.
  let finalizerReady = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (sql("select exists (select 1 from pg_stat_activity where wait_event = 'PgSleep');").includes(" t\n")) {
      finalizerReady = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  if (!finalizerReady) {
    await finalize;
    throw new Error("Finalizer did not reach the concurrency barrier");
  }
  const staleSave = runAsync(`${asUser} update public.gym_workout_exercises set weight = 999 where workout_id = '${workoutId}';`);
  const [finished, stale] = await Promise.all([finalize, staleSave]);
  if (finished.code !== 0 || stale.code === 0 || !stale.output.includes("Workout is no longer in progress")) {
    throw new Error(`Concurrent finalization failed: ${JSON.stringify({ finished, stale })}`);
  }
  const retries = await Promise.all(Array.from({ length: 4 }, () => runAsync(`${asUser} select public.gym_set_workout_status('${workoutId}', 'completed');`)));
  if (retries.some((result) => result.code !== 0)) throw new Error("Concurrent completion retries failed");
  sql(`${asUser} select test.assert((select weight = 25 from public.gym_workout_exercises where workout_id = '${workoutId}'), 'Stale save changed a completed snapshot');`);
  console.log("PASS: concurrent completion retries and stale weight save");

  const starts = await Promise.all(Array.from({ length: 4 }, () => runAsync(`${asUser} select public.gym_start_workout('${day}');`)));
  const ids = starts.map((result) => result.output.match(/[0-9a-f]{8}-[0-9a-f-]{27}/)?.[0]);
  if (starts.some((result) => result.code !== 0) || !ids[0] || new Set(ids).size !== 1) {
    throw new Error(`Concurrent starts did not resume the same workout: ${JSON.stringify(starts)}`);
  }
  sql(`${asUser} select test.assert((select count(*) = 1 from public.gym_workouts where status = 'in_progress'), 'Concurrent starts duplicated workouts');
    select test.assert((select count(*) = 1 from public.gym_workout_exercises where workout_id = '${ids[0]}'), 'Concurrent starts duplicated snapshots');`);
  console.log("PASS: concurrent starts resume one session with one snapshot");

  // All new progress/swap operations lock the same parent before touching a snapshot.
  const snapshotState = () => {
    const output = sql(`${asUser} select json_build_object('id', id, 'updatedAt', updated_at, 'version', substitution_version) from public.gym_workout_exercises where workout_id = '${ids[0]}';`);
    return JSON.parse(output.split("\n").find(line => line.trim().startsWith("{")));
  };
  const waitForBarrier = async () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (sql("select exists (select 1 from pg_stat_activity where wait_event = 'PgSleep');").includes(" t\n")) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error("Substitution transaction did not reach its concurrency barrier");
  };
  const hammer = JSON.stringify({ id: "fallback-hammer", name: "Hammer Curl", primaryMuscle: "Biceps", equipment: "Dumbbells", instructions: [] });
  const preacher = JSON.stringify({ id: "fallback-preacher", name: "Preacher Curl", primaryMuscle: "Biceps", equipment: "Machine", instructions: [] });
  const callSwap = (state, replacement) => `select public.gym_swap_workout_exercise('${ids[0]}','${state.id}',${state.version},'${state.updatedAt}','Biceps','${replacement}');`;
  const original = snapshotState();
  const swap = runAsync(`${asUser} begin; ${callSwap(original, hammer)} select pg_sleep(1); commit;`);
  await waitForBarrier();
  const oldWeight = runAsync(`${asUser} select public.gym_update_workout_progress('${ids[0]}','${original.id}',0,'{"weight":999}');`);
  const competingSwap = runAsync(`${asUser} ${callSwap(original, preacher)}`);
  const [swapped, rejectedWeight, rejectedSwap] = await Promise.all([swap, oldWeight, competingSwap]);
  if (swapped.code !== 0 || rejectedWeight.code === 0 || rejectedSwap.code === 0
    || !rejectedWeight.output.includes("Exercise changed") || !rejectedSwap.output.includes("Exercise changed")) {
    throw new Error(`Concurrent swap protection failed: ${JSON.stringify({ swapped, rejectedWeight, rejectedSwap })}`);
  }
  sql(`${asUser} select test.assert((select substitution_version = 1 and weight is null and jsonb_array_length(substitution_history) = 1 from public.gym_workout_exercises where id = '${original.id}'), 'Concurrent swap changed progress twice');`);

  const beforeSave = snapshotState();
  const save = runAsync(`${asUser} begin; select public.gym_update_workout_progress('${ids[0]}','${original.id}',1,'{"weight":42}'); select pg_sleep(1); commit;`);
  await waitForBarrier();
  const staleReview = runAsync(`${asUser} ${callSwap(beforeSave, preacher)}`);
  const [saved, staleReviewResult] = await Promise.all([save, staleReview]);
  if (saved.code !== 0 || staleReviewResult.code === 0 || !staleReviewResult.output.includes("Exercise changed")) {
    throw new Error(`Concurrent progress save was lost: ${JSON.stringify({ saved, staleReviewResult })}`);
  }
  const beforeFinish = snapshotState();
  const finalizing = runAsync(`${asUser} begin; select public.gym_set_workout_status('${ids[0]}','completed'); select pg_sleep(1); commit;`);
  await waitForBarrier();
  const lateSwap = runAsync(`${asUser} ${callSwap(beforeFinish, preacher)}`);
  const [finalized, lateSwapResult] = await Promise.all([finalizing, lateSwap]);
  if (finalized.code !== 0 || lateSwapResult.code === 0 || !lateSwapResult.output.includes("Workout is no longer in progress")) {
    throw new Error(`Finalization allowed a late swap: ${JSON.stringify({ finalized, lateSwapResult })}`);
  }
  sql(`${asUser} select test.assert((select name = 'Hammer Curl' and weight = 42 and substitution_version = 1 from public.gym_workout_exercises where id = '${original.id}'), 'Saved replacement progress was not preserved');`);
  console.log("PASS: swap vs stale progress/second swap, progress vs stale review, and finalization vs swap");

  const setWorkout = sql(`${asUser} select public.gym_start_workout('${day}');`).match(/[0-9a-f]{8}-[0-9a-f-]{27}/)?.[0];
  const setExercise = sql(`${asUser} select id from public.gym_workout_exercises where workout_id='${setWorkout}';`).match(/[0-9a-f]{8}-[0-9a-f-]{27}/)?.[0];
  const firstSets = JSON.stringify([{set:1,reps:10,weight:25,completed:true},{set:2,reps:null,weight:null,completed:false}]);
  const competingSets = JSON.stringify([{set:1,reps:8,weight:50,completed:true}]);
  const oldScopeReview = JSON.parse(sql(`${asUser} select jsonb_agg(jsonb_build_object('id',id,'updatedAt',updated_at)) from public.gym_workout_exercises where workout_id='${setWorkout}';`).split("\n").find(line=>line.trim().startsWith("[")));
  const setSave = runAsync(`${asUser} begin; select public.gym_save_workout_sets('${setWorkout}','${setExercise}',0,0,'${firstSets}'); select pg_sleep(1); commit;`);
  await waitForBarrier();
  const competingSetSave = runAsync(`${asUser} select public.gym_save_workout_sets('${setWorkout}','${setExercise}',0,0,'${competingSets}');`);
  const staleScope = runAsync(`${asUser} select public.gym_adapt_workout('${setWorkout}','full',null,0,'${JSON.stringify(oldScopeReview)}',array[]::uuid[]);`);
  const setResults = await Promise.all([setSave, competingSetSave, staleScope]);
  if (setResults[2].code === 0 || !setResults[2].output.includes("Exercise changed")) throw new Error("Stale scope review discarded new sets");
  if (setResults[0].code !== 0 || setResults[1].code === 0 || !setResults[1].output.includes("Set log changed")) throw new Error("Concurrent sets overwrote one another");
  const setFinish = runAsync(`${asUser} begin; select public.gym_set_workout_status('${setWorkout}','completed'); select pg_sleep(1); commit;`);
  await waitForBarrier();
  const lateSets = runAsync(`${asUser} select public.gym_save_workout_sets('${setWorkout}','${setExercise}',0,1,'${competingSets}');`);
  const setFinishResults = await Promise.all([setFinish, lateSets]);
  if (setFinishResults[0].code !== 0 || setFinishResults[1].code === 0 || !setFinishResults[1].output.includes("Workout is no longer in progress")) throw new Error("Late sets changed a finished session");
  sql(`${asUser} select test.assert((select logged_sets='${firstSets}'::jsonb and log_revision=1 from public.gym_workout_exercises where id='${setExercise}'), 'Concurrent sets/finalization must preserve saved records');`);
  console.log("PASS: concurrent set saves/scope reviews reject stale state; finalization preserves set records");

} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (started) execFileSync(join(bin, "pg_ctl"), ["-D", join(directory, "data"), "-m", "immediate", "-w", "stop"], { stdio: "pipe" });
  rmSync(directory, { recursive: true, force: true });
}
