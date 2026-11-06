---
type: decision
title: Consensus review lives in Community research
project: Landnam
status: decided
created: 2026-11-04
---

# Consensus review lives in Community research (2026-11-04)

Decided by Liam, answering the open questions on SSL-746.

## Decision

- Any player can review. There is no instrument-level gate.
- The number of supports that verifies a result slides with the number of regular players, so it rises as the player base grows.
- The review area is part of Community research, not the instrument hub, so it is reachable without choosing a weekly path.
- New PocketBase collections for requests and votes are approved.

## How it was built (SSL-746)

- Verified at `ceil(log2(active + 1))` supports, clamped 3 to 9, where active players are saves changed in the last 30 days. Disputes must stay under a third of supports.
- Reviewers do their own run of the instrument first; the requester's readout is only released after that. Reviewers never see running counts.
