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

    </div>
  )
}
