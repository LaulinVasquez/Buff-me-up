# Development issues

## BMU-011 — Account accent-color preferences

**Status:** implemented in `02fb241`, draft [PR #7](https://github.com/LaulinVasquez/Buff-me-up/pull/7), on `agent/appearance-themes`, based on merged Gym is packed PR #6 (`aa44d5f`); lint/build/typecheck, 23 pure tests, SQL regressions and 25 fixture theme/width checks pass. Staging/device acceptance pending.

Profile → Appearance offers five presets, whole-view live preview with a labeled sample chart, explicit Save/Cancel and reset-to-Lime preview. Saved choices live on the owned profile and apply through shared accent tokens across authenticated navigation/buttons/charts; account keys and preview cleanup prevent transient state from leaking between views/accounts. Error/warning/completion semantics and brand assets remain distinct. No custom input/light mode or new package is added.

The additive migration checks allowed IDs under existing profile RLS. Pure contrast/validation tests, owner-isolated persistence tests and 25 fixture theme/width checks pass; browser interaction checks found and fixed the native action-reset/radio desynchronization. Real signed-in PostgREST/cross-device/iPhone acceptance remains pending. See `APPEARANCE_THEMES.md` for architecture, PR dependency, limits and rollout checks. No production migration or deployment was performed.

## BMU-010 — Gym is packed session-only exercise swaps

**Status:** implemented in `7a1ba02`, merged [PR #6](https://github.com/LaulinVasquez/Buff-me-up/pull/6), on `agent/gym-packed-mode`, based on merged responsive baseline `e45f53f`; lint/build/typecheck, seven matching tests, 12 History tests, SQL/concurrency and 20 responsive fixture-state checks pass. Staging rollout and signed-in/device acceptance remain pending.

Scope explicitly selected by the developer: an unfinished exercise can be replaced for the current workout using available equipment, with review/confirmation and saved original data. The bundled catalog supplies same-primary-muscle/type alternatives; existing session exercises are excluded and unclassified custom moves require a muscle choice. Targets/order stay intact; replacement weight resets, original data is retained, and the plan/completed work remains unchanged.

The additive migration introduces versioned, owner-scoped swap/progress RPCs, automatic swap history and legacy/stale-client guards. Local SQL tests cover preserved data/plan, validation, resume/finalization, two-user/anonymous RLS and concurrent saves/swaps/finalization. Pure helper tests and a labeled synthetic browser preview cover selection and responsive states. See `GYM_PACKED_MODE.md` for the migration dependency, catalog limits and required staging checks. No remote database or production deployment was changed.

## BMU-009 — Phone-first responsive layout for larger devices

**Status:** implemented in `9fdf744` on `agent/responsive-layout`, merged [PR #5](https://github.com/LaulinVasquez/Buff-me-up/pull/5), based on merged upstream `95b4b92`; local layout/build checks pass. Signed-in staging and physical-device acceptance pending.

Shared shell now expands beyond the former 512px cap, with bottom navigation below 1024px and a 240px sidebar at desktop widths. Dashboard, History, library, plans/generator, profile and detail pages use responsive grids. Workout actions stay fixed at the bottom on phones/tablets and become a sticky side panel on desktop. The sign-in page gains a desktop two-column layout.

Acceptance evidence: 55 fixture screen/width combinations have no horizontal page overflow at 320/390/768/1024/1440px, including all primary screens and details. Expanded plan forms fit at 320/768/1024px; generated 3-day phone and 4-day desktop plans fit; History controls/drill-down and chart keyboard selection work. The initial 320px History session-card overflow was repaired with explicit shrinkable grid tracks/items. Lint, build, sequential typecheck and 12 History tests pass. No migrations, dependencies, auth checks, services or server actions changed. See `RESPONSIVE_LAYOUT.md` and the session log for limits and review references.

## BMU-008 — History layout and day/month/year progress

**Status:** implemented in `96639e3`, merged [PR #4](https://github.com/LaulinVasquez/Buff-me-up/pull/4). Automated and synthetic-component checks pass; staging verification pending.

Acceptance: clear mobile layout, day/month/year views, workouts/time graphs, accurate local-date totals, selectable buckets and drill-downs, retained session details/calendar/resume links, usable empty/loading states, and accessible chart data. Existing completed-workout records supply all values; no sample records or chart dependency are shipped.

Implementation: narrow paginated period queries, pure timezone-aware aggregation, graph/metric controls, updated session cards and calendar, and 12 aggregation/date regression tests. Labeled synthetic component checks cover interactions, keyboard selection, annual/monthly/daily counts, 320px width and empty-state behavior. Existing issue/open-PR searches found no matching History work. The test preview was isolated from authentication/database code and removed after review. Live signed-in staging verification is still needed.

Audited 2026-11-01 against upstream `f4828cc`. GitHub searches returned no existing issues or open PRs for this repository. Creating an issue returned HTTP 403, `Resource not accessible by integration`, so this file tracks findings until GitHub issue write access is available.

## BMU-001 — P0: finalization retries and stale exercise saves

**Status:** implemented locally; database regression tests pass; staging verification pending.

Completing an already-completed session previously produced an error because the service updated only `in_progress` rows. Exercise snapshot mutations checked ownership but not session state, so a stale tab could overwrite a completed workout. The original migrations reproduce the stale-save failure in `tests/database/workouts.sql`.

Resolution: `gym_set_workout_status` serializes completion/cancellation and returns an existing matching final state without changing its time. Snapshot triggers reject finished-session changes; terminal status/timestamps cannot be reopened or rewritten. Invoker permissions/RLS remain enabled. The optional template foreign key may clear when its exercise is deleted, and parent-workout deletion still cascades.

Acceptance evidence: `npm run test:db` covers repeat/concurrent completion, cancellation, conflicting final states, stale progress writes, concurrent starts, two synthetic users, anonymous denial, and deletion compatibility. Apply the new migration to staging before using the updated application flows. No shared database migration was applied during this session.

## BMU-002 — P0: verify authenticated flows in staging

**Status:** blocked on a designated test environment/accounts.

Browser acceptance for M1–M7, including Google sign-in/out, plan/exercise edits after reload, history and local-date statistics, needs dedicated test accounts and a staging Supabase project. Existing `.env.local` is not evidence that a service is safe for test writes. Do not use real user data. Database tests cover a simulated Auth identity contract, not deployed authentication/RLS configuration.

## BMU-003 — P0: ordering after deleting a middle item

**Status:** source finding; regression reproduction and focused fix needed.

`addWorkoutDay` assigns order using `plan.gym_workout_days.length`; `addExercise` and catalog additions also use counts. Deleting a middle item leaves a gap, and a later insertion can reuse the last item's order. Sorting tied orders has no stable database guarantee. Reproduce with orders 0/1/2, delete 1, add another item; verify the new item is appended and workout rotation follows displayed order.

## BMU-004 — P0: latest previous weight query

**Status:** source finding; PostgREST reproduction needed.

`getPreviousExerciseWeight` orders the embedded `gym_workouts` relation, then limits the parent `gym_workout_exercises` query to one row. Confirm that this returns the latest completed workout's weight with three distinct dated sessions; add a regression and order the top-level result appropriately if it does not.

## BMU-005 — P1: exercise provider and generator verification

**Status:** partially implemented; not live-verified.

ExerciseDB browsing, fallback data, details, and a 3–6 day generator already exist upstream. Verify the provider's current contract, pagination/filtering, limits, and media terms/attribution before marking S1/S4 complete. Add deterministic generator tests for 3/4/5/6 days, sparse catalogs, duplicate avoidance, empty-day rejection, and edited-plan validation. Then demonstrate four populated days and saving/reloading in staging.

## BMU-006 — P2: mobile, CI, and demonstration evidence

**Status:** pending.

No repository CI configuration or existing automated test script was present at baseline. This session adds `test:db`; CI integration and browser smoke coverage remain. Physical iPhone OAuth/deep links, installation, PWA layout, network failures, real screenshots, and TestFlight checks require device/staging evidence. The approved requirements draft was not available in this repository; confirm scope before changing commitments. Publishing/signing/invites require human approval per the development plan.

## BMU-007 — P0: vulnerable locked dependencies

**Status:** implemented in merged [PR #3](https://github.com/LaulinVasquez/Buff-me-up/pull/3), commit `828dfdc`; production/native rollout remains unverified.

`npm ci` succeeded but reported 29 affected packages (21 moderate, 6 high, 2 critical). `npm audit --json` returned exit 1. Critical direct packages are `next@16.3.1` and `@capacitor/ios@8.5.0`; the audit reports patched versions are available. The finding alone does not establish which advisory preconditions are reachable in this deployment. Review the relevant advisories, update supported versions/lockfile in a separate focused change, then rerun application checks and the audit. Do not use forced bulk upgrades.

The separate repair updates Next.js/config to 16.4.3, Capacitor core/iOS/CLI and the native Swift package to 8.5.1, plus reviewed compatible transitive fixes. On that branch, `npm audit --omit=dev` reports zero vulnerabilities, and `npm audit --audit-level=high` passes with zero critical/high and 21 moderate development-tool findings. Lint/build/typecheck, local HTTP smoke checks, native sync/resolution, and an unsigned iOS simulator build pass. A full audit still reports the moderate findings; forced fixes propose incompatible tool downgrades. See the [security review](https://github.com/LaulinVasquez/Buff-me-up/blob/agent/security-dependencies/docs/DEPENDENCY_SECURITY_REVIEW.md). These dependency changes are not included in the workout-only branch until the separate PR is merged.
