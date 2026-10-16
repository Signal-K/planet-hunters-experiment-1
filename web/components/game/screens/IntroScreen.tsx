'use client'

import { useState, type CSSProperties } from 'react'
import { BaseWorldCanvas } from '@/components/game/hub/BaseWorldCanvas'
import { PRODUCT_WORDMARK } from '@/lib/brand'
import { formatCurrency } from '@/lib/format'
import { useViewSize } from '@/lib/hooks/useViewSize'
import { homeCenter, kitScale } from '@/lib/scene/base-site'
import { BIOME_PITCH, INTRO_COPY } from '@/lib/scene/biome-pitch'
import { EARTH_BIOMES, sanitizeEarthBiome, type EarthBiomeId } from '@/lib/scene/base-world'

interface IntroScreenProps {
  onBegin: (biome?: EarthBiomeId) => void
  returning?: boolean
  missionsDone?: number
  totalEarned?: number
  awaitingRemoteState?: boolean
  /** The saved landscape, shown behind a returning player's resume screen. */
  savedBiome?: string
}

export default function IntroScreen({
  onBegin,
  returning = false,
  missionsDone = 0,
  totalEarned = 0,
  awaitingRemoteState = false,
  savedBiome,
}: IntroScreenProps) {
  const [biome, setBiome] = useState<EarthBiomeId>('mountains')
  const shown = returning || awaitingRemoteState ? sanitizeEarthBiome(savedBiome) : biome
  // The backdrop is the base world itself, framed on the empty launch pad, and follows the picked landscape.
  const view = useViewSize()
  // The intro always plays under the deep dusk grade, never the bright daytime sky.
  const grade = 'dusk' as const
  const px = kitScale(view)
  const camX = view.w / 2 - homeCenter([], view.w / px) * px
  return (
    <div className="game-screen intro-screen theme-blueprint" data-biome={shown}>
      <div className="intro-world" aria-hidden="true" style={{ '--px': `${px}px`, '--hub-ground': '20%' } as CSSProperties}>
        <BaseWorldCanvas px={px} camera={{ x: camX, y: 0, zoom: 1 }} time={grade} biome={shown} />
      </div>
      <div className="intro-content" data-mode={awaitingRemoteState ? 'restoring' : returning ? 'returning' : 'new'}>
        <div className="intro-head">
          <h1 className="intro-title" data-testid="intro-title">{PRODUCT_WORDMARK}</h1>
          {awaitingRemoteState ? (
            <>
              <p className="intro-subtitle">Restoring your mission data&hellip;</p>
              <div className="intro-reconnecting-indicator" aria-label="Connecting to backend">
                <span /><span /><span />
              </div>
            </>
          ) : returning ? (
            <p className="intro-subtitle">{`Missions completed: ${missionsDone} · Total earned: ${formatCurrency(totalEarned, { compact: true })}`}</p>
          ) : (
            <>
              <h2 className="intro-heading">{INTRO_COPY.heading}</h2>
              <p className="intro-subtitle">{INTRO_COPY.lede}</p>
            </>
          )}
        </div>
        {!awaitingRemoteState && (
          <div className="intro-panel">
            {!returning && (
              <fieldset className="base-biome-choice" data-testid="base-biome-choice">
                <legend className="intro-legend">Landscape</legend>
                {EARTH_BIOMES.map(id => {
                  const pitch = BIOME_PITCH[id]
                  return (
                    <button
                      key={id}
                      type="button"
                      className="base-biome-option"
                      aria-pressed={biome === id}
                      data-testid={`base-biome-${id}`}
                      data-biome={id}
                      onClick={() => setBiome(id)}
                    >
                      <span className="base-biome-name">{pitch.label}</span>
                      <span className="base-biome-tagline">{pitch.tagline}</span>
                      <span className="base-biome-trait">{pitch.trait}</span>
                    </button>
                  )
                })}
              </fieldset>
            )}
            {!returning && <p className="intro-note">{INTRO_COPY.note}</p>}
            <button className="intro-begin-btn" onClick={() => onBegin(returning ? undefined : biome)} data-testid="intro-begin-btn" data-beacon="intro-begin">
              {returning ? 'RESUME OPERATIONS' : 'ESTABLISH BASE'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
