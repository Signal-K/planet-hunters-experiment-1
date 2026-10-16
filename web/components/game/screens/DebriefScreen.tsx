'use client'

import { useEffect, useRef, useState } from 'react'
import type { Mission, Target, MineralMeta, Client, RocketConfig } from '@/lib/data'
import { calibrateOnboardingPayout, FIRST_CREW_ARRIVAL_BONUS, isOwnProgramMission, isFreeHaulMission, rocketDisplayForConfig, rocketModelForConfig, loanInstalmentFor } from '@/lib/data'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { openSettings } from '@/lib/mining/openChrome'
import { Settings } from 'lucide-react'
import styles from './DebriefScreen.module.css'
import { useHelp } from '@/components/ui/useHelp'
import { UI_ZONES } from '@/lib/ui-zones'
import { ScrapSequenceCanvas } from '@/components/game/ScrapSequenceCanvas'
import LaserCapacitorPanel from '@/components/game/screens/LaserCapacitorPanel'
import DestinationLandscape from '@/components/game/screens/DestinationLandscape'
import { formatCurrency } from '@/lib/format'
import type { PlayerBadge } from '@/lib/data/sky-events'
import { SkyBadgeRow } from './SkyBadgeRow'

export default function DebriefScreen({ mission, target, cargo, onDone, minerals: _minerals, clients, clientMissions: _clientMissions, freeOperations: _freeOperations, annotations: _annotations, missionsDone, shipDestroyed, rocket, rocketSource, deliveryTargetName, originTargetName, loanDebt, firstCrewArrival, hasEarthStorage, storageCapacity, storageUsed, haulMarketValue, initialDisposition, onBuyLaserCapacitor, laserCapacitorLevel = 0, stashUnits = 0, badges }: {
  mission: Mission
  target: Target
  cargo: Record<string, number>
  onDone: (total: number, affinity: number, consumed?: Record<string, number>, disposition?: 'store' | 'sell') => void
  minerals: Record<string, MineralMeta>
  clients: Record<string, Client>
  clientMissions?: Record<string, number>
  freeOperations?: boolean
  annotations?: number
  missionsDone?: number
  shipDestroyed?: boolean
  rocket?: Pick<RocketConfig, 'chassis'>
  rocketSource?: 'company' | 'fabricated'
  deliveryTargetName?: string
  originTargetName?: string
  loanDebt?: number
  firstCrewArrival?: boolean
  hasEarthStorage?: boolean
  storageCapacity?: number
  storageUsed?: number
  haulMarketValue?: number
  initialDisposition?: 'store' | 'sell'
  onBuyLaserCapacitor?: (expectedLevel: number, reservedUnits: number) => void
  laserCapacitorLevel?: number
  stashUnits?: number
  badges?: Record<string, PlayerBadge>
}) {
  const isFreeHaul = isFreeHaulMission(mission, cargo)
  const isOrbitalInstrumentDeployment = mission.payload?.type === 'satellite'
  const help = useHelp('debrief')
  const [collecting, setCollecting] = useState(false)
  const collectingRef = useRef(false)
  const disposition = initialDisposition ?? (hasEarthStorage ? 'store' : 'sell')
  const haulUnits = Object.values(cargo).reduce((sum, n) => sum + Math.max(0, n), 0)
  const overflowUnits = hasEarthStorage ? Math.max(0, (storageUsed ?? 0) - (storageCapacity ?? 0)) : haulUnits
  const [scrapping, setScrapping] = useState(false)
  const rocketDisplay = rocketDisplayForConfig(rocket)
  const starterRocket = rocketModelForConfig(rocket)
  const vehicleCost = rocketSource === 'fabricated' ? 0 : starterRocket.costFrancs

  const requiredMaterials = mission.construction?.requiredMaterials ?? mission.requires.minerals
  const delivered = Object.entries(requiredMaterials).every(([id, amount]) => (cargo[id] ?? 0) >= amount)
  const client = mission.client ? clients[mission.client] : undefined
  const isStoryMission = !mission.deliveryTargetId && (mission.tag === 'STORY' || mission.payload?.type === 'satellite')
  const isProgramOperation = isOwnProgramMission(mission)
  const affinityEarned = delivered && client && !isStoryMission ? Math.max(0, mission.payout.affinity) : 0
  const contractPayout = delivered ? mission.payout.francs : 0
  const rawTotal = contractPayout
  const calibratedTotal = calibrateOnboardingPayout(rawTotal, missionsDone ?? 0)
  const crewArrivalBonus = delivered && firstCrewArrival ? FIRST_CREW_ARRIVAL_BONUS : 0
  const total = calibratedTotal + crewArrivalBonus
  const isTwoLegJob = !!mission.deliveryTargetId
  const miningFee = isTwoLegJob ? Math.round(mission.payout.francs * 0.5) : 0
  const transportFee = isTwoLegJob ? mission.payout.francs - miningFee : 0
  const loanRepayment = isProgramOperation ? 0 : loanInstalmentFor(loanDebt)
  const netTotal = total - vehicleCost - loanRepayment
  const cargoEntries = Object.entries(cargo).filter(([, units]) => units > 0)
  const willStore = isFreeHaul && disposition === 'store' && !!hasEarthStorage
  const clientOwedUnits = !isFreeHaul && !isTwoLegJob && delivered
    ? Object.values(requiredMaterials).reduce((sum, n) => sum + Math.max(0, n), 0)
    : 0
  const showLaserCapacitor = !!onBuyLaserCapacitor && !isProgramOperation
    && (!isFreeHaul || willStore) && (cargoEntries.length > 0 || stashUnits > 0)
  const status = shipDestroyed
    ? 'Hull lost · cargo recovered'
    : isProgramOperation
      ? 'Commissioned · instrument online'
      : 'Docked · mission complete'

  return (
    <div className={`game-screen debrief-game ${styles.screen}`}>
      <DestinationLandscape
        className={styles.vista}
        variant="scene"
        target={{ id: target.id, type: target.type, archetype: target.archetype ?? null }}
        cargo={cargoEntries.map(([id, units]) => ({ id, units }))}
      />

      <div className={styles.hud}>
        <div className={styles.cluster}>
          <button type="button" aria-label="Settings" onClick={openSettings}><Settings size={20} /></button>
          <HubClockWidget />
        </div>
        <div className={styles.cluster}>
          <span className="scene-chip">{haulUnits} U</span>
          {help.button}
        </div>
      </div>
      {help.layer}

      <div className={styles.column} data-ui-zone={UI_ZONES.screenContent}>
        <SkyBadgeRow badges={badges} />
        {isOrbitalInstrumentDeployment ? (
          <section className={`debrief-result-panel ${styles.card}`} aria-label="Mission result" data-testid="debrief-result-panel" data-surface="cream">
            <p className="debrief-result-panel__status"><span aria-hidden="true" /> Commissioned · instrument online</p>
            <h2 className="debrief-result-panel__title">{mission.title}</h2>
            <p className="debrief-result-panel__kicker">Program Outcome</p>
            <p className="debrief-result-panel__outcome">{mission.programReward?.outcome}</p>
            <p className="debrief-result-panel__note">{mission.payload?.name ?? 'Instrument'} remains in Earth orbit. The sky-side status indicator marks the downlink. Stationed at {target.name}.</p>
          </section>
        ) : (
          <section className={styles.card} aria-label="Mission result" data-surface="cream">
            <p className={`${styles.status} ${shipDestroyed ? styles.statusCrit : ''}`}><i aria-hidden="true" /> {status}</p>
            <div className={styles.route}>
              <div><span>Mission</span><strong>{mission.title}</strong></div>
              <div><span>{isProgramOperation ? 'Stationed at' : 'Returned from'}</span><strong>{target.name}</strong></div>
            </div>
          </section>
        )}

        {isOrbitalInstrumentDeployment ? null : isFreeHaul ? (
          <CargoDestinationPanel
            cargo={cargo}
            disposition={disposition}
            hasEarthStorage={!!hasEarthStorage}
            storageUsed={storageUsed ?? 0}
            storageCapacity={storageCapacity ?? 0}
            haulMarketValue={haulMarketValue ?? 0}
            overflowUnits={overflowUnits}
          />
        ) : isProgramOperation && mission.programReward ? (
          <section className={styles.card} data-surface="cream">
            <p className={styles.kicker}>Program Outcome</p>
            <p className={styles.note}>{mission.programReward.outcome}</p>
            <p className={styles.place}>+{mission.programReward.researchXP} XP</p>
          </section>
        ) : delivered ? (
          <section className={styles.card} data-surface="cream">
            <p className={styles.kicker}>Ledger</p>
            {isTwoLegJob ? (
              <>
                <PayRow testId="debrief-mining-fee" label={`Mining fee · ${client?.name ?? 'Client'}`} value={miningFee} />
                <PayRow testId="debrief-transport-fee" label="Transport fee · relay" value={transportFee} />
                {deliveryTargetName && (
                  <p className={styles.note}>{originTargetName ?? target.name} → {deliveryTargetName}</p>
                )}
              </>
            ) : (
              <PayRow label={isStoryMission ? 'Mission funding' : 'Contract value'} value={mission.payout.francs} />
            )}
            {calibratedTotal > rawTotal && <PayRow label="Onboarding bonus" value={calibratedTotal - rawTotal} />}
            {crewArrivalBonus > 0 && <PayRow label={`First astronaut at ${target.name}`} value={crewArrivalBonus} />}
            {vehicleCost !== 0 && (
              <PayRow
                label={`Vehicle · ${starterRocket.name}`}
                value={-vehicleCost}
                signed
              />
            )}
            {loanRepayment > 0 && (
              <PayRow
                label={loanRepayment >= (loanDebt ?? 0) ? 'Loan · cleared' : 'Loan · instalment'}
                value={-loanRepayment}
                signed
              />
            )}
            <div className={styles.netLine}>
              <span className={styles.netLabel}>Net</span>
              <AnimatedFrancs value={netTotal} />
            </div>
          </section>
        ) : null}

        {showLaserCapacitor && onBuyLaserCapacitor && (
          <LaserCapacitorPanel
            level={laserCapacitorLevel}
            haulUnits={haulUnits}
            spareUnits={Math.max(0, stashUnits - clientOwedUnits)}
            onInstall={() => onBuyLaserCapacitor(laserCapacitorLevel, clientOwedUnits)}
          />
        )}

        {!isFreeHaul && !isProgramOperation && !delivered && (
          <section className={styles.card} data-surface="cream">
            <p className={styles.note}>Order incomplete. The fee is paid on a full delivery.</p>
          </section>
        )}
      </div>

      <div className={styles.dock} data-ui-zone={UI_ZONES.bottomActions}>
        {!isOrbitalInstrumentDeployment && (
          <GhostBtn testId="debrief-teardown-btn" full={false} disabled={scrapping} onClick={() => setScrapping(true)}>
            Teardown
          </GhostBtn>
        )}
        <PrimaryBtn
          kind="cyan"
          full={false}
          testId="collect-reward-btn"
          disabled={collecting}
          onClick={() => {
            if (collectingRef.current) return
            collectingRef.current = true
            setCollecting(true)
            if (isFreeHaul) {
              onDone(0, 0, {}, hasEarthStorage ? disposition : 'sell')
            } else {
              onDone(total, affinityEarned, delivered ? requiredMaterials : {})
            }
          }}
        >
          {isFreeHaul
            ? willStore
              ? overflowUnits > 0 ? `Store haul · sell ${overflowUnits} over cap` : 'Keep haul on Earth'
              : `Collect ${formatCurrency(haulMarketValue ?? 0)}`
            : delivered
              ? isProgramOperation
                ? 'Log Program Outcome'
                : `Collect ${formatCurrency(total)}`
              : 'Return to Base'}
        </PrimaryBtn>
      </div>

      {scrapping && (
        <ScrapSequenceCanvas
          rocketImageSrc={rocketDisplay.img}
          onComplete={() => { setScrapping(false) }}
        />
      )}
    </div>
  )
}

