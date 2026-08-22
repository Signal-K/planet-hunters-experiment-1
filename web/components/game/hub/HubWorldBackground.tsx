'use client'

import React from 'react'

/**
 * Earth Base backdrop — rebuilt 2026-08-21 (KES-226), scrapping the
 * KES-220 light-daylight version same day. That version only recolored the
 * existing horizon+mountains composition and read as "the same screen with
 * new colors," not a redesign.
 *
 * This version replaces the composition itself: a large orbit ring (two
 * concentric circles — a conic-gradient outer ring, a near-black inner
 * "hole") is now the dominant visual, framed directly after tapnine.com's
 * "Black Hole" (com.tapnine.blackhole) reference screenshots. The ring's
 * bottom edge sits exactly on the ground contact line so PixiJS-rendered
 * buildings (`lib/pixi/hubScene.ts`) plant into its base, the way the
 * reference's facility sits at the foot of its ring. A dark skyline
 * silhouette fills the gap on either side of the buildings, low against
 * the void.
 *
 * Color reverts to Out There: Ω Edition's actual dark palette (near-black
 * navy, pale blue-grey linework, cyan accent) plus the reference's
 * signature pink as a second accent for the ring itself — this is a dark
 * diorama, not the KES-211/220 light "blueprint" paper treatment.
 *
 * Layout contract: the ring's bottom (= ground line) sits 22% from the
 * bottom, unchanged from before. hubScene.ts draws building feet against
 * `containerH * 0.78` and HubScreen/BuildPlaceScreen position DOM plot
 * labels against the same line — changing it means changing it in all three.
 */
export function HubWorldBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden', background: 'var(--hub-void)' }}>

      {/* ── Void — near-black navy beyond the ring ─────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 50% 34%, var(--hub-bg) 0%, var(--hub-void) 70%)',
      }} />

      {/* ── Orbit ring — the scene's dominant visual ─────────────────────
          Sized off container HEIGHT, not width — this scene renders inside
          a fixed-max-width, height-capped desktop card (.portrait-canvas,
          globals.css), so a width-driven ring would balloon far past the
          visible height at wide/short desktop aspect ratios. Height-driven
          sizing stays proportional across the mobile-portrait and capped
          desktop card alike. */}
      <div
        data-testid="hub-orbit-ring"
        aria-hidden="true"
        style={{
          position: 'absolute', left: '50%', bottom: 'var(--hub-ground)',
          height: '94%', aspectRatio: '1 / 1', transform: 'translate(-50%, 50%)',
          borderRadius: '50%',
          background: 'conic-gradient(from 200deg, var(--hub-ring-pink) 0deg, #cfe0f5 85deg, var(--hub-ring-cyan) 170deg, var(--hub-ring-mid) 255deg, var(--hub-ring-pink) 360deg)',
          boxShadow: '0 0 120px 40px rgba(227,95,160,0.14), 0 0 200px 80px rgba(112,217,234,0.08)',
        }}
      >
        {/* Inner hole — sized to leave a thick visible ring stroke */}
        <div style={{
          position: 'absolute', inset: '9%',
          borderRadius: '50%',
          background: 'var(--hub-ring-hole)',
        }} />
      </div>

      {/* ── Starfield scattered around the ring, upper band only ───────── */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: '55%',
          pointerEvents: 'none',
          backgroundImage: [
            'radial-gradient(1px 1px at 8% 18%, rgba(177,198,229,.6), transparent)',
            'radial-gradient(1px 1px at 28% 8%, rgba(177,198,229,.45), transparent)',
            'radial-gradient(1.5px 1.5px at 88% 14%, rgba(177,198,229,.55), transparent)',
            'radial-gradient(1px 1px at 95% 40%, rgba(177,198,229,.4), transparent)',
            'radial-gradient(1px 1px at 5% 45%, rgba(177,198,229,.35), transparent)',
            'radial-gradient(1px 1px at 70% 6%, rgba(177,198,229,.5), transparent)',
          ].join(','),
          backgroundSize: '520px 340px',
        }}
      />

      {/* ── Skyline silhouette — sits below the ring, either side of the
          real (Pixi-rendered) buildings, dark navy against the void ───── */}
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
