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
  allPartsForSlot,
  asLoadout,
  builderLandscape,
  fittedModules,
  installSlot,
  partEffectLabel,
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
  /** Tutorial player: walk the slots one at a time instead of offering the whole builder. */
  guided?: boolean
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
  guided = false,
}: RocketBuilderSceneProps) {
  const help = useHelp(helpScreen)
  const loadout = asLoadout(installed)
  const [selected, setSelected] = useState<BuilderSlotId | null>(null)
  const [notice, setNotice] = useState('')
  // The free Explorer launches as it is. The parts shop is optional, so it stays closed until the player asks for it.
  const [customizing, setCustomizing] = useState(false)
  const showParts = customizing || guided
  const land = builderLandscape(target)
  const stats = rocketBuilderStats(rocket, loadout, skills)
  const fitted = fittedModules(loadout)
  const fittedCount = BUILDER_SLOTS.filter(slot => partIdForSlot(loadout, slot)).length
  const targetLabel = target ? target.name : 'Choose a mission'

  // Only what can be fitted today: locked parts and slots with nothing available yet stay out of sight instead of reading as dead ends.
  const available = (slot: (typeof BUILDER_SLOTS)[number]) => allPartsForSlot(slot).filter(part => (part.unlockedAtMissions ?? 0) <= missionsDone || part.id === partIdForSlot(loadout, slot))
  const shownSlots = BUILDER_SLOTS.filter(slot => available(slot).length > 0)
  const guidedSlot = guided ? shownSlots.find(slot => !partIdForSlot(loadout, slot)) ?? null : null
  const firstSlot = shownSlots[0] ?? BUILDER_SLOTS[0]
  const activeSlotId: BuilderSlotId = selected && shownSlots.some(slot => slot.id === selected) ? selected : guidedSlot?.id ?? firstSlot.id
  const activeSlot = BUILDER_SLOTS.find(slot => slot.id === activeSlotId) ?? firstSlot
  const options = available(activeSlot)
  const fittedId = partIdForSlot(loadout, activeSlot)
  const fittedPart = options.find(part => part.id === fittedId)

  const fitPart = (partId: string, unlockedAt: number) => {
    if (unlockedAt > missionsDone) { setNotice(`Unlocks after ${unlockedAt} missions`); return }
    if (!onInstall) return
    const ok = onInstall(installSlot(loadout, activeSlot, partId), loadout)
    setNotice(ok ? '' : 'Not enough francs for this part')
  }

  return (
    <div
      className={styles.root}
      data-testid="rocket-builder"
      data-palette={land.paletteId}
      data-mission={missionTitle ?? ''}
      data-guided={guided ? 'true' : 'false'}
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
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
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

      <div className={styles.stage}>
        <div className={styles.actions}>
          {onBack && <button type="button" className={styles.back} data-testid="top-bar-back" aria-label="back" onClick={onBack}>&lsaquo; Back</button>}
          {/* With no mission picked there is nothing to launch: the primary button opens the contracts instead. */}
          {target
            ? <button type="button" className={styles.launch} data-testid={launchTestId} disabled={launchDisabled} onClick={onLaunch}>Launch</button>
            : <button type="button" className={styles.launch} data-testid="builder-choose-contract" data-beacon="launchpad-view-contracts" onClick={onChooseMission}>Contracts</button>}
          <button type="button" className={styles.target} data-testid="rocket-builder-target" onClick={onChooseMission}>
            <span>Target</span>
            <strong>{targetLabel}</strong>
          </button>
          {!guided && target && <button type="button" className={styles.back} data-testid="builder-customize" aria-expanded={customizing} onClick={() => setCustomizing(open => !open)}>{customizing ? 'Done' : 'Customize'}</button>}
        </div>

        {guided && (
          <p className={styles.guide} data-testid="rocket-builder-guide">
            {guidedSlot
              ? `Step ${fittedCount + 1} of ${BUILDER_SLOTS.length} · Fit your ${guidedSlot.label.toLowerCase()}`
              : 'Rocket ready · Press Launch'}
          </p>
        )}

        <div className={styles.body} data-parts={showParts ? 'open' : 'closed'}>
          <section className={styles.blueprint} aria-label="Rocket blueprint" data-fitted-count={fittedCount}>
            <div className={styles.rocketWrap}>
              <img src="/art/scenes/launchpad/launchpad-rocket-multistage.png" alt="" data-testid="launch-rocket" style={{ opacity: 0.55 + fittedCount * 0.09 }} />
            </div>
            <ul className={styles.stats} data-testid="rocket-builder-stats" data-capacity={stats.capacity} data-range={stats.range} data-laser={stats.laser}>
              <li><span>Capacity</span><strong>{stats.capacity}</strong></li>
              <li><span>Range</span><strong>{stats.range}</strong></li>
              <li><span>Laser</span><strong>{stats.laser}</strong></li>
            </ul>
          </section>

          {showParts && <section className={styles.choices} aria-label="Part choices">
            <div className={styles.tabs} role="tablist" data-testid="rocket-builder-tray">
              {shownSlots.map(slot => {
                const partId = partIdForSlot(loadout, slot)
                const partName = allPartsForSlot(slot).find(part => part.id === partId)?.name
                const lockedByGuide = guided && guidedSlot != null && slot.id !== guidedSlot.id && !partId
                return (
                  <button
                    key={slot.id}
                    type="button"
                    role="tab"
                    aria-selected={activeSlotId === slot.id}
                    className={styles.tab}
                    data-testid={`builder-part-${slot.id}`}
                    data-selected={activeSlotId === slot.id ? 'true' : 'false'}
                    data-part={partId ?? ''}
                    disabled={lockedByGuide}
                    onClick={() => { setSelected(slot.id); setNotice('') }}
                  >
                    <img src={slot.card} alt="" />
                    <span className={styles.tabLabel}>{slot.label}</span>
                    <span className={styles.tabPart}>{partName ?? 'Empty'}</span>
                  </button>
                )
              })}
            </div>

            <div className={styles.optionsHead}>
              <h2>{activeSlot.label}</h2>
              <p>{fittedPart ? `Fitted: ${fittedPart.name}` : 'Nothing fitted yet. Choose a part.'}</p>
            </div>
            <ul className={styles.options} data-testid="rocket-builder-options">
              {options.map(part => {
                const locked = (part.unlockedAtMissions ?? 0) > missionsDone
                const fittedNow = part.id === fittedId
                return (
                  <li key={part.id}>
                    <button
                      type="button"
                      className={styles.option}
                      data-testid={`builder-option-${part.id}`}
                      data-fitted={fittedNow ? 'true' : 'false'}
                      data-locked={locked ? 'true' : 'false'}
                      aria-disabled={locked}
                      onClick={() => fitPart(part.id, part.unlockedAtMissions ?? 0)}
                    >
                      <img src={part.img ?? activeSlot.card} alt="" onError={event => { event.currentTarget.src = activeSlot.card }} />
                      <span className={styles.optionText}>
                        <strong>{part.name}</strong>
                        <span>{part.description}</span>
                      </span>
                      <span className={styles.optionMeta}>
                        <em>{partEffectLabel(activeSlot, part)}</em>
                        <b>{fittedNow ? 'Fitted' : locked ? `After ${part.unlockedAtMissions} missions` : part.price === 0 ? 'Free' : formatCurrency(part.price, { compact: true })}</b>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
          </section>}
        </div>
      </div>

      {launching && onLaunchComplete && (
        <LaunchSequenceCanvas rocketName={launchRocketName} rocketImageSrc={launchRocketSrc} targetName={target?.name ?? 'orbit'} onComplete={onLaunchComplete} />
      )}
    </div>
  )
}
