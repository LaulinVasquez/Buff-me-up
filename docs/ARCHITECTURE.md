# Architecture

## Current architecture

Buff Me Up is one Next.js App Router application. Server Components are the default; Client Components are reserved for browser-only interaction. Tailwind styles are mobile-first.

## Application layers

- `app/` — routes, layouts, and route composition
- `components/` — reusable presentation
- `lib/` — services and integrations
- `lib/supabase/` — browser/server clients, config validation, session refresh
- `types/` — shared and future generated database types
- `data/` — future static reference data
- `supabase/migrations/` — future PostgreSQL migrations

## Supabase strategy

`@supabase/ssr` supplies separate browser and server factories. The proxy refreshes cookies with verified claims, protects `/app/*`, and redirects authenticated users away from `/`. The PKCE callback exchanges the code and idempotently upserts `gym_profiles`. Only the public URL and publishable key are exposed.

`gym_profiles` and its RLS policies, trigger, and function use the `gym_` prefix to isolate them from FlowDesk in the shared project. Synchronization happens in the Buff Me Up callback rather than through a shared `auth.users` trigger.

In Capacitor, OAuth uses `com.laurinvasquez.buffmeup://auth/callback` in Capacitor Browser. The App plugin delivers that URL to the deployed WebView. The OAuth request and callback exchange use the same browser Supabase client, so its persisted PKCE verifier is available for the one-time code exchange without exposing secrets to a bridge. The session uses the existing cookie strategy and profile RLS policies. Browser runtimes continue to use the server-side `/auth/callback` unchanged.

## Main routes

- `/` — public Google sign-in entry
- `/auth/callback` — OAuth exchange and profile synchronization
- `/app` — date-aware workout dashboard
- `/app/plan/[planId]` — plan and exercise management
- `/app/workout/[workoutId]` — persistent workout execution
- `/app/history/[workoutId]` — attendance calendar and snapshots
- `/app/profile` — account and consistency summary

## Workout-plan foundation

Workout persistence follows two ownership trees: users own plans, which own days and exercises; users also own workout sessions, which own workout-exercise snapshots. Nested RLS policies resolve ownership through these parent relationships.

Static recommendations live in `data/recommended-plans.ts`. The `gym_adopt_recommended_plan` database function copies a complete template atomically, while `gym_activate_workout_plan` atomically switches the active plan. A partial unique index guarantees at most one active plan per user. Server-only operations in `lib/workouts/` always derive the user ID from verified Supabase claims.

## Workout execution

`getNextWorkoutDay` advances through the active plan's ordered days using only the most recent completed workout for that plan; cancelled sessions do not advance the sequence. Any in-progress workout takes priority and is resumed.

`gym_start_workout` atomically creates a session and immutable exercise snapshots. A partial unique index prevents concurrent in-progress sessions. Workout weights, completion flags, and status remain database-backed, so refreshes and navigation do not lose progress.

## History and local dates

Attendance is derived from `gym_workouts.status = 'completed'` and `completed_at`; cancelled and in-progress sessions never count. Month queries select only a padded UTC boundary window, then the client groups timestamps using its IANA timezone. The timezone and selected month are retained in the History URL for refresh-safe navigation.

Streaks count consecutive distinct local attendance days ending today or yesterday, so a user does not lose yesterday's active streak at the start of today. Only narrow `completed_at` projections are loaded for all-time attendance calculations; calendar queries and recent workout details remain bounded.

## Security model

The proxy validates claims and protects every `/app` route. Server operations derive identity from the session and never accept a user ID. Direct-owner tables use `auth.uid()`; nested rows resolve ownership through parents. Buff Me Up shares Supabase Auth with FlowDesk but creates and references only `gym_` application objects.
