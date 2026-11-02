---
type: decision
title: Shipped tickets are moved to Done when pushed
project: Landnam
status: decided
created: 2026-11-02
---

# Shipped tickets are moved to Done when pushed (2026-11-02)

On 2 Nov the cycle 8 board read 22 of 39 done, while ten more tickets were already shipped on `cycle/8`. The sessions had pushed and, sometimes, commented, but never changed the status, and three shipped tickets (SSL-731, 732, 733) sat in Backlog outside the cycle. SSL-648 had been passing in production for three days but still read In Review.

## Decision

- The session that pushes a ticket's commit closes it in Linear in the same pass. It comments with the commit hash, the proof and the caveats, then sets the status.
- Shipped means **Done**. Caveats such as iOS parity deferred to a later cycle go in the comment, not in the status.
- **In Progress** is only for a ticket with part of its outcome still unbuilt, and the comment says which part.
- A ticket worked in a cycle is in that cycle. Add it if it is missing.
- A pushed commit whose ticket still reads Todo or Backlog is unfinished work.
