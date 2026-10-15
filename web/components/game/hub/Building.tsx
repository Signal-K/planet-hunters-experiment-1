'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { structureBuildMs, hubConstructionProgress } from '@/lib/systems/HubConstructionSystem'
import { useSharedSecond } from '@/lib/hooks/useSharedSecond'

/**
 * DOM half of a hub structure — hit area, status pill, and the notification
 * callout. The visual body is rendered by EarthBaseModules underneath; the
 * spacer div here reserves that footprint so the pill lands under the building.
 *
 * Restyled 2026-07-26 from `landnam-earth-base-v2.html`: black tile with a
 * 1.5px white outline (not a status-tinted border), mint status dot, and a
 * pulsing notify badge that opens a small anchored speech bubble.
 */

export interface BuildingCallout {
  title: string
  body: string
  cta: string
  /** A scene prompt can reserve a viewport-safe area instead of covering art. */
  placement?: 'anchored' | 'viewport-clear'
  onCta: () => void
  /** Optional "not now" for prompts the player can wave off. */
  onDismiss?: () => void
}

export interface BuildingProps {
  kind: string
  label: string
  sub: string
  status: 'ok' | 'warn' | 'info' | 'building'
  /** When `status` is 'building', the timestamp construction started — drives the countdown label. */
  buildStartedAt?: number
  hot?: boolean
  w: number
  /**
   * Height of the invisible click-target spacer above the status pill.
   * Defaults to `w * 0.6` (the old flat guess) when omitted, but that guess
   * badly undershoots tall art like the launchpad's gantry PNG, which
   * renders far above the footprint this spacer used to reserve — see
   * HubScreen.tsx's HIT_H map, which sizes this per building kind against
   * each PNG's actual rendered height.
   */
  hitH?: number
  style?: React.CSSProperties
  onClick: () => void
  /** Small numeric badge — used for the SMS daily-candidate-queue count. */
  badge?: number
  /**
   * "Something needs you" prompt for this building. Renders a pulsing badge
   * that opens a speech bubble anchored above the structure. Omit for
   * buildings with nothing outstanding.
   */
  callout?: BuildingCallout
  /**
   * Which way the callout opens. Plots sit at 15%–85% across the scene, so a
   * 208px bubble centered on an outer plot runs off the edge of the 402-wide
   * canvas — outer plots anchor the bubble by its near edge instead, keeping
   * the tail over the building either way.
   */
  calloutAlign?: 'start' | 'center' | 'end'
  /**
   * Post-tutorial Hub prominence pass (STS-631): recedes the status pill for
   * telescope/satellite buildings that are unlocked but still in their early,
   * not-yet-actively-producing state, so the Launchpad reads as the base's
   * primary structure. Never applied to the Launchpad itself.
   */
  dimmed?: boolean
  /** Called while the pointer/finger is actively pressing this structure. */
  onActiveChange?: (active: boolean) => void
  /** Controlled visual state shared with the sprite layer. */
  active?: boolean
  /** Disable hover/press lift for scene objects whose art should stay still. */
  disableHover?: boolean
  /** Hide the name pill. The structure stays tappable and keeps its accessible name. */
  quiet?: boolean
  /** Width/height of the hit spacer, matching the sprite. */
  hitAspect?: string
}

const CALLOUT_W = 208
// How far the bubble's near edge sits outside the building it points at, so
// the tail still lands over the structure when edge-anchored.
const CALLOUT_TAIL_INSET = 26

const STATUS_COLOR: Record<BuildingProps['status'], string> = {
  ok:   'var(--dusk-cta)',
  warn: 'var(--dusk-warn)',
  info: 'var(--dusk-info)',
  building: 'var(--dusk-info)',
}

function BellGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4a1 1 0 0 1 1 1v.6c2.3.6 4 2.7 4 5.2v3l1.5 2.4H5.5L7 13.8v-3c0-2.5 1.7-4.6 4-5.2V5a1 1 0 0 1 1-1z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

function ArrowGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function Building({ kind, label, sub, status, buildStartedAt, w, hitH, style, onClick, badge, callout, calloutAlign = 'center', dimmed, onActiveChange, active = false, disableHover = false, quiet = false, hitAspect }: BuildingProps) {
  const color = STATUS_COLOR[status]
  const [calloutOpen, setCalloutOpen] = useState(false)
  const [seen, setSeen] = useState(false)
  const now = useSharedSecond()
  const buildRemainingS = status === 'building'
    ? Math.max(0, Math.ceil(structureBuildMs(kind) * (1 - hubConstructionProgress(buildStartedAt, kind, now || undefined)) / 1000))
    : 0
  const displaySub = status === 'building' ? `BUILDING · ${buildRemainingS}S` : sub
  // Hover (desktop) and press (mobile — there's no real :hover on touch) both
  // drive the same lift + glow, via one piece of state instead of two
  // separate code paths (KES-231/KES-263). The glow lands on the spacer,
  // which sits exactly over the sprite art EarthBaseModules renders
  // underneath, so it reads as the structure itself lighting up.
  const [localActive, setLocalActive] = useState(false)
  const isActive = active || (!disableHover && localActive)
  const setActive = (next: boolean) => {
    setLocalActive(next)
    onActiveChange?.(next)
  }

  // Bubble box offset from the building center, and the tail's offset within
  // the bubble — the two always add back up to the building center.
  const bubbleLeft =
    calloutAlign === 'start' ? -CALLOUT_TAIL_INSET
      : calloutAlign === 'end' ? -(CALLOUT_W - CALLOUT_TAIL_INSET)
        : -CALLOUT_W / 2
  // Keep an anchored bubble inside the viewport (a tower near the screen edge
  // on a 390px phone otherwise pushes it off-screen). The tail moves the
  // opposite way so it still points at the building.
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const [nudge, setNudge] = useState(0)
  useLayoutEffect(() => {
    if (!calloutOpen || callout?.placement === 'viewport-clear') { setNudge(0); return }
    const measure = () => {
      const el = bubbleRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const margin = 8
      const vw = document.documentElement.clientWidth || window.innerWidth
      const left = r.left - nudge, right = r.right - nudge
      let next = 0
      if (right > vw - margin) next = vw - margin - right
      if (left + next < margin) next = margin - left
      next = Math.max(-CALLOUT_W, Math.min(CALLOUT_W, next))
      if (Math.abs(next - nudge) > 0.5) setNudge(next)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [calloutOpen, callout?.placement, nudge])
  const tailLeft = Math.max(CALLOUT_TAIL_INSET, Math.min(CALLOUT_W - CALLOUT_TAIL_INSET, -bubbleLeft - nudge))

  // Small delay so it reads as the base speaking up, rather than slamming
  // into view on load. Matches the mockup's 900ms auto-open.
  useEffect(() => {
    if (!callout) return
    const t = setTimeout(() => { setCalloutOpen(true); setSeen(true) }, 900)
    return () => clearTimeout(t)
  }, [callout])

  return (
    // data-testid lives on this wrapper, not the inner button, because the
    // wrapper is what carries the plot positioning — tests assert the
    // launchpad's `left: calc(...%)` off this element. Clicking it still
    // reaches the button underneath, which occupies the wrapper's center.
    <div
      className="hub-plot-anchor"
      data-testid={`building-${kind}`}
      // Desktop tutorial spotlight target. With the sidebar gone, "open a
      // mission" is coached on the launchpad itself rather than a nav rail.
      data-beacon={`building-${kind}`}
      // 'auto' because the hub's buildings layer is pointerEvents:'none' — it
      // must not be a full-screen click catcher over the progression cards.
      style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', width: w, minWidth: w, maxWidth: w, pointerEvents: 'auto', opacity: dimmed ? 0.62 : 1, transition: 'opacity 200ms', ...style }}
    >
      <button
        data-testid={`building-${kind}-hit`}
        onClick={onClick}
        aria-label={label}
        style={{
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          minWidth: 44, minHeight: 44,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'transform 180ms',
        }}
        onMouseEnter={disableHover ? undefined : () => setActive(true)}
        onMouseLeave={disableHover ? undefined : () => setActive(false)}
        onTouchStart={disableHover ? undefined : () => setActive(true)}
        onTouchEnd={disableHover ? undefined : () => setActive(false)}
        onTouchCancel={disableHover ? undefined : () => setActive(false)}
      >
        {/* Spacer reserving the building art's clickable footprint */}
        <div style={{
          width: hitAspect ? '100%' : w,
          height: hitAspect ? undefined : (hitH ?? w * 0.6),
          aspectRatio: hitAspect,
          minHeight: 44,
          position: 'relative',
          borderRadius: 12,
          // The sprite layer owns the silhouette highlight. Keep this spacer
          // visually empty so a tall hit target cannot read as a rectangle.
          boxShadow: 'none',
        }}>
          {!!badge && badge > 0 && (
            <span
              data-testid={`building-${kind}-badge`}
              style={{
                position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px',
                borderRadius: 999, background: 'var(--hub-mint)', border: '2px solid var(--ln-panel-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: 'var(--ln-text)',
                boxShadow: '0 0 8px var(--ln-ok-soft)',
              }}
            >
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>

        {quiet && (
          <span className="hub-building-name" data-testid={`building-${kind}-name`}>{label}</span>
        )}
        {!quiet && (
        <div className="hub-building-status" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          background: 'var(--dusk-deep)',
          border: '1.5px solid var(--hub-outline)',
          borderRadius: 999, padding: 'var(--ln-s-1) var(--ln-s-3)', whiteSpace: 'nowrap',
        }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--dusk-ink)' }}>
            {label}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: color, boxShadow: `0 0 8px ${color}` }} />
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color }}>
              {displaySub}
            </span>
          </span>
        </div>
        )}
      </button>

      {callout && (
        <>
          <button
            type="button"
            className="hub-notify"
            data-testid={`building-${kind}-notify`}
            title={callout.title}
            aria-label={callout.title}
            onClick={e => { e.stopPropagation(); setSeen(true); setCalloutOpen(v => !v) }}
            style={{
              position: 'absolute', top: -16, right: -10, zIndex: 4,
              width: 44, height: 44, background: 'transparent', border: 'none',
              display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0,
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: seen ? 'var(--ln-hairline)' : 'var(--hub-mint)',
              border: '2px solid var(--hub-panel)',
              display: 'grid', placeItems: 'center',
              color: seen ? 'var(--ln-text-dim)' : 'var(--ln-text-inverse)',
              boxShadow: seen ? 'none' : '0 0 12px var(--ln-ok-soft)',
              animation: seen ? 'none' : 'hub-notify-pulse 1.8s ease-in-out infinite',
            }}>
              <BellGlyph />
            </span>
          </button>

          {(() => {
            const clear = callout.placement === 'viewport-clear'
            // A transformed ancestor makes `position: fixed` stick to the
            // tower. Viewport-clear prompts portal to the document so the
            // card can sit in open sky, fully opaque, with the link intact.
            const bubble = (
          <div
            className={clear ? 'hub-callout hub-callout--clear' : undefined}
            ref={clear ? undefined : bubbleRef}
            data-testid={`building-${kind}-callout`}
            onClick={e => e.stopPropagation()}
            style={clear ? {
              opacity: calloutOpen ? 1 : 0,
              pointerEvents: calloutOpen ? 'auto' : 'none',
              visibility: calloutOpen ? 'visible' : 'hidden',
            } : {
              position: 'absolute',
              left: `calc(50% + ${bubbleLeft + nudge}px)`,
              bottom: 'calc(100% + 16px)',
              transform: calloutOpen ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.96)',
              transformOrigin: `bottom ${tailLeft}px`,
              width: CALLOUT_W, zIndex: 22,
              background: 'var(--hub-panel)',
              border: '1.5px solid var(--hub-outline)',
              borderRadius: 12, padding: 'var(--ln-s-3)',
              boxShadow: '0 2px 0 var(--hub-outline) inset, 0 24px 48px var(--ln-overlay)',
              opacity: calloutOpen ? 1 : 0,
              pointerEvents: calloutOpen ? 'auto' : 'none',
              visibility: calloutOpen ? 'visible' : 'hidden',
              transition: calloutOpen ? 'opacity 160ms ease, transform 160ms ease' : 'opacity 160ms ease, transform 160ms ease, visibility 0s linear 160ms',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, letterSpacing: '0.06em', color: 'var(--dusk-ink)' }}>
                {callout.title}
              </span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={e => { e.stopPropagation(); setCalloutOpen(false) }}
                style={{
                  // 46px stays at least 44px while the bubble scales to 0.96 before it opens.
                  flex: '0 0 auto', width: 46, height: 46, margin: '-8px -8px 0 0', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'var(--dusk-dim)',
                  display: 'grid', placeItems: 'center', padding: 0,
                }}
              >
                <span aria-hidden style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ln-hairline)', fontSize: 16, lineHeight: 1, display: 'grid', placeItems: 'center' }}>×</span>
              </button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--dusk-dim)', marginTop: 4 }}>
              {callout.body}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setCalloutOpen(false); callout.onCta() }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 46, minWidth: 46,
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 14,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--dusk-cta)',
              }}
            >
              {callout.cta} <ArrowGlyph />
            </button>
            {callout.onDismiss && (
              <button
                type="button"
                data-testid={`building-${kind}-callout-dismiss`}
                onClick={e => { e.stopPropagation(); setCalloutOpen(false); callout.onDismiss?.() }}
                style={{
                  display: 'inline-flex', alignItems: 'center', minHeight: 46, minWidth: 46, padding: 0, cursor: 'pointer',
                  background: 'transparent', border: 'none',
                  fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 14,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--dusk-dim)',
                }}
              >
                Dismiss
              </button>
            )}
            </div>
            {/* Bubble tail — outline triangle with a fill triangle stacked over it */}
            {callout.placement !== 'viewport-clear' && <span style={{
              position: 'absolute', left: tailLeft, top: '100%', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
              borderTop: '9px solid var(--hub-outline)',
            }} />}
            {callout.placement !== 'viewport-clear' && <span style={{
              position: 'absolute', left: tailLeft, top: 'calc(100% - 1.5px)', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
              borderTop: '7.5px solid var(--hub-panel)',
            }} />}
          </div>
            )
            if (clear && typeof document !== 'undefined') return createPortal(bubble, document.body)
            return bubble
          })()}
        </>
      )}
    </div>
  )
}

