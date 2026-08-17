# Buff Me Up — Milestone 7: Exercise Library and Smart Plan Generator

## Objective

Expand Buff Me Up from a small static exercise catalog into a richer workout-building system.

Users should be able to:

* browse a large exercise catalog
* search exercises
* filter exercises by muscle group
* view exercise demonstrations/instructions
* add catalog exercises to custom workout days
* choose 3–6 workout days
* choose desired muscle groups
* generate a suggested workout routine
* preview and edit the generated routine
* save it as a normal Buff Me Up workout plan

Do not implement AI-generated medical or rehabilitation advice.

---

# 1. External Exercise API

Integrate a dedicated exercise-data API.

Preferred provider:

`MuscleWiki API`

Evaluate the current API documentation before implementation.

Use the provider for exercise catalog information such as:

* exercise ID
* exercise name
* primary muscle
* secondary muscles
* equipment
* instructions
* video demonstration
* image/thumbnail where available

Do not expose the API key directly in the browser if the provider key must remain private.

Use a Next.js server/API layer where appropriate.

---

# 2. Environment Configuration

Add an environment variable such as:

```env
MUSCLEWIKI_API_KEY=
```

or the exact provider-required equivalent.

Do not use a `NEXT_PUBLIC_` prefix for private API credentials.

Update:

`.env.example`

README

Vercel setup documentation

Never commit the real API key.

---

# 3. Exercise Provider Abstraction

Do not make Buff Me Up components depend directly on MuscleWiki response shapes.

Create an internal application model.

Example:

```ts
type CatalogExercise = {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment?: string;
  instructions: string[];
  videoUrl?: string;
  imageUrl?: string;
};
```

Create a provider adapter that converts external API responses into Buff Me Up's internal model.

This allows the provider to be replaced later without rewriting the application.

---

# 4. Muscle Groups

Support a clear normalized set of muscle groups.

At minimum:

```text
Chest
Back
Shoulders
Biceps
Triceps
Quadriceps
Hamstrings
Glutes
Calves
Abs/Core
```

If the external provider uses more detailed terminology, normalize it into Buff Me Up categories while preserving detailed metadata when useful.

---

# 5. Exercise Library

Create a route such as:

`/app/exercises`

The page should support:

* search by exercise name
* filter by muscle group
* filter by equipment if practical
* responsive mobile cards
* exercise details
* video/example preview

Example:

```text
Exercises

Search
[ bench press... ]

Muscle
[ Chest ▼ ]

Bench Press
Chest
Barbell

[ View Exercise ]
```

Do not load the entire remote catalog into the browser unnecessarily.

Use server-side search/pagination where supported.

---

# 6. Exercise Detail

Display:

* exercise name
* primary muscle
* secondary muscles
* equipment
* instructions
* video/image demonstration when available

Example:

```text
Bench Press

Chest
Secondary: Triceps, Shoulders
Equipment: Barbell

[ Video demonstration ]

How to perform
1. ...
2. ...
3. ...
```

Remote media should be lazy loaded.

Handle missing images/video gracefully.

---

# 7. Add Exercise to Plan

Users should be able to add an exercise from the catalog directly into one of their workout days.

Flow:

```text
Exercise Library
      ↓
Bench Press
      ↓
Add to Plan
      ↓
Choose Plan
      ↓
Choose Day
      ↓
Sets / Reps / Weight
      ↓
Add
```

The resulting exercise becomes a normal `gym_exercises` record.

Store sufficient catalog metadata or external ID so exercise details can be retrieved later.

---

# 8. Database Extension

Extend `gym_exercises` only as necessary.

Potential fields:

```text
external_exercise_id text nullable
exercise_provider text nullable
muscle_group text nullable
equipment text nullable
```

Do not store remote video/image URLs permanently unless there is a clear reason.

Prefer retrieving provider content through the exercise ID.

Create a new timestamped migration.

All new Buff Me Up objects must continue using the `gym_` convention where applicable.

Do not modify FlowDesk objects.

---

# 9. Suggested Plan Builder

Create a new flow:

`/app/plan/generate`

The user should choose:

## Number of workout days

Minimum:

`3`

Maximum:

`6`

Options:

```text
3 days
4 days
5 days
6 days
```

Do not allow fewer than 3 or more than 6 in this version.

---

# 10. Muscle Selection

Allow users to choose which muscle groups they want emphasized.

Example:

```text
What do you want to train?

✓ Chest
✓ Back
✓ Shoulders
✓ Biceps
✓ Triceps
✓ Legs
□ Core
```

For simplicity, the UI may include a combined:

`Legs`

selection while the internal generator understands:

* quadriceps
* hamstrings
* glutes
* calves

---

# 11. Experience Level

Ask:

```text
Experience

Beginner
Intermediate
Advanced
```

Use this primarily to determine:

* exercise complexity
* exercise count
* volume

Do not make medical or injury assumptions.

---

# 12. Generation Engine

Buff Me Up should own the generation logic.

Do NOT request a complete routine from the external exercise API.

The API provides exercises.

Buff Me Up decides how to organize them.

Create deterministic plan-generation rules.

---

# 13. Split Rules

Create sensible templates for each day count.

Examples:

## 3 Days

Possible structure:

```text
Full Body A
Full Body B
Full Body C
```

or:

```text
Push
Pull
Legs
```

