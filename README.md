# Buff Me Up

Buff Me Up is a mobile-first gym tracking SaaS with authentication, plan management, persistent workout execution, and local-timezone history and consistency statistics.

## Features

- Google sign-in and protected user data
- Recommended and custom workout plans
- Ordered workout days and editable exercises
- Refresh-safe workout execution, weights, and completion tracking
- Local-timezone history, attendance, streaks, and weekly consistency
- Installable home-screen manifest for supported phone browsers
- Searchable ExerciseDB library and editable 3–6 day smart plan generator

## Technology stack

- Next.js App Router, strict TypeScript, and Tailwind CSS
- Supabase SSR, Supabase Auth, and PostgreSQL
- Vercel-compatible deployment

## Local setup

1. Install Node.js 20.9 or newer and run npm install.
2. Copy .env.example to .env.local and add the public Supabase values.
3. Apply the migrations below in order to the shared project.
4. Complete Google OAuth configuration below.
5. Run npm run dev.

## Environment variables

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- EXERCISEDB_BASE_URL (optional; defaults to the free keyless ExerciseDB V1 API)

Never commit real credentials.

## Google OAuth setup

Buff Me Up shares Supabase with FlowDesk. Apply only the provided gym-prefixed migration and do not alter FlowDesk tables.

### Google Cloud

1. Configure Google Auth Platform branding, audience, and test users.
2. Create a Web application OAuth client and add localhost and production JavaScript origins.
3. Add https://PROJECT_REF.supabase.co/auth/v1/callback as an authorized redirect URI.
4. Copy the Client ID and Client Secret into Supabase only.

### Supabase

1. Enable Google under Authentication > Providers and enter the Google credentials.
2. Confirm its callback URL exactly matches Google Cloud.
3. Set the production Site URL under Authentication > URL Configuration.
4. Keep `http://localhost:3000/auth/callback` and `https://buff-me-up.vercel.app/auth/callback` in the redirect allow list.
5. Add `com.laurinvasquez.buffmeup://auth/callback` to the redirect allow list.
6. For Vercel previews, add a suitably scoped preview wildcard callback.

Google redirects to Supabase, which returns to the application callback for the PKCE session exchange.

### Vercel

Set both public Supabase variables for Preview and Production. ExerciseDB V1 requires no account or API key. Add each deployment callback origin to Supabase. OAuth requires manual testing because provider credentials are not stored here.

## Commands

- npm run dev - development server
- npm run typecheck - strict TypeScript checking
- npm run lint - ESLint
- npm run build - production build
- npm start - production server

See docs/ARCHITECTURE.md for project boundaries.

## Capacitor iOS prototype

The iOS target registers `com.laurinvasquez.buffmeup` as its URL scheme. Native Google sign-in opens Capacitor Browser and returns through `com.laurinvasquez.buffmeup://auth/callback`. The App listener accepts only that callback route, exchanges the PKCE code, synchronizes `gym_profiles`, and enters `/app`. Callback codes and tokens are never logged.

Run `npx cap sync ios` after native changes and build the `App` scheme in Xcode. A physical-device OAuth check is still required because provider and Supabase dashboard credentials are not in this repository.

`capacitor.config.ts` retains `server.url` to load the production Vercel site for this prototype. Capacitor intends that setting for live-reload-style workflows, so it is not the final App Store architecture. Before shipping, create a Capacitor-compatible local web bundle (or deliberately design a hosted shell), remove `server.url`, and retest routing, persistence, offline/error states, and App Store behavior.

## Supabase migrations

Apply these files in order without modifying already-applied migrations:

1. 20260814000000_create_gym_profiles.sql
2. 20260815000000_create_gym_workout_foundation.sql
3. 20260816000000_add_gym_workout_execution.sql
4. 20260817000000_add_gym_history_index.sql
5. 20260818000000_add_gym_exercise_catalog.sql

All application objects use the gym_ prefix. Recommended templates remain static application data; attendance is derived from completed workouts.

## Vercel deployment

1. Import the repository into Vercel.
2. Configure the public Supabase variables for Preview and Production. ExerciseDB needs no environment variable unless overriding its base URL.
3. Set Supabase's Site URL to the production origin.
4. Allow production and intentionally supported preview /auth/callback URLs.
5. Deploy and run the manual checklist in docs/TESTING.md.

## Current limitations

There is no offline synchronization, per-set tracking, rest timer, personal-record detection, charts, notifications, or external exercise media. An internet connection is required during workouts.
