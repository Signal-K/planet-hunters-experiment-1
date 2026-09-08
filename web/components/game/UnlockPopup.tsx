'use client'

import React from 'react'
import Image from 'next/image'
import PageSurface from '@/components/ui/PageSurface'

type UnlockKind = 'sr2' | 'loan' | 'ship-customizer'

interface UnlockPopupProps {
  kind: string
  onClose: () => void
  onDismiss?: () => void
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount))
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const UNLOCKS: Record<string, {
  accent: string
  eyebrow: string
  title: string
  body: string
  art: 'rocket' | 'coin' | 'rooms'
  /** Real generated hull art (STS-157) to show instead of the generic
   * RocketArt placeholder — set only where that art actually exists. */
  imgSrc?: string
  stats: [string, string][]
  cta: string
}> = {
  sr2: {
    accent: '#3fa9ff',
    eyebrow: 'Vehicle Available',
    title: 'PROSPECTOR',
    body: 'Mission 2 needs 8 silicon — more than Explorer can carry. Prospector is the first heavier workhorse: larger cargo bay, stronger drill, and enough range for deeper starter targets.',
    art: 'rocket',
    imgSrc: '/game/assets/ships/ship_sr2.png',
    stats: [['CARGO', '10 UNITS'], ['DRILL', 'TIER 2'], ['ROLE', 'BULK RUNS']],
    cta: 'Select Prospector',
  },
  loan: {
    accent: '#ffb347',
    eyebrow: 'Offer',
    title: 'EMERGENCY LOAN',
    body: 'Running low on Francs? The Foundry Guild offers a 5,000 F advance, repaid from your next two deliveries.',
    art: 'coin',
    stats: [['ADVANCE', '5,000 F'], ['TERM', '2 RUNS'], ['RATE', '8%']],
    cta: 'Accept Loan',
  },
  'ship-customizer': {
    accent: '#39d36a',
    eyebrow: 'Facility Unlocked',
    title: 'SHIP ROOMS',
    body: 'The hangar now shows a full interior view of your ship — slot rooms to customise layout, capacity, and crew stations. Open Hangar from the base menu to explore it.',
    art: 'rooms',
    stats: [['VIEW', 'INTERIOR'], ['SLOTS', 'CUSTOM'], ['ACCESS', 'HANGAR']],
    cta: 'Open Hangar',
  },
  'tutorial-complete': {
    accent: '#39d9ff',
    eyebrow: 'Program Online',
    title: 'FREE OPERATIONS',
    body: 'The guided missions are complete. Your base is now yours to run: build facilities, choose your own objectives, and take on client work when it suits your program.',
    art: 'rooms',
    stats: [['STATUS', 'ONLINE'], ['MODE', 'OPEN OPS'], ['NEXT', 'YOUR CALL']],
    cta: 'Enter Free Operations',
  },
  'artifact-signal': {
    accent: '#39d9ff',
    eyebrow: 'Follow-up Record',
    title: 'POSSIBLE SIGNAL',
    body: 'This confirmed transit deserves another look. It is not evidence of life — preserve the raw observation, invite independent review, and let the data carry the claim.',
    art: 'rooms',
    stats: [['SOURCE', 'TESS'], ['STATUS', 'REVIEW'], ['TIER', 'LATE OPS']],
    cta: 'Acknowledge',
  },
}

function RocketArt({ accent }: { accent: string }) {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="ua-body" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--ln-text)"/>
          <stop offset="100%" stopColor="var(--ln-text-muted)"/>
        </linearGradient>
        <linearGradient id="ua-cargo" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent}/>
          <stop offset="100%" stopColor="var(--ln-panel-2)"/>
        </linearGradient>
      </defs>
      <path d="M48 6 L64 32 L62 73 L34 73 L32 32 Z" fill="url(#ua-body)" stroke="var(--ln-surface)" strokeWidth="1.2"/>
      <path d="M48 6 L64 32 L32 32 Z" fill={accent} stroke="var(--ln-surface)" strokeWidth="1"/>
      <rect x="39" y="47" width="18" height="20" rx="3" fill="url(#ua-cargo)" stroke="var(--ln-surface)" strokeWidth="1"/>
      <circle cx="48" cy="39" r="5.5" fill="var(--ln-warn)" stroke="var(--ln-surface)"/>
      <path d="M33 57 L19 79 L35 70 M63 57 L77 79 L61 70" fill={accent} stroke="var(--ln-surface)"/>
      <path d="M25 78 C27 69 31 64 36 61" fill="none" stroke="var(--ln-cyan)" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
      <path d="M71 78 C69 69 65 64 60 61" fill="none" stroke="var(--ln-cyan)" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
      <path d="M40 73 L48 91 L56 73" fill="var(--ln-warn)"/>
      <path d="M43 78 L48 92 L53 78" fill="var(--ln-warn)" opacity="0.72"/>
    </svg>
  )
}