depending on selected muscle groups.

## 4 Days

Prefer:

```text
Upper
Lower
Upper
Lower
```

or an equivalent balanced split.

## 5 Days

Example:

```text
Chest + Triceps
Back + Biceps
Legs
Shoulders + Arms
Upper Body
```

## 6 Days

Prefer:

```text
Push
Pull
Legs
Push
Pull
Legs
```

Do not hard-code only one possible arrangement if selected muscles make another split more appropriate.

---

# 14. Volume Guidelines

Keep generated sessions realistic.

General targets:

Beginner:

* approximately 4–5 exercises per session

Intermediate:

* approximately 5–6 exercises per session

Advanced:

* approximately 5–7 exercises per session

Avoid generating enormous workouts.

---

# 15. Exercise Selection Rules

For each workout day:

* prioritize compound exercises earlier
* accessory/isolation exercises later
* avoid unnecessary duplicates
* avoid repeating the exact same exercise on consecutive days
* balance movements where practical
* ensure selected muscle groups actually receive exercises

Example chest selection:

```text
Bench Press
Incline Dumbbell Press
Cable Fly
```

rather than five nearly identical chest presses.

---

# 16. Sets and Rep Suggestions

Buff Me Up should generate sensible defaults.

Examples:

Compound movements:

```text
3–4 sets
6–10 reps
```

Moderate hypertrophy exercises:

```text
3 sets
8–12 reps
```

Isolation exercises:

```text
3 sets
10–15 reps
```

Calves/core may use slightly different ranges.

Users must be able to edit these before or after saving.

---

# 17. Generated Plan Preview

Never save immediately after generation.

Show:

```text
Your Suggested 5-Day Plan

Day 1
Chest + Triceps

Bench Press
4 × 6–10

Incline Dumbbell Press
3 × 8–12

...

[ Regenerate ]
[ Edit ]
[ Use This Plan ]
```

The user remains in control.

---

# 18. Regeneration

Allow:

`Regenerate`

This should produce a different reasonable exercise selection while keeping:

* selected number of days
* selected muscles
* experience level

Avoid endlessly hitting the external API.

Fetch a reasonable candidate pool and select from it locally/server-side where practical.

---

# 19. Edit Before Save

The user should be able to:

* remove an exercise
* replace an exercise
* change sets
* change reps

before saving.

A generated plan is a suggestion, not a locked prescription.

---

# 20. Save Generated Plan

When the user selects:

`Use This Plan`

create normal Buff Me Up records:

```text
gym_workout_plans
gym_workout_days
gym_exercises
```

Set:

`source = recommended`

or introduce a clear source such as:

`generated`

if the schema is extended safely.

Once saved, the plan must behave exactly like any other user-owned plan.

---

# 21. Active Plan Behavior

Ask before replacing the current active plan if one exists.

Example:

```text
Make this your active plan?

Your current plan will remain saved.

[ Not Now ]
[ Make Active ]
```

Never delete the previous plan automatically.

---

# 22. Caching

Exercise catalogs do not change constantly.

Add appropriate caching to reduce API calls.

Use Next.js server caching or another simple mechanism where appropriate.

Do not aggressively refetch identical exercise queries.

---

# 23. API Failure Handling

If the external provider is temporarily unavailable:

* existing saved plans must continue working
* active workouts must continue working
* workout history must continue working
* show a friendly error only for catalog functionality

Example:

```text
Exercise library is temporarily unavailable.

Your saved workouts are still available.
```

The external API must never become a dependency for performing a previously saved workout.

---

# 24. Native Compatibility

The new exercise catalog and generator must continue working in:

* web application
* PWA
* Capacitor iOS application

Do not break existing native authentication/deep-link behavior.

Remote video/media should render correctly inside WKWebView.

---

# 25. Security

Keep the exercise provider API key server-side.

Never expose secrets through:

* client bundles
* console logs
* URL parameters
* Capacitor configuration

Validate user-owned plan operations server-side.

---

# 26. Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
git diff --check
```

Functionally verify:

1. Exercise search works.
2. Muscle filtering works.
3. Exercise instructions load.
4. Exercise videos/examples load when available.
5. Catalog exercise can be added to a plan.
6. User can select 3 days.
7. User can select 4 days.
8. User can select 5 days.
9. User can select 6 days.
10. Selected muscle groups influence generation.
11. Generated plans have reasonable exercises.
12. Sets/reps are generated.
13. Generated plan can be edited.
14. Regeneration works.
15. Saved generated plan appears under My Plans.
16. Saved plan can become active.
17. Existing workout execution still works.
18. External API failure does not break saved workouts.
19. Web still works.
20. Capacitor iOS still works.

---

# Completion Report

Return:

1. Exercise API selected
2. Why it was selected
3. Dependencies added
4. Environment variables added
5. Files created
6. Files modified
7. API/provider abstraction
8. Exercise library functionality
9. Muscle filters implemented
10. Exercise media/instructions
11. Database migration
12. Suggested-plan generation rules
13. Supported day counts
14. Muscle-selection behavior
15. Experience-level behavior
16. Sets/reps logic
17. Regeneration logic
18. Save/adoption logic
19. Caching strategy
20. Failure handling
21. Native compatibility review
22. Security review
23. Verification results
24. Manual configuration required
25. Known limitations

Do not start unrelated features.
