# Autonomous product improvement roadmap

Authorized by Laurin on 2026-11-02: continue the previously proposed opportunities, push focused branches/PRs, and leave review/merge to Laurin. Baseline: `c092c6a` (appearance PR #7 merged). Preserve the locally supplied, untracked development guide. No production data changes, deployments, signing or invitations.

| Order | Work | Acceptance / status |
| --- | --- | --- |
| 0 | Training correctness (BMU-003/004) | Append after deletion; query latest completed non-null weight. Implemented in PR #8; live acceptance pending. |
| 1 | Per-set logging and rest timer | Implemented on agent/set-logging: actual sets, immutable finished records, swap archives, responsive controls, reload persistence and rest timer. Staging/device acceptance pending. |
| 2 | “I only have 20 minutes” | Implemented on agent/session-adaptations: reviewed shorter session, protected logs/plan, explained changes and restore. Staging pending. |
| 3 | Progress explained / weekly review | Implemented on agent/weekly-progress: comparable best-set reps, labeled 90-day load best, distinct-day goal and schedule-focused next action. All-time records remain outside scope. |
| 4 | Comeback mode | Opt-in reduced session implemented with respectful copy and no load prescriptions. Flexible weekly goal implemented with progress review. |
| 5 | Personal gym setup | Implemented on agent/personal-gyms: account-owned named equipment setups, per-gym settings/notes, preferred alternatives and workout access. Staging pending. |
| 6 | Quality essentials | Account export implemented with readable-text fallback. Rest timer and failed-save retention implemented. Durable offline queue remains a separate design/test item; no offline guarantee is made. |
| 7 | Private partners | Deliberate sharing controls, revocable access and two-account acceptance required before release; never a public feed by default. |

Already implemented and merged: responsive History, phone/desktop layouts, Gym is packed mode, account color themes. Existing authentication, provider/generator and device acceptance gaps stay visible in ISSUES.md; local fixtures do not establish live acceptance. Features after the first PR may be stacked with explicit dependencies until reviewed.

## End-of-batch scope

Five of the six original product opportunities have implementations: Gym is packed (already merged), short sessions, explained progress/weekly goals, comeback sessions and personal gym setups. New set logging, rest timer, portable export and generator/CI reliability support them. Private partners are not implemented in this batch: shared/revocable visibility and two-account staging acceptance remain a separate feature. Durable offline queues, all-time records, light/custom themes and physical-device acceptance are also explicitly unimplemented/unverified; failed-save draft retention is not offline synchronization. No production changes were performed.

## Review queue snapshot

The developer merged #8 into main and #9–#13 into feature branches during the session. The agent did not merge PRs. Remaining [integration PR #14](https://github.com/LaulinVasquez/Buff-me-up/pull/14) now targets main and includes the complete batch; prior branch histories are preserved without code changes. GitHub quality run 41547160238 and local npm run check pass for implementation be4d160. See the consolidated report for staging migrations 9–13 and unverified native/live acceptance.
