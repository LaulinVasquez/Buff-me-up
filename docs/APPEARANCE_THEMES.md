# Appearance themes — BMU-011

## User behavior

Profile → Appearance offers Lime (default), Ocean Blue, Purple, Orange and Rose. Choosing a radio card previews the color in the current Profile view, including navigation, controls and a labeled sample chart. Save persists the selection to the signed-in account; Cancel restores the saved choice. Reset to default previews Lime and still requires Save. Leaving Profile discards an unsaved preview.

Saved colors apply to authenticated pages on subsequent loads/refreshes, including on another device. There is no realtime cross-device push. The dark backgrounds stay the same. Completion stays green, warning/error states keep their semantic colors, and brand/favicon/Google assets retain their own colors. Light mode and arbitrary custom-color input are outside this release.

## Implementation

- `lib/appearance/themes.ts`: five trusted palettes, validation, normalization and CSS variables. Invalid stored reads fall back to Lime; writes reject invalid selections.
- `app/globals.css`: shared Tailwind accent tokens, theme-tinted page glow and fixed semantic success tokens. Existing primary accents now reference these tokens, including chart shadows; unselected chart bars use 75% opacity to retain contrast with each palette.
- `ThemeProvider`: saved theme is passed from the authenticated server layout and applied in server-rendered markup. State is keyed by user ID and transient preview is restricted to Profile. No localStorage/theme cookie is shipped.
- `AppearanceSettings`: accessible controlled radio group, labeled sample preview, saved/preview labels and Save/Cancel/Reset/error/pending states. Preventing the native form action reset keeps radio selection synchronized with the visible color after successful or failed saves.
- `saveAppearanceAction`: allowlist validation and authoritative authenticated user lookup, owner-ID-filtered update of only `accent_theme`, existing RLS, and authenticated-layout revalidation. A failed request does not pretend to confirm persistence; retry or reload to check.
- Migration `20261102010000_add_profile_accent_theme.sql`: one non-null checked profile column, default `lime`; no policy/permission changes, destructive SQL, new table or package.

The feature is based on merged Gym is packed PR #6 (`aa44d5f`), so its primary controls receive the same theme tokens. The appearance PR targets `main`. No merge or production rollout is performed here.

## Verification and limits

Exact command outcomes and Git references are in `AGENT_SESSION_LOG.md`. Pure tests check palette validation/normalization/token mapping and contrast targets (4.5:1 for accent text/button labels, 3:1 for chart bars/focus against the tested dark surfaces). This is palette coverage, not a claim of full-site accessibility certification.

The disposable PostgreSQL suite tests defaults, allowed IDs/reset, invalid/null values, preservation of profile fields/callback-style upsert and user/anonymous isolation. Browser checks use actual provider/settings/shell/History components with synthetic fixture accounts and cookie-backed fixture actions. They verify live preview, explicit cancel/reset/save, keyboard selection, repeated saves/failures, saved reload, discarded previews on navigation, separate fixture accounts, History colors/glows and unchanged green completion. All 25 theme/width combinations (five presets × 320/390/768/1024/1440px) fit without horizontal page overflow and keep the selected radio/theme aligned. The temporary preview is removed before final build/typecheck. Screenshots are labeled synthetic data, not real-account requirements evidence.

Production server-action/PostgREST, actual OAuth callbacks, cross-device account loads and physical iPhone/PWA behavior still need designated staging evidence. No real user data or remote database was used.

## Staging acceptance and rollout

1. Apply migration 8 to designated staging. Existing accounts should default to Lime; no names, avatars or workout data should change. The preceding Gym is packed migration remains required by that feature's progress forms.
2. Sign in with synthetic account A. Preview every color, use arrow keys on the radio group and verify visible focus. Cancel and leave Profile without saving; both must restore the saved color. Reset previews Lime; save it to persist the reset.
3. Save a non-default color. Reload and navigate through dashboard, plans/generator, exercise library/details, workout/swap picker and History/details. Check primary controls, focus, chart bars/glows and fixed completion/error/warning colors at phone/desktop sizes.
4. Sign out and back in, then sign into A on another browser/device. The saved color must persist. Switch to synthetic account B: A's saved/preview color must not leak into B. Public sign-in keeps the default branding.
5. Simulate a failed save in staging: show an actionable error, keep controls consistent with the preview, allow cancel/retry and avoid falsely reporting success. Verify radio selection after repeated success/failure, and confirm a missing profile or expired session fails safely.
6. Review the PR and rollout dependency before any separately approved production migration/deployment. No production migration, merge, release or native signing occurred in this session.
