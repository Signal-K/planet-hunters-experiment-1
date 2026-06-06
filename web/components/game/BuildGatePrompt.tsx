'use client'

import React from 'react'

interface BuildGatePromptProps {
  francs: number
  onBuild: () => void
  onClose: () => void
}

export default function BuildGatePrompt({ francs, onBuild, onClose }: BuildGatePromptProps) {
  const cost = 500_000_000
  const afford = francs >= cost

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 88, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.7)' }} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(180deg, #0d1c30, #060d18)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        border: '1px solid rgba(245,166,35,0.5)',
        padding: '18px 16px 26px',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
        animation: 'gate-up 360ms cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,166,35,0.15)', borderRadius: 12, border: '1px solid rgba(245,166,35,0.4)' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="20" width="32" height="22" rx="3" fill="#1a1c2e" stroke="#f5a623" strokeWidth="1.5"/>
              <rect x="16" y="10" width="16" height="14" rx="2" fill="#0a0c18" stroke="#f5a623" strokeWidth="1.5"/>
              <rect x="20" y="26" width="8" height="10" rx="1" fill="#f5a623" opacity="0.8"/>
              <circle cx="24" cy="16" r="3" fill="#f5a623" opacity="0.9"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#f5a623', textTransform: 'uppercase' }}>Build Required</div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: '#e6efff' }}>Control Station</div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4, lineHeight: 1.4 }}>Unlocks the contractor job board and re-enables the Missions tab.</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#7a8294', textTransform: 'uppercase' }}>Cost</div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 16, fontWeight: 800, color: afford ? '#f5a623' : '#ff5a6a' }}>▲ 500,000,000</div>
          <span style={{ flex: 1 }} />
          <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#5d7390' }}>Bal ▲ {francs.toLocaleString()}</div>
        </div>
        <button
          onClick={onBuild}
          disabled={!afford}
          style={{
            width: '100%', marginTop: 14, padding: '15px', borderRadius: 12, border: 'none',
            cursor: afford ? 'pointer' : 'not-allowed',
            background: 'linear-gradient(180deg, #ffc25c, #d68a0d)', color: '#1d0c00',
            fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            boxShadow: 'inset 0 1px 0 rgba(255,235,180,0.5), 0 4px 0 rgba(0,0,0,0.3)',
            opacity: afford ? 1 : 0.5,
          }}
        >
          Build · Place on Earth Base
        </button>
      </div>
    </div>
  )
}
