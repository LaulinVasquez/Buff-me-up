# Buff Me Up — Milestone 4: Workout Execution

## Objective

Build the real gym-use experience.

At the end of this milestone, an authenticated user should be able to:

* open the app on their phone
* see today's local date
* see the workout they should perform
* start a workout
* check exercises off
* record weight used
* see workout progress
* finish the workout
* automatically save the workout date/time
* return to the dashboard with the workout recorded

This milestone should make Buff Me Up usable in a real gym session.

---

# 1. Today's Workout

Update the authenticated dashboard so the primary content is today's workout.

If the user has an active plan, determine the appropriate workout day.

For the MVP, use the workout-day sequence rather than tying workouts permanently to weekdays.

Example active plan:

```text
Push
Pull
Legs
```

If the user's most recent completed workout was:

`Push`

then the next workout should be:

`Pull`

If there are no previous completed workouts for the active plan, start with the first workout day.

After the final workout day, cycle back to the first.

Example:

```text
Push → Pull → Legs → Push
```

This behavior should be deterministic and documented.

Do not depend on Monday/Tuesday/etc. scheduling yet.

---

# 2. Today's Date

Display the user's local calendar date prominently.

Example:

```text
Friday, August 14

Today
Pull Day
```

Continue using browser-local display logic.

When a workout begins, store the actual timestamp in the database.

Use:

`started_at`

When completed, store:

`completed_at`

The history system in the next milestone will derive workout dates from these timestamps.

Do not store redundant formatted date strings.

---

# 3. Start Workout

Add a prominent:

`Start Workout`

action.

When selected:

1. Validate there is an active plan.
2. Determine the next workout day.
3. Create a `gym_workouts` row.
4. Set:

   * authenticated `user_id`
   * plan reference
   * workout day reference
   * workout name snapshot
   * `status = in_progress`
   * `started_at = current timestamp`
5. Copy the workout day's exercises into `gym_workout_exercises`.

Each copied exercise should preserve snapshot data including:

* exercise name
* target sets
* target reps
* default/starting weight when useful
* exercise order
* source exercise reference

This snapshot ensures future plan edits do not affect the current workout.

---

# 4. Prevent Duplicate Active Workouts

A user should not accidentally create several simultaneous workouts.

Before creating a new workout, check whether the user already has an:

`in_progress`

workout.

If one exists, show:

```text
Workout in progress

Pull Day
Started at 5:42 PM

[ Continue Workout ]
```

Do not silently create another workout.

---

# 5. Workout Screen

Create a dedicated route such as:

`/app/workout/[workoutId]`

This should be designed primarily for phone use.

Example:

```text
Friday, August 14

Pull Day

2 / 5 complete

────────────────────

Lat Pulldown
4 × 8–12

Weight
[ 120 ] lb

[ ✓ Complete ]

────────────────────

Barbell Row
3 × 6–10

Weight
[ 135 ] lb

[ ✓ Complete ]
```

The user should be able to comfortably operate the screen one-handed.

---

# 6. Exercise Completion

Users must be able to mark each exercise:

* complete
* incomplete again if tapped accidentally

Update:

`gym_workout_exercises.completed`

Persist changes immediately or through an equally reliable interaction.

The UI should provide obvious visual feedback when an exercise is completed.

Example:

```text
✓ Bench Press
185 lb
4 × 6–10
```

Avoid tiny checkbox controls.

Use a large touch-friendly card/action.

---

# 7. Weight Recording

Allow the user to record the actual working weight used for each exercise.

Use the existing:

`gym_workout_exercises.weight`

field.

The initial value should preferably use:

`gym_exercises.default_weight`

when one exists.

Example:

```text
Weight used

[ - ] [ 185 ] [ + ]
lb
```

A simple numeric input is sufficient.

The value may contain decimals.

Weight cannot be negative.

Persist weight changes.

Do not implement weight per individual set yet.

---

# 8. Previous Workout Weight

If practical within the existing architecture, show the most recent completed weight for the same exercise.

Example:

```text
Bench Press

4 × 6–10

Last time: 180 lb

Today
[ 185 ] lb
```

This is highly valuable for progressive overload.

Determine "same exercise" preferably using the original `exercise_id` when it still exists.

If that reference is unavailable, a conservative name match may be used only if necessary.

Do not build advanced PR calculations yet.

---

# 9. Exercise Details During Workout

Reuse the Milestone 3 exercise-detail experience where practical.

During a workout, users should be able to access basic information such as:

* muscle group
* equipment
* how to perform the exercise

Do not force the user to leave their active workout.

A collapsible section or similar lightweight interaction is acceptable.

If static metadata is not available for a custom exercise, simply omit those details.

---

# 10. Workout Progress

Display clear progress.

Example:

```text
3 of 5 exercises complete
60%
```

A simple progress bar is encouraged.

Calculate progress from:

`gym_workout_exercises.completed`

Do not introduce chart libraries.

---

# 11. Finish Workout

Add a prominent:

`Finish Workout`

button.

On selection:

* show a confirmation if some exercises remain incomplete
* allow the user to finish anyway
* set workout status to `completed`
* set `completed_at`
* persist all current exercise data

Example:

```text
2 exercises are still incomplete.

Finish workout anyway?

[ Keep Training ]
[ Finish Workout ]
```

If all exercises are completed, finishing should require minimal friction.

---

# 12. Completed Workout Result

After completing a workout, show a brief completion state.

Example:

