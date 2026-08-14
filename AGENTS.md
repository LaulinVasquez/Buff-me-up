# Buff Me Up — Milestone 2: Workout Data Model and Plan Foundation

## Objective

Build the complete workout-plan data model and the backend/data-access foundation needed for the next milestones.

At the end of this milestone, the application should have:

* secure workout plan tables
* workout day tables
* exercise tables
* workout session tables
* workout exercise tracking tables
* recommended workout plan data
* strongly typed data-access helpers
* Row Level Security for all Buff Me Up tables
* a minimal plan-selection/onboarding foundation

Do not build the full workout execution UI yet.

Do not build history, streaks, charts, or advanced analytics yet.

---

# IMPORTANT — SHARED SUPABASE PROJECT

Buff Me Up shares an existing Supabase project with another application called FlowDesk.

Do not:

* modify FlowDesk tables
* rename FlowDesk tables
* delete FlowDesk tables
* reference FlowDesk application tables
* create generic tables that could conflict with FlowDesk

Every Buff Me Up-owned table, trigger, function, policy, or database object must use the `gym_` prefix where practical.

Supabase Auth is intentionally shared.

Existing Buff Me Up authentication uses:

`gym_profiles`

Continue using that table when profile relationships are needed.

---

# 1. Core Data Model

Create a new timestamped SQL migration under:

`supabase/migrations/`

The migration should create the following tables.

---

## gym_workout_plans

Represents a user's workout program.

Suggested fields:

```text
id uuid primary key
user_id uuid not null
name text not null
description text nullable
is_active boolean default false
source text
created_at timestamptz
updated_at timestamptz
```

Requirements:

* `user_id` references `auth.users(id)`
* use cascading deletion where appropriate
* `source` should distinguish plans such as:

  * custom
  * recommended
* users may have multiple plans
* only one plan should normally be active for a user

If enforcing one active plan at the database level is clean and maintainable, implement it using an appropriate partial unique index.

Otherwise document how application logic will guarantee only one active plan.

---

## gym_workout_days

Represents a training day inside a workout plan.

Suggested fields:

```text
id uuid primary key
plan_id uuid not null
name text not null
day_order integer not null
created_at timestamptz
updated_at timestamptz
```

Examples:

```text
Push
Pull
Legs
Upper
Lower
Full Body A
Full Body B
```

Requirements:

* belongs to `gym_workout_plans`
* deleting a workout plan should remove its days
* support explicit ordering
* prevent obviously invalid ordering values where appropriate

Do not tie workout days directly to specific weekdays yet unless necessary.

The plan order should be flexible enough for users to rotate workouts independently of calendar weekdays later.

---

## gym_exercises

Represents exercises assigned to a workout day.

Suggested fields:

```text
id uuid primary key
workout_day_id uuid not null
name text not null
sets integer not null
target_reps text not null
default_weight numeric nullable
exercise_order integer not null
notes text nullable
created_at timestamptz
updated_at timestamptz
```

`target_reps` should be flexible enough to support values such as:

```text
8
10
8-12
AMRAP
30 sec
```

Do not force reps into an integer if that would make future programming unnecessarily restrictive.

Requirements:

* belongs to `gym_workout_days`
* deleting a workout day should delete its exercises
* support ordering
* sets must be greater than zero
* default weight, when provided, cannot be negative

The MVP may track one default/working weight per exercise.

Individual per-set weights are a future enhancement.

---

# 2. Workout Session Model

Create the foundation needed to record actual gym visits.

---

## gym_workouts

Represents an actual workout session.

Suggested fields:

