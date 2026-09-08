'use client'

import React from 'react'
import { UI_ZONES } from '@/lib/ui-zones'

interface PageSurfaceProps {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  style?: React.CSSProperties
  contentStyle?: React.CSSProperties
  zIndex?: number
  testId?: string
  contentTestId?: string
  ariaLabel?: string
  ariaLabelledBy?: string
}

/**
 * A page-level game surface, never a modal.
 *
 * It deliberately has no scrim, backdrop dismissal, focus trap, modal ARIA
 * state, drag handle, or floating-card geometry. Conditional flows can replace the
 * current screen without pretending to be a temporary sheet above it.
 */
export default function PageSurface({
  children,
  className,
  contentClassName,
  style,
  contentStyle,
  zIndex = 89,
  testId,
  contentTestId,
  ariaLabel,
  ariaLabelledBy,
}: PageSurfaceProps) {
  return (
    <div
      className={['ln-page-surface', className].filter(Boolean).join(' ')}
      data-ui-zone={UI_ZONES.screenContent}
      data-testid={testId}
      style={{ zIndex, ...style }}
    >
      <section
        className={['ln-page-surface__content', contentClassName].filter(Boolean).join(' ')}
        role="region"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        data-testid={contentTestId}
        style={contentStyle}
      >
        {children}
      </section>
    </div>
  )
}
