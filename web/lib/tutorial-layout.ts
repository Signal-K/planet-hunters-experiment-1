// TutorialLayoutZone - encodes the reserved/content rect contract for the tutorial rail.
//
// The tutorial coach always renders in the reserved_rect.
// Interactive gameplay UI must render in content_rect so it never overlaps onboarding copy.
//
// Canonical contract: @doc/Landnam-docs_specs_missions_tutorial-rail-user-flow-contract

export const TUTORIAL_RAIL = {
  // Top HUD/back buttons occupy this area.
  TOP_CHROME_HEIGHT: 68,
  // Dedicated space for onboarding/tutorial blocks. Gameplay buttons must stay out of it.
  RESERVED_TOP: 76,
  // Measured action-card height (avatar row + padding, single-line action
  // text) is ~71px in practice. KES-146: at the 390px mobile viewport, steps
  // whose body copy wraps to two lines (e.g. "Lock a Contract") measured
  // 134px tall — the old 84px estimate undershot that, leaving reserved
  // content areas too shallow and letting scrollIntoView tuck list items
  // under the coach card. Sized with headroom above the worst-case measured
  // height rather than the single-line optimum.
  RESERVED_HEIGHT: 150,
  // Compact pill height including shadow bleed (px).
  PILL_HEIGHT: 64,
  // Bottom clearance for screens with sticky actions above the reserved
  // .bottom-tab-bar (64px, see globals.css --ln-nav-h) plus a small margin.
  BOTTOM_PILL_Y: 80,
  // Minimum margin between the tutorial rail and interactive content (px).
  CONTENT_MARGIN: 12,
} as const

// For screens where the coach step is a compact action card (~56px tall)
export const TUTORIAL_CONTENT_TOP =
  TUTORIAL_RAIL.RESERVED_TOP + TUTORIAL_RAIL.RESERVED_HEIGHT + TUTORIAL_RAIL.CONTENT_MARGIN

// For screens where the coach step is a manual (full) card (~160px tall)
export const TUTORIAL_MANUAL_CONTENT_TOP =
  TUTORIAL_RAIL.RESERVED_TOP + 160 + TUTORIAL_RAIL.CONTENT_MARGIN

/** Returns the dedicated tutorial rect (top, height). */
export function reserved_rect(anchor: 'top' | 'bottom'): { top: number; height: number } {
  void anchor
  return { top: TUTORIAL_RAIL.RESERVED_TOP, height: TUTORIAL_RAIL.RESERVED_HEIGHT }
}

/** Returns the available content rect given a tutorial anchor. */
export function content_rect(
  anchor: 'top' | 'bottom',
  canvasHeight: number
): { top: number; bottom: number } {
  void anchor
  return { top: TUTORIAL_CONTENT_TOP, bottom: canvasHeight - TUTORIAL_RAIL.BOTTOM_PILL_Y }
}
