# Nutrition release report — 2026-11-04

## Delivered

The implementation plan was committed first (`27dcf2b`, PR #16), followed by focused branches for nutrition preferences (`72986c9`, PR #17), usual meals/diary (`ff551ae`, PR #18) and personalized plans (`agent/personalized-meal-plans`). The final integration targets main so feature work merged into intermediate branches is included. Review references are recorded below/at the end of AGENT_SESSION_LOG.md. No PR was merged, no production deployment occurred, no remote migration was applied and no real user data/provider key was used by the agent.

| Area | User-visible result |
| --- | --- |
| Setup / Profile | Optional setup after sign-in, skip support, editable diet/exclusions/usual foods, cooking/budget, optional measurements, optional user-entered target and explicit versioned AI consent. |
| Usual meals | Create/edit/archive/restore label-based meals or gram-based recipes; nullable calories/macros/fiber/sodium; source and USDA ID metadata; explicit ingredient/allergen/diet review. |
| USDA lookup | Authenticated food search/details, server-only key, public-data caching, timeout/quota/error handling, correct raw/cooked/brand selection and manual fallback. |
| Food diary | Local-day portion logging, daily/weekly known totals and missing-data labels, copied historical recipes/nutrients, retry-safe saves and correction/removal. |
| Meal weeks | Seven days of reviewed breakfast/lunch/dinner plus optional snacks, familiarity/variety/food-group scoring, eligible swaps, portion edits, renewed review before save, immutable saved plans and shopping quantities. |
| Optional AI | OpenAI structured known-meal choices, minimized consented context, bounded requests, no database tools, local validation/calculation, visibly labeled regular fallback. Configuration/live acceptance pending. |
| Reliability / privacy | Owner RLS, stale-revision checks, duplicate creation/log/plan protection, transport-error draft retention, private no-store routes and expanded owner-only export. |

## Verification

- `npm run check` — PASS: lint, generated SQL drift check, production build, sequential typecheck, **54 pure/contract tests** and the complete disposable PostgreSQL suite.
- `BMU_NUTRITION_BUNDLE=1 npm run test:db` — PASS: the combined SQL handoff is applied after the original migrations in a fresh cluster, then the same persistence/RLS/validation/concurrency tests run.
- New SQL cases: bounds and skipped/completed preference persistence; stale/two-user/anonymous access; recipe/log validation and copied nutrition; request retries; restricted/stale plan choices; immutable plan snapshots; versioned AI consent and helper grants; counter caps/isolation.
- New concurrency cases: conflicting preference/meal updates reject stale writes; duplicate meal creation/log retries produce one record; later recipe edits preserve a reviewed plan snapshot. Existing workout concurrency checks still pass.
- Production-server HTTP smoke with synthetic loopback configuration — PASS: two food API routes return private/no-store/nosniff 401 JSON while signed out; nutrition/setup/plan routes return 307 redirects. No provider or real database was contacted.
- Actual components in an isolated synthetic Next preview — PASS: preferences skip/save/reload/opt-out and failures; manual meals; recipe import/error fallback and 200-g/two-serving math; diary 1.5 portions/reload; meal edit retaining old diary calories; archive/restore; seven-day/snack generation; simulated AI fallback; invalid portion blocking; swapping resets review; save failure/retry/reload and shopping lists; plan saving does not log food; rejected transport keeps the meal editor/inputs alive.
- **20 screen/width combinations** (preferences with expanded measurements, recipe editor, diary, planner review × 320/390/768/1024/1440px) — no page overflow. JSON evidence and labeled synthetic screenshots are local artifacts. A fresh hydrated planner console check was clear.

Temporary fixture setup initially hit a case-sensitive Turbopack path and an initialization-time revalidation error; both were corrected in fixture code. A native details toggle made before hydration produced a warning; the fresh hydrated saved-plan interaction was clear. Deliberate fixture failures/rejected requests produced expected error logs. The synthetic fixture/server and browser tabs were removed/stopped before final checks; no preview route/auth bypass is committed. Screenshots do not establish real-account CSE acceptance.

## Supabase handoff

Run only pending migrations 14–16 after existing 1–13, in order. If all three are pending and SQL Editor is your established workflow, [the complete SQL bundle](../supabase/deploy/nutrition_2026_11_04.sql) applies them atomically and refreshes schema. If partially applied, use individual pending files. CLI-managed projects should use their migration workflow and reconcile prior manual schema changes.

New tables: `gym_nutrition_preferences`, `gym_meals`, `gym_food_logs`, `gym_nutrition_requests`, `gym_meal_plans`. Migration 16 adds consent scope to the new preferences table and a request ID to the new meals table. Existing `gym_profiles`, workouts, FlowDesk and Auth tables are unchanged.

Exact files, read-only verification queries and configuration: [NUTRITION_SUPABASE_SETUP.md](NUTRITION_SUPABASE_SETUP.md).

## Activation and practical limits

- USDA lookup needs server-only `USDA_FDC_API_KEY`. Optional AI additionally needs `OPENAI_API_KEY` and an explicit `OPENAI_NUTRITION_MODEL`. Users separately consent/request AI. Until configured, manual meals/diary and the regular planner work with the database migrations.
- Live USDA/OpenAI, Google sign-in/PostgREST integration, two-account deployed acceptance, physical iPhone/PWA/native and real download behavior remain unverified. No live AI charge or personal-data transmission occurred. The API shape and failure paths were tested with synthetic fixtures/mocked fetch.
- Plans use reviewed saved meals. Qualitative guidance cites USDA/HHS 2025–2030 pages 2–4; scoring/coverage and comparison to a user-entered calorie target are explicitly app heuristics. No complete nutrient adequacy, allergen certification, USDA endorsement, clinical diet or automatic energy-deficit target is claimed.
- Optional measurements are cm/kg. Ingredients use grams; label nutrition is per serving. Household measures are not guessed. Missing nutrient values stay unknown. Label-only shopping lists show meal-serving counts rather than invented ingredients.
- The diary loads recent 90 days/up to 1,000 entries and visibly labels partial totals at the cap. Meal retrieval loads up to 200 active/recent archived meals; active meals cap at 100. Saved-plan RPC caps at 100. Export reads all pages of the explicit personal-content table allowlist; operational counters, provider keys and prompts are excluded.
- Unsaved form drafts are in page memory; navigation/reload is not durable offline synchronization. Network failures retain the visible editor for retry. Concurrent invalid changes reject rather than overwrite reviewed data.

## Next acceptance tasks

1. Review the final integration and run the ordered SQL/configuration in designated staging.
2. Verify configured USDA food matches, AI consent/fallback and signed-in persistence/export across two test accounts.
3. Check physical-phone/PWA/native navigation and network failures before an approved release.

Learning note: a saved meal is a reusable template; a food log/meal plan stores a reviewed snapshot. This preserves past nutrition when a recipe changes. Stable request IDs let the server recognize a retried write instead of creating a second meal/log/plan.
