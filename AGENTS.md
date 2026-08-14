# Gym App — Milestone 1: Google Authentication

IMPORTANT — SHARED SUPABASE PROJECT

Buff Me Up shares an existing Supabase project with another application called FlowDesk.

Do not modify, rename, delete, reference, or depend on any existing FlowDesk application tables.

Supabase Auth is intentionally shared between the applications.

Every database table owned by Buff Me Up must use the `gym_` prefix.

For Milestone 1:
- Create `gym_profiles`, NOT `profiles`.
- All RLS policies must apply specifically to `gym_profiles`.
- Authentication may use the existing Supabase `auth.users`.
- Existing FlowDesk users/tables must remain unaffected.

Future Buff Me Up tables will follow the same `gym_` naming convention.

## Objective

Implement complete Supabase authentication using Google OAuth.

At the end of this milestone, the following flow must work:

1. Logged-out user visits the application.
2. User selects **Continue with Google**.
3. Google authentication completes.
4. Supabase establishes the authenticated session.
5. User is redirected to `/app`.
6. `/app` cannot be accessed while logged out.
7. Logged-in users visiting `/` are redirected to `/app`.
8. User can sign out.
9. After signing out, the user returns to `/`.

Do not implement workout plans, exercises, workout tracking, history, or gym statistics yet.

---

## Existing Architecture

The project already contains:

* Next.js 16 App Router
* TypeScript
* Tailwind CSS
* `@supabase/supabase-js`
* `@supabase/ssr`
* Browser Supabase client
* Server Supabase client
* Root `proxy.ts`
* `/app` application shell
* `.env.example`

Existing architecture should be reused rather than replaced.

Follow the current Supabase SSR authentication architecture.

---

# 1. Google Sign-In

Add a reusable Google authentication component.

Example intent:

`Continue with Google`

Use:

`supabase.auth.signInWithOAuth()`

with Google as the provider.

The OAuth redirect URL should point to an application callback route.

Do not hard-code localhost URLs.

Generate redirect URLs from the application's current origin or another deployment-safe strategy.

The solution must work for:

* localhost
* Vercel preview/production
* mobile browsers accessing the deployed application

---

# 2. OAuth Callback

Create an authentication callback route such as:

`/auth/callback`

The callback must:

1. Receive the authorization code.
2. Exchange the code for a Supabase session.
3. Establish the session through the SSR cookie-based architecture.
4. Redirect successfully authenticated users to `/app`.
5. Handle callback failures gracefully.

Use the existing server-side Supabase utilities.

Do not expose authentication errors, tokens, authorization codes, or sensitive data unnecessarily.

---

# 3. Route Protection

Protect `/app` and future routes under `/app`.

If there is no authenticated user:

`/app/* → /`

If the user is authenticated:

`/ → /app`

Prefer server-side/session-based redirects where appropriate.

Avoid client-side flashing where the protected page briefly appears before redirecting.

Do not rely only on React client state for security.

---

# 4. Session Refresh

Review the existing `proxy.ts` session-refresh implementation.

Ensure it follows the current Next.js 16 and Supabase SSR approach.

The proxy should refresh authentication state where necessary without performing unnecessary work for static assets.

Use an appropriate matcher configuration if required.

Do not replace `proxy.ts` with the deprecated `middleware.ts` convention.

---

# 5. User Profile

Create a `profiles` table using a Supabase SQL migration.

Suggested schema:

```sql
profiles

id uuid primary key
full_name text
avatar_url text
created_at timestamptz
updated_at timestamptz
```

`id` must reference:

`auth.users(id)`

with appropriate cascading behavior.

Enable Row Level Security.

Users must only be able to access or modify their own profile.

Create appropriate RLS policies.

---

# 6. Profile Creation / Synchronization

After a successful first login, ensure the user has a profile record.

Populate available Google metadata such as:

* full name
* avatar URL

The implementation should be idempotent.

