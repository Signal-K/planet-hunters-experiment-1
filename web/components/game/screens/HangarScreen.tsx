'use client'
import { useState } from 'react'
import { ROCKET_IDS, ROCKET_MODELS, hasShipCustomizer } from '@/lib/data'
import type { InstalledCustomizerPartsByKind } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'
import ShipInteriorPreview from '@/components/game/ShipInteriorPreview'
import HangarBay from './HangarBay'
import { formatCurrency } from '@/lib/format'
import { captureGameEvent } from '@/lib/posthog'
import { kitRocketBuilt, markRocketRolloutPending } from '@/lib/rocket-rollout'
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
  /** Title of the mission this vehicle is being built for; null when no mission is set up yet. */
  missionTitle?: string | null
  /** Rocket ids that can carry the set-up mission; null when there is no mission context. */
  compatibleRocketIds?: string[] | null
  /** Tier of the vehicle standing in the bay, or null when the bay is empty. */
  stagedTier?: number | null
  /** The staged vehicle currently associated with this mission, if any. */
  selectedRocketId?: string | null
  onChooseMission?: () => void
  /** Starts building the chosen rocket for the set-up mission. */
  onBuildRocket?: (rocketId: string) => void
}

const VEHICLES = [
  { id: ROCKET_IDS.explorer, rocketId: ROCKET_IDS.explorer, label: 'Explorer' },
  { id: ROCKET_IDS.prospector, rocketId: ROCKET_IDS.prospector, label: 'Prospector' },
  { id: ROCKET_IDS.surveyor, rocketId: ROCKET_IDS.surveyor, label: 'Surveyor' },
] as const

function RocketThumbnail({ rocketId, tier }: { rocketId?: string; tier: number }) {
  const source = rocketId === ROCKET_IDS.prospector
    ? '/game/assets/ships/ship_sr2.png'
    : rocketId === ROCKET_IDS.surveyor
      ? '/parts/hull_mk3_heavy_t3.png'
      : '/game/assets/ships/ship_sr1.png'
  return <img className={styles.vehicleIcon} src={source} alt="" aria-hidden="true" data-tier={tier} />
}

