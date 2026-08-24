'use client'

import React from 'react'
import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'

/**
 * Earth Base backdrop — corrected 2026-08-22 (KES-228, second pass). The
 * KES-226 version put a giant orbit-ring diorama behind the launchpad,
 * framed directly after tapnine.com's "Black Hole" reference — a narrative
 * mistake, since Earth Base is a facility *on Earth*, not a station in
 * orbit. The first correction removed the ring but replaced it with only
 * abstract hill silhouettes and a repeating zigzag skyline — reported back
 * as "looks exactly like before, just with no colour... I want buildings,
 * not abstract patterns."
 *
 * Looking at the reference again: its skyline isn't abstract at all — it's
 * a row of *specific, recognizable* structures (a domed command building, a
 * radio mast, a dish tower) rendered as flat silhouettes with a thin
 * chalky-green/cyan rim-light. This version replaces the zigzag with exactly that:
 * an SVG skyline built from the same building vocabulary Landnam's own
 * Pixi scene already uses for its foreground structures (dome + antenna
 * command building, lattice radio mast, tripod dish tower, tank silo,
 * lit-window blocks) — a distant row of sister facilities, not a random
 * pattern. Silhouette + a few lit windows/beacons, same restraint as the
 * real buildings: flat fill, hard edges, glow is the only softness.
 *
 * Layout contract: the ground line sits 22% from the bottom, unchanged.
 * hubScene.ts draws building feet against `containerH * 0.78` and
 * HubScreen/BuildPlaceScreen position DOM plot labels against the same
 * line — changing it means changing it in all three.
 */

function hillPath(points: [number, number][]): string {
  const coords = points.map(([x, y]) => `${x}% ${y}%`).join(', ')
  return `polygon(${coords})`
}

// ─── Distant skyline — built from silhouette "glyphs" of Earth Base's own
// building vocabulary, not an abstract repeating pattern. Coordinates are
// local to each glyph's own x=0 anchor at the ground line (y=0), extending
// upward (negative y), then translated into place by the caller. ─────────

// Decorative skyline reads as flat haze silhouette only — no window-glow
// accents at all. Earlier versions gave these dome/mast/dish/tank glyphs the
// same lit-window treatment as HubStructureArt's real, clickable buildings,
// which made the whole backdrop misread as a row of ungraded structures
// (reported directly: "why are the buildings still grey" pointed at this
// skyline, not the one real Launchpad in front of it). Flat single-tone
// silhouette, tinted with the hill-far color so it sits visually *behind*
// the terrain instead of competing with it.
function DomeBuilding({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x}, 0) scale(${s})`} style={{ fill: 'var(--hub-skyline-fade)' }}>
      <rect x={-16} y={-38} width={32} height={38} />
      <path d="M -16 -38 A 16 16 0 0 1 16 -38 Z" />
      <rect x={-1.4} y={-58} width={2.8} height={20} />
    </g>
  )
}

function RadioTower({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x}, 0) scale(${s})`} style={{ fill: 'var(--hub-skyline-fade)' }}>
      <path d="M -3 0 L -8 -60 L 8 -60 L 3 0 Z" />
      <path d="M -6.5 -18 L 6.5 -18 M -7.4 -36 L 7.4 -36 M -8 -48 L 8 -48" stroke="var(--hub-skyline-fade)" strokeWidth={2.4} />
    </g>
  )
}

function DishTower({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x}, 0) scale(${s})`} style={{ fill: 'var(--hub-skyline-fade)' }}>
      <path d="M -12 0 L -2 -34 L 2 -34 L 12 0 Z" />
      <ellipse cx={4} cy={-42} rx={11} ry={6} transform="rotate(-18 4 -42)" />
    </g>
  )
}

function TankSilo({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x}, 0) scale(${s})`} style={{ fill: 'var(--hub-skyline-fade)' }}>
      <rect x={-11} y={-30} width={22} height={30} rx={3} />
    </g>
  )
}

