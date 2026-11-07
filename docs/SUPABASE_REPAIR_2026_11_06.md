# Supabase recipe and workout repair — 2026-11-06

## Plan before implementation

User supplied live errors 42703 (gym_workout_exercises.substitution_details missing) and 42702 (ambiguous value). Follow the existing plan → implementation → validation → report → review branch/draft PR workflow. Do not apply remote SQL, merge or deploy.

1. Reproduce the recipe failure with a nonempty gram-based recipe against disposable PostgreSQL, and locate the missing workout migration dependencies. Do not change global variable-conflict settings.
2. Add a forward nutrition migration qualifying recipe query references while preserving function signature, validation, permissions, portion math and unknown nutrients. Keep previously published migrations and the original nutrition bundle intact.
3. Provide a guarded, additive SQL Editor recovery bundle for the missing workout substitution/set logging/session adaptation schema. Generate it from the original migrations and preserve stored sessions, history, RLS and stale-write guards. Include prerequisite checks, reapplication and schema refresh; do not replay unrelated migrations or fabricate CLI history.
4. Test the originally failing recipe path, exact portion totals, null nutrients, save/retry/log/history/owner isolation, and missing-workout recovery plus normal migrations and combined nutrition deployment. Reuse the full existing database/RLS/concurrency suite.
5. Document the exact SQL order and read-only verification, run appropriate checks, self-review, commit/push and open an attached draft PR for user review. Report local versus live validation clearly.

Only gym_* application schema is in scope. No Auth/FlowDesk changes, production records, provider calls, environment secrets, new dependency or automatic remote database access.
