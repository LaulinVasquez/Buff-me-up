# Gym is packed mode — BMU-010

## User flow

1. Open an in-progress workout and select **Equipment busy? Swap exercise** under an unfinished exercise.
2. Choose available equipment. For an unclassified custom exercise, first select its primary muscle group.
3. Review an alternative, its instructions and the retained set/rep targets. The original saved weight is kept in swap history; the replacement starts with a blank weight. Unsaved card edits are explicitly discarded by the confirmed swap.
4. Select **Use for this session**, or keep the original exercise. The saved plan and other exercises remain unchanged.
5. Resume/reload the workout to continue the replacement. Finished History details show both the performed replacement and its prior swap records.

The first release replaces one exercise at a time using the 29-entry bundled catalog. Matching uses the same primary muscle, and the same compound/isolation type when known; it is not a claim that movements or loads are interchangeable. Known aliases and all existing session exercises are excluded. If there is no match, the original stays available. No remote API, AI model, automatic occupancy detection or whole-session rewrite is involved.

## Data and concurrency

Migration `20261102000000_add_workout_substitutions.sql` adds JSON replacement details/history and an integer version to the existing owner-protected snapshot table. Existing records get version zero and empty history; stored plans, names, weights and statuses are not backfilled or rewritten. There are no new tables, packages or elevated functions.

Swaps verify workout ownership/status and reject completed exercises, duplicate names/IDs, invalid payloads, stale versions and a changed reviewed timestamp. The existing snapshot row retains its order and targets. A trigger archives original data, increments the version, clears the old template reference (avoiding incorrect previous-weight lookups) and resets the replacement weight. Repeated swaps append records rather than overwriting the original. Swap records remain subject to the completed-workout immutability guard.

Progress uses `gym_update_workout_progress` with the expected version. Progress, swap and finish operations serialize through the owned parent workout lock. Old forms cannot apply weights/completion to a replacement, and old unversioned clients are also blocked from changing replacement progress. They must refresh into the updated application. These checks preserve the existing RLS and authentication boundaries.

## Verification evidence

Automated command outcomes and Git/PR references are in `AGENT_SESSION_LOG.md`. The isolated browser preview imports the actual picker, swap-history component, application shell and workout layout with synthetic rows and a cookie-backed fixture action. It verifies interaction/layout, not the production action, Supabase/PostgREST or authentication. Local PostgreSQL tests verify the real migration/RPCs separately. No real user records or external database were used.

Browser checks cover equipment filtering, radio selection/review, blank replacement weight and retained original weight after a fixture swap/reload, preserved completed-card data, manual muscle choice, no alternatives, keep-original cancellation and error/refresh controls. Four scenarios at 320/390/768/1024/1440px produced 20 open-picker measurements with no horizontal page overflow. The temporary preview is removed before final build/typecheck. Screenshots are labeled synthetic fixtures and are not real-account requirements evidence.

## Staging acceptance and rollout

Apply migration 7 **before** deploying this application version: all new weight/completion forms depend on the progress RPC. Test first on a designated staging Supabase project with synthetic users/workouts. A production migration or deployment requires separate approval. Do not downgrade to an older app while replacement workouts are active; older clients cannot save their progress and must refresh to the version-aware app.

- [ ] User A starts a two-or-more-exercise session; finish one exercise and leave another unfinished with a saved weight.
- [ ] Open the picker at 320/390px and desktop width. Verify equipment filtering, matching focus, visible keyboard focus, radio navigation, keep-original cancellation and disabled submission until a choice is made.
- [ ] Swap an unfinished exercise. Reload/resume: confirm the new name/instructions, blank initial replacement weight, unchanged targets/order/count and original weight in swap history.
- [ ] Save a new replacement weight, complete it, finish the workout, and inspect History details. Confirm completed exercises and the saved routine did not change. Start the next applicable session and confirm it still uses the original routine.
- [ ] Open two tabs before swapping. After one tab swaps, attempt a weight/completion save in the stale tab; it must fail without changing the replacement. Refresh to continue.
- [ ] Save a weight or complete/finish the workout after another tab opened a picker. Submitting that stale review must fail without discarding newer work.
- [ ] Repeat a swap and verify the chain retains both originals. Try an already-used alternative, an unknown custom move, no alternatives and a failed request.
- [ ] Verify user B and signed-out users cannot read/write A’s session/swap records. Check Google sign-in/session refresh, PostgREST function availability and real iPhone/PWA behavior.

These signed-in/device checks remain pending until a designated staging environment is available. No production rollout is inferred from a passing local test or a Git merge.
