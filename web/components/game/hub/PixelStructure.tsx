'use client'

import React from 'react'
import { structureTier } from '@/lib/scene/base-world'
import styles from './BaseLayerScene.module.css'

const HULL = 'var(--ln-world-hull)'
const SHADE = 'var(--ln-world-hull-shade)'
const LIT = 'var(--ln-world-hull-lit)'
const INK = 'var(--ln-world-outline)'
const BLUE = 'var(--ln-world-trim-blue)'
const TEAL = 'var(--ln-world-trim-teal)'
const GLASS = 'var(--ln-world-glass)'
const CONCRETE = 'var(--ln-world-concrete)'

function Frame({ children, viewBox }: { children: React.ReactNode; viewBox: string }) {
  return (
    <svg className={styles.pixel} viewBox={viewBox} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {children}
    </svg>
  )
}

function Launchpad({ tier }: { tier: 1 | 2 | 3 }) {
  if (tier === 1) {
    return (
      <Frame viewBox="0 0 88 72">
        <rect x="6" y="58" width="76" height="10" fill={CONCRETE} stroke={INK} strokeWidth="2" />
        <rect x="38" y="22" width="12" height="36" fill={SHADE} stroke={INK} strokeWidth="2" />
        <rect x="30" y="28" width="28" height="18" fill={HULL} stroke={INK} strokeWidth="2" />
        <rect className={styles.windowGlow} x="36" y="32" width="8" height="6" fill={GLASS} />
        <rect className={styles.beacon} x="42" y="12" width="4" height="10" fill={TEAL} />
      </Frame>
    )
  }
  return (
    <Frame viewBox="0 0 120 176">
      <rect x="8" y="158" width="104" height="14" fill={CONCRETE} stroke={INK} strokeWidth="2" />
      <rect x="18" y="148" width="84" height="12" fill={SHADE} stroke={INK} strokeWidth="2" />
      <rect x="70" y="18" width="16" height="140" fill={HULL} stroke={INK} strokeWidth="2" />
      <rect x="74" y="36" width="8" height="100" fill={SHADE} />
      {[48, 72, 96, 120].map(y => <rect key={y} x="66" y={y} width="24" height="4" fill={BLUE} />)}
      <rect x="86" y="40" width="22" height="6" fill={BLUE} stroke={INK} strokeWidth="2" />
      <rect x="46" y="52" width="24" height="96" fill={LIT} stroke={INK} strokeWidth="2" />
      <rect x="50" y="28" width="16" height="26" fill={BLUE} stroke={INK} strokeWidth="2" />
      <polygon points="58,8 66,28 50,28" fill={LIT} stroke={INK} strokeWidth="2" />
      {tier === 3 && <rect x="28" y="70" width="16" height="88" fill={HULL} stroke={INK} strokeWidth="2" />}
      {tier === 3 && <rect className={styles.windowGlow} x="32" y="84" width="8" height="10" fill={GLASS} />}
      <circle className={styles.beacon} cx="78" cy="14" r="4" fill={TEAL} />
      <ellipse className={styles.steam} cx="40" cy="150" rx="8" ry="5" fill={LIT} opacity="0.7" />
    </Frame>
  )
}

function Hall({ tier, board }: { tier: 1 | 2 | 3; board?: boolean }) {
  const h = tier === 1 ? 64 : 88
  return (
    <Frame viewBox={`0 0 140 ${h + 8}`}>
      <rect x="4" y={h - 36} width="132" height="40" fill={HULL} stroke={INK} strokeWidth="2" />
      <polygon points={`4,${h - 36} 70,8 136,${h - 36}`} fill={SHADE} stroke={INK} strokeWidth="2" />
      <rect x="58" y={h - 28} width="24" height="32" fill={BLUE} stroke={INK} strokeWidth="2" />
      {tier > 1 && [18, 34, 96, 112].map(x => (
        <rect key={x} className={styles.windowGlow} x={x} y={h - 26} width="10" height="8" fill={GLASS} />
      ))}
      {board && tier > 1 && <rect x="96" y={h - 48} width="28" height="16" fill={INK} />}
      {board && tier > 1 && <polyline points={`100,${h - 36} 108,${h - 44} 116,${h - 40} 122,${h - 46}`} fill="none" stroke={TEAL} strokeWidth="2" />}
      {tier === 3 && <rect className={styles.beacon} x="66" y="4" width="6" height="8" fill={TEAL} />}
    </Frame>
  )
}

