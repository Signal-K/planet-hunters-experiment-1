'use client'

import Image from 'next/image'
import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { ROCKET_MODELS, hasShipCustomizer, calculateShipSuccessChance, selectedCustomizerPartIds, getBuildSequence } from '@/lib/data'
import type { RocketModel, InstalledCustomizerPartsByKind } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'
import ShipInteriorPreview from '@/components/game/ShipInteriorPreview'
import { formatCurrency } from '@/lib/format'
import styles from './HangarScreen.module.css'

interface HangarScreenProps {
  francs: number
  missionsDone: number
  unlockedSkillNodes?: string[]
  shipCustomizerParts?: InstalledCustomizerPartsByKind
  crewModuleResearched?: boolean
  landingResearched?: boolean
  pendingLaunch?: boolean
  pendingRocketName?: string
  onConfirmShipCustomizerBuild?: (installed: InstalledCustomizerPartsByKind, prevInstalled: InstalledCustomizerPartsByKind) => boolean
  onBack: () => void
  onSelect?: (rocketId: string) => void
}

const STAT_MAX: Record<string, number> = { cargo: 20, maxOrbit: 10, drillTier: 5 }

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statTrack} aria-hidden="true"><div className={styles.statFill} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}

function RocketCard({ rocket, missionsDone, onSelect }: { rocket: RocketModel; missionsDone: number; onSelect?: (id: string) => void }) {
  const missionUnlocked = missionsDone >= rocket.missionsRequired
  const isAvailable = !rocket.locked && missionUnlocked
  const isLocked = rocket.locked || !missionUnlocked
  const hasCost = rocket.costFrancs > 0

  return (
    <article className={`${styles.card} ${isLocked ? styles.isLocked : ''}`}>
      {/* Ship image banner */}
      <div className={styles.cardImage}>
        {/* Grid lines for tech feel */}
        {isAvailable ? (
          <Image
            src={rocket.img}
            alt={rocket.name}
            width={240}
            height={90}
            style={{ width: 240, height: 'auto' }}
          />
        ) : (
          <div>
            <span className={styles.lockedTier}>TIER {rocket.tier}</span>
            <span className={styles.lockedHint}>CLASSIFIED VEHICLE</span>
          </div>
        )}
        <div className={styles.tier}>TIER {rocket.tier}</div>
        {isLocked && (
          <div className={styles.locked}>LOCKED</div>
        )}
      </div>

      {/* Card body */}
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <div>
            <div className={styles.cardName}>
              {rocket.name}
            </div>
            {!isAvailable && <div className={styles.lockedHint}>{rocket.unlockHint}</div>}
          </div>
          {isAvailable && onSelect && hasCost && (
            <button
              onClick={() => onSelect(rocket.id)}
              className={styles.cost}
            >
              {formatCurrency(rocket.costFrancs, { compact: true })}
            </button>
          )}
          {isAvailable && !hasCost && (
            <div className={styles.standard}>STANDARD ISSUE</div>
          )}
        </div>

        {isAvailable && rocket.stats.cargo > 0 && (
          <div className={styles.stats}>
            <StatBar label="Cargo" value={rocket.stats.cargo} max={STAT_MAX.cargo} />
            <StatBar label="Max Orbit" value={rocket.stats.maxOrbit} max={STAT_MAX.maxOrbit} />
            <StatBar label={`Drill T${rocket.stats.drillTier}`} value={rocket.stats.drillTier} max={STAT_MAX.drillTier} />
          </div>
        )}
      </div>
    </article>
  )
}

export default function HangarScreen({ francs, missionsDone, unlockedSkillNodes, shipCustomizerParts, crewModuleResearched, landingResearched, pendingLaunch, pendingRocketName, onConfirmShipCustomizerBuild, onBack, onSelect }: HangarScreenProps) {
  // Academy research is a second, explicit unlock path: a player who has
  // researched Crew Quarters must be able to enter the fitter even if they
  // have not purchased the general-purpose customiser skill node.
  const customizerUnlocked = hasShipCustomizer(unlockedSkillNodes) || !!crewModuleResearched || !!landingResearched
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const installed = shipCustomizerParts ?? {}
  const sequence = getBuildSequence(missionsDone, crewModuleResearched, landingResearched)
  const installedIds = selectedCustomizerPartIds(installed, sequence)
  const hasLoadout = installedIds.length > 0
  const successChance = hasLoadout ? calculateShipSuccessChance(installedIds, sequence) : null

  return (
    <div className={`game-screen theme-deep ${styles.screen}`}>
      <TopBar eyebrow="LAUNCHPAD · HANGAR" title="Rocket Fleet" onBack={onBack} />
      <div className={`screen-scroll ${styles.scroll}`} data-ui-zone={UI_ZONES.screenContent}>
        <div className={styles.inner}>
          <div className={styles.intro}>
            <div>
              <div className={styles.eyebrow}>Launchpad · Vehicle Registry</div>
              <h1 className={styles.title}>Rocket Fleet</h1>
              <p className={styles.copy}>Inspect cleared vehicles, compare operating limits, and select the vessel assigned to the next launch.</p>
            </div>
            <div className={styles.fleetReadout} data-testid="hangar-fleet-readout">
              <span className={styles.railLabel}>{pendingLaunch ? 'Vehicle in build' : 'Cleared fleet'}</span>
              <strong className={styles.fleetValue}>{pendingLaunch ? pendingRocketName ?? 'STAGED VEHICLE' : `${ROCKET_MODELS.filter(rocket => !rocket.locked && missionsDone >= rocket.missionsRequired).length}/${ROCKET_MODELS.length}`}</strong>
            </div>
          </div>

        {customizerUnlocked && (
          <button
            data-testid="open-ship-customizer"
            onClick={() => setCustomizerOpen(true)}
            className={styles.customizer}
          >
            {/* Icon */}
              <div className={styles.customizerIcon}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 8v8l-8 5-8-5V8zM8 10l4 2.5 4-2.5M12 12.5V18" /></svg></div>
            <div className={styles.customizerText}>
              <div className={styles.customizerTitle}>Customiser Online</div>
              <div className={styles.customizerSummary} data-testid="ship-customizer-loadout-summary">
                {hasLoadout
                  ? `${installedIds.length}/${sequence.length} modules fitted · ${successChance}% success`
                  : 'Configure Explorer room modules'}
              </div>
            </div>
            <span className={styles.customizerArrow} aria-hidden="true">→</span>
          </button>
        )}

        <div className={styles.sectionHeader}><span>Cleared &amp; classified vehicles</span><span>{ROCKET_MODELS.length} registry entries</span></div>
        <div className={styles.fleetGrid}>{ROCKET_MODELS.map(rocket => (
          <RocketCard key={rocket.id} rocket={rocket} missionsDone={missionsDone} onSelect={onSelect} />
        ))}</div>
        <div className={styles.rail}><span><i className={styles.railValue}>●</i> Registry online</span><span>{missionsDone} missions logged</span><span>Balance {formatCurrency(francs, { compact: true })}</span></div>
        </div>
      </div>

      {customizerOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <ShipInteriorPreview
            rocketId="explorer"
            startingFrancs={francs}
            missionsDone={missionsDone}
            installedParts={installed}
            crewModuleResearched={crewModuleResearched}
            landingResearched={landingResearched}
            onConfirm={onConfirmShipCustomizerBuild}
            onClose={() => setCustomizerOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
