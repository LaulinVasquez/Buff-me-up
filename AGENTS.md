# Buff Me Up — Milestone 5: History, Attendance, Streaks, and Stats

## Objective

Build the history and consistency layer of Buff Me Up.

At the end of this milestone, users should be able to:

* see which dates they completed workouts
* browse workout history
* open a past workout
* see exercises and weights used
* see workouts completed this month
* see total completed workouts
* see current consistency streak
* see recent activity
* clearly distinguish completed, cancelled, and in-progress workouts

Do not build advanced analytics, charts, PR detection, or social functionality yet.

---

# 1. Attendance Definition

A gym visit counts when:

`gym_workouts.status = completed`

A user does not need to separately mark that they went to the gym.

Cancelled or in-progress workouts must not count as attendance.

Use `completed_at` as the source of truth for attendance.

Do not store redundant attendance rows unless there is a compelling architectural reason.

---

# 2. Local Calendar Dates

History must display workout dates according to the user's local timezone.

For example:

```text
Friday, August 14
```

or:

```text
Aug 14
```

Database timestamps remain UTC-compatible timestamps.

Do not store formatted date strings.

Be careful that a workout completed late at night does not appear on the wrong calendar day because of UTC conversion.

Where local-date grouping requires browser timezone information, use a clean client/server strategy and document it.

---

# 3. History Page

Replace the current History placeholder.

Route:

`/app/history`

The page should contain:

* current month calendar or calendar-like grid
* completed gym days visually marked
* monthly completed-workout count
* current streak
* total completed workouts
* recent workout history

Example:

```text
August 2026

M  T  W  T  F  S  S
               1  2
3  4  ●  6  ●  8  9
10 ● 12 13 ● 15 16

4 workouts this month
🔥 3 workout streak
```

Do not introduce a large calendar library unless clearly necessary.

A lightweight custom month grid is preferred.

---

# 4. Calendar Navigation

Allow basic month navigation:

```text
‹ July       August 2026       September ›
```

Users should be able to inspect previous months.

Future months may be visible but should not show fake activity.

Keep the implementation lightweight.

---

# 5. Workout-Day Markers

Completed workout dates should be visually obvious.

If multiple completed workouts occur on the same calendar day, the calendar may still use one attendance marker for that day.

However, workout counts should still count each completed workout individually unless otherwise documented.

Example:

* 2 workouts on August 14
* attendance days: 1
* total workouts: 2

This distinction should be preserved in the underlying calculations.

---

# 6. Current Streak

Implement a simple and clearly documented streak definition.

For this MVP:

A streak is based on **consecutive gym attendance days**, not consecutive workout sessions.

Example:

```text
Aug 10 — workout
Aug 11 — workout
Aug 12 — workout
```

Current streak:

`3 days`

If Aug 13 has no workout and today is Aug 14, the streak resets.

If today has no completed workout yet but yesterday was part of a streak, the current streak may remain active until the end of today.

Implement this behavior carefully so users do not lose their streak first thing in the morning.

Document the exact rule in code.

---

# 7. Important Streak UX

Do not pressure users or use manipulative messaging.

Display streaks informationally.

Example:

```text
🔥 4-day streak
```

Avoid messaging such as:

* "Don't break your streak!"
* "You failed"
* "You missed yesterday"

The app should remain supportive and neutral.

---

# 8. Monthly Statistics

Display at minimum:

* completed workouts this month
* gym attendance days this month
* total completed workouts
* current streak

Example:

```text
This Month
12 workouts

Gym Days
10

Current Streak
4 days

All Time
48 workouts
```

Do not add chart libraries.

---

# 9. Recent History

Below the calendar/stats, display recent completed workouts.

Example:

```text
Recent Workouts

Aug 14
Pull Day
52 min
5 exercises

Aug 12
Push Day
61 min
5 exercises
```

Sort newest first.

Duration should be derived from:

`completed_at - started_at`

---

# 10. Workout Detail

Allow a user to open a past workout.

Suggested route:

`/app/history/[workoutId]`

Display:

* workout name
* completed local date
* start time
* completion time
* duration
* exercise count
* completed exercise count
* exercises
* recorded weights
* original target sets/reps

Example:

```text
Pull Day

Friday, August 14
5:42 PM – 6:34 PM
52 minutes

Lat Pulldown
120 lb
4 × 8–12

Barbell Row
135 lb
3 × 6–10
```

Use the existing workout snapshots.

Do not rebuild history from the current workout plan.

---

# 11. Cancelled Workouts

Cancelled workouts should not appear as normal completed history.

If useful, include a secondary section or filter for:

`Cancelled`

But do not let them contribute to:

* gym attendance
* streaks
* monthly completed workouts
* total completed workouts

