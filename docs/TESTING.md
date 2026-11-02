# Verification

## History graphs

Run `npm run test:history`. The runner compiles the pure history tests into a disposable directory with the existing TypeScript dependency, runs Node's test runner, then removes the output. No additional package or database is needed. Tests cover day/month/year buckets, rest days, leap years, local year/month boundaries, both DST transitions, distinct active days, totals/duration, excluded statuses, query-window padding, invalid dates and clamped navigation.

In staging with a test account:

- [ ] Open History and verify the default month follows the browser timezone.
- [ ] Switch Day/Month/Year; verify 24 local-hour/day/month bars, matching totals and the filtered session list.
- [ ] Switch Workouts/Minutes and compare against completed sessions. Time logged is start-to-finish elapsed time, grouped by completion time.
- [ ] Select a bar by pointer, then use Tab and Left/Right/Home/End to inspect values. Expand the chart data table.
- [ ] Drill from a year bar to its month and a month bar/calendar day to its day; verify refresh and browser Back preserve view/date/timezone.
- [ ] Navigate periods, including Jan 31 → February and a leap year. Open an old `month=YYYY-MM&tz=...` link.
- [ ] Verify empty periods, resume an active session, open a completed-session detail, and load additional sessions.
- [ ] Verify narrow mobile layout, readable selected-tab colors, loading/error states, and no horizontal overflow.
- [ ] Verify year queries with more than 500 completed sessions include every page and isolate a second test user's data.

The development component preview used synthetic fixtures only. It verifies rendering/interactions, not a deployed Supabase/PostgREST configuration, and is not a shipped demo route.

## Gym is packed mode

Run `npm run test:swaps` for pure matching tests and `npm run test:db` for transactional acceptance in the disposable local cluster. Tests include template aliases, equipment/movement filters, completed/incomplete duplicate exclusion, unclassified custom moves, saved replacement metadata, malformed data and non-mutation of input lists. SQL verifies original weights/history/targets/order, unchanged plans and completed exercises, repeat swaps, future sessions, resume/finalization, validation, anonymous/two-user isolation, stale version/update-time rejection and legacy writes. Concurrent tests cover swap vs save/another swap, a save invalidating the reviewed timestamp, and finalization vs swap.

Before a release, apply `20261102000000_add_workout_substitutions.sql` in staging and run the full checklist in `GYM_PACKED_MODE.md` with dedicated test accounts. The application now requires the versioned progress RPC even for workouts that have never been swapped. Do not deploy the application before its migration.

## Automated database regression tests

Install dependencies with `npm ci`, then run `npm run test:db`. PostgreSQL's `pg_config`, `initdb`, `pg_ctl`, and `psql` must be installed locally and `pg_config` must be on PATH. The runner uses its reported binary directory. Run as a normal user; PostgreSQL refuses to initialize a cluster as root.

The runner creates a temporary cluster with a Unix socket and no TCP listener, applies every migration in filename order, and deletes the cluster after stopping it. It does not load `.env.local`, use a database connection URL, or connect to Supabase. The fixtures provide a minimal `auth.uid()` contract and two synthetic users under the real `authenticated` role. This verifies database/RLS behavior, not Google OAuth, JWT verification, PostgREST, or a deployed Supabase configuration.

Coverage includes start/resume uniqueness, decimal weight/completion persistence, completion and cancellation retries, conflicting final states, finalized snapshots, deletion compatibility, two-user RLS, anonymous denial, concurrent starts, concurrent completion retries, and a stale weight save racing finalization. On the pre-fix migrations, the stale-weight assertion fails because the update succeeds.

Run `npm run lint`, `npm run build`, and then `npm run typecheck`. Keep build and typecheck sequential because both consume generated Next.js route types.

## Manual staging checklist

Use dedicated test accounts and a development/staging Supabase project for writes. Record the browser/device, commit, migration version, outcome, and any reproduction steps. A production test that creates or changes data requires explicit approval.

For finalization specifically:

- [ ] Apply migration `20261101000000_guard_gym_workout_finalization.sql` to staging.
- [ ] Start a workout and open it in two tabs.
- [ ] Save a decimal weight and mark an exercise complete; reload and resume the same session.
- [ ] Finish in the first tab. Submit finish again from the stale tab; it should show the existing completion.
- [ ] Submit a stale weight/completion change from the second tab; it must fail without changing history.
- [ ] Confirm completion time stays unchanged and history contains one completed session.
- [ ] Start another workout, cancel twice, and confirm no attendance is recorded.
- [ ] Use two test accounts to confirm each sees only their own plans, exercises, sessions, and history.

## Phone checklist

Run this checklist against staging from a phone:

- [ ] Google login returns to /app.
- [ ] Sign out returns to /.
- [ ] Adopt a recommended plan and inspect its exercises.
- [ ] Create a custom plan and activate it.
- [ ] Add and edit a workout day and exercise.
- [ ] Start the next workout.
- [ ] Type a decimal weight and use the -5/+5 controls.
- [ ] Complete and uncomplete an exercise.
- [ ] Refresh and confirm workout progress remains.
- [ ] Navigate away and continue the workout from Home or History.
- [ ] Finish the workout and confirm its completion time.
- [ ] Confirm the workout appears on the correct local History date.
- [ ] Confirm monthly, weekly, all-time, and streak stats update.
- [ ] Confirm the next workout day advances.
- [ ] Cancel a workout and confirm the next day does not advance.
- [ ] Check all bottom navigation at a narrow phone width.
- [ ] Add the app to the phone home screen and launch it standalone.
- [ ] Confirm production Google OAuth uses the deployed callback URL.