Logging in multiple times must not create duplicate profiles.

If profile metadata changes, the application may safely update the stored values.

Do not duplicate authentication data unnecessarily.

Supabase Auth remains the source of truth for authentication.

---

# 7. Application Header

Update the `/app` shell to display basic authenticated user information.

For now show:

* avatar when available
* user name
* sign-out action

Example:

```text
Buff Me Up

                 [Avatar] Laulin
                          Sign out
```

Do not build the final dashboard yet.

The application shell should simply confirm that authentication is functioning.

---

# 8. Landing Page

Improve the existing public landing page enough to support authentication.

Keep it simple.

Suggested structure:

```text
BUFF ME UP

Your workouts.
Your progress.
No unnecessary clutter.

Track your workouts and stay consistent.

[ Continue with Google ]
```

The page should remain:

* mobile-first
* clean
* responsive
* visually polished
* fast

Do not spend excessive time designing the landing page.

Workout functionality is more important.

---

# 9. Sign Out

Implement sign out using Supabase Auth.

Expected flow:

```text
Authenticated user
      ↓
Sign Out
      ↓
Supabase session removed
      ↓
Redirect to /
```

Ensure authentication cookies/session data are correctly cleared.

---

# 10. Authentication Errors

Handle common authentication failures gracefully.

Examples:

* OAuth provider failure
* invalid callback
* expired authentication request
* Supabase unavailable
* missing configuration

Do not expose stack traces to users.

A basic error message is sufficient.

Example:

```text
We couldn't sign you in.

Please try again.

[ Try Again ]
```

---

# 11. Database Types

Update the existing database TypeScript types to include the `profiles` table if the project manages Supabase types manually.

Keep strong typing throughout the authentication/profile code.

Avoid `any`.

---

# 12. Security Requirements

Ensure:

* RLS is enabled on `profiles`
* users cannot access another user's profile
* OAuth credentials are never committed
* Supabase secret/service-role keys are not introduced
* authorization codes are not logged
* access tokens are not logged
* server-side authentication is used for protected routes

Only the publishable Supabase key should be exposed to the browser.

---

# 13. Environment Variables

Continue using:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not add a service-role key.

Update `.env.example` if necessary.

---

# 14. Manual Configuration Documentation

Update the README with a concise **Google OAuth Setup** section.

The owner needs clear instructions for configuring:

## Supabase

Explain where to enable Google authentication.

## Google Cloud

Explain where the owner needs to obtain:

* Google OAuth Client ID
* Google OAuth Client Secret

## Redirect URLs

Clearly document which redirect URL must be registered with Google/Supabase.

Account for both:

```text
localhost development
production/Vercel
```

Do not place actual credentials in the repository.

---

# 15. Verification

Before completing the milestone, run:

```bash
npm run typecheck
npm run lint
npm run build
```

Resolve all errors.

If authentication cannot be fully tested because the owner has not yet configured Google OAuth credentials, clearly state what was verified automatically and what requires manual verification.

---

# Do Not Implement Yet

Do not implement:

* workout plans
* workout days
* exercises
* recommended workout plans
* workout sessions
* gym attendance
* streaks
* history
* weights/reps tracking
* analytics
* AI
* nutrition features

Those belong to future milestones.

---

# Definition of Done

Milestone 1 is complete when:

```text
Google login
     ↓
OAuth callback
     ↓
Supabase session
     ↓
Profile exists
     ↓
Redirect /app
     ↓
Protected application
     ↓
Sign out
     ↓
Return /
```

works correctly.

---

# Completion Report

When finished, provide:

1. Files created
2. Files modified
3. Database migration created
4. Authentication flow implemented
5. RLS policies created
6. Environment variables used
7. Verification results
8. Manual steps required from the owner
9. Exact Google/Supabase OAuth configuration the owner must perform
10. Any known issues or limitations

Do not begin Milestone 2 automatically.

Stop after Milestone 1.
