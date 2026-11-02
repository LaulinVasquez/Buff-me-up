# Autonomous product improvement roadmap

Authorized by Laurin on 2026-11-02: continue the previously proposed opportunities, push focused branches/PRs, and leave review/merge to Laurin. Baseline: `c092c6a` (appearance PR #7 merged). Preserve the locally supplied, untracked development guide. No production data changes, deployments, signing or invitations.

| Order | Work | Acceptance / status |
| --- | --- | --- |
| 0 | Training correctness (BMU-003/004) | Append after deletion; query latest completed non-null weight. In progress. |
| 1 | Per-set logging and rest timer | Actual reps/weight/completion for each set; immutable finished records, substitutions preserve originals; responsive controls and reload persistence. |
| 2 | “I only have 20 minutes” | Review a shorter current session, preserve logged work and the saved plan; explain changes and restore where safe. |
| 3 | Progress explained / weekly review | Use recorded sets, distinguish comparable performance, personal bests, flexible attendance goal and one clear next action. |
| 4 | Comeback mode | Opt-in reduced return session after time away; respectful copy and adjustable weekly goal. No automatic medical/training prescriptions. |
| 5 | Personal gym setup | Account-owned equipment, settings/notes and preferred alternatives; easy access during training. |
| 6 | Quality essentials | Data export and interruption recovery; offline claims only with tested queue/conflict/account isolation. |
| 7 | Private partners | Deliberate sharing controls, revocable access and two-account acceptance required before release; never a public feed by default. |

Already implemented and merged: responsive History, phone/desktop layouts, Gym is packed mode, account color themes. Existing authentication, provider/generator and device acceptance gaps stay visible in ISSUES.md; local fixtures do not establish live acceptance. Features after the first PR may be stacked with explicit dependencies until reviewed.
