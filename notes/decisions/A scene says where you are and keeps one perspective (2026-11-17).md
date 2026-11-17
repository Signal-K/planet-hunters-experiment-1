# A scene says where you are and keeps one perspective

Date: 2026-11-17 · Ticket: SSL-853 · From Liam's feedback on the probe watch and landing scenes

Liam: "Why is it called 'Lunar field camera' if we're not on the moon? Why is the Leonids message present on every
screen? This UI/perspective is shit. The rover is side-on but the landscape is birds-eye."

## Rules

- The scene title says where the player is, in the player's words ("Moon · field camera"). Never name a place the
  view does not show.
- One perspective per scene. A side-on sprite is never drawn over a top-down map, or the other way round. A camera
  on a surface is first-person: horizon, sky and ground in perspective.
- A sky event (a meteor shower, a storm) is named once, in a sentence that says what it means for this scene. It is
  never a bare chip or banner repeated across screens.
- Every action says what to do in plain words: what to look for, which way to turn, what confirming does.
- The rover leaves the lander only after touchdown. Nothing is shown outside a craft until it has landed.

## Applied

- Probe watch is now a first-person camera on the Moon: Earth, Sun, horizon and craters; flashes on the ground; edge
  buttons that cue the side to turn; a bearing tape; confirm while the dust is up.
