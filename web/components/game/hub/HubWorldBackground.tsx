'use client'

import React from 'react'

/**
 * Earth Base sky — the atmospheric backdrop only.
 *
 * Earth seen from the surface: deep-space navy at the top fading through true
 * atmosphere blue to a pale horizon, with a starfield in the upper band and a
 * haze shelf where the ranges meet the sky.
 *
 * Terrain used to live here as SVG. It now renders in PixiJS
 * (`lib/pixi/hubScene.ts` → `buildTerrain`) so the ground, the plateau and the
 * structures standing on them are shaded by one system, and so the ground can
 * carry real cel-shaded facets rather than flat clip-path silhouettes. This
 * file keeps only what Pixi is poor at: large soft gradients.
 *
 * Layout contract: the ground line sits 22% from the bottom. hubScene.ts draws
 * terrain and building feet against it (`containerH * 0.78`) and
 * HubScreen/BuildPlaceScreen position DOM plot labels against it — changing it
 * means changing it in all three.
 */

// Plateau top surface sits ~3.4% above the scene floor; structure feet land
// at 22%, i.e. 3.4% inset inside the plateau's top edge, so buildings read as
// planted into the platform rather than balanced on its rim.
export function HubWorldBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}>

      {/* ── Sky — deep space to atmosphere ─────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #050a16 0%, #0a1530 22%, #123469 46%, #1c5490 68%, #3a80ae 86%, #5aa0c4 100%)',
      }} />

      {/* ── Starfield — upper band only, slow twinkle ──────────────────── */}
      <div
        className="hub-stars"
        style={{
          position: 'absolute', left: 0, right: 0, top: '-10%', height: '58%',
          pointerEvents: 'none',
          backgroundImage: [
            'radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,.55), transparent)',
            'radial-gradient(1px 1px at 30% 45%, rgba(255,255,255,.4), transparent)',
            'radial-gradient(1.5px 1.5px at 55% 15%, rgba(255,255,255,.5), transparent)',
            'radial-gradient(1px 1px at 75% 35%, rgba(255,255,255,.36), transparent)',
            'radial-gradient(1px 1px at 90% 10%, rgba(255,255,255,.44), transparent)',
            'radial-gradient(1px 1px at 22% 62%, rgba(255,255,255,.28), transparent)',
            'radial-gradient(1px 1px at 68% 58%, rgba(255,255,255,.24), transparent)',
          ].join(','),
          backgroundSize: '480px 320px',
          animation: 'hub-twinkle 5s ease-in-out infinite alternate',
        }}
      />

      {/* ── Atmospheric haze sitting on the ridgeline ──────────────────── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '25%', height: '22%',
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.14) 100%)',
      }} />

      {/* Renderer-independent base silhouette. Pixi paints richer terrain and
          structures above this when available, but a failed WebGL context must
          never reduce Earth Base to an empty sky. Keep this deliberately small:
          one ridge band, turf, and a service deck are enough to establish a
          readable playable place while the canvas is unavailable. */}
      <div
        data-testid="hub-terrain-fallback"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: '21%', height: '20%',
          background: '#315043',
          clipPath: 'polygon(0 72%, 8% 48%, 17% 68%, 29% 30%, 39% 60%, 51% 36%, 62% 70%, 73% 28%, 85% 58%, 100% 38%, 100% 100%, 0 100%)',
        }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '24%',
          background: '#1a3620',
          clipPath: 'polygon(0 18%, 12% 12%, 26% 18%, 39% 8%, 53% 16%, 66% 6%, 79% 15%, 91% 7%, 100% 13%, 100% 100%, 0 100%)',
        }} />
        <div style={{
          position: 'absolute', left: '13%', right: '13%', bottom: '14%', height: '9%',
          background: '#1c331c',
          borderTop: '2px solid rgba(140, 200, 90, 0.5)',
          borderRadius: '8% 8% 2px 2px / 30% 30% 2px 2px',
          boxShadow: 'inset 0 -14px 0 #13261b',
        }} />
      </div>

    </div>
  )
}