```text
id uuid primary key
user_id uuid not null
workout_day_id uuid nullable
plan_id uuid nullable
name text not null
status text not null
started_at timestamptz
completed_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

Supported status values should initially be limited to:

```text
in_progress
completed
cancelled
```

Use a check constraint or another simple maintainable strategy.

The workout should preserve enough context to remain meaningful even if the original workout plan changes later.

If storing a workout name snapshot is useful for this reason, keep it.

Do not over-engineer snapshotting yet.

---

## gym_workout_exercises

Represents the exercises performed during a workout session.

Suggested fields:

```text
id uuid primary key
workout_id uuid not null
exercise_id uuid nullable
name text not null
target_sets integer nullable
target_reps text nullable
weight numeric nullable
completed boolean default false
exercise_order integer not null
created_at timestamptz
updated_at timestamptz
```

The `name`, target sets, and target reps should act as lightweight workout-time snapshots.

This prevents old workout history from becoming meaningless if the user's plan changes later.

Requirements:

* belongs to `gym_workouts`
* deleting a workout session should delete its workout exercise rows
* weight cannot be negative
* exercise reference may be nullable so workout history survives future exercise deletion
* ownership should ultimately be determined through the parent workout

---

# 3. Recommended Workout Plans

Create a clean recommended-plan system.

Do NOT store global recommended plans in the shared Supabase database unless there is a strong reason.

For this MVP, prefer static application data under something such as:

`data/recommended-plans.ts`

Create at least these recommended plans:

## Push / Pull / Legs

Push:

* Bench Press — 4 sets — 6-10 reps
* Incline Dumbbell Press — 3 sets — 8-12 reps
* Shoulder Press — 3 sets — 8-12 reps
* Lateral Raise — 3 sets — 12-15 reps
* Tricep Pushdown — 3 sets — 10-15 reps

Pull:

* Lat Pulldown — 4 sets — 8-12 reps
* Barbell Row — 3 sets — 6-10 reps
* Seated Cable Row — 3 sets — 8-12 reps
* Face Pull — 3 sets — 12-15 reps
* Bicep Curl — 3 sets — 10-15 reps

Legs:

* Squat — 4 sets — 6-10 reps
* Romanian Deadlift — 3 sets — 8-12 reps
* Leg Press — 3 sets — 10-15 reps
* Leg Curl — 3 sets — 10-15 reps
* Calf Raise — 4 sets — 10-15 reps

---

## Upper / Lower

Upper:

* Bench Press
* Lat Pulldown
* Shoulder Press
* Seated Row
* Bicep Curl
* Tricep Pushdown

Lower:

* Squat
* Romanian Deadlift
* Leg Press
* Leg Curl
* Calf Raise

Assign sensible sets and rep targets.

---

## 3-Day Full Body

Create:

* Full Body A
* Full Body B
* Full Body C

Use a balanced combination of:

* squat or leg press
* horizontal press
* horizontal or vertical pull
* shoulder work
* hamstring work
* arms or core

Keep each workout realistic for a normal gym session.

---

# 4. Recommended Plan Adoption

Create the data-layer logic required for a user to select one of the static recommended plans and copy it into their own database records.

Expected behavior:

```text
Recommended plan
      ↓
User selects plan
      ↓
Create gym_workout_plans row
      ↓
Create corresponding gym_workout_days
      ↓
Create corresponding gym_exercises
      ↓
Mark plan active
```

The user's plan must become independent from the static recommended template after creation.

Editing a user's plan must never mutate the static recommended plan definition.

Use a transaction-like or failure-safe approach where practical.

Avoid leaving partially created plans if a multi-step insert fails.

---

# 5. Custom Plan Foundation

Create reusable data-access functions or server actions required to:

* create workout plan
* update workout plan
* delete workout plan
* activate workout plan
* create workout day
* update workout day
* delete workout day
* reorder workout days if practical
* create exercise
* update exercise
* delete exercise
* reorder exercises if practical

Do not create an elaborate UI yet.

The goal is to prepare safe reusable backend operations for Milestone 3.

---

# 6. Active Plan Behavior

A user should be able to have multiple plans, but only one active plan.

When activating a plan:

```text
Current active plan
      ↓
Set inactive
      ↓
Selected plan
      ↓
Set active
```

This operation should be as safe and atomic as practical.

If the database enforces one active plan using an index, application logic should cooperate with that constraint.

---

# 7. Row Level Security

Enable RLS on every new Buff Me Up table.

Tables include:

* gym_workout_plans
* gym_workout_days
* gym_exercises
* gym_workouts
* gym_workout_exercises

Users must only be able to read or modify their own data.

For direct-user ownership tables:

```text
gym_workout_plans.user_id
gym_workouts.user_id
```

ownership can be checked against:

`auth.uid()`

For nested tables such as workout days or exercises, policies should validate ownership through the parent relationship.

Example conceptual relationship:

```text
gym_exercises
      ↓
gym_workout_days
      ↓
gym_workout_plans
      ↓
