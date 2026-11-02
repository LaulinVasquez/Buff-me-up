# Responsive layout — BMU-009

The phone experience remains the default. CSS breakpoints progressively add room rather than scaling the phone screen or inspecting the browser user agent.

| Viewport | Navigation and content |
| --- | --- |
| Below 640px | Single-column screens, bottom navigation, retained safe-area padding. Navigation labels fit 320px. |
| 640–767px | Wider gutters; the exercise library can show two cards per row. |
| 768–1023px | Content capped at 768px; appropriate plan, generator, session and exercise grids use two columns. Bottom navigation remains. |
| 1024–1279px | 240px sidebar; content uses the remaining width. Workout Finish/Cancel become a sticky side panel. Dashboard/profile/details use columns. |
| 1280px and above | History chart and summary/calendar sit alongside each other, with a taller graph. Library uses three columns; workout exercises use two beside the action panel. |
| 1536px and above | Recommended plans can use three columns. Main content remains capped at 1280px for readability. |

`ApplicationShell` owns the authenticated presentation and accepts the existing user menu; authentication remains in the server layout. One `AppNavigation` changes orientation using CSS and retains route-aware active links. It stays hidden during phone/tablet workouts and is visible on desktop. A keyboard skip link goes directly to content.

`WorkoutLayout` accepts the existing exercise cards and forms. It renders each form once, preserving action/pending/confirmation behavior while changing placement. Mobile bottom padding reserves room for those controls; the desktop panel stays near the top while scrolling.

Form inputs can shrink inside grids, long headings can wrap, and History session cards explicitly permit shrinking/truncation. No chart library, responsive JavaScript listener, authentication bypass, database change or new dependency is shipped.

## Verification performed — 2026-11-02

- Lint, production build, sequential typecheck, and all 12 existing History aggregation/date tests pass.
- Measured document `clientWidth` and `scrollWidth` for 11 screens at 320/390/768/1024/1440px: 55 checks, no horizontal page overflow after the session-card fix.
- Screens: landing, dashboard, plans, plan detail, generator, exercise library/detail, History/detail, profile, active workout.
- Expanded plan edit/add forms, initially open in the fixture, fit at 320/768/1024px. These measurements establish layout, not native disclosure behavior or persistence.
- Observed bottom navigation below 1024px, sidebar at/above 1024px, hidden mobile workout navigation, fixed mobile actions and sticky desktop actions. A scrolled desktop workout kept actions 24px from the viewport top. A 1440px workout displayed two 386px exercise cards beside a 288px action panel.
- History metric switching, annual totals, arrow-key selection and year → month → day links remain usable; generator produced a 3-day phone layout and 4-day desktop grid and returned to settings with Start over.

The isolated Next preview imported the actual shared shell/navigation and client components. Server-page presentation was copied with service calls replaced by synthetic fixtures and server-action stubs. True iframe document viewports were used for width measurements because the desktop browser can clamp small window sizes. Fixture screenshots are labeled sample data; they are not evidence of real account/device acceptance. The temporary preview was removed and its localhost server stopped before final checks.

## Staging/device checklist still required

With dedicated staging accounts and synthetic workouts, run `npm run dev` and check each screen at the widths above, including 1023/1024px and 1279/1280px transitions. Resize during an active workout and confirm there is one reachable Finish/Cancel form. Open plan edit/add forms, exercise instructions and the attendance calendar with both pointer and keyboard; confirm focus is visible and no content is covered by navigation. Verify the skip link, long plan/user/exercise names, browser zoom, portrait/landscape safe areas and a short desktop viewport.

Finish/cancel and save/reload using staging records, exercise search/pagination, Google sign-in/out, native iPhone and installed-PWA behavior remain acceptance work. No persistence or OAuth operation was performed for the layout preview. Do not use real user data for acceptance fixtures.
