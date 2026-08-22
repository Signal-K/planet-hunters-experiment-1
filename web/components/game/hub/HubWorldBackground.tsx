'use client'

import React from 'react'

/**
 * Earth Base backdrop — corrected 2026-08-22 (KES-228). The prior version
 * (KES-226, same-day rebuild) put a giant orbit-ring diorama behind the
 * launchpad, framed directly after tapnine.com's "Black Hole" reference.
 * That was a narrative mistake: Earth Base is a space *agency facility on
 * Earth*, not a station in orbit — a dominant space-hole motif told players
 * they were somewhere they aren't. The reference's layout ideas (persistent
 * stacked HUD rail, docked bottom sheet) are real and stay elsewhere
 * (HUDStrip, HubScreen's dock); its literal ring does not belong here.
 *
 * This version is a grounded Earth diorama: a dusk sky (deep navy
 * overhead, warming toward the horizon), three parallax hill-silhouette
 * bands, and a low horizon glow where the sun sits just under the ridge
 * line. Out There: Ω Edition's dark navy + cyan trim stays the base
 * palette; the reference's pink survives only as the horizon's warm
 * accent, not as a space object.
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

export function HubWorldBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden', background: 'var(--hub-void)' }}>

      {/* ── Sky — deep navy overhead, warming toward the horizon ─────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, var(--hub-sky-top) 0%, var(--hub-sky-mid) 62%, var(--hub-void) 100%)',
      }} />

      {/* ── Horizon glow — the sun sitting just under the ridge line ──────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: '50%', bottom: 'calc(var(--hub-ground) - 4%)',
          width: '140%', height: '46%', transform: 'translateX(-50%)',
          background: 'radial-gradient(50% 100% at 50% 100%, var(--hub-horizon-glow) 0%, transparent 70%)',
        }}
      />

      {/* ── Sparse high stars — dusk, not full night; kept faint and few ──── */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: '38%',
          pointerEvents: 'none',
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

      {/* ── Skyline silhouette — sits at the very base, either side of the
          real (Pixi-rendered) buildings, dark navy against the nearest
          hill band ───────────────────────────────────────────────────── */}
      <div
        data-testid="hub-skyline-fallback"
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '19%',
          background: 'var(--hub-skyline)',
          clipPath: 'polygon(0 55%, 6% 55%, 6% 30%, 13% 30%, 13% 45%, 20% 45%, 20% 15%, 27% 15%, 27% 40%, 35% 40%, 35% 20%, 42% 20%, 42% 50%, 58% 50%, 58% 22%, 65% 22%, 65% 42%, 73% 42%, 73% 18%, 80% 18%, 80% 48%, 87% 48%, 87% 28%, 94% 28%, 94% 52%, 100% 52%, 100% 100%, 0 100%)',
        }}
      />

    </div>
  )
}