user_id
```

Do not add redundant `user_id` columns solely to make RLS easier unless there is a compelling architectural reason.

Prefer secure relational ownership checks.

Follow current Supabase RLS practices.

Use explicit policies for appropriate operations.

Ensure unauthenticated users cannot access workout data.

---

# 8. Shared Database Safety

This migration must be safe to apply to the existing FlowDesk Supabase project.

Before considering the milestone complete, inspect the migration and ensure:

* only `gym_` application objects are created
* `auth.users` may be referenced
* `gym_profiles` may be referenced if needed
* no FlowDesk tables are altered
* no existing generic functions or triggers are overwritten
* no unrelated schemas are changed

Prefer Buff Me Up-specific function and trigger names.

---

# 9. Indexes

Add sensible indexes where useful.

Likely examples include:

```text
gym_workout_plans.user_id
gym_workout_days.plan_id
gym_exercises.workout_day_id
gym_workouts.user_id
gym_workouts.started_at
gym_workout_exercises.workout_id
```

Also consider uniqueness for ordering inside parents where useful.

Do not add unnecessary indexes.

---

# 10. TypeScript Types

Update:

`types/database.ts`

to include all new tables and relationships.

Create strongly typed application models for:

* WorkoutPlan
* WorkoutDay
* Exercise
* Workout
* WorkoutExercise
* RecommendedWorkoutPlan

Avoid `any`.

Keep database types separate from higher-level UI models when useful.

---

# 11. Data Access Structure

Create a clean organization for workout-related database operations.

Possible structure:

```text
lib/workouts/
lib/plans/
```

or another simple equivalent.

Avoid creating unnecessary abstraction layers.

The code should make it easy for future pages to request:

```text
getActivePlan()
getPlans()
getPlan(id)
createPlan()
activatePlan()
createPlanFromRecommendation()
getWorkoutDay()
```

All user-specific operations must derive the authenticated user from the server session.

Do not trust a client-submitted `user_id`.

---

# 12. Minimal Plan Screen

You may update `/app` or create `/app/plan` with a minimal foundation demonstrating that the data layer works.

If the user has no plan, show something similar to:

```text
No workout plan yet.

Choose a recommended plan or create your own.
```

Display the names of the recommended plans.

The user may be allowed to select a recommended plan if the implementation is clean enough.

However, do NOT spend significant time polishing this UI.

Full plan-management UX belongs to Milestone 3.

---

# 13. Navigation Foundation

Prepare the application shell for eventual mobile navigation:

```text
Home
Plan
History
Profile
```

Only create lightweight navigation if useful.

Do not build History functionality yet.

The current priority is the database and workout-plan foundation.

---

# 14. Do Not Implement Yet

Do not implement:

* today's workout logic
* start workout screen
* interactive gym checklist
* individual set tracking
* rest timers
* workout history UI
* gym calendar
* streak calculations
* workout statistics
* personal records
* progress charts
* body weight tracking
* AI features
* nutrition
* social functionality

These belong to later milestones.

---

# 15. Verification

Before completion, run:

```bash
npm run typecheck
npm run lint
npm run build
```

Resolve all errors.

Also inspect the SQL migration for shared-project safety.

Do not automatically apply the migration to Supabase unless the development environment is already intentionally linked and doing so cannot affect unrelated FlowDesk objects.

The owner may apply the migration manually after review.

---

# Definition of Done

Milestone 2 is complete when this foundation exists:

```text
Authenticated user
       ↓
gym_workout_plans
       ↓
gym_workout_days
       ↓
gym_exercises

Authenticated user
       ↓
gym_workouts
       ↓
gym_workout_exercises
```

and:

```text
Recommended template
       ↓
Copy into user's plan
       ↓
Independent editable workout plan
```

All user-owned data must be protected by RLS.

---

# Completion Report

When finished, provide:

1. Files created
2. Files modified
3. Exact tables created
4. Relationships and cascade behavior
5. Constraints and indexes
6. RLS policies created
7. Recommended plans implemented
8. Plan creation/adoption logic
9. Data-access functions created
10. Verification results
11. Migration filename
12. Manual steps required from the owner
13. Shared FlowDesk-project safety review
14. Any architectural decisions or deviations from this prompt

Do not begin Milestone 3 automatically.

Stop after Milestone 2.
