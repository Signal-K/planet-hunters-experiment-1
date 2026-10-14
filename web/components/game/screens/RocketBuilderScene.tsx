'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
import { openSettings } from '@/lib/mining/openChrome'
import { useHelp } from '@/components/ui/useHelp'
import { formatCurrency } from '@/lib/format'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import type { RocketConfig, Target } from '@/lib/data'
import type { Screen } from '@/lib/game-types'
import flight from './FlightScene.module.css'
import styles from './RocketBuilderScene.module.css'
import {
  BLUEPRINT_MODULES,
  BUILDER_SLOTS,
  asLoadout,
  builderLandscape,
  fittedModules,
  installSlot,
  nextPartId,
  partIdForSlot,
  rocketBuilderStats,
  type BuilderLoadout,
  type BuilderSlotId,
} from '@/lib/launchpad/rocketBuilder'

interface RocketBuilderSceneProps {
  missionTitle?: string | null
  target?: Pick<Target, 'id' | 'name' | 'type' | 'archetype'> | null
  rocket: RocketConfig
  installed?: BuilderLoadout | null
  missionsDone: number
  skills?: string[]
  francs: number
  helpScreen?: Screen
  towerLabel: string
  launchTestId?: string
  launchDisabled?: boolean
  onChooseMission: () => void
  onBack?: () => void
  onLaunch: () => void
  onInstall?: (next: BuilderLoadout, prev: BuilderLoadout) => boolean
  launching?: boolean
  launchRocketName?: string
  launchRocketSrc?: string
  onLaunchComplete?: () => void
}

