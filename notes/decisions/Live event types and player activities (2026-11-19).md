---
type: decision
title: Live event types and player activities
project: Landnam
status: decided
created: 2026-11-19
---

# Live event types and player activities (2026-11-19)

Cycle closeout decision for SSL-656, completing the requested event-type definition. It consolidates the 22 Oct live-event request and the later shared-instrument, mission-chain, community-vote and real-sky decisions. It does not publish a new event or a launch date.

## Types and player activity

| Type | Player activity | Existing systems |
| --- | --- | --- |
| Meteor showers | Catch that shower's own fragments, then confirm its research on the community instrument. | Existing per-shower chains, fragments and radio observations. |
| Planet oppositions | Point the appropriate telescope, inspect/classify real observations from an available identified dataset, then confirm the event research. | Weekly pointing, instrument feeds, authored mission chains and research stamps. |
| Notable real launches | Complete ordinary agency missions that add construction credit to the selected shared spaceport project, follow its verified real brief/status, and complete the declared simulated launch mission in the event chain. | Existing mining/contract/payload missions, shared site ledger, launch flow and optional official coverage link. |

No other event category is scheduled by this decision. An actual event, usable source/data and a checked window must exist before an opposition or launch chain is published. A missing instrument leads to its existing build/launch flow. Opening a card or watching a stream alone never counts as completing research or a mission.

## Progress, rewards and replay

- Each event declares its finite tasks, dataset/source, required instrument, story item, completion proof and Mission ids before implementation. Reuse Landnam's mission and economy rules.
- The final chain confirmation grades the badge: gold during the verified event window, silver through the archive replay after it. Keep the existing replay access policy and idempotent rewards; never downgrade earned gold.
- Either tier opens one relevant survey/launch follow-up using an existing mission type. Gold opens one additional relevant existing-type mission. The concrete unlock ids belong in each event declaration, not in a new global reward or currency system.
- Completed activities feed Community Research through existing stamps/contributions. A contribution copies credit; players keep their cargo and earnings. Meteor fragments stay shower-specific and are not a currency for opposition or launch participation.
- Delays and scrubs move verified schedule/status, not accumulated construction credit or already-earned rewards.

## Real information and scheduling

- Reuse the sources already specified for SSL-760: Atlas/Astronomy Engine plus a checked independent astronomy source for oppositions, IMO for showers, and the server's launch schedule checked against the operator for launches.
- Do not carry the old approximate “Jupiter ~Jan 2027” wording into a build. Exact dates remain schedule work in SSL-760 and must be checked before publication.
- Show source and last check, and say launch dates may change. Separate “Real mission” information from “Game simulation”.
- An official Watch live link opens externally when one exists. No embedded stream or live telemetry is promised.
- Existing Community Research ballots select the next verified research/launch focus (SSL-757). The calendar is not padded with invented events.

## Follow-up work

- SSL-866: opposition telescope/classification chain and concrete replay unlocks.
- SSL-867: notable-launch shared-project chain and official coverage entry points.
- SSL-760: checked server schedule, source/status freshness and official link coverage for both.
- SSL-757 is already Done: retain its existing ballots rather than rebuilding voting.

The decision ticket closes separately from those builds. SSL-866 and SSL-867 are Backlog with no cycle assigned; Cycle 10 remains a fix-only release candidate.