```text
Workout Complete 💪

Pull Day

Friday, August 14

5 exercises
52 minutes

[ Back to Home ]
```

Duration should be derived from:

`completed_at - started_at`

Do not store a separate duration value unless clearly necessary.

---

# 13. Dashboard After Completion

After completion, the dashboard should update.

Example:

```text
Friday, August 14

Workout complete

Pull Day ✓

Next workout
Legs
```

A completed workout automatically counts as a gym visit.

The user should not need to separately mark:

"I went to the gym."

---

# 14. Workout Cancellation

Allow an active workout to be cancelled.

Use:

`status = cancelled`

Require confirmation.

Example:

```text
Cancel workout?

Your current exercise progress will remain stored,
but this workout will not count as completed.

[ Keep Workout ]
[ Cancel ]
```

Cancelled workouts must not advance the workout-day sequence.

---

# 15. Next Workout Logic

Create a reusable server-side function such as:

```text
getNextWorkoutDay()
```

or equivalent.

It should:

1. Retrieve the active plan.
2. Retrieve its ordered workout days.
3. Find the most recent completed workout belonging to that active plan.
4. Determine the next day in sequence.
5. Wrap to the beginning when necessary.

Only:

`status = completed`

should advance the sequence.

Cancelled workouts must not.

In-progress workouts should resume instead of selecting another day.

---

# 16. Data Security

All operations must derive the user from the authenticated server session.

Never trust client-provided `user_id`.

A user must not be able to:

* view another user's workout
* modify another user's workout
* complete another user's exercises
* guess another workout ID and access it

Existing RLS remains part of the security boundary.

Validate ownership server-side as well where appropriate.

---

# 17. Server Actions / Data Layer

Expand the existing workout data layer cleanly.

Functions may include equivalents of:

```text
getCurrentWorkout()
getNextWorkoutDay()
startWorkout()
getWorkout()
updateWorkoutExercise()
toggleExerciseComplete()
finishWorkout()
cancelWorkout()
getPreviousExerciseWeight()
```

Do not create unnecessary abstraction.

Keep authenticated logic server-side.

---

# 18. Loading and Error States

Handle:

* no active plan
* active plan with no workout days
* workout day with no exercises
* workout creation failure
* exercise update failure
* workout already completed
* cancelled workout
* unauthorized workout ID
* missing workout ID
* network/server errors

Messages should remain concise and useful.

---

# 19. Mobile Gym UX

This screen is the most important mobile UI in the application.

Prioritize:

* large exercise cards
* 44px+ tap areas
* sticky workout header if helpful
* sticky Finish Workout action where appropriate
* large numeric weight inputs
* minimal navigation distraction
* readable text under gym lighting
* easy scrolling
* clear completed states

Avoid:

* dense forms
* tiny inputs
* desktop tables
* excessive modal interactions

---

# 20. Navigation During Workout

When a workout is active, the user should easily return to it.

If they navigate to another app section and return home:

```text
Workout in progress

[ Continue Workout ]
```

should be prominent.

Do not lose workout state due to navigation or refresh.

The database is the source of truth.

---

# 21. Refresh / Recovery

The workout must survive:

* browser refresh
* accidentally closing the tab
* navigating elsewhere in the app

Because session state is persisted in Supabase, reopening the app should detect the existing `in_progress` workout and allow the user to continue.

Do not rely solely on React local state.

---

# 22. No External Exercise API Yet

Do not integrate ExerciseDB, MuscleWiki, or another external provider in this milestone.

Continue using existing static exercise metadata.

External images/video demonstrations can be evaluated after the core workout experience works reliably.

---

# 23. Do Not Implement Yet

Do not implement:

* history calendar UI
* streak calculations
* monthly statistics
* charts
* personal-record detection
* individual set tracking
* rest timers
* workout sharing
* AI workout recommendations
* social features
* nutrition

Those belong to future milestones.

---

# 24. Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
git diff --check
```

Resolve all errors.

Functionally verify:

1. User sees the correct next workout day.
2. Start Workout creates one workout.
3. Exercise snapshots are created.
4. Default weights appear.
5. Exercises can be checked and unchecked.
6. Weight changes persist.
7. Refresh preserves progress.
8. Duplicate active workouts are prevented.
9. Workout can be completed.
10. `completed_at` is stored.
11. Completed workout advances the sequence.
12. Cancelled workout does not advance it.
13. User cannot access another user's workout.
14. Mobile layout works at common phone widths.

---

# Definition of Done

The following flow must work:

```text
Open Buff Me Up
      ↓
Friday, August 14
      ↓
Today's Workout: Push
      ↓
Start Workout
      ↓
Bench Press
185 lb
✓
      ↓
Incline Press
60 lb
✓
      ↓
...
      ↓
Finish Workout
      ↓
Workout Complete
      ↓
Recorded automatically
      ↓
Next workout: Pull
```

The workout must survive browser refresh and navigation.

---

# Completion Report

Return:

1. Files created
2. Files modified
3. Workout start logic
4. Next-workout selection logic
5. Exercise snapshot behavior
6. Weight tracking
7. Previous-weight functionality
8. Exercise completion behavior
9. Progress tracking
10. Workout finish behavior
11. Workout cancellation behavior
12. Date/time handling
13. Security/ownership handling
14. Database changes or new migration
15. Verification results
16. Mobile testing performed
17. Known limitations
18. Any deviations from this prompt

Do not begin Milestone 5 automatically.
