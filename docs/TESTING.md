# Verification

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
