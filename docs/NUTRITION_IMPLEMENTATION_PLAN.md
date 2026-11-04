# Meals & nutrition implementation plan

Approved direction: Laurin, 2026-11-04. Starting point: `d7eee65` (search PR #15 merged by the developer). Follow inspect → bounded implementation → validation → review → commit/push → draft PR → report. The previously read local development guide is no longer in the checkout; its established workflow remains in effect. No merge, production deployment, live user-data access or remote database mutation is authorized by this implementation task.

## Intended experience

After sign-in, offer a short nutrition setup that can be skipped without blocking workouts. Store optional measurements, activity, goal, diet, food exclusions, usual eating habits, time and budget. The same form remains editable from Profile. A Meals area provides usual meals/recipes, portion-based daily logs, weekly totals, and a reviewed seven-day plan built from familiar meals. USDA provides food composition; the application calculates nutrition and applies documented planning checks; optional AI can arrange approved choices. Users choose whether to send the minimum meal/preferences context to the AI provider.

## Branch sequence and acceptance

| Phase | Branch | Deliverable / acceptance |
| --- | --- | --- |
| 0 | agent/nutrition-plan | This committed plan, source boundaries and rollout sequence before feature edits. |
| 1 | agent/nutrition-profile | Owner-scoped nutrition preferences, optional first-visit setup/skip, Profile editing, consistent validation and stale-save detection. Migration 14; two-user/anonymous tests. |
| 2 | agent/meals-and-logging | Authenticated server USDA food search/details, manual-label fallback, ingredient quantities, reusable meal CRUD/archive, portion logs, historical snapshots, local-day/weekly summaries and nutrition export. Migration 15; no invented nutrients or historical edits. |
| 3 | agent/personalized-meal-plans | Seven-day saved-meal planner, review/edit/swap/save, grocery quantities, versioned USDA guidance checks, optional opt-in AI selection and rate limits. Migration 16; reject unknown meal IDs/stale reviews/restricted or unreviewed choices and provider failures. |
| 4 | same final branch | Aggregate quality checks, synthetic actual-component phone/desktop validation, review report, exact ordered Supabase SQL and configuration guide. |

Branches may be stacked for review; each PR names its base/dependency. Changes to main by the developer must be fetched and preserved. Never force-push or merge a PR on the developer's behalf.

## Data and calculation design

- New tables use `gym_` names only: `gym_nutrition_preferences`, `gym_meals`, `gym_food_logs`, `gym_meal_plans` and (if needed) bounded request bookkeeping for external API rate limits. No changes to shared FlowDesk objects or Auth schemas. `gym_profiles` remains the identity source.
- Preferences have owner RLS, versioned writes and explicit setup state. Sensitive measurements are optional, stay in the app, and are excluded from AI context. No automatic energy-deficit, medical-diet or exercise-calorie prescriptions in this version; user-entered targets are labeled as such.
- Meals store a bounded ingredient array with explicit quantity/basis in grams, label or USDA provenance, nullable nutrient fields and reviewed dietary/allergen tags. Support direct per-serving label entry as well as ingredient composition. Missing values remain unknown. Save source/USDA ID and retrieval time; calculate quantities and totals in application code.
- Food logs copy the reviewed meal/portion/nutrients/name at logging time with a user-local calendar date, unique request token and owner-scoped idempotent insert. Updating/archiving a usual meal never rewrites old logs. Incomplete logging is not treated as a complete diet assessment.
- Plans store immutable reviewed meal snapshots/portion counts and source-policy version. Profile/meal versions are checked before saving so stale reviews are rejected. Persist only an explicitly reviewed plan; never mark planned meals as eaten automatically.
- All personal nutrition tables are included in authenticated no-store data export. No provider keys, prompts or unrelated tables are exported.

## USDA and AI boundaries

FoodData Central API: https://fdc.nal.usda.gov/api-guide/ . Server-only `USDA_FDC_API_KEY`; cache public food lookups, authenticate/rate-limit routes, clamp page sizes, handle 429/timeouts/no results. No key in browser requests, logs or Git. No live-key/account creation is required to build or test adapters: use recorded synthetic contract fixtures. Real provider acceptance remains pending until configured.

Dietary Guidelines for Americans 2025–2030: https://cdn.realfood.gov/DGA.pdf . Implement narrow, explainable general-food-pattern checks from pages 2–4: varied protein sources, fruits/vegetables and whole grains. These are qualitative coverage prompts based on user-reviewed food-group tags, not a claim of complete nutrient adequacy or USDA endorsement. Keep version, source page and the distinction between an app heuristic and a direct guideline. No automated allergen safety guarantee: known exclusions disqualify a meal; uncertain ingredient/allergen review requires the user to review it before planner eligibility.

Optional AI: server-only `OPENAI_API_KEY` plus explicit `OPENAI_NUTRITION_MODEL`; no automatic model selection/cost commitment. Use Responses structured JSON output, `store:false`, bounded output/timeouts, no external tools/database access. Official contract: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses . AI receives only approved meal IDs/names, meal slots, food-group tags, broad preferences and habit summaries with explicit consent. It chooses known approved meal IDs and portions within limits. It cannot invent nutrient values, modify restrictions, issue medical guidance, change targets, save/log meals or access another account. Validate returned IDs/slots/portions and recalculate all totals locally. Invalid/refused/timed-out output falls back visibly to the deterministic planner, without silently claiming AI success. No live AI/user-data transmission occurs during development tests.

## Verification and release

- Pure tests: units/portion scaling, nullable nutrients, manual/USDA adapter shapes, missing data, selection/exclusions, schema validation and AI refusal/invalid IDs.
- Disposable local PostgreSQL only: all migrations from scratch; owner/anonymous RLS, constraints, stale/concurrent saves, idempotent logs, historical snapshots and plan review preservation. Never use `.env.local` as authorization to test real data.
- `npm run check`: lint → build → typecheck → tests → local database suite. Build/typecheck run sequentially.
- Synthetic actual-component preview for setup, meal editing/logging and planner review/error states at 320/390/768/1024/1440px. Fixture stays out of commits; label images synthetic. Real sign-in/device/provider acceptance remains separately documented.
- Deliver migrations 14–16 in timestamp order, plus a convenience combined SQL artifact that contains exactly those migrations inside a transaction. Run only once after existing migrations 1–13. Do not execute remote SQL. Explain keys, migration history and post-deployment staging checks.

## Progress

- [x] Phase 0: sources/current repository inspected; structured plan written before feature work.
- [ ] Phase 1: nutrition profile and onboarding.
- [ ] Phase 2: usual meals, USDA lookup and food logs.
- [ ] Phase 3: reviewed personalized plans and optional AI.
- [ ] Phase 4: full verification, review and SQL handoff.
