# Buff Me Up — Capacitor iOS Native Authentication and Deep Linking

## Objective

Fix Google OAuth for the Capacitor iOS version of Buff Me Up.

The native application currently loads the deployed Vercel application successfully inside Capacitor, but Google authentication leaves the app and returns the user to Safari.

The desired native flow is:

```text
Buff Me Up iOS app
      ↓
Continue with Google
      ↓
Google authentication
      ↓
Supabase callback
      ↓
Deep link back into Buff Me Up
      ↓
Authenticated app session
      ↓
/app
```

The existing web authentication flow must continue to work unchanged for normal browser users.

---

# Current Architecture

Buff Me Up uses:

* Next.js App Router
* Supabase Auth
* Google OAuth
* PKCE
* `@supabase/ssr`
* Vercel
* Capacitor iOS

Current production web URL:

`https://buff-me-up.vercel.app`

Current native bundle ID:

`com.laurinvasquez.buffmeup`

Capacitor is currently loading the deployed Vercel application using the native WebView.

Do not break existing web authentication.

---

# 1. Detect Native Capacitor Runtime

Add a small reusable runtime helper that safely detects whether the application is running inside Capacitor.

Use the official Capacitor runtime APIs rather than user-agent detection.

Example conceptual behavior:

```text
isNativeApp()
```

returns true only when running inside the native Capacitor shell.

Normal Safari/Chrome/Vercel usage must continue using the existing web OAuth flow.

---

# 2. Native Redirect Scheme

Configure a custom URL scheme for Buff Me Up.

Use:

`com.laurinvasquez.buffmeup`

with an auth callback such as:

```text
com.laurinvasquez.buffmeup://auth/callback
```

or another clean equivalent.

The scheme must be registered in the iOS project.

Follow Capacitor's current iOS deep-link guidance.

Do not invent a web URL for the native callback.

---

# 3. Supabase Redirect Configuration

The native redirect must be compatible with Supabase Auth.

The native callback URI should be added to the Supabase Authentication redirect allow list.

Expected example:

```text
com.laurinvasquez.buffmeup://auth/callback
```

Document the exact URI the owner must add.

Keep existing web redirects such as:

```text
http://localhost:3000/auth/callback
https://buff-me-up.vercel.app/auth/callback
```

Do not remove or replace them.

---

# 4. Google OAuth Behavior

Update the Google sign-in logic so:

## Web

Normal browser use continues to use:

```text
https://current-origin/auth/callback
```

## Capacitor iOS

Native runtime uses the registered native redirect URI.

Example:

```text
com.laurinvasquez.buffmeup://auth/callback
```

Use Supabase's supported OAuth/deep-link flow.

Do not hard-code localhost.

---

# 5. Capacitor App Plugin

Install and use the Capacitor App plugin if not already installed.

The application must listen for native deep-link events.

Handle:

```text
appUrlOpen
```

or the current official equivalent.

When the application receives:

```text
com.laurinvasquez.buffmeup://auth/callback?...
```

extract the OAuth authorization information safely.

Do not log:

* authorization codes
* access tokens
* refresh tokens

---

# 6. PKCE Compatibility

The web app currently uses PKCE.

Preserve PKCE security.

Ensure the native flow correctly exchanges the returned authorization code for a Supabase session.

Do not switch the entire application to an insecure authentication strategy merely to simplify native OAuth.

If the current SSR cookie-based PKCE architecture cannot directly complete inside the native shell, implement the smallest clean bridge necessary between the native callback and the deployed Next.js application.

Document the reasoning.

---

# 7. Session Establishment

After successful native OAuth:

* Supabase session must exist
* authenticated application state must be available
* user should navigate to `/app`
* `gym_profiles` behavior must remain intact

Closing and reopening Buff Me Up should retain authenticated behavior according to the existing Supabase session strategy.

---

# 8. External Browser Handling

Google OAuth may open an external browser/authentication session if required by iOS.

That is acceptable.

The critical behavior is that successful authentication returns the user into Buff Me Up automatically.

Do not leave the user stranded in Safari.

---

# 9. Deep-Link Routing

Handle deep links defensively.

Only recognized Buff Me Up routes should be processed.

At minimum:

```text
/auth/callback
```

Unknown deep links should not execute arbitrary navigation.

---

# 10. iOS Configuration