For the MVP, hiding cancelled sessions from the main history list is acceptable.

---

# 12. In-Progress Workout

If a workout is currently in progress, History may show a small informational state, but the primary action should remain:

`Continue Workout`

Do not treat it as completed history.

---

# 13. Dashboard Stats

Update `/app` with compact consistency information.

Example:

```text
Friday, August 14

Today's Workout
Pull Day

🔥 4-day streak
10 workouts this month

[ Start Workout ]
```

If today's workout has already been completed:

```text
Workout complete ✓

Pull Day

🔥 4-day streak
10 workouts this month

Next
Legs
```

Do not overwhelm the dashboard with analytics.

---

# 14. Data Layer

Create clean server-side helpers such as equivalents of:

```text
getWorkoutHistory()
getWorkoutHistoryByMonth()
getWorkoutDetail()
getWorkoutStats()
getCurrentStreak()
getAttendanceDates()
```

Do not trust client-submitted user IDs.

Derive ownership from the authenticated Supabase user.

Reuse existing workout/session data.

---

# 15. Query Efficiency

Avoid loading every historical workout into the browser just to render one month.

Use bounded queries where appropriate.

Examples:

* month start
* month end
* recent N workouts
* total count query

Keep the implementation simple but avoid obviously wasteful data fetching.

---

# 16. No New Attendance Table Unless Needed

Prefer deriving attendance from completed workouts.

Do not add:

`gym_attendance`

unless a real requirement appears that cannot be cleanly represented through completed workout sessions.

For this milestone, completed workouts should remain the source of truth.

---

# 17. Database Changes

Avoid database changes if the current schema already supports this milestone.

If indexes are needed for efficient history queries, a small migration is acceptable.

Potential useful indexes may include:

```text
user_id + status + completed_at
plan_id + status + completed_at
```

Do not create unnecessary database objects.

Any new database object must continue using the `gym_` prefix where applicable and must not affect FlowDesk.

---

# 18. Profile Page

Upgrade `/app/profile` slightly.

Display:

* Google avatar
* name
* email
* total workouts
* gym days
* member since date if available
* sign out

Keep it minimal.

Do not build account settings yet.

---

# 19. Mobile-First UX

History must work well on a phone.

Prioritize:

* readable calendar cells
* clear date markers
* touch-friendly month navigation
* cards instead of tables
* concise workout summaries
* comfortable scrolling
* sticky bottom navigation

Test narrow phone widths.

---

# 20. Empty States

Handle:

## No completed workouts

```text
No workouts yet.

Complete your first workout and it will show up here.
```

## No workouts in selected month

```text
No workouts this month.
```

## No active streak

Display:

```text
Current streak
0 days
```

without negative messaging.

---

# 21. Security

Users must only access their own workout history.

Ensure:

* direct workout-detail URLs are ownership checked
* server queries filter by authenticated user
* nested RLS remains effective
* no client-submitted `user_id`
* guessed workout IDs return not found

---

# 22. Do Not Implement Yet

Do not implement:

* charts
* personal records
* best lifts
* per-set tracking
* rest timers
* body-weight tracking
* photos
* external exercise API
* AI recommendations
* nutrition
* social features
* leaderboards

---

# 23. Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
git diff --check
```

Functionally verify:

1. Completed workout appears on correct local date.
2. Calendar marks completed attendance days.
3. Month navigation works.
4. Multiple workouts on one day are handled correctly.
5. Monthly workout count is correct.
6. Monthly attendance-day count is correct.
7. Total workout count is correct.
8. Current streak is correct.
9. Today's missing workout does not prematurely break yesterday's active streak.
10. Cancelled workouts do not count.
11. In-progress workouts do not count.
12. Workout detail uses snapshots.
13. Duration is derived correctly.
14. Dashboard stats update after workout completion.
15. Unauthorized history URLs are inaccessible.
16. Mobile layout works at common phone widths.

---

# Definition of Done

This user flow must work:

```text
Complete Workout
      ↓
Workout timestamp stored
      ↓
Open History
      ↓
August 14 marked
      ↓
Pull Day appears
      ↓
Open Pull Day
      ↓
See exercises and weights
      ↓
Dashboard stats/streak updated
```

---

# Completion Report

Return:

1. Files created
2. Files modified
3. History UI implemented
4. Calendar implementation
5. Local-date grouping strategy
6. Attendance logic
7. Streak definition and implementation
8. Monthly statistics
9. Dashboard statistics
10. Workout-detail functionality
11. Profile updates
12. Data-access functions
13. Database changes, if any
14. Security/ownership handling
15. Verification results
16. Mobile testing performed
17. Known limitations
18. Any deviations from this prompt

Do not begin Milestone 6 automatically.
