'use client'

import React from 'react'

/**
 * Earth Base world — ported from the Open Design mockup
 * `landnam-earth-base-v2.html` (2026-07-26).
 *
 * Earth seen from the surface: deep-space navy at the top fading through
 * true atmosphere blue to a pale horizon — not the old warm amber/green
 * blend. Bold flat-shaded silhouettes, two parallax ridge layers, a faceted
 * ground polygon and a central octagonal plateau the structures stand on.
 *
 * Layout contract: every vertical position is a percentage of the scene box,
 * anchored off the ground line 22% from the bottom. That is the same ground
 * line hubScene.ts uses for PixiJS building feet (`containerH * 0.78`) and
 * the same one HubScreen/BuildPlaceScreen position DOM plot labels against —
 * changing it here means changing it in all three.
 */

// Plateau top surface sits ~3.4% above the scene floor; structure feet land
// at 22%, i.e. 3.4% inset inside the plateau's top edge, so buildings read as
// planted into the platform rather than balanced on its rim.
const PLATEAU_BOTTOM = '3.4%'
const PLATEAU_HEIGHT = '22%'
const GROUND_HEIGHT = '29%'

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

      {/* ── Ridgelines — two layers, opposing slow parallax drift ──────── */}
      <div
        className="hub-ridge"
        style={{
          position: 'absolute', left: '-5%', width: '110%', bottom: '25%',
          pointerEvents: 'none',
          animation: 'hub-drift-slow 60s ease-in-out infinite alternate',
        }}
      >
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none" style={{ width: '100%', display: 'block' }} aria-hidden="true">
          <path d="M0,180 L120,120 240,160 380,90 520,150 660,80 820,140 980,70 1140,130 1300,60 1440,110 1440,220 0,220 Z" fill="#638098" />
        </svg>
      </div>
      <div
        className="hub-ridge"
        style={{
          position: 'absolute', left: '-5%', width: '110%', bottom: '19%',
          pointerEvents: 'none',
          animation: 'hub-drift-slow 40s ease-in-out infinite alternate-reverse',
        }}
      >
        <svg viewBox="0 0 1440 200" preserveAspectRatio="none" style={{ width: '100%', display: 'block' }} aria-hidden="true">
          <path d="M0,160 L160,100 300,140 460,70 620,130 780,60 940,120 1120,50 1300,110 1440,80 1440,200 0,200 Z" fill="#3a5a52" />
        </svg>
      </div>

      {/* ── Atmospheric haze sitting on the ridgeline ──────────────────── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '25%', height: '22%',
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.14) 100%)',
      }} />

      {/* ── Ground — faceted clip-path polygon, hard-edged, no gradient texture ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: GROUND_HEIGHT,
        background: 'linear-gradient(180deg, #23421f 0%, #16301a 45%, #0d2015 100%)',
        clipPath: 'polygon(0% 38%, 12% 30%, 26% 40%, 40% 26%, 55% 36%, 68% 24%, 82% 34%, 100% 22%, 100% 100%, 0% 100%)',
      }} />

      {/* ── Plateau — octagonal build platform, cyan rim ───────────────── */}
      <div style={{
        position: 'absolute', left: '50%', bottom: PLATEAU_BOTTOM, transform: 'translateX(-50%)',
        width: 'min(74%, 900px)', height: PLATEAU_HEIGHT,
        background: 'linear-gradient(180deg, #2c4d28 0%, #1c331c 100%)',
        clipPath: 'polygon(4% 22%, 22% 4%, 78% 4%, 96% 22%, 96% 78%, 78% 96%, 22% 96%, 4% 78%)',
        border: '2px solid rgba(108,212,255,0.26)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 40px 70px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.35)',
      }} />
    </div>
  )
}
