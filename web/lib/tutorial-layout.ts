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
  RESERVED_HEIGHT: 116,
  // Compact pill height including shadow bleed (px).
  PILL_HEIGHT: 64,
  // Legacy bottom clearance for screens with sticky actions/radial nav.
  BOTTOM_PILL_Y: 92,
  // Minimum margin between the tutorial rail and interactive content (px).
  CONTENT_MARGIN: 12,
} as const

export const TUTORIAL_CONTENT_TOP =
  TUTORIAL_RAIL.RESERVED_TOP + TUTORIAL_RAIL.RESERVED_HEIGHT + TUTORIAL_RAIL.CONTENT_MARGIN

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
