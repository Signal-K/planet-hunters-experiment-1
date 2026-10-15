'use client'

import { useState } from 'react'
import { DEV_GROUPS } from '@/lib/devPresets'

// Every fixture as a live, scaled frame, so you can look at all of them in one scroll (or in the editor's Simple Browser).
const SIZES = {
  phone: { w: 390, h: 844, label: 'Phone 390x844' },
  landscape: { w: 926, h: 428, label: 'Landscape 926x428' },
  desktop: { w: 1440, h: 900, label: 'Desktop 1440x900' },
} as const
type Size = keyof typeof SIZES

const INK = '#0f2436'

export default function StageGallery() {
  const [size, setSize] = useState<Size>('phone')
  const [group, setGroup] = useState('all')
  const { w, h } = SIZES[size]
  const scale = size === 'phone' ? 0.55 : size === 'landscape' ? 0.5 : 0.3
  const groups = DEV_GROUPS.filter(g => group === 'all' || g.label === group)

  const pill = (active: boolean): React.CSSProperties => ({
    minHeight: 44, padding: '0 12px', border: `2px solid ${INK}`, borderRadius: 6, cursor: 'pointer',
    background: active ? INK : 'transparent', color: active ? '#eef4fa' : INK, font: '14px system-ui',
  })

  return (
    <main style={{ padding: 16, background: '#eef4fa', color: INK, minHeight: '100vh', font: '16px system-ui' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Stage gallery: every scene, live</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {(Object.keys(SIZES) as Size[]).map(s => (
          <button key={s} style={pill(s === size)} onClick={() => setSize(s)}>{SIZES[s].label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {['all', ...DEV_GROUPS.map(g => g.label)].map(g => (
          <button key={g} style={pill(g === group)} onClick={() => setGroup(g)}>{g}</button>
        ))}
      </div>
      {groups.map(g => (
        <section key={g.label} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16 }}>{g.label}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {g.shots.map(s => (
              <figure key={s.key} style={{ margin: 0, width: w * scale }}>
                <div style={{ width: w * scale, height: h * scale, border: `2px solid ${INK}`, overflow: 'hidden', background: '#fff' }}>
                  <iframe
                    title={s.key}
                    loading="lazy"
                    src={`/game/stage?preset=${s.key}`}
                    style={{ width: w, height: h, border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }}
                  />
                </div>
                <figcaption style={{ fontSize: 14, marginTop: 4 }}>
                  <a href={`/game/stage?preset=${s.key}`} style={{ color: 'inherit', fontWeight: 600 }}>{s.label}</a>
                  <span style={{ opacity: 0.7 }}> {s.key}</span>
                  <div style={{ opacity: 0.7 }}>{s.hint}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
