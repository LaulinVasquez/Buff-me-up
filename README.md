# Buff Me Up

Buff Me Up is a mobile-first gym tracking SaaS with authentication, plan management, and a persistent phone-first workout execution flow.

## Technology stack

- Next.js App Router, strict TypeScript, and Tailwind CSS
- Supabase SSR, Supabase Auth, and PostgreSQL
- Vercel-compatible deployment

## Local setup

1. Install Node.js 20.9 or newer and run npm install.
2. Copy .env.example to .env.local and add the public Supabase values.
3. Apply the migrations in supabase/migrations to the shared project.
4. Complete Google OAuth configuration below.
5. Run npm run dev.

## Environment variables

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

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
4. Allow http://localhost:3000/auth/callback and https://YOUR_DOMAIN/auth/callback.
5. For Vercel previews, add a suitably scoped preview wildcard callback.

Google redirects to Supabase, which returns to the application callback for the PKCE session exchange.

### Vercel

Set both public Supabase variables for Preview and Production. Add each deployment callback origin to Supabase. OAuth requires manual testing because provider credentials are not stored here.

## Commands

- npm run dev - development server
- npm run typecheck - strict TypeScript checking
- npm run lint - ESLint
- npm run build - production build
- npm start - production server

See docs/ARCHITECTURE.md for project boundaries.

## Workout foundation

Apply migrations in timestamp order. The Milestone 2 migration creates only `gym_`-prefixed workout objects in the shared Supabase project. Recommended plans remain static application data and are copied into user-owned rows when adopted.

The Milestone 4 migration adds duplicate-active-workout protection and the atomic workout snapshot function. Apply it before using Start Workout.
