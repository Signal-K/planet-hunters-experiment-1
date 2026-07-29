'use client'

import React from 'react'
import { UI_ZONES } from '@/lib/ui-zones'

type SheetVariant = 'bottom' | 'centered'
type SheetAnimation = 'sheet' | 'popup' | false

interface SheetProps {
  children: React.ReactNode
  variant?: SheetVariant
  onDismiss?: () => void
  dismissOnBackdrop?: boolean
  showHandle?: boolean
  animation?: SheetAnimation
  zIndex?: number
  className?: string
  panelClassName?: string
  overlayStyle?: React.CSSProperties
  scrimStyle?: React.CSSProperties
  panelStyle?: React.CSSProperties
  handleContainerStyle?: React.CSSProperties
  handleStyle?: React.CSSProperties
  testId?: string
  panelTestId?: string
  backdropTestId?: string
  role?: 'dialog' | 'alertdialog'
  ariaLabel?: string
  ariaLabelledBy?: string
}

export default function Sheet({
  children,
  variant = 'bottom',
  onDismiss,
  dismissOnBackdrop = true,
  showHandle = variant === 'bottom',
  animation = variant === 'bottom' ? 'sheet' : 'popup',
  zIndex = 89,
  className,
  panelClassName,
  overlayStyle,
  scrimStyle,
  panelStyle,
  handleContainerStyle,
  handleStyle,
  testId,
  panelTestId,
  backdropTestId,
  role = 'dialog',
  ariaLabel,
  ariaLabelledBy,
}: SheetProps) {
  const canDismiss = dismissOnBackdrop && onDismiss

  return (
    <div
      className={['ln-sheet', `ln-sheet--${variant}`, className].filter(Boolean).join(' ')}
      data-ui-zone={UI_ZONES.modalOverlay}
      data-testid={testId}
      style={{ zIndex, ...overlayStyle }}
    >
      <div
        className="ln-sheet__scrim"
        data-testid={backdropTestId}
        onClick={canDismiss || undefined}
        style={{ cursor: canDismiss ? 'pointer' : undefined, ...scrimStyle }}
        aria-hidden="true"
      />
      <div
        className={[
          'ln-sheet__panel',
          `ln-sheet__panel--${variant}`,
          animation && `ln-sheet__panel--${animation}-in`,
          panelClassName,
        ].filter(Boolean).join(' ')}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        data-testid={panelTestId}
        style={panelStyle}
      >
        {showHandle && (
          <div className="ln-sheet__handle-wrap" style={handleContainerStyle}>
            <div className="ln-sheet__handle" style={handleStyle} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
