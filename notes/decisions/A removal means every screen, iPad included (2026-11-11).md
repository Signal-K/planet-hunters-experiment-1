---
type: decision
title: A removal means every screen, iPad included
project: Landnam
status: decided
created: 2026-11-11
---

# A removal means every screen, iPad included (2026-11-11)

Liam asked for the Base Overview slider to be removed entirely. SSL-787 recorded it as phones only ("desktop unchanged"), so the slider was hidden under 600px wide and kept on iPad and desktop. It was still on his iPad on 11 Nov.

Rule: an instruction to remove or change something applies on every screen size unless Liam names a device. Never narrow it to phones in the ticket. Check every change at iPad size (1180x820 and 820x1180) as well as phone and desktop; `scene-drive.mjs shot --all` now includes both iPad sizes.

The Overview slider is gone from the Base at every size and must not come back.
