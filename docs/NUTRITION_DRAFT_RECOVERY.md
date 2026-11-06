# Nutrition draft recovery and synchronization — 2026-11-06

User reported losing form state on reload and a generic meal-save failure after changing cooking-time preferences in another tab. Also requested a warning when a meal exceeds their cooking limit and an inline way to raise that limit. Base: developer-merged PR #23, main `d8376b6`. Follow plan → implement → verify → report → branch/draft PR; no merge/deploy/remote SQL.

## Findings and scope

Meal saving is independently versioned from nutrition preferences. Existing SQL does not reject a new meal merely because preferences changed; the screenshot's generic catch message cannot establish its actual cause. Preserve that boundary and expose safe, actionable conflict/schema/validation failures without revealing database internals. Reproduce preference changes + meal saves in disposable database tests.

Focus on the nutrition flow shown: preference questions, meal/ingredient entry, setup selections and weekly plan review. Use authenticated owner-scoped, versioned, bounded, expiring sessionStorage drafts per browser tab, with visible persistence failure, explicit discard, cleanup on save/cancel/sign-out, and stable retry tokens across reload. No extra server table and no cross-device draft claim. Never auto-submit restored work or restore an automatic AI request.

## Implementation procedure

1. Add validated draft storage and authenticated owner context. Persist incomplete nutrition inputs, wizard position, food search/selected product/quantity, setup editor, date/snack and weekly draft/day/plan name. Restore before accepting edits; reject corrupt/expired/wrong-owner records. Session drafts stay separate across tabs.
2. Make saved data refresh on focus, visibility and owner-scoped change notifications. Use server data for latest preferences/meals while retaining local drafts. Detect changed revisions and offer explicit reconciliation; never silently overwrite another tab's changes or automatically reapprove a changed meal/plan. Preference edits use a three-way comparison so unchanged local fields take current server values; conflict choices remain explicit.
3. Warn beside meal cooking time and on review when it exceeds the saved limit. Offer an explicit update to that time using the existing preference RPC, current owner and expected revision. Preserve every other preference; concurrent updates return latest values for review. Updating preferences does not submit the meal.
4. Replace ambiguous meal errors with safe classifications. Preserve meal revision/idempotent tokens through reload; show refresh/review recovery for conflicts and distinguish missing server setup from a normal stale edit.
5. Verify reload, two-tab changes, inline limit updates, storage failures/account isolation, save/transport retries, corrupt/expired drafts, stale-write guards and full phone/desktop flow. Run meaningful pure tests, disposable SQL/RLS/concurrency, build/types/lint and actual-component synthetic browser checks. Commit/push and open draft PR; deliver any SQL handoff (none planned).

## Boundaries

No real-account testing, provider requests, production-data writes, paid services, remote SQL, merge or deployment. Existing migrations 14–16 remain required. Session storage now intentionally holds unfinished nutrition entries because the user requested reload recovery; isolate by owner/tab and expire/clear them. Local drafts are not a successful database save. Preserved confirmation is valid only against the recorded input/revision; preference or saved-meal reconciliation clears review. AI remains opt-in and restored pages cannot trigger an AI request.

## Results

Implementation and verification references follow after checks and review publishing.
