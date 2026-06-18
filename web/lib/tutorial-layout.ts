// TutorialLayoutZone — encodes the reserved/content rect contract for the tutorial rail.
//
// The tutorial coach always renders in the reserved_rect (top pill strip or bottom strip).
// Interactive gameplay UI must render in content_rect so they do not overlap.
//
// Canonical contract: @doc/Landnam-docs_specs_missions_tutorial-rail-user-flow-contract

export const TUTORIAL_RAIL = {
  // Pill height including shadow bleed (px)
  PILL_HEIGHT: 56,
  // Top offset where the compact pill sits when the coach is at the top
  TOP_PILL_Y: 84,
  // Bottom offset where the compact pill sits when the coach is at the bottom
  BOTTOM_PILL_Y: 92,
  // Minimum margin between coach pill and interactive content (px)
  CONTENT_MARGIN: 8,
} as const

/** Returns the rect (top, height) reserved by the tutorial rail for a given anchor. */
export function reserved_rect(anchor: 'top' | 'bottom'): { top: number; height: number } {
  if (anchor === 'top') {
    return { top: TUTORIAL_RAIL.TOP_PILL_Y, height: TUTORIAL_RAIL.PILL_HEIGHT + TUTORIAL_RAIL.CONTENT_MARGIN }
  }
  return { top: 0, height: 0 }
}

/** Returns the available content rect given a tutorial anchor. */
export function content_rect(
  anchor: 'top' | 'bottom',
  canvasHeight: number
): { top: number; bottom: number } {
  if (anchor === 'top') {
    const reserved = reserved_rect('top')
    return { top: reserved.top + reserved.height, bottom: canvasHeight - TUTORIAL_RAIL.BOTTOM_PILL_Y }
  }
  return { top: 0, bottom: canvasHeight - TUTORIAL_RAIL.BOTTOM_PILL_Y - TUTORIAL_RAIL.PILL_HEIGHT }
}
