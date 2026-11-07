# Supabase recipe and workout repair — 2026-11-06

## Plan before implementation

User supplied live errors 42703 (gym_workout_exercises.substitution_details missing) and 42702 (ambiguous value). Follow the existing plan → implementation → validation → report → review branch/draft PR workflow. Do not apply remote SQL, merge or deploy.

1. Reproduce the recipe failure with a nonempty gram-based recipe against disposable PostgreSQL, and locate the missing workout migration dependencies. Do not change global variable-conflict settings.
2. Add a forward nutrition migration qualifying recipe query references while preserving function signature, validation, permissions, portion math and unknown nutrients. Keep previously published migrations and the original nutrition bundle intact.
3. Provide a guarded, additive SQL Editor recovery bundle for the missing workout substitution/set logging/session adaptation schema. Generate it from the original migrations and preserve stored sessions, history, RLS and stale-write guards. Include prerequisite checks, reapplication and schema refresh; do not replay unrelated migrations or fabricate CLI history.
4. Test the originally failing recipe path, exact portion totals, null nutrients, save/retry/log/history/owner isolation, and missing-workout recovery plus normal migrations and combined nutrition deployment. Reuse the full existing database/RLS/concurrency suite.
5. Document the exact SQL order and read-only verification, run appropriate checks, self-review, commit/push and open an attached draft PR for user review. Report local versus live validation clearly.

Only gym_* application schema is in scope. No Auth/FlowDesk changes, production records, provider calls, environment secrets, new dependency or automatic remote database access.

## Confirmed causes

Reproduced `42702` on disposable PostgreSQL with `plpgsql.variable_conflict=error`: `gym_meal_nutrients(value jsonb)` aggregates ingredient nutrients and divides by `value->>'recipe_servings'`. The set-returning JSON function also exposes a column named `value`, making that denominator ambiguous. Label meals return before the query; the older database fixtures covered labels and missed recipes. This is independent of preference duration or another tab. Migration 17 uses `$1` and explicitly named ingredient columns, preserves the RPC signature/ACL and keeps the same validation, rounding, portion formula and null propagation.

`gym_workout_exercises_1` is the API query's alias, not a second table to create. `substitution_details` belongs to original migration 7. The progress query also uses `logged_sets` from migration 9 and `deferred` from migration 10. The provided recovery restores those three related features with their RPCs/triggers, not just a bare nullable column. It does not replay migrations 8, 11, 12, 13 or any nutrition migration.

## Exact SQL Editor procedure

Use the Supabase project connected to Buff Me Up. Each link is a complete SQL file; copy and run the **entire file**, including transaction boundaries. These are user-run changes; no remote database has been modified by the agent.

1. Run [migration 17 — recipe calculation repair](../supabase/migrations/20261106000000_fix_recipe_nutrient_calculation.sql). Requires the already-installed nutrition migrations 14–16. This is a forward replacement of one helper; it preserves its permissions and does not rewrite stored meals or diary snapshots. No new nutrition tables. If the prerequisite guard fails, use NUTRITION_SUPABASE_SETUP.md to apply only pending prerequisites first.
2. Run [workout schema recovery](../supabase/deploy/workout_recovery_2026_11_06.sql). Requires foundation/finalization migrations 1–6 and enabled workout RLS. It adds missing substitution, set log and session adaptation fields with their original defaults, installs the matching functions/triggers/grants and preserves existing field values. Reapplication is supported for the expected schema. A wrong existing type, nullability or missing required default stops the transaction for inspection instead of coercing/dropping data. It does not repair arbitrary customized schemas or reconstruct history that was never recorded.
3. Run [read-only verification](../supabase/verify/supabase_repair_2026_11_06.sql). Expect ten column rows with `OK`, six installed functions, both RLS flags true and `recipe_math_ok=true`. This calculates synthetic food values without reading personal records.
4. Both repairs notify PostgREST to refresh its schema. Refresh the app's saved data and retry the preserved meal draft; review it again if requested. Confirm history/progress loads and a recipe save succeeds with a test account. Existing saved nutrition snapshots are intentionally not recalculated.

No USDA/OpenAI key or Vercel environment change is required. The database repair works with the existing application; deploying the reviewed branch adds a specific database-update message if `42702` is encountered again. The reload/draft work from developer-merged PR #24 remains in place.

## If using Supabase CLI migration history

Continue the existing migration workflow: apply original missing migrations 7, 9 and 10 in order with their prerequisites, then forward migration 17 after 14–16. Do not run the SQL Editor catch-up as well as those originals. If changes were previously made manually, reconcile actual schema and migration history before pushing. The convenience bundle deliberately does not fabricate entries in Supabase migration history. The old nutrition deployment bundle remains exactly migrations 14–16; new installations using it must run 17 afterward.

## Validation and boundaries

Plan commit `4e40bf7`, branch `agent/supabase-schema-repair`, based on developer-merged PR #24 at `27c7483`. Added a committed before-repair reproduction and an after-repair recipe regression with mixed USDA/manual ingredients, exact per-serving totals, unknown versus zero nutrients, bounds, create/retry/edit/log snapshots, stale revisions, retained helper permissions and second-owner isolation. Added SQL Editor tests for missing foundation rejection, incompatible-column atomic rejection, recovery from migrations 1–6 with preexisting completed snapshots, and repeat application after actual sets/swaps/adaptations exist. Stored workout/exercise rows are compared in full before/after reapplication.

The ordinary migration path and the SQL Editor recovery plus original nutrition-bundle path pass the full disposable PostgreSQL suite including concurrency. CI now runs both paths. The runner applies the original nutrition bundle at migration 16 before forward repairs, avoiding dependency-order errors as new migrations are added. Generated recovery SQL has an aggregate drift check alongside the unchanged nutrition bundle. Full `npm run check` passes: lint, both SQL drift checks, production build, sequential typecheck, all 72 pure tests (29 nutrition) and the complete disposable migration/RLS/concurrency suite. Final wording/verification/reapplication changes passed fresh lint, all 29 nutrition tests and the full combined recovery/bundle database suite. The read-only verification file executes successfully, and repeat recipe repair retains helper permissions. Customer errors describe a server update with a safe reference code; they do not instruct ordinary users to run migrations. Final review references follow in the session log.

No remote SQL, Auth/FlowDesk changes, new dependency/provider call, production record, deployment or agent merge. The user-provided log identifies the live symptoms; reproduction/verification here uses local synthetic records. Live PostgREST/project acceptance remains user-run after applying the scripts. Previous reports saying no new SQL referred to those UI changes; these newly supplied database errors require the repair above.
