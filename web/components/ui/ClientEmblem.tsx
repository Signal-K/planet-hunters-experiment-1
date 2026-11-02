'use client'

import type { ReactNode } from 'react'

/**
 * SSL-730 drawing 2: every client has a company logo instead of an initials circle (Liam chose flat two-tone
 * emblems, 2 Nov). One badge per client: a navy field, a ring in the client's colour, and a bold cream symbol of
 * its trade with a colour accent. Drawn on a 48-unit grid as filled shapes so it still reads at 34px.
 */
const INK = 'var(--ln-bp-ink, #142840)'
const PAPER = 'var(--ln-bp-paper, #f4efe4)'

type Emblem = (accent: string) => ReactNode

export const CLIENT_EMBLEMS: Record<string, Emblem> = {
  // Thruster supply: an engine bell with its flame.
  'helios-propulsion-depot': accent => (
    <>
      <rect x="17" y="5" width="14" height="10" rx="4" fill={PAPER} />
      <rect x="21" y="14" width="6" height="4" fill={PAPER} />
      <path d="M21 18h6c2 6 6 10 9 13H12c3-3 7-7 9-13z" fill={PAPER} />
      <path d="M15 32h18c-2 5-5 9-9 11-4-2-7-6-9-11z" fill={accent} />
      <path d="M20.5 33h7c-1 3-2 5-3.5 6.5-1.5-1.5-2.5-3.5-3.5-6.5z" fill={PAPER} opacity="0.85" />
    </>
  ),
  // Batteries: a cell with a charge bolt.
  'arcturus-battery-systems': accent => (
    <>
      <rect x="20" y="7" width="8" height="5" rx="1.5" fill={PAPER} />
      <rect x="13" y="11" width="22" height="30" rx="4" fill={PAPER} />
      <path d="M27 15l-8 12h6l-3 10 9-13h-6l3-9z" fill={accent} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
    </>
  ),
  // Orbital construction: a girder truss.
  'ferrum-orbital-construction': accent => (
    <>
      <path d="M7 37L24 10l17 27z" fill="none" stroke={PAPER} strokeWidth="4" strokeLinejoin="round" />
      <path d="M15.5 37L24 23.5 32.5 37" fill="none" stroke={PAPER} strokeWidth="3" strokeLinejoin="round" />
      <rect x="5" y="36" width="38" height="5" rx="1.5" fill={accent} />
    </>
  ),
  // Bulk aggregate: three stacked boulders.
  'atlas-aggregate': accent => (
    <>
      <path d="M6 37c0-6 4-10 10-10s10 4 10 10z" fill={PAPER} stroke={INK} strokeWidth="1.5" />
      <path d="M22 37c0-6 4-10 10-10s10 4 10 10z" fill={PAPER} stroke={INK} strokeWidth="1.5" />
      <path d="M14 26c0-6 4-11 10-11s10 5 10 11z" fill={accent} stroke={INK} strokeWidth="1.5" />
      <rect x="5" y="37" width="38" height="4" rx="1.5" fill={PAPER} />
    </>
  ),
  // Volatiles: a drop of ice with a frost star.
  'ceres-volatiles-collective': accent => (
    <>
      <path d="M24 6C20 13 12 21 12 29a12 12 0 0 0 24 0c0-8-8-16-12-23z" fill={PAPER} />
      <path d="M24 23v14M18 26.5l12 7M30 26.5l-12 7" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  // Metals: an anvil and a spark.
  'helioforge-metals': accent => (
    <>
      <path d="M6 17h30c0 4 3 6 7 6v2H31l-3 5h4v8H15v-8h4l-3-5h-5c-3 0-5-4-5-8z" fill={PAPER} />
      <path d="M38 6l1.6 4.4L44 12l-4.4 1.6L38 18l-1.6-4.4L32 12l4.4-1.6z" fill={accent} />
    </>
  ),
  // Deep-core materials: a fluted drill bit.
  'kepler-materials': accent => (
    <>
      <rect x="19" y="6" width="10" height="7" rx="1.5" fill={accent} />
      <path d="M16 14h16l-8 29z" fill={PAPER} />
      <path d="M17.5 19l13 4M19 26l10 3M20.6 33l6.6 2" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // Night operations: a crescent moon and a star.
  'nightjar-systems': accent => (
    <>
      <path d="M28 7a17 17 0 1 0 13 27A14 14 0 0 1 28 7z" fill={PAPER} />
      <path d="M33 11l1.4 3.6 3.6 1.4-3.6 1.4L33 21l-1.4-3.6-3.6-1.4 3.6-1.4z" fill={accent} />
    </>
  ),
  // Core metallurgy: a volcano with molten glow.
  'vulcan-core-metallurgy': accent => (
    <>
      <path d="M5 41l13-22h12l13 22z" fill={PAPER} />
      <path d="M18 19h12l-2.5 5h-7z" fill={accent} />
      <circle cx="24" cy="11" r="3.4" fill={accent} />
      <circle cx="18" cy="8" r="1.8" fill={accent} opacity="0.75" />
      <circle cx="30" cy="7" r="1.6" fill={accent} opacity="0.6" />
    </>
  ),
  // Solar grid: a sun over a tilted panel.
  'solgrid-dynamics': accent => (
    <>
      <circle cx="15" cy="14" r="6.5" fill={accent} />
      <path d="M13 25h29l-6 16H7z" fill={PAPER} />
      <path d="M21 25l-4.5 16M31 25l-4.5 16M10 33h29" stroke={INK} strokeWidth="2" />
    </>
  ),
  // Research: a lens with an iris.
  'lumen-research': accent => (
    <>
      <path d="M5 24C10 15 17 11 24 11s14 4 19 13c-5 9-12 13-19 13S10 33 5 24z" fill={PAPER} />
      <circle cx="24" cy="24" r="8" fill={INK} />
      <circle cx="24" cy="24" r="4" fill={accent} />
      <circle cx="21.5" cy="21.5" r="1.6" fill={PAPER} />
    </>
  ),
  // Frontier works: a claim flag on a ridge.
  'pioneer-works': accent => (
    <>
      <path d="M5 41l11-11 7 6 8-10 12 15z" fill={PAPER} />
      <rect x="22" y="7" width="3" height="27" rx="1" fill={PAPER} />
      <path d="M25 8h15l-4 5.5 4 5.5H25z" fill={accent} />
    </>
  ),
}

export function hasClientEmblem(clientId: string | undefined): clientId is string {
  return !!clientId && clientId in CLIENT_EMBLEMS
}

export default function ClientEmblem({ clientId, color, size = 36, label }: { clientId: string; color: string; size?: number; label?: string }) {
  const draw = CLIENT_EMBLEMS[clientId]
  if (!draw) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-testid="client-emblem"
      data-client={clientId}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect x="1" y="1" width="46" height="46" rx="12" fill={INK} />
      <rect x="3.5" y="3.5" width="41" height="41" rx="10" fill="none" stroke={color} strokeWidth="2.5" />
      {draw(color)}
    </svg>
  )
}