function PayRow({ label, value, testId, signed = false }: { label: string; value: number; testId?: string; signed?: boolean }) {
  return (
    <div className={styles.row} data-testid={testId}>
      <span>{label}</span>
      <span>{formatCurrency(value, signed ? { signed: true } : undefined)}</span>
    </div>
  )
}

function AnimatedFrancs({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    if (!media || media.matches || typeof requestAnimationFrame !== 'function') {
      setShown(value)
      return
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100)
      const eased = 1 - (1 - t) ** 3
      setShown(Math.round(value * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    setShown(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <span className={styles.net}>{formatCurrency(shown, { signed: true })}</span>
}

function CargoDestinationPanel({
  cargo, disposition, hasEarthStorage, storageUsed, storageCapacity, haulMarketValue, overflowUnits,
}: {
  cargo: Record<string, number>
  disposition: 'store' | 'sell'
  hasEarthStorage: boolean
  storageUsed: number
  storageCapacity: number
  haulMarketValue: number
  overflowUnits: number
}) {
  const store = disposition === 'store' && hasEarthStorage
  const haulUnits = Object.values(cargo).reduce((sum, n) => sum + Math.max(0, n), 0)
  const priorUnits = Math.max(0, storageUsed - haulUnits)
  const cap = storageCapacity > 0 ? storageCapacity : 1
  const miningFee = Math.round(haulMarketValue * 0.5)
  const transportFee = haulMarketValue - miningFee
  return (
    <section className={styles.card} data-surface="cream">
      <p className={styles.kicker}>Free Ops haul</p>
      {haulMarketValue > 0 && (
        <>
          <PayRow testId="debrief-mining-fee" label="Mining fee · your program" value={miningFee} />
          <PayRow testId="debrief-transport-fee" label="Transport fee · return" value={transportFee} />
        </>
      )}
      <p className={styles.place}>{store ? 'Earth storage' : 'sell on Earth return'}</p>
      {store ? (
        <>
          <div className={styles.row}>
            <span>Silo</span>
            <span>{Math.min(storageUsed, storageCapacity)} / {storageCapacity} U</span>
          </div>
          <div className={styles.bar} aria-hidden="true">
            {priorUnits > 0 && <span style={{ width: `${Math.min(100, (priorUnits / cap) * 100)}%` }} />}
            {haulUnits > 0 && <span style={{ width: `${Math.min(100, (haulUnits / cap) * 100)}%` }} />}
          </div>
          {overflowUnits > 0 && <p className={styles.note}>{overflowUnits} units over capacity are sold.</p>}
        </>
      ) : (
        <div className={styles.netLine}>
          <span className={styles.netLabel}>Sale value</span>
          <AnimatedFrancs value={haulMarketValue} />
        </div>
      )}
      {!hasEarthStorage && <p className={styles.note}>Build a Mineral Vault to keep ore on Earth.</p>}
    </section>
  )
}
