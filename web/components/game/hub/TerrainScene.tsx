'use client'

import React from 'react'
import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'
import { groundOffsetCss, TERRAIN_KIT, brickSrc, type BrickPlacement, type SceneBand, type SceneComposition, type SceneRoadPath } from '@/lib/scene/terrain-kit'

/**
 * Renders a `SceneComposition` from the modular Blender terrain kit (KES-260).
 *
 * **How depth is done, and why it matters.** Every brick is authored once, in
 * one mid-tone palette, at one camera angle. Distance is applied *here*, by
 * washing each band toward the sky colour through a mask of the sprite's own
 * silhouette. That is aerial perspective, and it is the reason the same
 * `mtn_peak_tall.png` can be a pale blue ridge on the horizon and a solid grey
 * mass in the middle distance.
 *
 * The alternative — drawing distant things in a different style — is precisely
 * what produced the reported bug: *"why do we have different styles between the
 * buildings in the background and in the foreground?"*. The old backdrop mixed a
 * painted JPG horizon with hand-written SVG skyline glyphs and Blender
 * foreground sprites. One kit plus a haze wash keeps everything the same
 * material and still reads as miles of distance.
 */

interface Palette {
  skyTop: string
  skyMid: string
  skyHorizon: string
  /** What every band is washed toward. Matching this to the horizon colour is
   *  what makes far bricks appear to dissolve into the sky. */
  haze: string
  ground: string
  groundNear: string
  groundLip: string
  starOpacity: number
  /** Multiplies the whole scene's haze — a clear midday reads further than a
   *  murky dusk, and a night scene needs almost no haze because there is no
   *  scattered light to make. */
  hazeGain: number
  /** Darkens everything toward night without changing any brick's own colour. */
  shade: string
}

const PALETTES: Record<TimeOfDayPhase, Palette> = {
  night: {
    skyTop: '#040a18', skyMid: '#0b1830', skyHorizon: '#1b2b46',
    haze: '#16233f', ground: '#0a1120', groundNear: '#070d19', groundLip: '#121d33',
    starOpacity: 1, hazeGain: 0.55, shade: 'rgba(3,10,24,0.62)',
  },
  dawn: {
    skyTop: '#2c3560', skyMid: '#7d7397', skyHorizon: '#e2a184',
    haze: '#9d94ad', ground: '#4a4258', groundNear: '#3a3348', groundLip: '#635774',
    starOpacity: 0.22, hazeGain: 0.95, shade: 'rgba(52,42,78,0.20)',
  },
  day: {
    skyTop: '#4f9bda', skyMid: '#8fc9ec', skyHorizon: '#d5ecf7',
    haze: '#bcdcee', ground: '#8d8a63', groundNear: '#6f6f4e', groundLip: '#a8a67c',
    starOpacity: 0, hazeGain: 1, shade: 'transparent',
  },
  dusk: {
    skyTop: '#26264f', skyMid: '#71446d', skyHorizon: '#e08a63',
    haze: '#9c6a78', ground: '#3b2f42', groundNear: '#2c2334', groundLip: '#553f57',
    starOpacity: 0.4, hazeGain: 0.85, shade: 'rgba(44,28,62,0.26)',
  },
}

/**
 * How strongly a band is washed toward the haze colour. Non-linear on purpose:
 * most of aerial perspective happens in the first stretch of distance, so a
 * linear ramp leaves the far range looking merely "a bit faded" while the
 * mid-ground goes too pale.
 */
function hazeFor(depth: number, gain: number): number {
  const t = 1 - Math.min(1, Math.max(0, depth))
  return Math.min(0.92, t * t * 0.95 * gain)
}

function Brick({ placement, band, haze, hazeAmount }: {
  placement: BrickPlacement
  band: SceneBand
  haze: string
  hazeAmount: number
}) {
  const def = TERRAIN_KIT[placement.brick]
  const scale = (placement.scale ?? 1) * (band.scale ?? 1)
  const src = brickSrc(placement.brick)
  const w = def.w * scale
  const h = def.h * scale
  const mask: React.CSSProperties = {
    position: 'absolute', inset: 0, background: haze, opacity: hazeAmount,
    WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
    WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
    pointerEvents: 'none',
  }
  return (
    <span
      style={{
        position: 'absolute',
        left: `${placement.x}%`,
        bottom: placement.lift ?? 0,
        width: w,
        height: h,
        transform: `translateX(-50%)${placement.flip ? ' scaleX(-1)' : ''}`,
        // Near-field rocks, shrubs, and road pieces need a contact shadow to
        // sit into the ground plane. Without it the foreground reads as a
        // handful of floating cut-outs, especially on the taller desktop
        // scene where the ground band has more vertical room.
        filter: band.depth >= 0.88
          ? 'drop-shadow(0 3px 3px color-mix(in srgb, var(--ln-void) 42%, transparent))'
          : undefined,
      }}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {hazeAmount > 0.01 && <span aria-hidden="true" style={mask} />}
    </span>
  )
}

