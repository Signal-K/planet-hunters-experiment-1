'use client'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
import { BaseWorldCanvas } from '@/components/game/hub/BaseWorldCanvas'
import LaunchpadPrefab from '@/components/game/LaunchpadPrefab'
import { formatCurrency } from '@/lib/format'
import type { RocketConfig, Target } from '@/lib/data'
import { BASE_CAMERA_HOME } from '@/lib/scene/base-camera'
import { kitScale } from '@/lib/scene/base-site'
import { sanitizeEarthBiome, type EarthBiomeId } from '@/lib/scene/base-world'
import styles from './RocketBuilderScene.module.css'
import {
  BLUEPRINT_MODULES,
  BUILDER_SLOTS,
  allPartsForSlot,
  asLoadout,
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
  missionPayload?: { type: string; name: string; cargoCost: number }
  target?: Pick<Target, 'id' | 'name' | 'type' | 'archetype'> | null
  /** A physical vehicle is actually staged on the pad, rather than merely a default configuration. */
  hasStagedRocket?: boolean
  rocket: RocketConfig
  installed?: BuilderLoadout | null
  missionsDone: number
  towerLabel: string
  launchTestId?: string
  launchDisabled?: boolean
  onChooseMission: () => void
  onBack?: () => void
  onLaunch: () => void
  onInstall?: (next: BuilderLoadout, prev: BuilderLoadout) => boolean
  onDismantle?: () => void
  launching?: boolean
  launchRocketName?: string
  launchRocketSrc?: string
  onLaunchComplete?: () => void
  /** Tutorial player: walk the slots one at a time instead of offering the whole builder. */
  guided?: boolean
  /** Where the rocket is: still a design (blueprint), being built on the pad, or standing ready. With no target the pad is idle. */
  assembly?: AssemblyPhase
  /** The Earth Base landscape selected during onboarding/settings. */
  earthBiome?: EarthBiomeId
}

export type AssemblyPhase = 'design' | 'building' | 'ready'

/** How long the rocket takes to rise on the pad; the route waits this long before the vehicle is bought. */
export const ROLLOUT_MS = 1600

