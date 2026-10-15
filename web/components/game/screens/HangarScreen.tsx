'use client'

import { useState } from 'react'
import { ROCKET_IDS, ROCKET_MODELS, hasShipCustomizer } from '@/lib/data'
import type { InstalledCustomizerPartsByKind } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'
import ShipInteriorPreview from '@/components/game/ShipInteriorPreview'
import { formatCurrency } from '@/lib/format'
import { captureGameEvent } from '@/lib/posthog'
import { kitRocketBuilt, markRocketRolloutPending } from '@/lib/rocket-rollout'
import { useHelp } from '@/components/ui/useHelp'
import { BaseDock } from '@/components/game/hub/BaseDock'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { openSettings } from '@/lib/mining/openChrome'
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
  trainingPartTry?: boolean
  onConfirmShipCustomizerBuild?: (installed: InstalledCustomizerPartsByKind, prevInstalled: InstalledCustomizerPartsByKind) => boolean
  onBack: () => void
  onBuild?: () => void
  onHub?: () => void
  onNext?: () => void
  onSelect?: (rocketId: string) => void
}

const VEHICLES = [
  { id: ROCKET_IDS.explorer, rocketId: ROCKET_IDS.explorer, label: 'Explorer' },
  { id: ROCKET_IDS.prospector, rocketId: ROCKET_IDS.prospector, label: 'Prospector' },
  { id: ROCKET_IDS.surveyor, rocketId: ROCKET_IDS.surveyor, label: 'Surveyor' },
] as const

function RocketThumbnail({ tier }: { tier: number }) {
  return (
    <svg className={styles.vehicleIcon} viewBox="0 0 210 107" aria-hidden="true" shapeRendering="crispEdges">
      <g stroke="var(--ln-world-outline)" strokeWidth="4" strokeLinejoin="round">
        <path d="M24 42h114l44 11-44 12H24z" fill="var(--ln-world-hull-lit)" />
        <path d="M43 42 30 26l30 16M43 65 30 81l30-16" fill="var(--ln-world-trim-blue)" />
        <path d="M18 44h12v19H18z" fill="var(--ln-world-asphalt)" />
        <path d="M110 43h10v21h-10z" fill="var(--ln-world-trim-blue)" stroke="none" />
        <rect x="76" y="48" width="13" height="10" rx="4" fill="var(--ln-world-glass)" strokeWidth="2" />
        {tier >= 2 && <path d="M91 30h38v12H91z" fill="var(--ln-world-trim-blue)" />}
        {tier >= 3 && <path d="M91 65h38v12H91z" fill="var(--ln-world-trim-blue)" />}
      </g>
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

export default function HangarScreen({
  francs, missionsDone, unlockedSkillNodes, shipCustomizerParts, crewModuleResearched, landingResearched,
  trainingPartTry = false, onConfirmShipCustomizerBuild, onBack, onBuild, onHub, onNext, onSelect,
}: HangarScreenProps) {
  const customizerUnlocked = trainingPartTry || hasShipCustomizer(unlockedSkillNodes) || !!crewModuleResearched || !!landingResearched
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const help = useHelp('hangar')
  const installed = shipCustomizerParts ?? {}
  const staged = [...ROCKET_MODELS].reverse().find(rocket => !rocket.locked && missionsDone >= rocket.missionsRequired) ?? ROCKET_MODELS[0]
  const [focused, setFocused] = useState(staged.id)

  const choose = (rocketId: string | null) => {
    if (!rocketId) {
      setFocused('rover')
      return
    }
    const rocket = ROCKET_MODELS.find(model => model.id === rocketId)
    const open = !!rocket && !rocket.locked && missionsDone >= rocket.missionsRequired
    if (!open) return
    setFocused(rocketId)
    if (onSelect) {
      captureGameEvent('hangar_rocket_selected', { rocket_id: rocketId, cost_francs: rocket.costFrancs })
      onSelect(rocketId)
    }
  }

  return (
    <div className={`game-screen theme-blueprint ${styles.screen}`} data-testid="hangar-screen">
      <img className={styles.bay} src="/art/scenes/hangar/hangar-plate-bay.png" alt="" />
      <div className={styles.assembly} data-testid="hangar-assembly" aria-hidden="true">
        <img className={styles.scene} src="/art/scenes/hangar/hangar-sheet.png" alt="" />
      </div>
      <button
        type="button"
        className={styles.blueprint}
        data-testid="open-ship-customizer"
        aria-label="Vehicle blueprint"
        onClick={() => {
          if (!customizerUnlocked) return
          captureGameEvent('hangar_customizer_opened')
          setCustomizerOpen(true)
        }}
      >
        <img src="/art/scenes/hangar/hangar-blueprint-panel.png" alt="" />
      </button>

      <div className={styles.fleet} data-testid="hangar-fleet-grid" data-ui-zone={UI_ZONES.screenContent}>
        {VEHICLES.map(vehicle => {
          const rocket = vehicle.rocketId ? ROCKET_MODELS.find(model => model.id === vehicle.rocketId) : null
          const sealed = !!rocket && (rocket.locked || missionsDone < rocket.missionsRequired)
          return (
            <button
              key={vehicle.id}
              type="button"
              className={styles.card}
              data-selected={focused === vehicle.id}
              disabled={sealed}
              aria-label={sealed ? `${vehicle.label}, sealed` : vehicle.label}
              onClick={() => choose(vehicle.rocketId)}
            >
              <RocketThumbnail tier={rocket?.tier ?? 1} />
              <span className={styles.label}>
                {vehicle.label}
                {sealed && rocket && <span className={styles.sealed}>{`Needs ${rocket.missionsRequired} ${rocket.missionsRequired === 1 ? 'mission' : 'missions'}`}</span>}
              </span>
            </button>
          )
        })}
      </div>

      <header className={styles.hud}>
        <div className={styles.cluster}>
          <button type="button" className={styles.cog} data-testid="settings-button" aria-label="Settings" onClick={openSettings}>
            <GearIcon />
          </button>
          <HubClockWidget />
          {help.button}
        </div>
        <div className={styles.cluster}>
          <span className="scene-chip" data-testid="hangar-francs-chip">{formatCurrency(francs, { compact: true })}</span>
          <span className="scene-chip" data-testid="hangar-cargo-chip" aria-label="Cargo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
              <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          </span>
        </div>
      </header>

      <div className={styles.dock}>
        <BaseDock
          onPrev={onBack}
          onNext={onNext ?? onBack}
          onBuild={onBuild ?? onBack}
          onHub={onHub ?? onBack}
        />
      </div>

      {help.layer}

      {customizerOpen && (
        <div data-testid="hangar-customizer-overlay" style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'var(--set-bg)' }}>
          <ShipInteriorPreview
            rocketId="explorer"
            startingFrancs={francs}
            missionsDone={missionsDone}
            installedParts={installed}
            crewModuleResearched={crewModuleResearched}
            landingResearched={landingResearched}
            onConfirm={onConfirmShipCustomizerBuild ? (nextInstalled, prevInstalled) => {
              const ok = onConfirmShipCustomizerBuild(nextInstalled, prevInstalled)
              captureGameEvent('hangar_customizer_build_confirmed', { success: ok })
              if (ok && kitRocketBuilt(nextInstalled)) {
                markRocketRolloutPending()
                onBack()
              }
              return ok
            } : onConfirmShipCustomizerBuild}
            onClose={() => setCustomizerOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
