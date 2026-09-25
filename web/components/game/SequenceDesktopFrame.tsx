'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'

// SSL-309: the launch and vehicle-teardown Pixi scenes are authored at a
// portrait-phone size, so on a wide viewport they read as a small sprite
// centred in an empty window. This frame gives them a desktop composition:
// the Pixi stage keeps its own aspect ratio in the middle, flanked by
// instrument readout panels. Below the desktop breakpoint it renders the
// stage full-bleed, exactly as before.

export interface ReadoutRow {
  label: string
  value: string
}

interface Props {
  /** Ref-holder element for the Pixi canvas; receives stage sizing styles. */
  renderStage: (style: React.CSSProperties) => ReactNode
  /** CSS aspect-ratio of the desktop stage, e.g. '390 / 780'. */
  stageAspect: string
  stageMaxWidth?: number
  leftTitle: string
  leftRows: ReadoutRow[]
  rightTitle: string
  rightRows: ReadoutRow[]
  /** Optional live clock in the right panel, in seconds since mount. */
  showClock?: boolean
  children?: ReactNode
  background: string
  light?: boolean
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `T+${m}:${s}`
}

function ReadoutPanel({ title, rows, light }: { title: string; rows: ReadoutRow[]; light?: boolean }) {
  return (
    <aside
      style={{
        alignSelf: 'center',
        width: '100%',
        maxWidth: 280,
        padding: 'var(--ln-s-4)',
        borderRadius: 12,
        border: '1px solid var(--ln-hairline)',
        background: light ? 'var(--ln-panel)' : 'rgba(20,20,23,0.72)',
      }}
    >
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(row => (
          <div key={row.label}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: light ? 'var(--ln-text-muted)' : 'var(--ln-text-dim)', textTransform: 'uppercase' }}>
              {row.label}
            </div>
            <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 14, color: light ? 'var(--ln-text)' : '#e8f0fe', marginTop: 4, overflowWrap: 'anywhere' }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default function SequenceDesktopFrame({
  renderStage, stageAspect, stageMaxWidth, leftTitle, leftRows, rightTitle, rightRows, showClock, children, background, light,
}: Props) {
  const isDesktop = useIsDesktop()
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!showClock || !isDesktop) return
    const id = window.setInterval(() => setSeconds(s => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [showClock, isDesktop])

  const rows = showClock ? [{ label: 'MISSION CLOCK', value: formatClock(seconds) }, ...rightRows] : rightRows

  return (
    <div
      data-testid="sequence-desktop-frame"
      data-sequence-mode={isDesktop ? 'desktop' : 'mobile'}
      style={{
        position: 'absolute', inset: 0, zIndex: 100, overflow: 'hidden', background,
        ...(isDesktop
          ? {
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
              alignItems: 'stretch',
              gap: 'var(--ln-s-6)',
              padding: 'var(--ln-s-4) var(--ln-s-6)',
            }
          : {}),
      }}
    >
      {isDesktop && <ReadoutPanel title={leftTitle} rows={leftRows} light={light} />}
      {renderStage(
        isDesktop
          ? {
              position: 'relative', height: '100%', maxHeight: '100%', aspectRatio: stageAspect,
              maxWidth: stageMaxWidth, justifySelf: 'center', overflow: 'hidden', borderRadius: 12,
              border: '1px solid var(--ln-hairline)',
            }
          : { position: 'absolute', inset: 0, overflow: 'hidden' },
      )}
      {isDesktop && <ReadoutPanel title={rightTitle} rows={rows} light={light} />}
      {children}
    </div>
  )
}
