# Buff Me Up — Milestone 3: Plan Management, Exercise Details, and Date-Aware UX

## Objective

Turn the workout-plan foundation into a polished, mobile-first plan-management experience.

At the end of this milestone, users should be able to:

* view their active workout plan
* view today's actual date
* browse recommended plans before selecting one
* inspect the exercises contained in a recommended plan
* view basic exercise examples/instructions
* create a custom plan
* edit workout days
* add, edit, delete, and reorder exercises
* edit sets, reps, default weight, and notes
* activate different plans

Do not build workout execution or workout history yet.

---

# 1. Date-Aware Application UI

The application must prominently use the user's current local date where relevant.

On the main authenticated page, display something similar to:

`Friday, August 14`

Use the browser/user local timezone for display.

Do not hard-code dates.

Do not create unnecessary date columns if existing timestamps already represent the underlying event.

Future workout sessions will use `started_at` and `completed_at` as the source of truth.

Create reusable date-formatting utilities where appropriate.

Avoid timezone bugs caused by converting a local calendar day to UTC prematurely.

---

# 2. Main Dashboard Foundation

Update `/app` to provide a useful pre-workout dashboard.

If there is an active plan, show:

* current date
* active plan name
* number of workout days
* a compact preview of the next/current workout day
* button to manage the plan

Example:

```text
Friday, August 14

Push / Pull / Legs

Your Plan

Push
5 exercises

Bench Press
Incline Dumbbell Press
Shoulder Press
+2 more

[ View Plan ]
```

Do not implement Start Workout yet.

That belongs to Milestone 4.

---

# 3. Recommended Plan Browser

Improve `/app/plan` so users can browse recommended plans before adopting them.

Display cards for:

* Push / Pull / Legs
* Upper / Lower
* 3-Day Full Body

Each card should show:

* plan name
* short description
* number of workout days
* approximate focus
* expandable or navigable preview

Example:

```text
Push / Pull / Legs

3 training days

Push
• Bench Press
• Incline Dumbbell Press
• Shoulder Press
• Lateral Raise
• Tricep Pushdown

Pull
...

Legs
...

[ Use This Plan ]
```

Users must be able to see the actual exercises before selecting the plan.

---

# 4. Exercise Metadata

Extend the static recommended exercise definitions with lightweight metadata where appropriate.

Suggested fields:

```text
name
sets
targetReps
muscleGroup
equipment
instructions
```

Optional:

```text
secondaryMuscles
```

Do not introduce an external exercise API yet.

Do not add API keys.

The recommended plan data should remain static TypeScript data for this milestone.

---

# 5. Exercise Instruction UI

Allow users to open exercise details.

Example:

```text
Bench Press

Chest
Barbell

4 sets
6–10 reps

How to perform

1. Lie on the bench with your feet firmly planted.
2. Grip the bar slightly wider than shoulder width.
3. Lower the bar under control toward the chest.
4. Press upward until the arms are extended.

[ Close ]
```

Use a:

* modal
* drawer
* bottom sheet
* expandable card

whichever best fits a mobile-first gym application.

Keep instructions concise.

Do not pretend these instructions replace professional coaching.

---

# 6. Exercise Visual Foundation

Prepare the exercise data model/UI so a future external visual source can be added cleanly.

For example, the application model may optionally support:

```text
imageUrl
videoUrl
externalExerciseId
```

Do not add these columns to Supabase unless they are needed for user-owned exercise data.

For recommended static exercise definitions, optional fields in TypeScript are sufficient.

Do not call an external API yet.

---

# 7. Custom Plan Creation

Allow users to create their own workout plan.

Flow:

```text
Plan
 ↓
Create Custom Plan
 ↓
Plan Name
 ↓
Create
```

Examples:

* My 5-Day Split
* Strength Program
* Summer Cut
* Full Body

New custom plans should use:

`source = custom`

Do not automatically activate a newly created plan unless that behavior is clearly communicated.

---

# 8. Plan Management

Users must be able to:

* rename plan
* activate plan
* delete plan

Deletion requires confirmation.

Do not allow accidental plan deletion from a single tap.

When deleting the active plan, handle the resulting no-active-plan state gracefully.

---

# 9. Workout Day Management

Within a plan, allow:

