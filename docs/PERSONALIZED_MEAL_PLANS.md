# Reviewed personalized meal weeks

Phase 3, 2026-11-04, `agent/personalized-meal-plans`. Depends on nutrition preferences and usual-meal phases. Migration 16 adds immutable `gym_meal_plans`, versioned AI consent, retry-safe meal creation and restricted validation helpers. Final rollout/SQL: NUTRITION_SUPABASE_SETUP.md.

## Planning behavior

The regular planner produces seven days with breakfast, lunch and dinner, plus an optional saved snack each day. A meal must be active, explicitly ingredient/allergen/diet-reviewed, compatible with declared eating pattern/exclusions, and within the user's selected per-meal cooking time/budget. A missing slot yields an actionable request to save/review a suitable meal. Known allergens are excluded from tags; free food exclusions are matched against meal/ingredient text. Users must verify labels/cross-contact and the accuracy of their review; no allergen-safety certification is claimed.

Selection favors foods mentioned in private usual-food notes, recent saved-meal log frequencies, varied choices and food-group coverage. Recent logs are bounded by the diary's declared retrieval scope. The user edits eligible choices and 0.5–3 servings in half-serving steps. Changes clear the review checkbox. Saving requires explicit review; PostgreSQL rechecks all current preferences, meal versions, slots, exclusions and quantities under owner locks, then copies canonical meal/nutrient snapshots. Saved plans remain unchanged when recipes/preferences change. Plan saving and new meal creation have owner-scoped request IDs for retries; a changed request is rejected. Planned food is not automatically logged as eaten.

Shopping quantities aggregate saved recipe gram quantities scaled by recipe servings/plan portions. Label-only meals show serving counts and ask users to check their own ingredient lists; ingredients are not invented. Saved plans can be removed without changing food logs; the save RPC caps saved plans at 100.

## Sources and scope

`dga-2025-2030-app-v1` cites https://cdn.realfood.gov/DGA.pdf pages 2–4 for general protein variety, vegetables/fruit and whole-grain guidance. The app's food-group coverage score and 20% comparison with a user-entered calorie target are app heuristics, not USDA numeric prescriptions. Food groups come from reviewed user tags; this is not a full nutrient-adequacy assessment, medical diet, regulatory compliance claim or USDA endorsement. No automatic calorie deficit, exercise-calorie subtraction, photo nutrient estimate or personalized energy requirement is generated. Optional measurements remain private account fields, outside AI context.

## Optional AI connection

When the server key/model are configured and current `nutrition-choices-v1` consent is enabled, an explicit request can use OpenAI Responses structured JSON output. The server rechecks consent immediately before requesting, uses opaque per-request meal aliases, passes only approved meal names/types/tags/frequency counts and broad eating/cooking/budget preferences, disables response storage (`store:false`), sets a 15-second timeout/3,000-output-token bound and uses the database's ten-attempts-per-account/UTC-day limit. No arbitrary tools, database access, calorie generation or free-form medical advice is allowed. Output is known aliases/day/slot/portions only; the server rejects unknown IDs, wrong slots, invalid portions, omissions, duplicates, refusals and incomplete output. It recalculates all totals locally. Invalid/unavailable/quota-limited AI returns a visibly labeled regular plan. Users review before saving. `store:false` does not establish zero provider retention; see OpenAI's account/data controls.

The prior consent flag alone is insufficient after the scope version is introduced. The current form initially leaves mismatched consent unchecked, and saving a reviewed setting records the current scope. Revocation clears it. No live AI key, user-data transmission or model charge occurred during development. Official contract: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses . Provider activation remains a deployment step.

## Verification

Pure/contract tests cover deterministic required slots, missing/filtered choices, stale/duplicate plan entries, nullable totals/grocery scaling, minimized AI context, request bounds/store flag, valid responses and invalid/refused/incomplete/consent failures. Disposable PostgreSQL checks validate immutable reviewed snapshots, stale profile/meal rejection, exclusions, request retries, helper permissions and two-user/anonymous RLS. Concurrent writes cover preference/meal conflicts, duplicate creation/logging and meal edits after reviewed snapshot saves.

Synthetic actual-component UI checks cover seven-day/snack generation, visible simulated-AI fallback, invalid portion blocking, swaps clearing review, failed-save retention, explicit save/reload, shopping quantities and no automatic food logging. Setup, recipe editor, diary and review each fit 320/390/768/1024/1440px without page overflow. Test fixtures and server are removed/stopped before final checks. Real provider, signed-in PostgREST and physical-phone acceptance remain pending. Final aggregate results: NUTRITION_RELEASE_REPORT_2026-11-04.md.


## November 6 follow-up

Generate now creates a draft immediately for eligible reviewed meal choices. Missing preferences or slots open `/app/nutrition/plan/setup`; saved preferences and the last eligible meal lead to a regular draft automatically, retaining date/snack selections. Explicit plan review/save remains required. See NUTRITION_FLOW_UPGRADE.md.
