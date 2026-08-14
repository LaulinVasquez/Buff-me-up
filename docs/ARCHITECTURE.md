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

`@supabase/ssr` supplies separate browser and server factories. The root Next.js proxy refreshes authentication cookies when configured but does not enforce authentication. Only the public URL and publishable key are exposed. Database types will be generated after schemas exist. Milestone 0 configures no tables or providers.

## Planned routes

- `/` — public product and sign-in entry
- `/app` — future authenticated shell/dashboard
- `/app/workouts` — future plans and training days
- `/app/history` — future completed workouts, attendance, and streaks

Milestone 1 will add Google authentication and protect `/app`. Workout routes will live under `app/app/`, reusable domain UI in `components/`, and data access in `lib/`. No workout implementation exists yet.
