'use client'

import React from 'react'
import Image from 'next/image'
import Sheet from '@/components/ui/Sheet'

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
}

function RocketArt({ accent }: { accent: string }) {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="ua-body" x1="0" x2="1">
          <stop offset="0%" stopColor="#eaf3ff"/>
          <stop offset="100%" stopColor="#7a93b5"/>
        </linearGradient>
        <linearGradient id="ua-cargo" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent}/>
          <stop offset="100%" stopColor="#0d3158"/>
        </linearGradient>
      </defs>
      <path d="M48 6 L64 32 L62 73 L34 73 L32 32 Z" fill="url(#ua-body)" stroke="#1a2230" strokeWidth="1.2"/>
      <path d="M48 6 L64 32 L32 32 Z" fill={accent} stroke="#1a2230" strokeWidth="1"/>
      <rect x="39" y="47" width="18" height="20" rx="3" fill="url(#ua-cargo)" stroke="#1a2230" strokeWidth="1"/>
      <circle cx="48" cy="39" r="5.5" fill="#f5a623" stroke="#1a2230"/>
      <path d="M33 57 L19 79 L35 70 M63 57 L77 79 L61 70" fill={accent} stroke="#1a2230"/>
      <path d="M25 78 C27 69 31 64 36 61" fill="none" stroke="#7ec8ff" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
      <path d="M71 78 C69 69 65 64 60 61" fill="none" stroke="#7ec8ff" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
      <path d="M40 73 L48 91 L56 73" fill="#f5a623"/>
      <path d="M43 78 L48 92 L53 78" fill="#ff6b35" opacity="0.72"/>
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
      <circle cx="48" cy="48" r="34" fill="#f5a623" stroke="#8a5300" strokeWidth="2"/>
      <circle cx="48" cy="48" r="26" fill="none" stroke="#fff1d0" strokeWidth="1.5" opacity="0.6"/>
      <text x="48" y="60" textAnchor="middle" fontFamily="var(--ln-font-display)" fontSize="34" fontWeight="800" fill="#7a4f00">▲</text>
    </svg>
  )
}

export default function UnlockPopup({ kind, onClose, onDismiss }: UnlockPopupProps) {
  const u = UNLOCKS[kind] ?? UNLOCKS.sr2

  return (
    <Sheet
      variant="centered"
      onDismiss={onDismiss ?? onClose}
      zIndex={90}
      backdropTestId="unlock-popup-scrim"
      scrimStyle={{ background: 'rgba(8,8,9,0.8)', backdropFilter: 'blur(3px)' }}
      panelStyle={{
        width: 320, maxWidth: '90%',
        background: 'linear-gradient(180deg, #0d1c30 0%, #060d18 100%)',
        border: `1px solid ${u.accent}88`,
        borderRadius: 20, padding: 22, textAlign: 'center',
        boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 40px ${u.accent}33`,
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

          <div style={{ margin: '14px auto', width: 96, height: 96, position: 'relative' }}>
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

          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '0.04em', color: '#fff', textShadow: `0 0 18px ${u.accent}88` }}>{u.title}</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#a9b8ce', marginTop: 8, lineHeight: 1.5 }}>{u.body}</div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {u.stats.map(([k, v]) => (
              <div key={k} style={{ flex: 1, padding: '8px 4px', background: 'rgba(20,20,23,0.7)', border: `1px solid ${u.accent}44`, borderRadius: 10 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.16em', color: '#7a8294', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: u.accent, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <button data-testid="unlock-popup-primary" onClick={onClose} style={{
            width: '100%', marginTop: 18, padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: `linear-gradient(180deg, ${u.accent}, ${darkenColor(u.accent, 0.35)})`,
            color: '#04121f', fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3)',
          }}>{u.cta}</button>
          {onDismiss && (
            <button data-testid="unlock-popup-secondary" onClick={onDismiss} style={{
              width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(169,184,206,0.2)',
              color: 'rgba(169,184,206,0.5)', fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>Decline</button>
          )}
        </div>
    </Sheet>
  )
}