export default function HangarScreen({
  francs, missionsDone, unlockedSkillNodes, shipCustomizerParts, crewModuleResearched, landingResearched,
  trainingPartTry = false, onConfirmShipCustomizerBuild, onBack,
  missionTitle = null, compatibleRocketIds = null, stagedTier = null, selectedRocketId = null, onChooseMission, onBuildRocket,
}: HangarScreenProps) {
  const customizerUnlocked = trainingPartTry || hasShipCustomizer(unlockedSkillNodes) || !!crewModuleResearched || !!landingResearched
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [previewRocketId, setPreviewRocketId] = useState<string | null>(selectedRocketId)
  const installed = shipCustomizerParts ?? {}
  const hasMission = compatibleRocketIds !== null

  const build = (rocketId: string) => {
    const rocket = ROCKET_MODELS.find(model => model.id === rocketId)
    if (!rocket || !onBuildRocket || !hasMission) return
    captureGameEvent('hangar_rocket_selected', { rocket_id: rocketId, cost_francs: rocket.costFrancs })
    onBuildRocket(rocketId)
  }

  const previewRocket = ROCKET_MODELS.find(model => model.id === previewRocketId) ?? null
  const previewReady = previewRocket && hasMission && compatibleRocketIds.includes(previewRocket.id)

  return (
    <div className={`game-screen theme-blueprint ${styles.screen}`} data-testid="hangar-screen">
      {/* The customizer is a full-screen sheet: the bay under it cannot be tapped or tabbed to while it is open. */}
      <div style={{ display: 'contents' }} inert={customizerOpen}>
      <div className={styles.assembly} data-testid="hangar-assembly" aria-hidden="true">
        <HangarBay stagedTier={stagedTier} />
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
        <svg viewBox="0 0 220 150" aria-hidden="true">
          <rect x="2" y="2" width="216" height="146" rx="6" fill="color-mix(in srgb, var(--ln-world-outline) 70%, var(--ln-world-trim-blue))" stroke="var(--ln-world-hull-lit)" strokeWidth="3" />
          <g fill="none" stroke="var(--ln-world-glass)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
            <path d="M60 118 V50 q14 -34 28 0 V118 z" />
            <path d="M44 118 V76 q8 -20 16 0 M88 118 V76 q8 -20 16 0" />
            <path d="M126 40 h70 M126 62 h54 M126 84 h62 M126 106 h40" />
          </g>
        </svg>
      </button>

      <div className={styles.status} data-testid="hangar-status" role="status">
        {hasMission ? (
          <>
            <span className={styles.statusKicker}>VEHICLE BAY</span>
            <span className={styles.statusText}>{previewRocket ? `${previewRocket.name} selected` : 'Choose a vehicle to inspect'}</span>
          </>
        ) : (
          <>
            <span className={styles.statusText}>No mission set up</span>
            {onChooseMission && <button type="button" className={styles.statusCta} data-testid="hangar-choose-mission" onClick={onChooseMission}>Choose mission</button>}
          </>
        )}
      </div>

      {hasMission && (
        <section className={styles.preview} data-testid="hangar-vehicle-preview" aria-live="polite">
          <div className={styles.previewVisual} aria-hidden="true">
            <RocketThumbnail rocketId={previewRocket?.id} tier={previewRocket?.tier ?? 1} />
            <img className={styles.crewSprite} src="/game/assets/actors/crew.png" alt="" />
            <span className={styles.previewStamp}>{previewRocket ? `TIER ${previewRocket.tier}` : 'SELECT'}</span>
          </div>
          <div className={styles.previewCopy}>
            <span className={styles.previewEyebrow}>MISSION VEHICLE</span>
            <strong>{previewRocket?.name ?? 'No vehicle selected'}</strong>
            <span>{previewRocket ? 'Review the flight profile before staging.' : 'Choose a blueprint below to see what it can carry.'}</span>
          </div>
          <div className={styles.previewStats}>
            {(['cargo', 'maxOrbit', 'drillTier'] as const).map(stat => (
              <div key={stat} className={styles.previewStat}>
                <span>{stat === 'maxOrbit' ? 'Range' : stat === 'drillTier' ? 'Laser' : 'Capacity'}</span>
                <strong>{previewRocket?.stats[stat] ?? '—'}</strong>
                <i><b style={{ width: `${previewRocket ? Math.min(100, previewRocket.stats[stat] / (stat === 'cargo' ? 18 : stat === 'maxOrbit' ? 9 : 3) * 100) : 0}%` }} /></i>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.previewAction}
            data-testid="hangar-stage-vehicle"
            disabled={!previewReady}
            onClick={() => previewRocket && build(previewRocket.id)}
          >
            {previewRocket ? `Stage ${previewRocket.name}` : 'Select a vehicle'}
            {previewRocket && <small>{previewRocket.costFrancs === 0 ? 'FREE' : formatCurrency(previewRocket.costFrancs, { compact: true })}</small>}
          </button>
        </section>
      )}

      <div className={styles.fleet} data-testid="hangar-fleet-grid" data-ui-zone={UI_ZONES.screenContent}>
        {VEHICLES.map(vehicle => {
          const rocket = ROCKET_MODELS.find(model => model.id === vehicle.rocketId)
          const sealed = !!rocket && (rocket.locked || missionsDone < rocket.missionsRequired)
          const incompatible = !!rocket && hasMission && !compatibleRocketIds.includes(rocket.id)
          const waiting = !hasMission
          const cost = rocket ? (rocket.costFrancs === 0 ? 'Free' : formatCurrency(rocket.costFrancs, { compact: true })) : ''
          const note = sealed && rocket
            ? `Needs ${rocket.missionsRequired} ${rocket.missionsRequired === 1 ? 'mission' : 'missions'}`
            : incompatible ? 'Cannot carry this mission' : waiting ? 'Choose a mission first' : null
          const disabled = sealed || incompatible || waiting
          return (
            <button
              key={vehicle.id}
              type="button"
              className={styles.card}
              data-testid={`hangar-rocket-${vehicle.id}`}
              data-state={sealed ? 'sealed' : incompatible ? 'incompatible' : waiting ? 'waiting' : 'ready'}
              disabled={disabled}
              aria-label={note ? `${vehicle.label}, ${note}` : `Build ${vehicle.label} for ${cost}`}
              aria-pressed={previewRocketId === vehicle.id}
              onClick={() => setPreviewRocketId(vehicle.id)}
            >
              <RocketThumbnail rocketId={rocket?.id} tier={rocket?.tier ?? 1} />
              <span className={styles.label}>{vehicle.label}</span>
              {note
                ? <span className={styles.note}>{note}</span>
                : <span className={styles.buildPill}><span>Build</span><span className={styles.cost}>{cost}</span></span>}
            </button>
          )
        })}
      </div>

      <button type="button" className={styles.exit} data-testid="hangar-exit-bay" onClick={onBack}>Exit bay</button>
      </div>

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
