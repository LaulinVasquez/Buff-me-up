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

## Planned routes

- `/` — public Google sign-in entry
- `/auth/callback` — OAuth exchange and profile synchronization
- `/app` — protected authenticated shell
- `/app/workouts` — future plans and training days
- `/app/history` — future completed workouts, attendance, and streaks

Future workout routes will live under `app/app/`, reusable domain UI in `components/`, and data access in `lib/`. No workout implementation exists yet.

## Workout-plan foundation

Workout persistence follows two ownership trees: users own plans, which own days and exercises; users also own workout sessions, which own workout-exercise snapshots. Nested RLS policies resolve ownership through these parent relationships.

Static recommendations live in `data/recommended-plans.ts`. The `gym_adopt_recommended_plan` database function copies a complete template atomically, while `gym_activate_workout_plan` atomically switches the active plan. A partial unique index guarantees at most one active plan per user. Server-only operations in `lib/workouts/` always derive the user ID from verified Supabase claims.
