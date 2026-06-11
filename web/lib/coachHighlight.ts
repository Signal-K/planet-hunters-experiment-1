import type { CSSProperties } from 'react'

/**
 * Style overrides that draw the Mission Coach highlight ring directly on the
 * target control's own box, so it always tracks that control's real
 * position/size instead of a hand-tuned overlay rectangle.
 */
export function coachHighlightStyle(active: boolean, radius = 12): CSSProperties {
  if (!active) return {}
  return {
    zIndex: 85,
    outline: '3px solid #f5a623',
    outlineOffset: 4,
    borderRadius: radius,
    boxShadow: '0 0 0 9999px rgba(3,6,12,0.55)',
    animation: 'coach-spot 1.4s ease-in-out infinite',
  }
}
