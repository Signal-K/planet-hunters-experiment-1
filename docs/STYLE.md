# STYLE (all scenes, forever)

Art direction (dark steel lattice gantry, cream/blue panelled rocket with boosters, warm grey concrete pad, glazed cream buildings). Match it; the reference's orange trim is NOT used: no orange anywhere.

1. **Pixel art only.** Every scene sprite uses the same pixel scale and palette as the base kit sprites in `native/App/Resources/Art/base/kit`. No code-drawn shapes (SwiftUI `Canvas`, `Path`, `Capsule` art), no procedural noise sprites, no low-poly. Show sprites with `.interpolation(.none)` at a whole-number scale.
2. **No scene titles.** Never show "Base", "Earth HQ", "Earth Base" or any other internal scene name.
3. **Same UI layout every scene.** Top-left gear and clock, top-right chips, one bottom dock built from the shared `BaseDock` and `DockButton` (each action its own pill with an icon, dividers between).
4. **Only structures from the flow doc.** Launchpad, Hangar, Surface Silo (underground), Astronaut Academy, Exchange. No command building (the instrument hub is its own Hub button) and no refinery.
5. **Every new asset commits the full sheet and the sliced parts.** Sheet under `docs/art/<kit>/sheet.png`, slices in `native/App/Resources/Art/...`, plus the authoring script (`tools/pixel-kit/`).
6. **Idle launchpad is empty.** The pad shows a rocket only when a build or mission is in progress. When nothing is being built or in progress, the pad must be empty (no decorative parked rocket). Camera framing must still look good with an empty pad.

Binding flow: Craft "Landnam Mission & Structure Flow (binding rule)".