export default function RocketBuilderScene({
  missionTitle,
  missionPayload,
  target = null,
  hasStagedRocket = false,
  rocket,
  installed,
  missionsDone,
  towerLabel,
  launchTestId = 'launch-btn',
  launchDisabled = false,
  onBack,
  onChooseMission,
  onLaunch,
  onInstall,
  onDismantle,
  launching = false,
  launchRocketName = 'Explorer',
  launchRocketSrc = '',
  onLaunchComplete,
  guided = false,
  assembly = 'ready',
  earthBiome,
}: RocketBuilderSceneProps) {
  const loadout = asLoadout(installed)
  const [selected, setSelected] = useState<BuilderSlotId | null>(null)
  const [notice, setNotice] = useState('')
  // The free Explorer launches as it is. The parts shop is optional, so it stays closed until the player asks for it.
  const [customizing, setCustomizing] = useState(false)
  const showParts = customizing || guided
  const [viewSize, setViewSize] = useState(() => typeof window === 'undefined' ? { w: 1440, h: 900 } : { w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const onResize = () => setViewSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const px = kitScale(viewSize)
  const biome = sanitizeEarthBiome(earthBiome)
  const stats = rocketBuilderStats(rocket, loadout)
  const fitted = fittedModules(loadout)
  const fittedCount = BUILDER_SLOTS.filter(slot => partIdForSlot(loadout, slot)).length
  const targetLabel = target ? target.name : 'Choose a mission'
  const hasLaunchPlan = Boolean(missionTitle && target)
  const phase: 'idle' | AssemblyPhase = !hasLaunchPlan ? 'idle' : hasStagedRocket ? assembly : 'design'
  const launchLabel = phase === 'design' ? 'Build rocket' : phase === 'building' ? 'Building' : 'Launch'
  const [confirmingDismantle, setConfirmingDismantle] = useState(false)

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
      data-palette={biome}
      data-mission={missionTitle ?? ''}
      data-guided={guided ? 'true' : 'false'}
      data-assembly={phase}
      style={{ '--lb-build-ms': `${ROLLOUT_MS}ms` } as CSSProperties}
    >
      <div className={styles.sceneBackdrop} data-testid="rocket-builder-landscape" aria-hidden="true">
        <BaseWorldCanvas px={px} camera={BASE_CAMERA_HOME} time="midday" biome={biome} />
      </div>


      <div className={styles.stage}>
        <div className={styles.actions}>
          {onBack && <button type="button" className={styles.back} data-testid="top-bar-back" aria-label="back" onClick={onBack}>&lsaquo; Back</button>}
          {hasLaunchPlan && <button type="button" className={styles.launch} data-testid={launchTestId} data-assembly={phase} disabled={launchDisabled || phase === 'building'} onClick={onLaunch}>{launchLabel}</button>}
          <button type="button" className={styles.target} data-testid="rocket-builder-target" onClick={onChooseMission}>
            <span>{hasLaunchPlan ? 'Change mission' : 'Select mission'}</span>
            <strong>{hasLaunchPlan ? `${missionTitle} · ${targetLabel}` : targetLabel}</strong>
          </button>
          {!guided && hasLaunchPlan && <button type="button" className={`${styles.back} ${styles.customize}`} data-testid="builder-customize" aria-expanded={customizing} onClick={() => setCustomizing(open => !open)}>{customizing ? 'Done' : 'Customize'}</button>}
          {hasStagedRocket && onDismantle && <button type="button" className={styles.dismantle} data-testid="builder-dismantle" onClick={() => setConfirmingDismantle(true)}>Dismantle</button>}
        </div>

        {guided && (
          <p className={styles.guide} data-testid="rocket-builder-guide">
            {guidedSlot
              ? `Step ${fittedCount + 1} of ${BUILDER_SLOTS.length} · Fit your ${guidedSlot.label.toLowerCase()}`
              : 'Rocket ready · Press Launch'}
          </p>
        )}

        <div className={styles.body} data-parts={showParts ? 'open' : 'closed'}>
          <section className={styles.pad} aria-label="Launchpad" data-phase={phase} data-fitted-count={fittedCount}>
            <LaunchpadPrefab towerLabel={towerLabel} onChooseMission={onChooseMission} showRocket={phase === 'building' || phase === 'ready'} />
            {missionPayload && phase !== 'idle' && (
              <aside className={styles.payloadManifest} data-testid="launchpad-payload-manifest">
                <span className={styles.payloadKicker}>PAYLOAD LOADED</span>
                <strong>{missionPayload.name}</strong>
                <span>{missionPayload.type === 'rover' ? 'Surface rover · deploy on target' : 'Mission equipment'}</span>
              </aside>
            )}
            {phase === 'idle' && (
              <button type="button" className={styles.choose} data-testid="builder-choose-contract" data-beacon="launchpad-view-contracts" onClick={onChooseMission}>
                <span>Nothing on the pad</span>
                <strong>Choose a mission</strong>
              </button>
            )}
            {(phase === 'building' || phase === 'ready') && (
              <ul className={styles.stats} data-testid="rocket-builder-stats" data-capacity={stats.capacity} data-range={stats.range} data-laser={stats.laser}>
                <li data-stat="capacity"><span className={styles.statIcon} aria-hidden="true" /><span className={styles.statCopy}>Capacity</span><strong>{stats.capacity}</strong><i aria-hidden="true" /></li>
                <li data-stat="range"><span className={styles.statIcon} aria-hidden="true" /><span className={styles.statCopy}>Range</span><strong>{stats.range}</strong><i aria-hidden="true" /></li>
                <li data-stat="laser"><span className={styles.statIcon} aria-hidden="true" /><span className={styles.statCopy}>Laser</span><strong>{stats.laser}</strong><i aria-hidden="true" /></li>
              </ul>
            )}
            {confirmingDismantle && (
              <div className={styles.dismantleConfirm} role="alert">
                <span>Dismantle this unlaunched rocket?</span>
                <button type="button" onClick={() => { setConfirmingDismantle(false); onDismantle?.() }}>Confirm</button>
                <button type="button" onClick={() => setConfirmingDismantle(false)}>Keep</button>
              </div>
            )}
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