function BoxBuilding({ x, h, s = 1 }: { x: number; h: number; s?: number }) {
  return (
    <g transform={`translate(${x}, 0) scale(${s})`} style={{ fill: 'var(--hub-skyline-fade)' }}>
      <rect x={-14} y={-h} width={28} height={h} />
    </g>
  )
}

// Tree cluster silhouette — three overlapping conifer triangles on a trunk
// stub, flat-shaded to match the hill polygons rather than a painted asset.
// Sits on the nearest hill band, addressing "where's the trees" directly.
function TreeCluster({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x}, 0) scale(${s})`} style={{ fill: 'var(--hub-tree)' }}>
      <path d="M -13 0 L -4 -22 L 2 -22 L -6 0 Z" opacity={0.85} />
      <path d="M 0 0 L 9 -30 L 16 -30 L 6 0 Z" />
      <path d="M 12 0 L 19 -16 L 24 -16 L 16 0 Z" opacity={0.85} />
      <rect x={7.5} y={-8} width={2} height={8} style={{ fill: 'var(--hub-tree-trunk)' }} />
    </g>
  )
}

interface SkylineGlyph { kind: 'dome' | 'radio' | 'dish' | 'tank' | 'box'; x: number; s?: number; h?: number }

const SKYLINE_LAYOUT: SkylineGlyph[] = [
  { kind: 'box', x: 40, h: 46 },
  { kind: 'tank', x: 92, s: 0.9 },
  { kind: 'radio', x: 140 },
  { kind: 'box', x: 200, h: 60 },
  { kind: 'dome', x: 268 },
  { kind: 'box', x: 330, h: 38 },
  { kind: 'dish', x: 386, s: 1.1 },
  { kind: 'box', x: 448, h: 52 },
  { kind: 'tank', x: 500, s: 1.05 },
  { kind: 'radio', x: 556, s: 0.85 },
  { kind: 'box', x: 610, h: 64 },
  { kind: 'dome', x: 682, s: 1.15 },
  { kind: 'box', x: 748, h: 42 },
  { kind: 'dish', x: 800 },
  { kind: 'tank', x: 856, s: 0.95 },
  { kind: 'box', x: 908, h: 56 },
  { kind: 'radio', x: 966 },
  { kind: 'box', x: 1020, h: 40 },
  { kind: 'dome', x: 1082, s: 0.9 },
  { kind: 'box', x: 1148, h: 48 },
]

// KES-228, third correction: this band was anchored `bottom: 0` — flush
// with the very bottom of the scene, which on mobile is exactly where
// HubScreen's docked bottom sheet (title/CTA row + icon strip) overlays
// the scene. The skyline was rendering correctly the whole time; it was
// just entirely hidden behind the dock, which is why it kept reading as
// "still just triangles" (the hill bands sit higher up and clear the dock;
// this band didn't). Anchored to the ground line instead — buildings stand
// on the ground like the real foreground structures, not partly buried
// below the visible scene — so their upper two-thirds clear the dock.
function HubSkyline() {
  return (
    <svg
      data-testid="hub-skyline-fallback"
      aria-hidden="true"
      viewBox="0 0 1200 90"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 'var(--hub-ground)', width: '100%', height: '26%' }}
    >
      <g transform="translate(0, 90)">
        {SKYLINE_LAYOUT.map((g, i) => {
          if (g.kind === 'dome') return <DomeBuilding key={i} x={g.x} s={g.s} />
          if (g.kind === 'radio') return <RadioTower key={i} x={g.x} s={g.s} />
          if (g.kind === 'dish') return <DishTower key={i} x={g.x} s={g.s} />
          if (g.kind === 'tank') return <TankSilo key={i} x={g.x} s={g.s} />
          return <BoxBuilding key={i} x={g.x} h={g.h ?? 40} s={g.s} />
        })}
      </g>
    </svg>
  )
}

// Time-of-day palettes — genuine day/night brightness range, not a hue
// shift within one dark band. The player's own local clock should be
// legible at a glance: midday reads as a real bright sky, not a slightly
// lighter navy. (The "one dark palette" rule elsewhere in this codebase
// governs UI chrome — HUD panels, sheets, `.theme-deep` — not this outdoor
// scene art; conflating the two here was the bug.) Hills/skyline shift with
// the sky so the whole scene reads as one lit environment, not a static
// foreground pasted over a changing backdrop.
const SKY_PALETTES: Record<TimeOfDayPhase, {
  skyTop: string; skyMid: string; horizonGlow: string; starOpacity: number
  hillFar: string; hillMid: string; hillNear: string; skylineFade: string
  tree: string; treeTrunk: string; snowCap: number
}> = {
  night: {
    skyTop: '#050d1f', skyMid: '#12213f', horizonGlow: 'rgba(227,95,160,0.22)', starOpacity: 1,
    hillFar: '#16233f', hillMid: '#0f1b34', hillNear: '#0a1428', skylineFade: '#0d1a30',
    tree: '#0c1a16', treeTrunk: '#1a1410', snowCap: 0.5,
  },
  dawn: {
    skyTop: '#2a2f52', skyMid: '#7a6a86', horizonGlow: 'rgba(255,164,110,0.42)', starOpacity: 0.25,
    hillFar: '#3a3a5c', hillMid: '#2a2c48', hillNear: '#1c2038', skylineFade: '#2a2a44',
    tree: '#1e3324', treeTrunk: '#2a1f16', snowCap: 0.75,
  },
  day: {
    skyTop: '#4f95d6', skyMid: '#bfe3f5', horizonGlow: 'rgba(255,244,214,0.5)', starOpacity: 0,
    hillFar: '#7f9fb0', hillMid: '#4f7d6a', hillNear: '#2f5c46', skylineFade: '#8fa6b6',
    tree: '#2c5a3a', treeTrunk: '#4a3420', snowCap: 1,
  },
  dusk: {
    skyTop: '#2c2454', skyMid: '#8a4a68', horizonGlow: 'rgba(255,138,90,0.5)', starOpacity: 0.45,
    hillFar: '#3c2f52', hillMid: '#2a2040', hillNear: '#1a1630', skylineFade: '#2e2648',
    tree: '#1c2e22', treeTrunk: '#2a1c14', snowCap: 0.85,
  },
}

// Pixel-unit x positions on the same 0–1200 baseline as SKYLINE_LAYOUT
// (not percentages) so trees can share HubSkyline's viewBox/aspect-ratio
// handling instead of stretching under "none".
const TREE_CLUSTERS: { x: number; s?: number }[] = [
  { x: 20, s: 0.9 }, { x: 160, s: 1.15 }, { x: 300, s: 0.75 }, { x: 420, s: 1.0 },
  { x: 580, s: 0.65 }, { x: 700, s: 1.1 }, { x: 780, s: 0.8 }, { x: 940, s: 0.7 },
  { x: 1060, s: 1.05 }, { x: 1160, s: 0.85 },
]

export function HubWorldBackground({ phase = 'night' }: { phase?: TimeOfDayPhase }) {
  const sky = SKY_PALETTES[phase]
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden', background: 'var(--hub-void)' }}>

      {/* ── Sky — deep navy overhead, warming toward the horizon. Colors
          shift with the local-clock phase (see SKY_PALETTES above). ─────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, ${sky.skyTop} 0%, ${sky.skyMid} 62%, var(--hub-void) 100%)`,
        transition: 'background 1.2s ease',
      }} />

      {/* ── Horizon glow — the sun sitting just under the ridge line ──────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: '50%', bottom: 'calc(var(--hub-ground) - 4%)',
          width: '140%', height: '46%', transform: 'translateX(-50%)',
          background: `radial-gradient(50% 100% at 50% 100%, ${sky.horizonGlow} 0%, transparent 70%)`,
          transition: 'background 1.2s ease',
        }}
      />

      {/* ── Sparse high stars — fade out through dawn/day, back in at dusk/
          night, tracking the same local-clock phase. ────────────────────── */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: '38%',
          pointerEvents: 'none', opacity: sky.starOpacity, transition: 'opacity 1.2s ease',
          backgroundImage: [
            'radial-gradient(1px 1px at 8% 18%, rgba(177,198,229,.5), transparent)',
            'radial-gradient(1px 1px at 28% 8%, rgba(177,198,229,.35), transparent)',
            'radial-gradient(1.5px 1.5px at 88% 14%, rgba(177,198,229,.45), transparent)',
            'radial-gradient(1px 1px at 95% 28%, rgba(177,198,229,.3), transparent)',
            'radial-gradient(1px 1px at 70% 6%, rgba(177,198,229,.4), transparent)',
          ].join(','),
          backgroundSize: '520px 340px',
        }}
      />

      {/* ── Parallax mountains, far to near — jagged sharp peaks (not soft
          rolling hills), snow-capped tips that brighten with the sky so the
          range reads as real terrain lit by the same light source. Colors
          shift per phase so midday actually looks like midday. ─────────── */}
      {(() => {
        const farPath = hillPath([
          [0, 100], [0, 55], [9, 38], [18, 48], [27, 22], [36, 40],
          [46, 18], [55, 44], [64, 28], [73, 46], [82, 20], [91, 42],
          [100, 30], [100, 100],
        ])
        const midPath = hillPath([
          [0, 100], [0, 62], [12, 32], [23, 52], [33, 24], [44, 46],
          [56, 18], [67, 44], [78, 26], [89, 48], [100, 34], [100, 100],
        ])
        const nearPath = hillPath([
          [0, 100], [0, 68], [15, 40], [30, 60], [48, 30], [63, 58],
          [80, 36], [100, 56], [100, 100],
        ])
        return (
          <>
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', left: 0, right: 0, bottom: 'calc(var(--hub-ground) + 6%)', height: '30%',
                background: sky.hillFar, clipPath: farPath, transition: 'background 1.2s ease',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0, clipPath: farPath,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, transparent 10%)',
                opacity: sky.snowCap * 0.6, transition: 'opacity 1.2s ease',
              }} />
            </div>
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', left: 0, right: 0, bottom: 'calc(var(--hub-ground) + 2%)', height: '24%',
                background: sky.hillMid, clipPath: midPath, transition: 'background 1.2s ease',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0, clipPath: midPath,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, transparent 8%)',
                opacity: sky.snowCap * 0.4, transition: 'opacity 1.2s ease',
              }} />
            </div>
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', left: 0, right: 0, bottom: 'var(--hub-ground)', height: '16%',
                background: sky.hillNear, clipPath: nearPath, transition: 'background 1.2s ease',
              }}
            >
              {/* Rim-light tracing the nearest ridge crest — cyan at night
                  (facility trim), warm sun-catch by day. */}
              <div style={{
                position: 'absolute', inset: 0,
                background: phase === 'day' || phase === 'dawn'
                  ? 'linear-gradient(180deg, rgba(255,244,214,0.4) 0%, transparent 14%)'
                  : 'linear-gradient(180deg, rgba(112,217,234,0.28) 0%, transparent 14%)',
                clipPath: nearPath, transition: 'background 1.2s ease',
              }} />
            </div>
          </>
        )
      })()}

      {/* ── Tree line — conifer clusters standing on the nearest ridge,
          the terrain detail the flat hill polygons alone don't read as. ── */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 60"
        preserveAspectRatio="xMidYMax slice"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 'var(--hub-ground)', width: '100%', height: '18%',
          ['--hub-tree' as string]: sky.tree, ['--hub-tree-trunk' as string]: sky.treeTrunk,
        }}
      >
        <g transform="translate(0, 60)">
          {TREE_CLUSTERS.map((t, i) => <TreeCluster key={i} x={t.x} s={t.s} />)}
        </g>
      </svg>

      {/* ── Skyline — a distant row of sister facilities built from the same
          dome/mast/dish/tank vocabulary the foreground buildings use, not
          an abstract repeating shape. Flat single-tone haze silhouette (no
          window-glow accents — see the glyph components above) so it can't
          be mistaken for the real, clickable structures HubStructureArt
          renders in front of it. ────────────────────────────────────────── */}
      <div style={{ ['--hub-skyline-fade' as string]: sky.skylineFade }}>
        <HubSkyline />
      </div>

    </div>
  )
}
