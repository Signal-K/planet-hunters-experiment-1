'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Boxes,
  Clock3,
  LockKeyhole,
  MapPin,
  RadioTower,
  Rocket,
  RotateCcw,
  Satellite,
  Truck,
} from 'lucide-react'
import type { Player } from '@/lib/game-types'
import {
  MINERAL_META,
  SETTLEMENT_LAUNCHPAD,
  SURFACE_SITES,
  SURFACE_STORAGE_CAPACITY,
  type SurfaceSiteDefinition,
} from '@/lib/data'
import {
  settlementLaunchpadStatus,
  surfaceCargoReady,
  surfaceSiteProgress,
  surfaceStorageTotal,
} from '@/lib/systems/SurfaceOpsSystem'
import type { TakeonHostEvent } from '@/lib/takeon/events'
import { TAKEON_TO_LANDNAM_MINERAL } from '@/lib/takeon/minerals'
import { formatCountdown, formatCurrency } from '@/lib/format'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import ConstructionTargetCanvas from './ConstructionTargetCanvas'
import TakeOnMount from '@/components/takeon/TakeOnMount'
import styles from './SurfaceOpsScreen.module.css'

type SurfaceView = 'logistics' | 'field'

interface SurfaceOpsScreenProps {
  player: Player
  onBack: () => void
  onPurchaseSiteAccess: (siteId: string) => void
  onStartFieldOperation: (siteId: string) => void
  onBuildLaunchpad: (siteId: string, pad: 0 | 1 | 2) => void
  onMined: (siteId: string, mineralId: string, amount: number) => void
  onDispatch: (siteId: string) => void
  onRetry: (siteId: string) => void
  onReconcile: (siteId: string) => void
  onAcknowledge: (siteId: string) => void
}

function siteStatusLabel(
  definition: SurfaceSiteDefinition,
  accessPurchased: boolean
): string {
  if (definition.availability !== 'available') return 'EQUIPMENT LOCK'
  return accessPurchased ? 'ACCESS ACTIVE' : 'ACCESS AVAILABLE'
}

function ManifestRows({ manifest }: { manifest: Record<string, number> }) {
  const rows = Object.entries(manifest).filter(([, amount]) => amount > 0)
  if (rows.length === 0) {
    return <p className={styles.emptyCopy}>No cargo buffered.</p>
  }
  return (
    <div className={styles.manifest}>
      {rows.map(([id, amount]) => (
        <div className={styles.manifestRow} key={id}>
          <span className={styles.mineralIdentity}>
            <span
              className={styles.mineralDot}
              style={{ background: MINERAL_META[id]?.color ?? 'var(--ln-text-muted)' }}
            />
            {MINERAL_META[id]?.name ?? id}
          </span>
          <strong>{amount} U</strong>
        </div>
      ))}
    </div>
  )
}