export default function RocketBuilderScene({
  missionTitle,
  target = null,
  rocket,
  installed,
  missionsDone,
  skills = [],
  francs,
  helpScreen = 'launchpad',
  towerLabel,
  launchTestId = 'launch-btn',
  launchDisabled = false,
  onBack,
  onChooseMission,
  onLaunch,
  onInstall,
  launching = false,
  launchRocketName = 'Explorer',
  launchRocketSrc = '',
  onLaunchComplete,
}: RocketBuilderSceneProps) {
  const help = useHelp(helpScreen)
  const loadout = asLoadout(installed)
  const [selected, setSelected] = useState<BuilderSlotId | null>(null)
  const [notice, setNotice] = useState('')
  const land = builderLandscape(target)
  const stats = rocketBuilderStats(rocket, loadout, skills)
  const fitted = fittedModules(loadout)
  const fittedCount = BUILDER_SLOTS.filter(slot => partIdForSlot(loadout, slot)).length
  const targetLabel = target ? target.name : 'Choose a mission'

  const choosePart = (slotId: BuilderSlotId) => {
    const slot = BUILDER_SLOTS.find(item => item.id === slotId)
    if (!slot) return
    setSelected(slotId)
    const partId = nextPartId(slot, loadout, missionsDone)
    if (!partId || !onInstall) {
      setNotice(partId ? '' : 'LOCKED')
      return
    }
    const next = installSlot(loadout, slot, partId)
    const ok = onInstall(next, loadout)
    setNotice(ok ? '' : 'CANNOT AFFORD THIS PART')
  }

  return (
    <div
      className={styles.root}
      data-testid="rocket-builder"
      data-palette={land.paletteId}
      data-mission={missionTitle ?? ''}
      style={{
        '--lb-sky-top': land.skyTop,
        '--lb-sky-horizon': land.skyHorizon,
        '--lb-ground': land.ground,
        '--lb-ridge': land.ridge,
        '--lb-tint': land.tint,
      } as CSSProperties}
    >
      <div className={styles.land} data-testid="rocket-builder-landscape" aria-hidden="true">
        <img className={`${styles.plate} ${styles.plateLeft}`} src="/art/scenes/launchpad/launchpad-plate-landscape-left.png" alt="" />
        <img className={`${styles.plate} ${styles.plateRight}`} src="/art/scenes/launchpad/launchpad-plate-landscape-right.png" alt="" />
        {land.pieces.map((piece, index) => (
          <img
            key={`${piece.kind}-${piece.x}-${index}`}
            className={styles.piece}
            src={`/game/assets/mining/terrain_${piece.kind}.png`}
            alt=""
            style={{
              left: `${(piece.x / land.period) * 100}%`,
              transform: `translateX(-50%) scale(${piece.scale})${piece.flip ? ' scaleX(-1)' : ''}`,
            }}
          />
        ))}
        <div className={styles.ground} />
        <div className={styles.wash} />
      </div>

      <button type="button" className={styles.tower} data-testid="launchpad-status-card" data-beacon="launchpad-view-contracts" data-action="primary-mission" aria-label={towerLabel} onClick={onChooseMission}>
        <span data-testid="launchpad-new-mission-btn">
          <img src="/art/scenes/launchpad/launchpad-tower.png" alt="" />
        </span>
      </button>

      <div className={`${flight.chrome} launchpad-shared-hud`}>
        <div className={flight.top}>
          <div className={flight.cluster}>
            <button type="button" className={flight.cog} data-testid="settings-button" aria-label="Settings" onClick={openSettings}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06-.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
            <div className={flight.clock}><HubClockWidget /></div>
            {help.button}
          </div>
          <div className={flight.cluster}>
            <span className="scene-chip" data-testid="launchpad-francs-chip">{formatCurrency(francs, { compact: true })}</span>
            <span className="scene-chip" data-testid="launchpad-cargo-chip" aria-label="Cargo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
              </svg>
            </span>
          </div>
        </div>
      </div>
      {help.layer}

      <div className={styles.actions}>
        <div className={styles.leftGroup}>
          {onBack && <button type="button" className={styles.back} data-testid="top-bar-back" aria-label="back" onClick={onBack}>&lsaquo; Back</button>}
          <button type="button" className={styles.launch} data-testid={launchTestId} disabled={launchDisabled} onClick={onLaunch}>Launch</button>
        </div>
        <button type="button" className={styles.target} data-testid="rocket-builder-target" onClick={onChooseMission}>
          <span>Target</span>
          <strong>{targetLabel}</strong>
        </button>
      </div>

      <section className={styles.blueprint} aria-label="Rocket blueprint" data-fitted-count={fittedCount}>
        <div className={styles.sheet}>
          <div className={styles.rocketWrap}>
            <img src="/art/scenes/launchpad/launchpad-rocket-multistage.png" alt="" data-testid="launch-rocket" style={{ opacity: 0.55 + fittedCount * 0.09 }} />
          </div>
          <div className={styles.labels}>
            {BLUEPRINT_MODULES.map(module => (
              <p
                key={module.id}
                className={styles.label}
                data-module={module.id}
                data-fitted={fitted[module.id] ? 'true' : 'false'}
                data-selected={selected === module.id || (module.id === 'engines' && selected === 'engine') ? 'true' : 'false'}
              >
                {module.label}
              </p>
            ))}
          </div>
        </div>
        <p className={styles.stats} data-testid="rocket-builder-stats" data-capacity={stats.capacity} data-range={stats.range} data-laser={stats.laser}>
          <span>Capacity {stats.capacity}</span>
          <span>Range {stats.range}</span>
          <span>Laser {stats.laser}</span>
        </p>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
      </section>

      <div className={styles.tray} data-testid="rocket-builder-tray">
        {BUILDER_SLOTS.map(slot => {
          const partId = partIdForSlot(loadout, slot)
          const locked = nextPartId(slot, loadout, missionsDone) == null && !partId
          return (
            <button
              key={slot.id}
              type="button"
              className={styles.card}
              data-testid={`builder-part-${slot.id}`}
              data-selected={selected === slot.id ? 'true' : 'false'}
              data-part={partId ?? ''}
              disabled={locked}
              onClick={() => choosePart(slot.id)}
            >
              <img src={slot.card} alt="" />
              <span>{slot.label}</span>
            </button>
          )
        })}
      </div>

      {launching && onLaunchComplete && (
        <LaunchSequenceCanvas rocketName={launchRocketName} rocketImageSrc={launchRocketSrc} targetName={target?.name ?? 'orbit'} onComplete={onLaunchComplete} />
      )}
    </div>
  )
}
