# Gym App — Milestone 0: Project Foundation

You are building a production-ready MVP gym tracking SaaS application.

The project must prioritize:

* Fast implementation
* Clean architecture
* Mobile-first usability
* Maintainability
* Strong TypeScript usage
* Supabase integration
* Vercel deployment compatibility

The owner intends to use this application personally at the gym immediately after deployment.

## Product Vision

The application allows users to:

* Sign in with Google
* Choose a recommended workout plan or build their own
* Organize workouts by training day
* View today's workout
* Check off exercises while training
* Record completed workouts
* Track gym attendance
* View workout history and streaks

Future functionality may include:

* Individual set tracking
* Progressive overload
* Personal records
* Analytics
* AI-generated plans
* Exercise libraries
* Nutrition integrations

Do not implement those future features unless specifically requested.

---

## Technology Stack

Use:

* Next.js
* App Router
* TypeScript
* Tailwind CSS
* Supabase
* PostgreSQL through Supabase
* Vercel for deployment

Use the current stable versions compatible with one another.

Do not introduce unnecessary technologies.

Do not use:

* Express
* Separate backend servers
* Firebase
* Prisma unless explicitly requested later
* Redux unless there is a demonstrated need
* Native mobile frameworks

The application should remain a responsive web application.

---

## Milestone 0 Objective

Create the complete project foundation.

Do NOT implement the workout system yet.

The purpose of this milestone is to establish a clean base for subsequent milestones.

---

## Requirements

Initialize the Next.js application with:

* TypeScript
* App Router
* Tailwind CSS
* ESLint
* Strict TypeScript configuration

Install and configure the Supabase dependencies needed for browser and server-side authentication.

Create an organized project structure suitable for the upcoming application.

Suggested areas include:

* app
* components
* lib
* lib/supabase
* types
* data
* supabase/migrations

Do not over-engineer the folder structure.

---

## Environment Variables

Create:

`.env.example`

Include placeholders for the Supabase environment variables required by the application.

Never commit actual credentials.

The owner will manually configure the real values.

The application should fail gracefully or clearly communicate missing configuration during development.

---

## Supabase Foundation

Prepare reusable Supabase utilities for:

* Browser/client usage
* Server-side usage
* Middleware/session handling if required by the current Supabase SSR architecture

Follow Supabase's current recommended Next.js authentication approach.

Do not implement Google authentication yet.

That will be completed in Milestone 1.

---

## Application Shell

Create a minimal application shell.

The public root page can simply identify the product and indicate that authentication will be added next.

Create the basic protected application route structure under:

`/app`

Do not build the dashboard functionality yet.

Prepare the architecture so Milestone 1 can protect this route through authentication.

---

## UI Direction

The application will be primarily used from a phone while exercising.

Design decisions should therefore prioritize:

* Large touch targets
* Easy one-handed interaction
* High readability
* Minimal visual clutter
* Fast navigation
* Responsive layouts

Use a modern SaaS aesthetic.

Keep the initial shell simple because the full UI will be developed in later milestones.

---

## Quality Requirements

The project must successfully pass:

* TypeScript checking
* ESLint
* Production build

Resolve all errors before considering the milestone complete.

Avoid placeholder code that breaks builds.

Avoid `any` unless genuinely necessary.

Do not leave unused imports or dead code.

---

## Documentation

Update the README with:

* Project description
* Technology stack
* Local setup instructions
* Required environment variables
* Development command
* Production build command

Also create:

`docs/ARCHITECTURE.md`

Document:

* Current architecture
* Application layers
* Supabase strategy
* Planned high-level route structure
* Where future workout functionality will live

Keep it concise.

---

## Important Constraints

Do not implement authentication yet.

Do not create database workout tables yet.

Do not build workout plans yet.

Do not build exercise tracking yet.

Do not implement AI features.

Do not add unnecessary dependencies.

Keep this milestone focused exclusively on the foundation.

---

## Completion Report

When finished, provide a concise report containing:

1. Files created
2. Files modified
3. Dependencies added
4. Architecture established
5. Environment variables required
6. Verification performed
7. Any manual steps required from the owner

Do not proceed to Milestone 1 automatically.

Stop after Milestone 0 and wait for review.