Update the Capacitor iOS project as necessary.

Possible required changes include:

* URL Types
* CFBundleURLSchemes
* Capacitor App plugin configuration
* Info.plist changes

Use:

```text
com.laurinvasquez.buffmeup
```

Do not change the bundle identifier.

---

# 11. Existing Web Flow Must Remain Working

Verify that normal web authentication still works:

```text
Safari/Chrome
   ↓
Google OAuth
   ↓
https://buff-me-up.vercel.app/auth/callback
   ↓
/app
```

Native-specific logic must not break the deployed SaaS experience.

---

# 12. Capacitor Configuration

Review `capacitor.config.ts`.

Current native prototype may use:

```ts
server: {
  url: 'https://buff-me-up.vercel.app',
  cleartext: false,
}
```

Do not silently treat this as the final App Store architecture.

Capacitor documentation states that `server.url` is intended for live-reload/development use rather than production.

Keep it only for the current prototype unless a better architecture is implemented as part of this task.

Document this limitation clearly.

---

# 13. Xcode Console Warnings

The current app may log messages such as:

```text
Could not create a sandbox extension
WebContent process became unresponsive
JS Eval error
```

Investigate only if they are causally related to authentication or navigation.

Do not spend excessive time eliminating harmless WebKit/LLDB diagnostic warnings.

The priority is functional OAuth return-to-app behavior.

---

# 14. Dependencies

Add only dependencies genuinely required for native deep linking/auth.

Likely candidate:

```text
@capacitor/app
```

Avoid unnecessary authentication libraries if Supabase + Capacitor can handle the flow cleanly.

---

# 15. Sync Native Project

After changes, run the appropriate Capacitor synchronization command:

```bash
npx cap sync ios
```

Ensure the native iOS project contains the updated configuration.

---

# 16. Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
git diff --check
```

Also verify native configuration compiles.

Manual native test:

1. Launch Buff Me Up on physical iPhone.
2. Tap Continue with Google.
3. Complete Google authentication.
4. Confirm Buff Me Up reopens automatically.
5. Confirm authenticated dashboard appears.
6. Close Buff Me Up.
7. Reopen it.
8. Confirm authentication/session behavior is correct.
9. Sign out.
10. Confirm native login can be performed again.
11. Confirm web login at the production Vercel URL still works.

---

# Completion Report

Return:

1. Files created
2. Files modified
3. Dependencies added
4. Native runtime detection strategy
5. Native redirect URI
6. Capacitor deep-link configuration
7. iOS URL scheme configuration
8. OAuth flow changes
9. PKCE/session handling
10. Supabase dashboard configuration required
11. Web-auth compatibility
12. Capacitor config changes
13. Verification results
14. Manual Xcode/iPhone steps
15. Known limitations
16. Whether `server.url` remains in use
17. Recommended path toward App Store-ready architecture

Do not start unrelated product features.

# Additional Requirement — Use Existing Buff Me Up Logo as Native iOS Icon

The project already contains a Buff Me Up logo/icon created for the web application, currently available as an application asset such as:

`app/icon.svg`

Reuse the existing Buff Me Up branding for the native iOS application.

## Requirements

1. Inspect the existing Buff Me Up logo/icon asset.
2. Use that design as the source for the native iOS app icon.
3. Generate the appropriate iOS icon assets required by the Xcode asset catalog.
4. Configure the Capacitor iOS project so Buff Me Up displays the correct icon:

   * on the iPhone Home Screen
   * in the App Library
   * in iOS system surfaces where the application icon is used
5. Do not replace the existing logo with unrelated branding.
6. Preserve the current Buff Me Up visual identity.
7. Ensure the icon has appropriate padding/background treatment for iOS and is not visibly clipped.
8. Do not rely solely on the existing web/PWA SVG; configure the native `AppIcon` asset catalog correctly.
9. After generating/configuring the assets, run:

```bash
npx cap sync ios
```

and verify the iOS project still builds successfully.

## Existing Application Identity

App name:

`Buff Me Up`

Bundle identifier:

`com.laurinvasquez.buffmeup`

The native application name and icon should consistently use this branding.

## Verification

Confirm in the completion report:

* source logo used
* native icon files/assets created
* Xcode asset catalog updated
* Home Screen icon configured
* build verification result
* any manual Xcode action still required