export default function SurfaceOpsScreen({
  player,
  onBack,
  onPurchaseSiteAccess,
  onStartFieldOperation,
  onBuildLaunchpad,
  onMined,
  onDispatch,
  onRetry,
  onReconcile,
  onAcknowledge,
}: SurfaceOpsScreenProps) {
  const [selectedSiteId, setSelectedSiteId] = useState(SURFACE_SITES[0].id)
  const [selectedPad, setSelectedPad] = useState<0 | 1 | 2>(0)
  const [view, setView] = useState<SurfaceView>('logistics')
  const [routeSteps, setRouteSteps] = useState(0)
  const [now, setNow] = useState(0)

  const definition = SURFACE_SITES.find(site => site.id === selectedSiteId)
    ?? SURFACE_SITES[0]
  const progress = surfaceSiteProgress(player, definition.id)
  const accessPurchased = !!progress.siteAccessPurchasedAt
  const launchpadStatus = settlementLaunchpadStatus(player, definition.id, now)
  const constructionState =
    launchpadStatus === 'ready'
      ? 'operational'
      : launchpadStatus === 'building'
        ? 'constructing'
        : 'placing'
  const storageTotal = surfaceStorageTotal(progress)
  const cargoReady = surfaceCargoReady(progress)
  const ferry = progress.ferry
  const canAffordAccess = player.francs >= definition.accessFee
  const canAffordLaunchpad =
    player.francs >= SETTLEMENT_LAUNCHPAD.costFrancs
    && Object.entries(SETTLEMENT_LAUNCHPAD.costMaterials)
      .every(([id, amount]) => (player.stash?.[id] ?? 0) >= amount)
  const dispatchReady =
    launchpadStatus === 'ready'
    && cargoReady
    && !ferry

  useEffect(() => {
    if (progress.launchpad) setSelectedPad(progress.launchpad.pad)
  }, [progress.launchpad])

  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (ferry?.status === 'in-flight' && now >= ferry.arrivesAt) {
      onReconcile(definition.id)
    }
  }, [definition.id, ferry?.arrivesAt, ferry?.status, now, onReconcile])

  const handleTakeonEvent = useCallback((event: TakeonHostEvent) => {
    if (event.type !== 'mined' || !event.payload.resource) return
    const mineralId = TAKEON_TO_LANDNAM_MINERAL[event.payload.resource]
    if (mineralId) onMined(definition.id, mineralId, event.payload.amount)
  }, [definition.id, onMined])

  const handleRouteChange = useCallback((steps: number) => {
    setRouteSteps(steps)
  }, [])

  const launchpadCost = `${formatCurrency(SETTLEMENT_LAUNCHPAD.costFrancs, { compact: true })} · ${
    Object.entries(SETTLEMENT_LAUNCHPAD.costMaterials)
      .map(([id, amount]) => `${amount} ${MINERAL_META[id]?.sym ?? id}`)
      .join(' · ')
  }`

  return (
    <div className={`theme-blueprint ln-scene-surface-ops ${styles.screen}`} data-testid="surface-ops-screen" data-view={view}>
      <TopBar
        eyebrow="SURFACE OPS · SOLO SITE CONTROL"
        title="Surface Operations"
        onBack={onBack}
        solid
        francs={player.francs}
      />

      <main className={styles.content} data-view={view}>
        <section className={styles.siteRail} aria-label="Surface sites">
          {SURFACE_SITES.map(site => {
            const siteProgress = surfaceSiteProgress(player, site.id)
            const selected = site.id === definition.id
            return (
              <button
                key={site.id}
                type="button"
                className={`${styles.siteCard} ${selected ? styles.siteCardSelected : ''}`}
                onClick={() => {
                  setSelectedSiteId(site.id)
                  setView('logistics')
                }}
                data-testid={`surface-site-${site.id}`}
              >
                <span className={styles.siteCardHeader}>
                  <MapPin size={16} />
                  <span>{site.name}</span>
                </span>
                <span className={styles.siteRegion}>{site.region}</span>
                <span className={styles.siteMeta}>
                  ORBIT {site.orbitBand} · {site.demand.toUpperCase()} DEMAND
                </span>
                <span className={styles.siteStatus}>
                  {site.availability !== 'available' && <LockKeyhole size={12} />}
                  {siteStatusLabel(site, !!siteProgress.siteAccessPurchasedAt)}
                </span>
              </button>
            )
          })}
        </section>

        <div className={styles.viewTabs} role="tablist" aria-label="Surface operations view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'logistics'}
            className={view === 'logistics' ? styles.tabActive : styles.tab}
            onClick={() => setView('logistics')}
          >
            <RadioTower size={16} /> LOGISTICS
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'field'}
            disabled={!accessPurchased}
            className={view === 'field' ? styles.tabActive : styles.tab}
            onClick={() => accessPurchased && setView('field')}
          >
            <Satellite size={16} /> FIELD
          </button>
        </div>

        {view === 'field' && accessPurchased && progress.fieldOperation ? (
          <section className={styles.fieldPanel} data-testid="surface-field-view">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>LIVE FIELD · {definition.region}</span>
                <h2>{progress.fieldOperation.label}</h2>
              </div>
              <span className={styles.statusPill}>SYNCED</span>
            </div>
            <p className={styles.sectionCopy}>The Prospector is a named Landnam operation. Field yield feeds the settlement buffer; return to Logistics when full.</p>
            <div className={styles.routeReadout} data-testid="surface-field-route-readout">
              <span>FIELD ROUTE</span>
              <strong>{routeSteps > 0 ? `${routeSteps} SAFE STEPS` : 'TAP TERRAIN TO PLAN'}</strong>
            </div>
            <TakeOnMount
              missionId={progress.fieldOperation.id}
              bodyId={progress.fieldOperation.bodyId}
              seed={progress.fieldOperation.seed}
              rover={progress.fieldOperation.rover}
              roverName={progress.fieldOperation.rover.name}
              onEvent={handleTakeonEvent}
              onRouteChange={handleRouteChange}
              className={styles.takeonMount}
            />
          </section>
        ) : view === 'field' && accessPurchased ? (
          <section className={styles.fieldPanel} data-testid="surface-field-operation-start">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>DEPLOYMENT READY · {definition.region}</span>
                <h2>Start Prospector operation</h2>
              </div>
              <span className={styles.statusPill}>LOCAL READY</span>
            </div>
            <p className={styles.sectionCopy}>Landnam commits the mission identity, lunar site and rover assembly before mounting TakeOn. Programme state stays here; the field layer only operates the site.</p>
            <PrimaryBtn onClick={() => onStartFieldOperation(definition.id)}>
              <Satellite size={16} /> Deploy Prospector
            </PrimaryBtn>
          </section>
        ) : (
          <div className={styles.operationsGrid}>
            <section className={styles.siteVisualPanel}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>SITE · {definition.region}</span>
                  <h2>{definition.name}</h2>
                </div>
                <span
                  className={`${styles.statusPill} ${
                    definition.availability !== 'available' ? styles.statusUnavailable : ''
                  }`}
                >
                  {siteStatusLabel(definition, accessPurchased)}
                </span>
              </div>
              <p className={styles.sectionCopy}>{definition.description}</p>
              <div className={styles.canvasFrame}>
                <ConstructionTargetCanvas
                  state={constructionState}
                  selectedPad={selectedPad}
                  onSelectPad={index => setSelectedPad(index as 0 | 1 | 2)}
                />
                <span className={styles.canvasLabel}>
                  SETTLEMENT PAD {selectedPad + 1}
                </span>
              </div>
            </section>

            <aside className={styles.controlStack}>
              <section className={styles.controlPanel} data-testid="site-access-panel">
                <div className={styles.panelTitle}>
                  <MapPin size={18} />
                  <span>SITE ACCESS</span>
                </div>
                <div className={styles.readoutRow}>
                  <span>ACCESS FEE</span>
                  <strong>{formatCurrency(definition.accessFee, { compact: true })}</strong>
                </div>
                <div className={styles.readoutRow}>
                  <span>MODEL</span>
                  <strong>SOLO · NON-TRANSFERABLE</strong>
                </div>
                {!accessPurchased ? (
                  <PrimaryBtn
                    disabled={
                      definition.availability !== 'available'
                      || !player.freeOperations
                      || !canAffordAccess
                    }
                    testId="surface-purchase-access"
                    onClick={() => onPurchaseSiteAccess(definition.id)}
                  >
                    {definition.availability === 'available'
                      ? `Open Site · ${formatCurrency(definition.accessFee, { compact: true })}`
                      : definition.unlockHint}
                  </PrimaryBtn>
                ) : (
                  <span className={styles.confirmedLine}>ACCESS PERMIT ACTIVE</span>
                )}
              </section>

              <section className={styles.controlPanel} data-testid="settlement-launchpad-panel">
                <div className={styles.panelTitle}>
                  <Rocket size={18} />
                  <span>SETTLEMENT LAUNCHPAD</span>
                  <span className={styles.panelState}>{launchpadStatus.toUpperCase()}</span>
                </div>
                {!accessPurchased ? (
                  <p className={styles.emptyCopy}>Open site access before placing infrastructure.</p>
                ) : !progress.launchpad ? (
                  <>
                    <p className={styles.sectionCopy}>
                      Pad {selectedPad + 1} selected · {launchpadCost}
                    </p>
                    <PrimaryBtn
                      disabled={!canAffordLaunchpad}
                      testId="surface-build-launchpad"
                      onClick={() => onBuildLaunchpad(definition.id, selectedPad)}
                    >
                      Build Settlement Pad
                    </PrimaryBtn>
                  </>
                ) : launchpadStatus === 'building' ? (
                  <div className={styles.stateMessage}>
                    <Clock3 size={18} />
                    <span>
                      CONSTRUCTION ACTIVE
                      <strong>{formatCountdown(progress.launchpad.completesAt - now)}</strong>
                    </span>
                  </div>
                ) : (
                  <div className={styles.stateMessage}>
                    <RadioTower size={18} />
                    <span>
                      LAUNCH CONTROL
                      <strong>READY · PAD {progress.launchpad.pad + 1}</strong>
                    </span>
                  </div>
                )}
              </section>

              <section className={styles.controlPanel} data-testid="surface-cargo-panel">
                <div className={styles.panelTitle}>
                  <Boxes size={18} />
                  <span>MINING STATION BUFFER</span>
                  <span className={styles.panelState}>
                    {storageTotal}/{SURFACE_STORAGE_CAPACITY} U
                  </span>
                </div>
                <div
                  className={styles.capacityTrack}
                  role="progressbar"
                  aria-label="Surface storage capacity"
                  aria-valuenow={storageTotal}
                  aria-valuemin={0}
                  aria-valuemax={SURFACE_STORAGE_CAPACITY}
                >
                  <span style={{ width: `${storageTotal / SURFACE_STORAGE_CAPACITY * 100}%` }} />
                </div>
                <ManifestRows manifest={progress.storage} />
                {!ferry && (
                  <PrimaryBtn
                    disabled={!dispatchReady}
                    testId="surface-dispatch-ferry"
                    onClick={() => onDispatch(definition.id)}
                  >
                    <Truck size={16} /> Dispatch Cargo Ferry
                  </PrimaryBtn>
                )}
                {ferry?.status === 'in-flight' && (
                  <div className={styles.stateMessage}>
                    <Truck size={18} />
                    <span>
                      FERRY IN FLIGHT
                      <strong>{formatCountdown(ferry.arrivesAt - now)}</strong>
                    </span>
                  </div>
                )}
                {ferry?.status === 'failed' && (
                  <>
                    <div className={`${styles.stateMessage} ${styles.failedState}`}>
                      <RadioTower size={18} />
                      <span>
                        DISPATCH FAILED
                        <strong>{ferry.failureReason ?? 'Telemetry fault'}</strong>
                      </span>
                    </div>
                    <GhostBtn onClick={() => onRetry(definition.id)}>
                      <RotateCcw size={16} /> Retry Same Manifest
                    </GhostBtn>
                  </>
                )}
                {ferry?.status === 'delivered' && (
                  <>
                    <div className={styles.stateMessage}>
                      <Truck size={18} />
                      <span>
                        CARGO DELIVERED
                        <strong>EARTH INVENTORY RECONCILED</strong>
                      </span>
                    </div>
                    <ManifestRows manifest={ferry.manifest} />
                    <GhostBtn onClick={() => onAcknowledge(definition.id)}>
                      Clear Delivery Record
                    </GhostBtn>
                  </>
                )}
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
