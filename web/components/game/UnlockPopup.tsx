'use client'

import React from 'react'

type UnlockKind = 'sr2' | 'freeops' | 'loan'

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
  art: 'rocket' | 'star' | 'coin'
  stats: [string, string][]
  cta: string
}> = {
  sr2: {
    accent: '#3fa9ff',
    eyebrow: 'Vehicle Unlocked',
    title: 'STARTER ROCKET 2',
    body: 'Faster, longer range, and 1.5× cargo capacity. Now available at the Launchpad.',
    art: 'rocket',
    stats: [['RANGE', '+60%'], ['CARGO', '×1.5'], ['SPEED', '+40%']],
    cta: 'Outstanding',
  },
  freeops: {
    accent: '#f5a623',
    eyebrow: 'M1–M3 Complete',
    title: 'FREE OPERATIONS',
    body: 'You\'re on your own now. The full mission board is open, the Satellite Uplink can classify TESS lightcurves, and every confirmed planet adds 1% to your discovery payouts.',
    art: 'star',
    stats: [['MISSIONS', '∞'], ['CLASSIFY', 'ACTIVE'], ['DISCOVERY', '+10%']],
    cta: 'Take Command',
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
}

function RocketArt({ accent }: { accent: string }) {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="ua-body" x1="0" x2="1">
          <stop offset="0%" stopColor="#eaf3ff"/>
          <stop offset="100%" stopColor="#7a93b5"/>
        </linearGradient>
      </defs>
      <path d="M48 8 L62 34 L62 70 L34 70 L34 34 Z" fill="url(#ua-body)" stroke="#1a2230" strokeWidth="1.2"/>
      <path d="M48 8 L62 34 L34 34 Z" fill={accent}/>
      <circle cx="48" cy="42" r="6" fill="#f5a623" stroke="#1a2230"/>
      <path d="M34 60 L22 78 L34 72 M62 60 L74 78 L62 72" fill={accent} stroke="#1a2230"/>
      <path d="M40 70 L48 90 L56 70" fill="#f5a623"/>
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

function StarArt({ accent }: { accent: string }) {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <path d="M48 8 L58 38 L90 39 L64 58 L74 90 L48 70 L22 90 L32 58 L6 39 L38 38 Z" fill={accent} stroke="#fff" strokeWidth="1.5" opacity="0.95"/>
    </svg>
  )
}

export default function UnlockPopup({ kind, onClose, onDismiss }: UnlockPopupProps) {
  const u = UNLOCKS[kind] ?? UNLOCKS.sr2

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.8)', backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'relative', width: 320, maxWidth: '90%',
        background: 'linear-gradient(180deg, #0d1c30 0%, #060d18 100%)',
        border: `1px solid ${u.accent}88`,
        borderRadius: 20, padding: 22, textAlign: 'center',
        boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 40px ${u.accent}33`,
        animation: 'unlock-in 420ms cubic-bezier(.16,1,.3,1)',
      }}>
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
            {u.art === 'rocket' && <RocketArt accent={u.accent} />}
            {u.art === 'coin' && <CoinArt />}
            {u.art === 'star' && <StarArt accent={u.accent} />}
          </div>

          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '0.04em', color: '#fff', textShadow: `0 0 18px ${u.accent}88` }}>{u.title}</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#a9b8ce', marginTop: 8, lineHeight: 1.5 }}>{u.body}</div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {u.stats.map(([k, v]) => (
              <div key={k} style={{ flex: 1, padding: '8px 4px', background: 'rgba(8,16,28,0.7)', border: `1px solid ${u.accent}44`, borderRadius: 10 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.16em', color: '#7a8294', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: u.accent, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <button onClick={onClose} style={{
            width: '100%', marginTop: 18, padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: `linear-gradient(180deg, ${u.accent}, ${darkenColor(u.accent, 0.35)})`,
            color: '#04121f', fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3)',
          }}>{u.cta}</button>
          {onDismiss && (
            <button onClick={onDismiss} style={{
              width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(169,184,206,0.2)',
              color: 'rgba(169,184,206,0.5)', fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>Decline</button>
          )}
        </div>
      </div>
    </div>
  )
}