function Tower({ tier }: { tier: 1 | 2 | 3 }) {
  return (
    <Frame viewBox="0 0 72 150">
      <rect x="22" y="46" width="28" height="96" fill={HULL} stroke={INK} strokeWidth="2" />
      <rect x="18" y="36" width="36" height="16" fill={SHADE} stroke={INK} strokeWidth="2" />
      <rect x="16" y="18" width="40" height="22" fill={GLASS} stroke={INK} strokeWidth="2" />
      {tier > 1 && <rect x="34" y="4" width="4" height="16" fill={INK} />}
      {tier === 3 && <rect className={styles.beacon} x="30" y="2" width="4" height="4" fill={TEAL} />}
      {[64, 84, 104].map(y => <rect key={y} className={styles.windowGlow} x="28" y={y} width="8" height="8" fill={tier === 1 && y > 64 ? SHADE : GLASS} />)}
      <rect x="10" y="132" width="52" height="12" fill={CONCRETE} stroke={INK} strokeWidth="2" />
    </Frame>
  )
}

function Dome({ tier }: { tier: 1 | 2 | 3 }) {
  return (
    <Frame viewBox="0 0 100 96">
      <rect x="10" y="48" width="80" height="40" fill={HULL} stroke={INK} strokeWidth="2" />
      <path d="M18 50 Q50 8 82 50" fill={GLASS} stroke={INK} strokeWidth="2" />
      <rect x="42" y="58" width="16" height="30" fill={BLUE} stroke={INK} strokeWidth="2" />
      {tier > 1 && <rect className={styles.windowGlow} x="22" y="62" width="12" height="10" fill={LIT} />}
      {tier > 1 && <rect className={styles.windowGlow} x="66" y="62" width="12" height="10" fill={LIT} />}
      {tier === 3 && <rect x="46" y="14" width="8" height="10" fill={TEAL} />}
    </Frame>
  )
}

function Refinery({ tier }: { tier: 1 | 2 | 3 }) {
  return (
    <Frame viewBox="0 0 120 86">
      <rect x="8" y="36" width="28" height="42" fill={HULL} stroke={INK} strokeWidth="2" />
      <rect x="44" y="22" width="24" height="56" fill={SHADE} stroke={INK} strokeWidth="2" />
      {tier > 1 && <rect x="76" y="40" width="28" height="38" fill={HULL} stroke={INK} strokeWidth="2" />}
      <rect x="48" y="8" width="6" height="16" fill={INK} />
      <ellipse className={styles.steam} cx="51" cy="8" rx="6" ry="4" fill={LIT} />
      {tier === 3 && <rect x="16" y="48" width="12" height="8" fill={BLUE} />}
      <rect x="4" y="74" width="112" height="8" fill={CONCRETE} />
    </Frame>
  )
}

function Telescope({ tier }: { tier: 1 | 2 | 3 }) {
  return (
    <Frame viewBox="0 0 84 100">
      <rect x="28" y="58" width="28" height="34" fill={HULL} stroke={INK} strokeWidth="2" />
      <circle cx="42" cy="46" r="18" fill={GLASS} stroke={INK} strokeWidth="2" />
      {tier > 1 && (
        <g className={styles.dish}>
          <rect x="54" y="28" width="22" height="6" fill={SHADE} stroke={INK} strokeWidth="2" />
        </g>
      )}
      {tier === 3 && <rect className={styles.beacon} x="40" y="12" width="4" height="8" fill={TEAL} />}
    </Frame>
  )
}

function Shed() {
  return (
    <Frame viewBox="0 0 72 56">
      <rect x="6" y="22" width="60" height="28" fill={HULL} stroke={INK} strokeWidth="2" />
      <polygon points="6,22 36,6 66,22" fill={SHADE} stroke={INK} strokeWidth="2" />
      <rect className={styles.windowGlow} x="14" y="30" width="12" height="8" fill={GLASS} />
      <rect x="44" y="30" width="12" height="16" fill={BLUE} stroke={INK} strokeWidth="2" />
    </Frame>
  )
}

/** Side-on pixel structure. Tier 1 is the first small build; tier 3 is the full module. Surface silo has no above-ground sprite. */
export function PixelStructure({ kind, level = 1 }: { kind: string; level?: number }) {
  const tier = structureTier(level)
  let body: React.ReactNode = null
  if (kind === 'launchpad') body = <Launchpad tier={tier} />
  else if (kind === 'hangar') body = <Hall tier={tier} />
  else if (kind === 'market') body = <Hall tier={Math.max(tier, 2) as 2 | 3} board />
  else if (kind === 'command') body = <Tower tier={tier} />
  else if (kind === 'astronaut-academy') body = <Dome tier={tier} />
  else if (kind === 'refinery') body = <Refinery tier={tier} />
  else if (kind === 'deep-space-telescope' || kind === 'transit-telescope') body = <Telescope tier={tier} />
  else if (kind !== 'surface-silo') body = <Shed />
  if (!body) return null
  return <span data-pixel-structure={kind} data-tier={tier} style={{ display: 'block', width: '100%', height: '100%' }}>{body}</span>
}
