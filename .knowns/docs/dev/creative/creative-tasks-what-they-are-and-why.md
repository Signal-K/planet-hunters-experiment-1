---
title: Creative tasks — what they are and why
createdAt: '2026-03-25T20:53:17.968Z'
updatedAt: '2026-03-25T20:53:42.954Z'
description: >-
  Overview of all open creative tasks across Saily and Planet Hunters: who
  they're for, what unblocks, and what format output should take
tags:
  - creative
  - writing
  - design
  - liam
---
# Creative Tasks — What They Are and Why

Creative tasks are work items that require **human authorship** — writing, design direction, or editorial judgment that an engineer can't generate from code alone. They block implementation tickets and should be completed before (or alongside) the engineering that depends on them.

---

## Why they exist

The codebase has systems that render content — dialogue, UI copy, reward screens, celebration beats — but the *content itself* hasn't been written. These tasks are placeholders or gaps that show up as empty strings, placeholder text, or TODO comments in the code.

Without this content:
- Screens show blank or fallback text in production
- Implementation tickets can't be marked done (they depend on copy being handed off)
- Narrative coherence breaks (characters feel empty or generic)

---

## Saily — open creative tasks

| Task ID | Title | Unblocks |
|---------|-------|----------|
| `lccgj7` | Write briefing dialogue for all 4 character arcs | Narrative UI rendering |
| `33dtin` | Write missing briefingExpression for all chapters | Avatar expression system |
| `magq2n` | Write arc 1 completion screen copy (all 4 characters) | Arc reward screen |
| `nm3efx` | Write arc-completion reward screen copy (all arcs) | Arc reward screen (full) |
| `2pqc1e` | Draft chapter beat outlines for Story Arc 2 | Arc 2 implementation |
| `z6m85p` | Add second story arc chapters 6–10 (all 4 characters) | Content expansion |
| `wnmktw` | Write mission control helper copy for puzzle actions | In-game UX guidance |
| `8rv9kf` | Design arc-complete celebration beat | Reward moment UX |

**Characters**: Zix, Brix, Pip, The Cartographer (Carta). Each has a distinct voice and arc position — match tone accordingly.

**Output format**: Plain text lines ready to drop into `lib/storylines.ts` or the relevant scene file. If it's copy for a screen, include the headline and body separately.

---

## Planet Hunters — open creative tasks

| Task ID | Title | Unblocks |
|---------|-------|----------|
| `49fr2b` / `lod035` | Write in-game button guide copy (mining, debrief, launchpad) | Button guide overlay |
| `gu5376` | Write copy and flow for the SR2 unlock screen | SR2 unlock moment |
| `ps6nfy` | Design the SR2 unlock celebration beat | SR2 celebration UX |

**Tone**: Citizen science, space exploration, approachable but not childish. The player is a real participant in science — the copy should reinforce that.

**Output format**: Short strings, max 1–2 lines per button/screen. For celebration beats, a brief spec (headline, sub-line, visual direction) is enough — engineering handles implementation.

---

## How to hand off

1. Write copy directly into the task notes (`knowns task edit <id> --append-notes "..."`)
2. Or drop it in a comment in the relevant source file and link the task
3. Mark AC done when copy is finalised: `knowns task edit <id> --check-ac N`
4. Ping engineering — these tasks block specific implementation tickets listed above