export function EmptyPlot({ w = 90, style, onClick, plot }: { w?: number; style?: React.CSSProperties; onClick: () => void; plot?: number }) {
  return (
    <button
      data-testid={plot != null ? `build-plot-${plot}` : 'build-plot'}
      onClick={onClick}
      style={{
        position: 'absolute', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
        pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, ...style,
      }}
    >
      <div style={{ width: w, height: w * 0.5, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '88%', height: 26, borderRadius: '50% / 60%',
          // 0.04 trailing gradient stop has no matching --ln-* token (nothing
          // that faint exists); left as a literal fade-out, not swapped.
          background: 'radial-gradient(ellipse at 50% 35%, var(--ln-cyan-soft), rgba(112,217,234,0.04) 70%)',
          border: '2px dashed var(--ln-cyan-border)',
          display: 'grid', placeItems: 'center',
          animation: 'hub-pad-pulse 2s ease-in-out infinite',
        }}>
          <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 15, fontWeight: 800, color: 'var(--ln-cyan-bright)' }}>+</span>
        </div>
      </div>
      <div style={{
        background: 'var(--hub-panel-deep)', border: '1px solid var(--hub-outline)', borderRadius: 999,
        padding: 'var(--ln-s-1) var(--ln-s-2)', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--hub-cyan)', whiteSpace: 'nowrap',
      }}>
        Build
      </div>
    </button>
  )
}
