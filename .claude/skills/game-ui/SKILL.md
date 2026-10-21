---
name: game-ui
description: Design or revise Landnam game screens, HUDs, menus, and scenes without drifting into SaaS-style interface patterns.
---

# Landnam game UI

Read the repository `AGENTS.md` and the relevant scene script, feedback, and instructions before visual work. Use `node scripts/studio.mjs where` and `focus` to make the active scene visible.

Put the primary action on an object or instrument in the illustrated scene. Prefer one clear action, thumb-reachable 44px targets, 14px minimum body text, and UPPERCASE letter-spaced labels for instruments and calls to action. Status needs shape, colour, and a label.

Use tokens, tactile panels, pressed states, and short 80 to 150ms motion with sound and haptic hooks where the platform supports them. Never use hover as the only interaction. Do not add rounded white cards, soft-shadow dashboards, gradient calls to action, text-tab navigation, tables, toast stacks, empty-state art, or welcome copy.

Open the scene in Studio at portrait, landscape, and desktop sizes. A `wrong` pin is a permanent exclusion and a `keep` pin cannot change. In explore mode, present two materially different directions that fix every wrong pin. Verify visual work with viewed screenshots.
