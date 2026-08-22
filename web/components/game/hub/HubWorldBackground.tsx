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

function DomeBuilding({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x}, 0) scale(${s})`}>
      <rect x={-16} y={-38} width={32} height={38} style={{ fill: 'var(--hub-skyline)' }} />
      <path d="M -16 -38 A 16 16 0 0 1 16 -38 Z" style={{ fill: 'var(--hub-skyline)' }} />
      <rect x={-1.4} y={-58} width={2.8} height={20} style={{ fill: 'var(--hub-skyline)' }} />
      <circle cx={0} cy={-59} r={2.2} style={{ fill: 'var(--hub-chalk)', opacity: 0.55 }} />
      {/* Decorative-only skyline: window glow dialed back (KES-231) so this
          non-interactive backdrop doesn't read as clickable next to the real,
          brighter-lit foreground structures (HubStructureArt). */}
      <rect x={-9} y={-22} width={6} height={8} style={{ fill: 'var(--hub-cyan)', opacity: 0.2 }} />
      <rect x={3} y={-22} width={6} height={8} style={{ fill: 'var(--hub-cyan)', opacity: 0.14 }} />
    </g>
  )
}

function RadioTower({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x}, 0) scale(${s})`}>
      <path d="M -3 0 L -8 -60 L 8 -60 L 3 0 Z" style={{ fill: 'var(--hub-skyline)' }} />
      <path d="M -6.5 -18 L 6.5 -18 M -7.4 -36 L 7.4 -36 M -8 -48 L 8 -48" stroke="var(--hub-skyline)" strokeWidth={2.4} />
      <circle cx={0} cy={-63} r={1.8} style={{ fill: 'var(--hub-cyan)' }} />
    </g>
  )
}

function DishTower({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x}, 0) scale(${s})`}>
      <path d="M -12 0 L -2 -34 L 2 -34 L 12 0 Z" style={{ fill: 'var(--hub-skyline)' }} />
      <ellipse cx={4} cy={-42} rx={11} ry={6} transform="rotate(-18 4 -42)" style={{ fill: 'var(--hub-skyline)' }} />
      <circle cx={4} cy={-42} r={1.6} style={{ fill: 'var(--hub-chalk)', opacity: 0.8 }} />
    </g>
  )
}

function TankSilo({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x}, 0) scale(${s})`}>
      <rect x={-11} y={-30} width={22} height={30} rx={3} style={{ fill: 'var(--hub-skyline)' }} />
      <rect x={-11} y={-14} width={22} height={2} style={{ fill: 'var(--hub-cyan)', opacity: 0.3 }} />
    </g>
  )
}

function BoxBuilding({ x, h, s = 1 }: { x: number; h: number; s?: number }) {
  const rows = Math.max(1, Math.floor((h - 8) / 11))
  return (
    <g transform={`translate(${x}, 0) scale(${s})`}>
      <rect x={-14} y={-h} width={28} height={h} style={{ fill: 'var(--hub-skyline)' }} />
      {Array.from({ length: rows }, (_, row) => (
        <rect
          key={row}
          x={-8}
          y={-h + 8 + row * 11}
          width={16}
          height={5}
          style={{ fill: 'var(--hub-cyan)', opacity: (row % 2 === 0) ? 0.16 : 0.09 }}
        />
      ))}
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

// Time-of-day sky palettes (KES-231) — the base sky stays the same deep-navy
// command-deck tone at every phase (ops screens never go full daylight
// blue), only the sky-top/mid warmth, horizon glow color, and star
// visibility shift with the player's local clock. `night` matches the
// original static values exactly, so the SSR-default phase renders
// pixel-identical to the pre-KES-231 scene.
const SKY_PALETTES: Record<TimeOfDayPhase, { skyTop: string; skyMid: string; horizonGlow: string; starOpacity: number }> = {
  night: { skyTop: 'var(--hub-sky-top)', skyMid: 'var(--hub-sky-mid)', horizonGlow: 'var(--hub-horizon-glow)', starOpacity: 1 },
  dawn: { skyTop: '#132242', skyMid: '#2c3d61', horizonGlow: 'rgba(255,164,110,0.34)', starOpacity: 0.35 },
  day: { skyTop: '#1c3459', skyMid: '#40608c', horizonGlow: 'rgba(163,203,229,0.2)', starOpacity: 0 },
  dusk: { skyTop: '#17204a', skyMid: '#3c2c52', horizonGlow: 'rgba(227,95,160,0.36)', starOpacity: 0.55 },
}

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

      {/* ── Parallax hill silhouettes, far to near — real terrain, not a
          space object. Jagged ridgelines via clip-path, flat-color facets
          matching the Crashlands/Out There linework the rest of the scene
          uses. Each band sits a little lower/darker than the last. ──────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 'calc(var(--hub-ground) + 6%)', height: '30%',
          background: 'var(--hub-hill-far)',
          clipPath: hillPath([
            [0, 100], [0, 55], [9, 38], [18, 48], [27, 22], [36, 40],
            [46, 18], [55, 44], [64, 28], [73, 46], [82, 20], [91, 42],
            [100, 30], [100, 100],
          ]),
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 'calc(var(--hub-ground) + 2%)', height: '24%',
          background: 'var(--hub-hill-mid)',
          clipPath: hillPath([
            [0, 100], [0, 62], [12, 32], [23, 52], [33, 24], [44, 46],
            [56, 18], [67, 44], [78, 26], [89, 48], [100, 34], [100, 100],
          ]),
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 'var(--hub-ground)', height: '16%',
          background: 'var(--hub-hill-near)',
          clipPath: hillPath([
            [0, 100], [0, 68], [15, 40], [30, 60], [48, 30], [63, 58],
            [80, 36], [100, 56], [100, 100],
          ]),
        }}
      >
        {/* Cyan rim-light tracing the nearest ridge crest — the scene's one
            grounded accent above the ground line, echoing the facility's
            own trim rather than a giant light source. */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(112,217,234,0.28) 0%, transparent 14%)',
          clipPath: hillPath([
            [0, 100], [0, 68], [15, 40], [30, 60], [48, 30], [63, 58],
            [80, 36], [100, 56], [100, 100],
          ]),
        }} />
      </div>

      {/* ── Skyline — a distant row of sister facilities built from the same
          dome/mast/dish/tank vocabulary the foreground buildings use, not
          an abstract repeating shape. Sits at the very base, either side of
          the real (Pixi-rendered) buildings, dark navy against the nearest
          hill band. ─────────────────────────────────────────────────────── */}
      <HubSkyline />

    </div>
  )
}