function Band({ band, palette }: { band: SceneBand; palette: Palette }) {
  const hazeAmount = hazeFor(band.depth, palette.hazeGain)
  return (
    <div
      data-band={band.id}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: band.baseline,
        height: 0,
        // Bands must not clip: bricks extend upward out of a zero-height strip,
        // which is what keeps every brick standing on one shared baseline
        // regardless of its own height.
        overflow: 'visible',
        zIndex: 1 + Math.round(band.depth * 10),
      }}
    >
      {band.bricks.map((placement, i) => (
        <Brick
          key={`${band.id}-${i}`}
          placement={placement}
          band={band}
          haze={palette.haze}
          hazeAmount={hazeAmount}
        />
      ))}
    </div>
  )
}

function RoadBed({ road, palette }: { road: SceneRoadPath; palette: Palette }) {
  const firstPoint = road.points[0]
  if (!firstPoint) return null

  return (
    <div
      data-road-bed={road.id}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: groundOffsetCss(firstPoint.groundOffset),
        height: 22,
        zIndex: 9,
        pointerEvents: 'none',
        background: `color-mix(in srgb, var(--ln-void) 78%, ${palette.groundNear})`,
        borderTop: `2px solid ${palette.groundLip}`,
        borderBottom: `2px solid ${palette.groundNear}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: 2,
          transform: 'translateY(-50%)',
          opacity: 0.82,
          background: `repeating-linear-gradient(90deg, transparent 0 24px, color-mix(in srgb, ${palette.groundLip} 78%, var(--hub-chalk)) 24px 40px)`,
        }}
      />
    </div>
  )
}

export function TerrainScene({
  composition,
  phase = 'day',
}: {
  composition: SceneComposition
  phase?: TimeOfDayPhase
}) {
  const palette = PALETTES[phase]
  return (
    <div
      data-testid="terrain-scene"
      data-composition={composition.id}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: palette.skyTop }}
    >
      {/* Sky. Three stops rather than two so the horizon warms without the
          midband going muddy — the ground meets a light band, not the deep
          zenith colour. */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `linear-gradient(180deg, ${palette.skyTop} 0%, ${palette.skyMid} 52%, ${palette.skyHorizon} 100%)`,
        transition: 'background 1.2s ease',
      }} />

      {palette.starOpacity > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: '46%', zIndex: 0,
          opacity: palette.starOpacity, transition: 'opacity 1.2s ease', pointerEvents: 'none',
          backgroundImage: [
            'radial-gradient(1px 1px at 8% 18%, rgba(198,216,240,.55), transparent)',
            'radial-gradient(1px 1px at 28% 8%, rgba(198,216,240,.4), transparent)',
            'radial-gradient(1.5px 1.5px at 63% 13%, rgba(198,216,240,.5), transparent)',
            'radial-gradient(1px 1px at 88% 24%, rgba(198,216,240,.35), transparent)',
            'radial-gradient(1px 1px at 45% 30%, rgba(198,216,240,.3), transparent)',
          ].join(','),
          backgroundSize: '520px 340px',
        }} />
      )}

      {composition.bands.map(band => <Band key={band.id} band={band} palette={palette} />)}

      {/* Ground plane, at zIndex 9 — deliberately *between* the depth bands.
          Bands compute `zIndex = 1 + round(depth * 10)`, so everything from the
          horizon out to the tree line (depth <= 0.74 -> zIndex <= 8) is clipped
          by it and reads as standing behind the ground, while the near
          ground-detail band (depth 0.92 -> zIndex 10) draws on top and reads as
          lying on it. The road remains a single connected lane at zIndex 9. */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 'var(--hub-ground)',
        zIndex: 9, background: palette.ground, transition: 'background 1.2s ease',
      }}>
        {/* Enlarged from 5px/.95 opacity (KES-263) so the ground/sky contact
            point reads as a clear, deliberate line rather than a thin seam —
            same groundLip token/palette, just more visible. */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: 9,
          background: palette.groundLip, opacity: 1,
          boxShadow: `0 0 16px ${palette.groundLip}`,
        }} />
        {/* A second, nearer soil band. One flat fill over a fifth of the frame
            reads as dead space; a horizon-parallel break gives the ground a
            near and a far half without adding a texture. */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '46%', bottom: 0,
          background: palette.groundNear, transition: 'background 1.2s ease',
        }} />
      </div>

      {/* Blender road tiles provide lane markings and edge detail, while this
          continuous bed keeps the authored SceneRoadPath traversable between
          tiles at wide desktop sizes. */}
      {composition.roadPaths?.map(road => <RoadBed key={road.id} road={road} palette={palette} />)}

      {/* Night/dusk wash. One overlay over the whole scene rather than four
          separate palettes per brick — the bricks stay one set of files. */}
      {palette.shade !== 'transparent' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 13, pointerEvents: 'none',
          background: palette.shade, transition: 'background 1.2s ease',
        }} />
      )}

    </div>
  )
}
