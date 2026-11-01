# Development issues

## BMU-008 — History layout and day/month/year progress

**Status:** implemented on `agent/history-progress`; automated and synthetic-component checks pass; PR handoff/staging verification pending.

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

**Status:** implemented separately in draft [PR #3](https://github.com/LaulinVasquez/Buff-me-up/pull/3), commit `828dfdc`; merge/rollout pending.

`npm ci` succeeded but reported 29 affected packages (21 moderate, 6 high, 2 critical). `npm audit --json` returned exit 1. Critical direct packages are `next@16.3.1` and `@capacitor/ios@8.5.0`; the audit reports patched versions are available. The finding alone does not establish which advisory preconditions are reachable in this deployment. Review the relevant advisories, update supported versions/lockfile in a separate focused change, then rerun application checks and the audit. Do not use forced bulk upgrades.

The separate repair updates Next.js/config to 16.4.3, Capacitor core/iOS/CLI and the native Swift package to 8.5.1, plus reviewed compatible transitive fixes. On that branch, `npm audit --omit=dev` reports zero vulnerabilities, and `npm audit --audit-level=high` passes with zero critical/high and 21 moderate development-tool findings. Lint/build/typecheck, local HTTP smoke checks, native sync/resolution, and an unsigned iOS simulator build pass. A full audit still reports the moderate findings; forced fixes propose incompatible tool downgrades. See the [security review](https://github.com/LaulinVasquez/Buff-me-up/blob/agent/security-dependencies/docs/DEPENDENCY_SECURITY_REVIEW.md). These dependency changes are not included in the workout-only branch until the separate PR is merged.
