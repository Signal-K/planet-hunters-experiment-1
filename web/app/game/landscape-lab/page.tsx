'use client'

import { useMemo, useState } from 'react'
import { HangarModules, LaunchpadModules } from '@/components/game/hub/EarthBaseModules'
import { TerrainScene } from '@/components/game/hub/TerrainScene'
import { EARTH_BASE_PAD } from '@/lib/scene/compositions'
import type { SceneComposition } from '@/lib/scene/terrain-kit'

type LandscapeOption = {
  id: string
  label: string
  summary: string
  composition: SceneComposition
}

const OPEN_BASELINE: SceneComposition = {
  ...EARTH_BASE_PAD,
  id: 'earth-base-pad-open-baseline',
  bands: EARTH_BASE_PAD.bands.filter(band => band.id !== 'facility-apron'),
}

const GREEN_VERGE: SceneComposition = {
  ...EARTH_BASE_PAD,
  id: 'earth-base-pad-green-verge',
  bands: [
    ...EARTH_BASE_PAD.bands,
    {
      id: 'green-verge',
      depth: 0.79,
      baseline: 'calc(var(--hub-ground) + 0.8%)',
      scale: 1.4,
      bricks: [
        { brick: 'hill_long', x: 8, scale: 0.9 },
        { brick: 'hill_round', x: 34, scale: 0.78, flip: true },
        { brick: 'hill_long', x: 62, scale: 0.82, flip: true },
        { brick: 'hill_round', x: 90, scale: 0.8 },
      ],
    },
  ],
}

const OPTIONS: LandscapeOption[] = [
  {
    id: 'receding-apron',
    label: 'A · Receding apron',
    summary: 'Low Blender soil shoulder under the facilities; the recommended production option.',
    composition: EARTH_BASE_PAD,
  },
  {
    id: 'green-verge',
    label: 'B · Green verge',
    summary: 'Adds a soft grass rise behind the service road for a more settled Earth Base read.',
    composition: GREEN_VERGE,
  },
  {
    id: 'open-baseline',
    label: 'C · Open baseline',
    summary: 'The flatter comparison state without the new Blender apron.',
    composition: OPEN_BASELINE,
  },
]

export default function LandscapeLabPage() {
  const [selectedId, setSelectedId] = useState(OPTIONS[0].id)
  const selected = useMemo(
    () => OPTIONS.find(option => option.id === selectedId) ?? OPTIONS[0],
    [selectedId],
  )
  const sceneStyle = { '--hub-ground': '20%' } as React.CSSProperties

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100dvh',
        overflow: 'hidden',
        background: 'var(--ln-void)',
        color: 'var(--ln-text)',
        fontFamily: 'var(--ln-font-body)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', inset: 0, ...sceneStyle }}>
          <TerrainScene composition={selected.composition} phase="day" />
          <div
            style={{
              position: 'absolute',
              left: '9%',
              bottom: '20%',
              width: '30%',
              aspectRatio: '220 / 160',
              zIndex: 15,
            }}
          >
            <LaunchpadModules />
          </div>
          <div
            style={{
              position: 'absolute',
              right: '5%',
              bottom: '20%',
              width: '37%',
              aspectRatio: '250 / 161',
              zIndex: 15,
            }}
          >
            <HangarModules />
          </div>
          <div
            style={{
              position: 'absolute',
              left: '24%',
              bottom: 'calc(20% - 38px)',
              zIndex: 16,
              padding: '7px 12px',
              border: '1px solid rgba(212,229,247,.34)',
              borderRadius: 999,
              background: 'rgba(8,18,32,.78)',
              font: '700 10px var(--ln-font-display)',
              letterSpacing: '.12em',
              textTransform: 'uppercase',
            }}
          >
            Launchpad · grounded
          </div>
          <div
            style={{
              position: 'absolute',
              right: '16%',
              bottom: 'calc(20% - 38px)',
              zIndex: 16,
              padding: '7px 12px',
              border: '1px solid rgba(212,229,247,.34)',
              borderRadius: 999,
              background: 'rgba(8,18,32,.78)',
              font: '700 10px var(--ln-font-display)',
              letterSpacing: '.12em',
              textTransform: 'uppercase',
            }}
          >
            Hangar · grounded
          </div>
        </div>
      </div>

      <section
        style={{
          position: 'relative',
          zIndex: 30,
          width: 'min(420px, calc(100% - 32px))',
          margin: 16,
          padding: 16,
          border: '1px solid var(--ln-cyan-border)',
          borderRadius: 8,
          background: 'rgba(0,13,31,.88)',
          boxShadow: 'var(--ln-shadow-card)',
        }}
      >
        <p style={{ color: 'var(--ln-cyan)', fontSize: 12, letterSpacing: '.16em', fontWeight: 700 }}>
          EARTH BASE · LANDSCAPE LAB
        </p>
        <h1 style={{ marginTop: 8, font: '700 26px var(--ln-font-display)' }}>Ground contact options</h1>
        <p style={{ marginTop: 8, color: 'var(--ln-text-dim)', fontSize: 14 }}>
          Same Launchpad and Hangar, same Blender terrain kit. Select a terrain treatment to compare the contact line.
        </p>
        <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
          {OPTIONS.map(option => {
            const active = option.id === selected.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedId(option.id)}
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${active ? 'var(--ln-cyan)' : 'var(--ln-hairline)'}`,
                  borderRadius: 6,
                  background: active ? 'var(--ln-cyan-soft)' : 'rgba(13,52,104,.52)',
                  color: active ? 'var(--ln-cyan-bright)' : 'var(--ln-text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  font: '600 13px var(--ln-font-display)',
                  letterSpacing: '.05em',
                }}
              >
                <span style={{ display: 'block' }}>{option.label}</span>
                <span style={{ display: 'block', marginTop: 4, color: 'var(--ln-text-dim)', font: '400 12px var(--ln-font-body)', letterSpacing: 0 }}>
                  {option.summary}
                </span>
              </button>
            )
          })}
        </div>
        <p style={{ marginTop: 12, color: 'var(--ln-text-muted)', font: '500 11px var(--ln-font-mono)' }}>
          SELECTED · {selected.label.toUpperCase()}
        </p>
      </section>
    </main>
  )
}
