# Development status

Last audited: **2026-11-01**. Upstream baseline: **`f4828cc`**. Working branch: **`agent/core-workout-audit`**.

BMU-001 implementation: `a0abae4`, draft [PR #2](https://github.com/LaulinVasquez/Buff-me-up/pull/2). Review and staging migration are pending.

BMU-007 dependency repair: `828dfdc` on separate branch `agent/security-dependencies`, draft [PR #3](https://github.com/LaulinVasquez/Buff-me-up/pull/3). Production dependency audit is clean on that branch; 21 moderate development-tool findings remain. Review, merge, and approved rollout are pending. The workout-only branch retains the original dependency lockfile.

The session follows the locally supplied `BUFF_ME_UP_AGENT_DEVELOPMENT_PLAN.md`. That pre-existing untracked file is preserved. The approved CSE 499 requirements draft was not found in the repository, so its scope has not been changed.

## Evidence and acceptance status

“Implemented” refers to code/database evidence. “Partially implemented” means implementation exists but required acceptance or integration evidence is incomplete. “Blocked” identifies a verification dependency; no item below is represented as fully demonstrated in the deployed app.

| Requirement | Status | Evidence and remaining work |
| --- | --- | --- |
| M1 Google login | Partially implemented; authenticated verification blocked | OAuth button, web callback, native listener, sign-out action, protected proxy/layout exist. Dedicated Google test-account sign-in/out and native checks remain. |
| M2 custom plans | Partially implemented | Plan actions/services, owner RLS, active-plan index and RPCs exist. Local database fixtures persist plans; browser creation/reload demonstration remains. |
| M3 workout days/exercises | Partially implemented | Day/exercise forms and nested owner RLS exist; database fixtures exercise persistence/isolation. Two-day browser reload and deletion/reordering checks remain (BMU-003). |
| M4 start/resume | Implemented at database level; app verification partial | `gym_start_workout`, snapshots, unique active-session index, resume UI and next-day selection exist. Database tests verify repeated/concurrent starts return one session. Browser refresh/next-day rotation remains. |
| M5 completion | Implemented at database level; staging rollout pending | BMU-001 fixed with locked, idempotent finalization and snapshot guards. Regression tests verify timestamps, retries, stale writes, cancellation, and isolation. New migration is required before updated app flows are used. |
| M6 history/detail | Partially implemented | Completed-only history queries, calendar/detail pages, saved snapshots exist. Database completion/snapshot tests pass; browser calendar/detail checks remain. |
| M7 consistency | Partially implemented | `lib/dates/local.ts`, attendance queries and consistency components exist. Timezone/DST and browser summary acceptance remain. |
| S1 ExerciseDB | Partially implemented | Server provider, normalized model, fallback catalog, API/search/detail/add-to-day exist. Live contract/limits/terms, pagination and saved-plan demonstration unverified. |
| S2 generator | Partially implemented | Seeded generator, preview editing, 3–6 day UI and atomic save RPC exist. Schedule/sparse-catalog tests and four-populated-day save/reload demonstration remain. |
| S3 mobile | Partially implemented; device verification blocked | Capacitor iOS target, deep-link handling, safe-area layouts and manifest exist. No physical-device/PWA installation verification this session. Hosted `server.url` remains a prototype limitation. |
| S4 guidance | Partially implemented | Local workout instructions and provider detail media/instructions/fallback UI exist. Saved provider exercises' workout-view guidance and licensing/attribution require verification. |
| User isolation | Implemented in local migration tests; deployed verification blocked | All six tables have owner/nested RLS. Tests use two synthetic users and real database roles; deployed JWT/PostgREST/two-account checks remain. |
| Automated quality checks | Partially implemented | Lint/typecheck/build scripts existed; no test script or CI configuration existed at baseline. Added `test:db` with isolated PostgreSQL regression coverage. CI/browser coverage remains missing. |

## First selected task and implementation plan

**BMU-001 (P0)**: preserve completed workouts and make completion retries safe. Files: workout service/types, one additive migration, disposable database test runner/fixtures, and verification documentation. Lock each owned workout during finalization; have snapshot writes acquire the same lock; preserve final timestamps and allow retrying the same terminal state. Test both serial and concurrent requests, two-user isolation, and deletion compatibility.

Rollout risk: application completion/cancellation now depends on `gym_set_workout_status`. Apply and verify migration `20261101000000_guard_gym_workout_finalization.sql` in staging before deploying this version. The migration adds functions/triggers and does not backfill, rewrite, or delete stored rows. Existing migrations are unchanged.

## Repository and external checks

- Fetched upstream safely; local `main` was seven commits behind. Created the agent branch from `origin/main` without moving local `main` or overwriting the untracked guide.
- Read README, package scripts, routes/actions, services, all migrations/RLS, history/date logic, provider/generator, Capacitor and deployment configuration.
- GitHub issue/open-PR searches returned none. Issue creation returned 403; findings are tracked in `ISSUES.md`.
- No `.github` workflow directory was present. GitHub returned no PR-triggered workflow runs for the baseline commit; this does not prove absence of external deployment checks.
- No authenticated test-account or staging service was established. Production data, OAuth provider settings, signing, publishing, and deployments were not changed.

## Prioritized next steps

1. Review the two draft PRs; establish staging/test accounts, apply the finalization migration there, and demonstrate M1–M7 using `TESTING.md`. Merge/production rollout remain human decisions.
2. Resolve append-order/latest-weight findings (BMU-003/BMU-004) with focused regressions.
3. Test existing generator schedules and exercise-provider behavior before expanding stretch scope (BMU-005); then add CI/mobile evidence and track the residual moderate tooling advisories.

See `AGENT_SESSION_LOG.md` for command outcomes and Git/PR references, and `ISSUES.md` for acceptance details and blockers.
