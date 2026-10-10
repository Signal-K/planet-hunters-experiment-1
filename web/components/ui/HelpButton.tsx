'use client'

import { forwardRef } from 'react'

/**
 * The shared "?" control (SSL-432). 44x44 tap target, 16px glyph. It only
 * opens help when tapped; nothing opens on its own.
 */
const HelpButton = forwardRef<HTMLButtonElement, { onClick: () => void; label?: string; testId?: string }>(
  function HelpButton({ onClick, label = 'Help', testId = 'help-button' }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        data-testid={testId}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={onClick}
        style={{
          width: 44, height: 44, flex: '0 0 auto', borderRadius: 'var(--ln-r-pill)', cursor: 'pointer',
          border: '2px solid var(--ln-bp-ink, #0f2436)', background: 'var(--ln-bp-paper, #fff)', color: 'var(--ln-bp-ink, #0f2436)',
          boxShadow: '2px 2px 0 var(--ln-bp-blue, #42a6df)',
          fontFamily: 'var(--ln-font-display)', fontSize: 16, fontWeight: 800, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          pointerEvents: 'auto',
        }}
      >
        ?
      </button>
    )
  },
)

export default HelpButton
