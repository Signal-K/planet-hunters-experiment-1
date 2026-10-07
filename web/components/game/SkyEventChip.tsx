'use client'

import { useEffect, useState } from 'react'
import { captureGameEvent } from '@/lib/posthog'
import { useDebrisEvent } from '@/lib/hooks/useDebrisEvent'

const seenSurfaces = new Set<string>()

/**
 * "Orionids active" chip plus a small sky overlay (CSS meteor streaks; placeholder
 * art until Ink's sprites land, SSL-475). Renders nothing outside the event.
 * The chip is a 44px tap target that opens a one-line explainer.
 */
export default function SkyEventChip({ surface, className }: { surface: 'base' | 'mining'; className?: string }) {
  const preset = useDebrisEvent()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!preset) return
    const key = `${preset.eventId}:${surface}`
    if (seenSurfaces.has(key)) return
    seenSurfaces.add(key)
    captureGameEvent('sky_event_seen', { event_id: preset.eventId, surface })
  }, [preset, surface])

  if (!preset) return null
  return (
    <div className={['sky-event-wrap', className].filter(Boolean).join(' ')} data-testid={`sky-event-${surface}`} style={{ position: 'absolute', top: 64, left: 12, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <div className="sky-event-overlay" aria-hidden="true">
        <i /><i /><i />
      </div>
      <button
        type="button"
        data-testid="sky-event-chip"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{
          minHeight: 44, minWidth: 44, padding: '0 16px', borderRadius: 22,
          border: '2px solid var(--ln-ink, #0f2436)', background: 'var(--ln-panel)', color: 'var(--ln-text)',
          font: '700 14px var(--ln-font-display)', letterSpacing: '0.04em', cursor: 'pointer',
        }}
      >
        {preset.chipLabel}
      </button>
      {open && (
        <div role="status" style={{ maxWidth: 240, padding: 12, borderRadius: 8, border: '1px solid var(--ln-hairline)', background: 'var(--ln-panel)', color: 'var(--ln-text-dim)', font: '14px/1.4 var(--ln-font-body)' }}>
          {preset.label} falls while you mine tonight. Laser it, then sell it at the Market spot price.
        </div>
      )}
    </div>
  )
}
