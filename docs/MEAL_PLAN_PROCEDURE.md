# Meal-plan procedure — 2026-11-06

Laurin requested a new plan/procedure and implementation after the guided-planning update. Working interpretation: improve the food-plan creation process with shorter questions, guided meal building and a manageable weekly review. Started at `0caf7be` while PR #22 was pending. The developer merged #22 to main (`0d712b8`) during implementation; the final follow-up targets main and preserves that history. The agent does not merge PRs or deploy.

## User procedure

1. Choose the plan start date and optional snack, then Generate. Existing completed preferences and eligible reviewed meals still create a draft directly.
2. If preferences are needed, answer three short screens: eating pattern and exclusions; familiar foods, schedule and budget; optional measurements/target and explicit AI consent. Back retains answers in memory. Only the final Save writes preferences. Invalid values return to the relevant screen; skipped measurements stay unknown.
3. For each missing meal type, build a familiar meal in three steps: name/type/ingredients and amounts; food groups/eating patterns/allergens/time/cost/preparation; final ingredient/nutrient/eligibility review. Users must explicitly confirm review. Incompatible meals can still be saved for logging but do not unlock planning. Editing details clears the review confirmation. Back retains edits. The subsequent user-requested reload-recovery update adds owner-scoped per-tab session drafts; see NUTRITION_DRAFT_RECOVERY.md.
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
- [x] Phase 1: guided preferences.
- [x] Phase 2: guided meal entry.
- [x] Phase 3: day/week review and shopping preview.
- [x] Phase 4: verification and review handoff.

## Implementation and verification report

Plan-first commit: `570691f`. Guided forms keep all panels mounted so Back retains values and the final submission contains all answers. Enter advances a screen; native validation reveals/focuses invalid fields, including fields inside optional details. Intermediate steps never invoke a save. Profile/onboarding keep their full-form layout; meal setup opts into the guided screens. An in-progress meal hides the otherwise prominent Create my plan action.

The meal review displays ingredients, per-serving known/unknown nutrition, declared allergens, reviewed eating patterns, time/cost and current preference blockers. It does not set review flags automatically. The day review supports one day or all seven, retains swaps/portions across navigation, shows weekly known totals/unknown counts, and derives shopping quantities from the current draft. Missing saved choices are counted as unknown and block the existing save validation. Existing provider, consent, canonical measurement and authoritative server-save behavior is unchanged.

`npm run check` PASS: lint, generated SQL drift, production build, sequential types, 66 pure/contract tests (23 nutrition), and the complete disposable PostgreSQL migration/RLS/concurrency suite. New regressions cover unknown/unavailable meals, scaled portions, swaps, weekly totals and shopping quantities. No database migration or new dependency/environment variable.

Actual-component synthetic browser checks PASS: Enter/Back/value retention; invalid cooking time and ingredient grams; no preference write before final Save; failed preference/meal/plan saves retaining input; imperial values and exclusions retained in final preferences; searched recipe, manual ingredient and whole-meal label paths; explicit allergen blocker, unreviewed save staying in setup, edits clearing confirmation and final reviewed save causing automatic generation; day-specific changes retained through navigation; 1→1.5 recipe portions updating shopping 700→750 g; invalid 2.3 portions blocking save; explicit reviewed plan save/reload preserving 1.5 portions and leaving zero food logs. Unknown label nutrition appears as a subtotal. Full preferences remain visible outside guided setup. Normal console clear.

Forty view/width combinations fit without horizontal overflow: three preference screens, three meal screens and day/week reviews × 320/390/768/1024/1440px. Phone and desktop screenshots retained as synthetic evidence outside the repository. One initial off-screen pointer action landed on bottom navigation; returned to the draft, verified keyboard navigation and a visible pointer day change, and excluded that interrupted attempt from assertions. Temporary preview files moved outside the checkout; server/tab closed and viewport reset.

No production data, live provider call, AI charge, remote SQL, paid signup, PR merge or deployment by the agent. Signed-in PostgREST/real-account and physical-device acceptance remain staging tasks. Review link/final branch references are recorded in AGENT_SESSION_LOG.md after publishing.

Review: [draft PR #23](https://github.com/LaulinVasquez/Buff-me-up/pull/23), targeting main. Implementation `7662925`; preserved main history in `0334288` with identical tested file contents. Branch `agent/meal-plan-procedure`. GitHub CI is reported separately from the passing local checks; live-account/device acceptance remains pending.