* add workout day
* rename workout day
* delete workout day
* reorder workout days

Examples:

```text
Push
Pull
Legs
Rest
Upper
Lower
```

Workout days should remain sequence-based rather than permanently tied to Monday/Tuesday/etc.

Do not introduce weekday scheduling yet.

---

# 10. Exercise Management

Within each workout day, allow:

* add exercise
* edit exercise
* delete exercise
* reorder exercise

Exercise form fields:

```text
Exercise name
Sets
Target reps
Default weight
Notes
```

If useful, optionally include:

```text
Muscle group
Equipment
```

for custom exercises at the application level.

Do not overcomplicate database migrations for optional metadata unless needed.

---

# 11. Weight Input

Default weight should support decimals.

Example:

```text
Bench Press

Sets
[ 4 ]

Target reps
[ 6-10 ]

Default weight
[ 185 ]

Unit
lb
```

For this MVP, use pounds as the default display unit.

Structure the UI so unit preferences could be introduced later.

Do not build unit settings yet.

---

# 12. Recommended Plan Adoption

When a user chooses:

`Use This Plan`

use the existing transactional recommendation-adoption logic.

After adoption:

* new plan becomes active
* user is taken to their plan
* days and exercises are visible immediately
* recommended template itself remains unchanged

Provide appropriate loading and error states.

Prevent duplicate submission from rapid repeated taps.

---

# 13. Multiple Plans

Users may have several plans.

Add a simple plan-switching experience.

Example:

```text
My Plans

● Push / Pull / Legs
  Active

○ Strength Program

○ Full Body

[ + Create Plan ]
```

Users can activate a different plan.

Only one plan may remain active.

---

# 14. Mobile-First UX

This application will primarily be used on a phone in the gym.

Prioritize:

* large tap targets
* bottom sheets/modals
* clear typography
* minimal typing
* easy scrolling
* sticky important actions where appropriate
* no tiny desktop-only controls

Avoid dense tables.

Prefer cards and lists.

---

# 15. Navigation

Complete the basic authenticated navigation:

```text
Home
Plan
History
Profile
```

History can remain a placeholder.

Profile can remain minimal.

The currently active route should be visually clear.

---

# 16. Loading / Empty / Error States

Create useful states for:

* no active plan
* no workout days
* no exercises
* loading plan
* failed plan update
* failed exercise update
* plan deleted
* recommendation successfully adopted

Keep messaging concise.

---

# 17. Do Not Implement Yet

Do not implement:

* Start Workout
* exercise completion checkboxes
* workout session execution
* Finish Workout
* streak calculations
* history calendar
* completed workout history
* individual set tracking
* rest timers
* personal records
* charts
* external exercise API
* AI features
* nutrition

These belong to later milestones.

---

# 18. External Exercise API Preparation

Do not integrate an API in this milestone.

However, keep the exercise-detail component structured so it can later consume richer exercise data from sources such as:

* ExerciseDB
* MuscleWiki
* another approved exercise catalog

The UI should not depend specifically on one provider.

---

# 19. Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Resolve all errors.

Also verify:

* recommended plan can be previewed before adoption
* adopted plan becomes editable
* custom plan can be created
* workout day CRUD works
* exercise CRUD works
* plan activation respects one-active-plan constraint
* plan deletion works safely
* UI works at common phone widths

---

# Definition of Done

A user should be able to perform this flow:

```text
Sign in
   ↓
See today's date
   ↓
Plan
   ↓
Browse recommendation
   ↓
See actual exercises
   ↓
Open Bench Press details
   ↓
Use This Plan
   ↓
Edit plan
   ↓
Add/remove/edit exercises
```

and:

```text
Create Custom Plan
   ↓
Create workout days
   ↓
Add exercises
   ↓
Configure sets/reps/weight
   ↓
Activate plan
```

---

# Completion Report

Return:

1. Files created
2. Files modified
3. UI implemented
4. Date handling implemented
5. Exercise metadata added
6. Exercise details/examples implemented
7. Plan-management functionality
8. Workout-day functionality
9. Exercise CRUD functionality
10. Navigation changes
11. Database changes, if any
12. Verification results
13. Mobile testing performed
14. Known limitations
15. Any deviations from this prompt

Do not start Milestone 4 automatically.
