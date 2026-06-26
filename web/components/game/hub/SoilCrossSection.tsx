'use client'

export function SoilCrossSection() {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: '78%', zIndex: 4, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 0, borderTop: '1.5px dashed rgba(255,225,160,0.5)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 18, background: 'linear-gradient(180deg, rgba(60,40,20,0.5), transparent)' }} />
      <svg width="100%" height="100%" viewBox="0 0 402 168" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="strata1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1a0e" stopOpacity="0.0"/>
            <stop offset="100%" stopColor="#1a0f06" stopOpacity="0.35"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="402" height="168" fill="url(#strata1)"/>
        <path d="M0 44 Q 100 40, 200 46 T 402 42" stroke="rgba(255,220,160,0.18)" strokeWidth="1" fill="none"/>
        <path d="M0 96 Q 120 102, 220 94 T 402 100" stroke="rgba(255,220,160,0.14)" strokeWidth="1" fill="none"/>
        <circle cx="74" cy="66" r="3" fill="#d97150" opacity="0.9"/>
        <circle cx="80" cy="72" r="1.8" fill="#ff9a78" opacity="0.8"/>
        <circle cx="86" cy="66" r="2.2" fill="#d97150" opacity="0.85"/>
        <circle cx="316" cy="90" r="2.6" fill="#b9d8ff" opacity="0.9"/>
        <circle cx="322" cy="96" r="1.6" fill="#e0f0ff" opacity="0.8"/>
        <circle cx="328" cy="90" r="2" fill="#b9d8ff" opacity="0.85"/>
        <circle cx="250" cy="132" r="2.8" fill="#ffd166" opacity="0.9"/>
        <circle cx="256" cy="138" r="1.6" fill="#fff0b0" opacity="0.8"/>
        <circle cx="80" cy="68" r="14" fill="#d97150" opacity="0.12"/>
        <circle cx="322" cy="92" r="14" fill="#b9d8ff" opacity="0.12"/>
        <circle cx="252" cy="134" r="12" fill="#ffd166" opacity="0.12"/>
        <g stroke="#2a1a0e" strokeWidth="1.4" fill="none" opacity="0.55" strokeLinecap="round">
          <path d="M40 0 q -4 24, 4 50"/>
          <path d="M150 0 q 6 30, -6 56"/>
          <path d="M360 0 q 8 20, -4 48"/>
        </g>
      </svg>
      <div style={{ position: 'absolute', right: 14, top: 58, padding: '3px 8px', background: 'rgba(8,12,22,0.7)', border: '1px solid rgba(122,80,40,0.55)', borderRadius: 999, fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9c8d70' }}>
        · Subsurface ·
      </div>
    </div>
  )
}
