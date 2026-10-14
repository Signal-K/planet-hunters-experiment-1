'use client'

import { useState } from 'react'
import { PRODUCT_OPERATIONS_LABEL, PRODUCT_WORDMARK } from '@/lib/brand'
import { formatCurrency } from '@/lib/format'
import type { EarthBiomeId } from '@/lib/scene/base-world'
import { biomeLayers } from '@/lib/scene/base-world'

interface IntroScreenProps {
  onBegin: (biome?: EarthBiomeId) => void
  returning?: boolean
  missionsDone?: number
  totalEarned?: number
  awaitingRemoteState?: boolean
}

const BIOME_CHOICES: { id: EarthBiomeId; label: string }[] = [
  { id: 'mountains', label: 'Mountains' },
  { id: 'desert', label: 'Desert' },
  { id: 'tundra', label: 'Tundra' },
  { id: 'coast', label: 'Coast' },
]

export default function IntroScreen({
  onBegin,
  returning = false,
  missionsDone = 0,
  totalEarned = 0,
  awaitingRemoteState = false,
}: IntroScreenProps) {
  const [biome, setBiome] = useState<EarthBiomeId>('mountains')
  return (
    <div className="game-screen intro-screen theme-blueprint">

      {awaitingRemoteState ? (
        <div className="intro-content">
          <div className="intro-badge">{PRODUCT_OPERATIONS_LABEL}</div>
          <img className="intro-logo-mark" src="/icons/landnam-logo-mark.png" alt="" aria-hidden="true" />
          <h1 className="intro-title" data-testid="intro-title">{PRODUCT_WORDMARK}</h1>
          <p className="intro-welcome">Welcome back, Commander.</p>
          <p className="intro-subtitle">Restoring your mission data&hellip;</p>
          <div className="intro-reconnecting-indicator" aria-label="Connecting to backend">
            <span /><span /><span />
          </div>
        </div>
      ) : (
        <div className="intro-content">
          <div className="intro-badge">{PRODUCT_OPERATIONS_LABEL}</div>
          <img className="intro-logo-mark" src="/icons/landnam-logo-mark.png" alt="" aria-hidden="true" />
          <h1 className="intro-title" data-testid="intro-title">{PRODUCT_WORDMARK}</h1>
          <p className="intro-welcome">{returning ? 'Welcome back, Commander.' : 'Welcome, Commander.'}</p>
          <p className="intro-subtitle">
            {returning
              ? `Missions completed: ${missionsDone} · Total earned: ${formatCurrency(totalEarned, { compact: true })}`
              : 'Build your base. Mine the asteroids. Fulfill the contract. The belt is waiting.'}
          </p>
          {!returning && (
            <fieldset className="base-biome-choice" data-testid="base-biome-choice">
              <legend style={{ padding: '0 8px', font: '800 14px var(--ln-font-display)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ln-bp-ink, #0f2436)' }}>Landscape</legend>
              {BIOME_CHOICES.map(choice => (
                <button
                  key={choice.id}
                  type="button"
                  className="base-biome-option"
                  aria-pressed={biome === choice.id}
                  data-testid={`base-biome-${choice.id}`}
                  onClick={() => setBiome(choice.id)}
                >
                  <img src={biomeLayers(choice.id)[0].src} alt="" draggable={false} />
                  {choice.label}
                </button>
              ))}
            </fieldset>
          )}
          <button className="intro-begin-btn" onClick={() => onBegin(returning ? undefined : biome)} data-testid="intro-begin-btn" data-beacon="intro-begin">
            {returning ? 'RESUME OPERATIONS' : 'BEGIN OPERATIONS'}
          </button>
        </div>
      )}
    </div>
  )
}