function RoomsArt({ accent }: { accent: string }) {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <rect x="16" y="16" width="64" height="64" rx="6" fill="none" stroke={accent} strokeWidth="2"/>
      <line x1="48" y1="16" x2="48" y2="80" stroke={accent} strokeWidth="1.4" opacity="0.6"/>
      <line x1="16" y1="48" x2="80" y2="48" stroke={accent} strokeWidth="1.4" opacity="0.6"/>
      <rect x="22" y="22" width="20" height="20" rx="3" fill={`${accent}33`} stroke={accent} strokeWidth="1.2"/>
      <rect x="54" y="22" width="20" height="20" rx="3" fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="3 3"/>
      <rect x="22" y="54" width="20" height="20" rx="3" fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="3 3"/>
      <rect x="54" y="54" width="20" height="20" rx="3" fill={`${accent}33`} stroke={accent} strokeWidth="1.2"/>
    </svg>
  )
}

function CoinArt() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r="34" fill="var(--ln-amber)" stroke="var(--ln-amber-press)" strokeWidth="2"/>{/* amber allowed: coin/loan reward icon */}
      <circle cx="48" cy="48" r="26" fill="none" stroke="var(--ln-amber-bright)" strokeWidth="1.5" opacity="0.6"/>
      <text x="48" y="60" textAnchor="middle" fontFamily="var(--ln-font-display)" fontSize="34" fontWeight="800" fill="var(--ln-amber-press)">▲</text>
    </svg>
  )
}

export default function UnlockPopup({ kind, onClose, onDismiss }: UnlockPopupProps) {
  const u = UNLOCKS[kind] ?? UNLOCKS.sr2

  return (
    <PageSurface
      zIndex={90}
      testId="unlock-page"
      contentStyle={{
        background: 'linear-gradient(180deg, var(--ln-panel-2) 0%, var(--ln-void) 100%)',
        border: `1px solid ${u.accent}88`,
        padding: 24, textAlign: 'center',
      }}
    >
        <div style={{ position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', left: '50%', top: 70, width: 300, height: 300,
            transform: 'translate(-50%,-50%)',
            background: `conic-gradient(from 0deg, ${u.accent}22 0deg, transparent 18deg, ${u.accent}22 36deg, transparent 54deg, ${u.accent}22 72deg, transparent 90deg, ${u.accent}22 108deg, transparent 126deg, ${u.accent}22 144deg, transparent 162deg, ${u.accent}22 180deg, transparent 198deg, ${u.accent}22 216deg, transparent 234deg, ${u.accent}22 252deg, transparent 270deg, ${u.accent}22 288deg, transparent 306deg, ${u.accent}22 324deg, transparent 342deg, ${u.accent}22 360deg)`,
            animation: 'unlock-spin 18s linear infinite',
          }} />
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.24em', color: u.accent, textTransform: 'uppercase' }}>{u.eyebrow}</div>

          <div style={{ margin: 'var(--ln-s-4) auto', width: 96, height: 96, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -8, borderRadius: 999, background: `radial-gradient(circle, ${u.accent}44, transparent 70%)` }} />
            {u.imgSrc ? (
              <Image src={u.imgSrc} alt="" width={96} height={96} style={{ objectFit: 'contain', position: 'relative' }} />
            ) : (
              <>
                {u.art === 'rocket' && <RocketArt accent={u.accent} />}
                {u.art === 'coin' && <CoinArt />}
                {u.art === 'rooms' && <RoomsArt accent={u.accent} />}
              </>
            )}
          </div>

          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '0.04em', color: 'var(--ln-text)', textShadow: `0 0 16px ${u.accent}88` }}>{u.title}</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', marginTop: 8, lineHeight: 1.5 }}>{u.body}</div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {u.stats.map(([k, v]) => (
              <div key={k} style={{ flex: 1, padding: '8px 4px', background: 'var(--ln-overlay)', border: `1px solid ${u.accent}44`, borderRadius: 10 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: u.accent, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <button data-testid="unlock-popup-primary" onClick={onClose} style={{
            width: '100%', marginTop: 18, padding: 'var(--ln-s-4)', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: `linear-gradient(180deg, ${u.accent}, ${darkenColor(u.accent, 0.35)})`,
            color: 'var(--ln-text-on-cyan)', fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            boxShadow: 'inset 0 1px 0 var(--ln-hairline-strong), 0 4px 0 var(--ln-overlay)',
          }}>{u.cta}</button>
          {onDismiss && (
            <button data-testid="unlock-popup-secondary" onClick={onDismiss} style={{
              width: '100%', marginTop: 8, padding: 'var(--ln-s-2)', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--ln-hairline)',
              color: 'var(--ln-text-dim)', fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>Decline</button>
          )}
        </div>
    </PageSurface>
  )
}
