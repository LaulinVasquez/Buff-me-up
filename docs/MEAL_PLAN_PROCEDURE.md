# Meal-plan procedure — 2026-11-06

Laurin requested a new plan/procedure and implementation after the guided-planning update. Working interpretation: improve the food-plan creation process with shorter questions, guided meal building and a manageable weekly review. Base `0caf7be`, pending PR #22; this follow-up remains separately reviewable and does not merge or deploy either branch.

## User procedure

1. Choose the plan start date and optional snack, then Generate. Existing completed preferences and eligible reviewed meals still create a draft directly.
2. If preferences are needed, answer three short screens: eating pattern and exclusions; familiar foods, schedule and budget; optional measurements/target and explicit AI consent. Back retains answers in memory. Only the final Save writes preferences. Invalid values return to the relevant screen; skipped measurements stay unknown.
3. For each missing meal type, build a familiar meal in three steps: name/type/ingredients and amounts; food groups/eating patterns/allergens/time/cost/preparation; final ingredient/nutrient/eligibility review. Users must explicitly confirm review. Incompatible meals can still be saved for logging but do not unlock planning. Editing details clears the review confirmation. Back retains edits and transient input; no new sensitive browser-storage draft.
4. Once choices are ready, create a regular seven-day draft automatically. On phone, select a day to review meals/servings; allow an all-days view for larger screens and comparison. Show weekly known calorie totals, unique choices and a shopping preview derived from current quantities. Missing nutrition stays unknown; no automatic target prescription or certification.
5. Explicitly review and save the plan. Changing meal choices/portions clears confirmation. Failed saves retain the current draft and stable retry token; planned meals remain separate from consumed logs.

## Implementation sequence and acceptance

| Phase | Work | Acceptance |
| --- | --- | --- |
| 0 | Inspect current branch/workflow; commit this plan first | Clean base, PR #22 dependency recorded, no unrelated scope or remote writes |
| 1 | Guided preferences, using the existing form/action | Next/Back/Enter and optional units work; hidden screens do not lose fields; invalid input focuses its screen; only final submit saves; full Profile form remains available |
| 2 | Guided meal editor for setup | Build/details/review navigation retains ingredients, label/manual fallback and edits; review explains blockers; no implicit allergen/diet approval; unreviewed logging remains supported |
| 3 | Responsive day review and shopping preview | Correct day/slot swaps, portions and unknown summaries; shopping matches current draft; all-days option, explicit save and retry behavior preserved |
| 4 | Verification/report/review branch | Meaningful pure tests, synthetic actual-component phone/desktop journeys, production build/types/lint, full disposable DB checks; update status/issues/session log, commit/push draft PR |

## Data and provider boundaries

No new Supabase table, column, RPC or SQL is planned. Existing owner-scoped nutrition migrations 14–16 remain required. Existing deterministic generator and authoritative server save checks remain in control. No new provider/dependency/paid signup, API secret, calorie algorithm or AI sharing scope. Open Food Facts activation and real provider/account/device acceptance from PR #22 remain separate staging tasks.

This work uses synthetic fixtures and disposable local PostgreSQL only. Never use a live account or change real user food preferences/logs for tests. Preserve existing canonical cm/kg, source nutrition, meal revisions, immutable snapshots, exclusions, explicit consent and idempotent saves. No agent merge, deployment or remote SQL.

## Validation procedure

Check preference navigation/back/Enter/invalid ranges, save failure and imperial values; meal search/import/manual/label paths, retained inputs, incompatible and unreviewed saves, review reset and transport retry; missing setup to last eligible save to automatic draft; day navigation, all-days view, swaps/portions and shopping quantities; unknown nutrition and stale draft blocking; 320/390/768/1024/1440px layouts and keyboard focus. Keep preview code/state outside commits. Record actual results and pending live acceptance separately.

## Progress

- [x] Phase 0: bounded procedure recorded before implementation.
- [ ] Phase 1: guided preferences.
- [ ] Phase 2: guided meal entry.
- [ ] Phase 3: day/week review and shopping preview.
- [ ] Phase 4: verification and review handoff.
