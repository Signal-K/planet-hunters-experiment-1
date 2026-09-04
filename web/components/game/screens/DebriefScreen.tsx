'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Mission, Target, MineralMeta, Client, RocketConfig } from '@/lib/data'
import { calibrateOnboardingPayout, FIRST_CREW_ARRIVAL_BONUS, isOwnProgramMission, isFreeHaulMission, rocketDisplayForConfig, rocketModelForConfig, loanInstalmentFor } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import { PrimaryBtn } from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import MineralChip from '@/components/game/MineralChip'
import CostSummaryRow from '@/components/game/CostSummaryRow'
import { UI_ZONES } from '@/lib/ui-zones'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import { ScrapSequenceCanvas } from '@/components/game/ScrapSequenceCanvas'
import DebriefCanvas from '@/components/game/screens/DebriefCanvas'
import { formatCurrency } from '@/lib/format'
import { rocketStageRecoveryForId } from '@/lib/data/rocket-composition'
import StatRow from '@/components/ui/StatRow'

export default function DebriefScreen({ mission, target, cargo, onDone, minerals, clients, clientMissions: _clientMissions, freeOperations, annotations, missionsDone, hasCoach, shipDestroyed, rocket, rocketSource, deliveryTargetName, loanDebt, firstCrewArrival, hasEarthStorage, storageCapacity, storageUsed, haulMarketValue }: {
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
  hasCoach?: boolean
  shipDestroyed?: boolean
  rocket?: Pick<RocketConfig, 'chassis'>
  rocketSource?: 'company' | 'fabricated'
  deliveryTargetName?: string
  /** Outstanding emergency-loan debt. Collecting this payout repays an instalment, so it is itemized rather than silently deducted (STS-542). */
  loanDebt?: number
  /** First time any astronaut in this save reaches this mission target. */
  firstCrewArrival?: boolean
  /** True once the subsurface Mineral Vault is built — the prerequisite for keeping a free haul on Earth (KES-271). */
  hasEarthStorage?: boolean
  /** Total ore units the player's silos can hold. */
  storageCapacity?: number
  /** Ore units already in storage, including this run's haul. */
  storageUsed?: number
  /** What this run's haul would fetch if sold now at market. */
  haulMarketValue?: number
}) {
  // A self-directed haul the player owns outright gets a store-vs-sell choice
  // here instead of a fixed contract payout (KES-271). Storing needs a built
  // Mineral Vault; without one the haul can only be sold on return.
  const isFreeHaul = isFreeHaulMission(mission, cargo)
  // KES-282: the "Resolve Cargo" tap only ever existed to gate the reveal
  // animation — on every mission, including the player's very first, it forced
  // a second real tap ("Collect Reward") to actually finish. During onboarding
  // (same boundary ProgressionCard/useGameLoop use for "still in the tutorial
  // sequence") we skip that gate and start already resolved, so the reveal
  // plays on mount and one tap collects. Free hauls are excluded — they still
  // need the resolve tap to expose the store-vs-sell choice.
  const isEarlyMission = (missionsDone ?? 0) < FREE_OPS_START_MISSIONS_DONE
  const autoResolve = isEarlyMission && !isFreeHaul
  const [resolved, setResolved] = useState(autoResolve)
  const [collecting, setCollecting] = useState(false)
  const collectingRef = useRef(false)
  const [disposition, setDisposition] = useState<'store' | 'sell'>(hasEarthStorage ? 'store' : 'sell')
  const haulUnits = Object.values(cargo).reduce((sum, n) => sum + Math.max(0, n), 0)
  const overflowUnits = hasEarthStorage ? Math.max(0, (storageUsed ?? 0) - (storageCapacity ?? 0)) : haulUnits
  // Every current vehicle is single-use. Show teardown on every mission so the
  // player sees stages dismantled even when no failure flag was raised.
  const [scrapping, setScrapping] = useState(false)
  useEffect(() => {
    if (autoResolve) setScrapping(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const rocketDisplay = rocketDisplayForConfig(rocket)
  const starterRocket = rocketModelForConfig(rocket)
  const recoveryMaterials = rocketStageRecoveryForId(starterRocket.id)
  const recoveryEntries = Object.entries(recoveryMaterials)
  const vehicleCost = rocketSource === 'fabricated' ? 0 : starterRocket.costFrancs

  const requiredMaterials = mission.construction?.requiredMaterials ?? mission.requires.minerals
  const delivered = Object.entries(requiredMaterials).every(([id, amount]) => (cargo[id] ?? 0) >= amount)
  const client = mission.client ? clients[mission.client] : undefined
  const isStoryMission = !mission.deliveryTargetId && (mission.tag === 'STORY' || mission.payload?.type === 'satellite')
  const isProgramOperation = isOwnProgramMission(mission)
  // Client level is updated from completed player-built work by the daily
  // economy cycle. A player's repeated jobs no longer create a private
  // affinity multiplier at debrief.
  const contractPayout = delivered ? mission.payout.francs : 0
  const rawTotal = contractPayout
  const calibratedTotal = calibrateOnboardingPayout(rawTotal, missionsDone ?? 0)
  const crewArrivalBonus = delivered && firstCrewArrival ? FIRST_CREW_ARRIVAL_BONUS : 0
  const total = calibratedTotal + crewArrivalBonus
  // Two-leg jobs (mine at targetId, drop at deliveryTargetId) are paid for both
  // services — split the flat contract payout into mining/transport lines so
  // that's visible, rather than implying it's a single flat fee.
  const isTwoLegJob = !!mission.deliveryTargetId
  const miningFee = isTwoLegJob ? Math.round(mission.payout.francs * 0.5) : 0
  const transportFee = isTwoLegJob ? mission.payout.francs - miningFee : 0
  // Repaid out of this payout the moment it is collected (see onDebriefDone),
  // so it belongs in the expense panel and in Net — not silently off the balance.
  const loanRepayment = isProgramOperation ? 0 : loanInstalmentFor(loanDebt)
  const netTotal = total - vehicleCost - loanRepayment
  const manifestAccent = isFreeHaul || isProgramOperation
    ? 'var(--ln-cyan)'
    : delivered ? 'var(--ln-ok)' : 'var(--ln-crimson)'
  const cargoEntries = Object.entries(cargo).filter(([, units]) => units > 0)
  const willStore = isFreeHaul && disposition === 'store' && !!hasEarthStorage

  return (
    <div className="game-screen debrief-game">
      <DebriefCanvas rocketImageSrc={rocketDisplay.img} />
      <div className="debrief-game__world-shade" aria-hidden="true" />

      <header className="debrief-hud-header" data-ui-zone={UI_ZONES.topChrome}>
        <div>
          <span>MISSION COMPLETE</span>
          <h1>DEBRIEF</h1>
        </div>
        <span className="debrief-hud-header__location">EARTH RECEIVING BERTH · 01</span>
      </header>

      <div className={`debrief-game__content screen-scroll${hasCoach ? ' screen-scroll--coach' : ''}`} data-ui-zone={UI_ZONES.screenContent}>
        <section className="debrief-mission-strip" aria-label="Mission result">
          <div className="debrief-mission-strip__status"><span aria-hidden="true" /> {shipDestroyed ? 'HULL LOST · CARGO RECOVERED' : 'DOCKED · MISSION COMPLETE'}</div>
          <div className="debrief-mission-strip__route">
            <div><span>MISSION</span><strong>{mission.title}</strong></div>
            <div><span>RETURNED FROM</span><strong>{target.name}</strong></div>
          </div>
        </section>

        {/* ── Overview: client (if any) + cargo manifest ─────────────────── */}
        <div className="debrief-overview" style={(client && !isStoryMission) ? undefined : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {client && !isStoryMission && (
          <Panel className="debrief-client-panel" accent={client.color} surface="solid">
            <div className="ln-section-label" style={{ marginBottom: 10 }}>Client</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15,
                border: `1.5px solid ${client.color}`, background: 'var(--ln-surface-2)', color: client.color,
              }}>
                {client.initial}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ln-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</div>
                  <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Client work complete</div>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Cargo manifest — required-order rows for client work, plain haul rows
            for a self-directed run the player owns. */}
        <Panel className="debrief-delivery-panel" accent={manifestAccent} surface="solid">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isTwoLegJob ? 10 : 4 }}>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-dim)' }}>
              {isFreeHaul ? 'Cargo Hold' : mission.title}
            </span>
            {!isFreeHaul && !isProgramOperation && (
              <StatusPill kind={delivered ? 'ok' : 'crit'}>{delivered ? 'Delivered' : 'Incomplete'}</StatusPill>
            )}
          </div>
          {isTwoLegJob && deliveryTargetName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingBottom: 10 }}>
              <span style={{ font: '600 9px var(--ln-font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>Route</span>
              <span style={{ font: '700 10px var(--ln-font-display)', padding: '3px 10px', borderRadius: 4, background: 'rgba(112,217,234,0.06)', border: '1px solid rgba(112,217,234,0.12)', color: 'var(--ln-cyan)' }}>{target.name}</span>
              <span style={{ color: 'var(--ln-text-muted)', fontSize: 9 }}>→</span>
              <span style={{ font: '700 10px var(--ln-font-display)', padding: '3px 10px', borderRadius: 4, background: 'rgba(112,217,234,0.06)', border: '1px solid rgba(112,217,234,0.12)', color: 'var(--ln-cyan)' }}>{deliveryTargetName}</span>
            </div>
          )}
          {isFreeHaul
            ? cargoEntries.map(([id, units]) => (
                <ManifestRow key={id} id={id} name={minerals[id]?.name ?? id}>
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--ln-text)' }}>{units} U</span>
                </ManifestRow>
              ))
            : Object.entries(mission.requires.minerals).map(([id, required]) => {
                const collected = Math.min(cargo[id] ?? 0, required)
                const done = collected >= required
                return (
                  <ManifestRow key={id} id={id} name={minerals[id]?.name ?? id} meta={`${collected} / ${required}`}>
                    <StatusPill kind={done ? 'ok' : 'crit'}>{done ? 'Done' : `${required - collected} short`}</StatusPill>
                  </ManifestRow>
                )
              })}
        </Panel>
        </div>

        {/* ── Resolved outcome ─────────────────────────────────────────────── */}
        {resolved && (
          isFreeHaul ? (
            <CargoDispositionPanel
              cargo={cargo}
              minerals={minerals}
              disposition={disposition}
              setDisposition={setDisposition}
              hasEarthStorage={!!hasEarthStorage}
              storageUsed={storageUsed ?? 0}
              storageCapacity={storageCapacity ?? 0}
              haulMarketValue={haulMarketValue ?? 0}
              overflowUnits={overflowUnits}
            />
          ) : isProgramOperation && mission.programReward ? (
            <Panel accent="var(--ln-cyan)" surface="solid" style={{ animation: 'unlock-in 0.35s ease-out' }}>
              <div className="ln-section-label" style={{ marginBottom: 8 }}>Program Outcome</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, lineHeight: 1.5, color: 'var(--ln-text)' }}>
                {mission.programReward.outcome}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--ln-cyan-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ln-text-dim)' }}>Research</span>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 24, fontWeight: 800, color: 'var(--ln-cyan)', lineHeight: 1 }}>+{mission.programReward.researchXP} XP</span>
              </div>
            </Panel>
          ) : delivered ? (
            /* One Ledger panel: payout, expenses, hull and net together, rather
               than two stacked panels repeating the same section chrome. */
            <Panel accent="var(--ln-cyan)" surface="solid" style={{ animation: 'unlock-in 0.35s ease-out' }}>
              <div className="ln-section-label" style={{ marginBottom: 8 }}>Ledger</div>
              {isTwoLegJob ? (
                <>
                  <PayRow label={`Mining fee · ${client?.name ?? 'Client'}`} value={miningFee} />
                  <PayRow label="Transport fee · relay" value={transportFee} />
                </>
              ) : (
                <PayRow label={isStoryMission ? 'Mission funding' : `Order · ${client?.name ?? (isProgramOperation ? 'Program' : 'Client')}`} value={mission.payout.francs} />
              )}
              {calibratedTotal > rawTotal && <PayRow label="Onboarding bonus" value={calibratedTotal - rawTotal} />}
              {crewArrivalBonus > 0 && <PayRow label={`First astronaut at ${target.name}`} value={crewArrivalBonus} />}
              <CostSummaryRow
                label={rocketSource === 'fabricated' ? `${starterRocket.name} · silo fabrication` : `${starterRocket.name} · vehicle`}
                value={rocketSource === 'fabricated' ? 'Minerals committed' : formatCurrency(-vehicleCost, { signed: true })}
                color={rocketSource === 'fabricated' ? 'var(--ln-cyan)' : 'var(--ln-crimson)'}
                last={loanRepayment === 0}
              />
              {loanRepayment > 0 && (
                <CostSummaryRow
                  label={loanRepayment >= (loanDebt ?? 0) ? 'Loan · cleared' : 'Loan · instalment'}
                  value={formatCurrency(-loanRepayment, { signed: true })}
                  color="var(--ln-crimson)"
                  last
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 2px', marginTop: 2, borderTop: '1px solid var(--ln-hairline)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: shipDestroyed ? 'var(--ln-crimson)' : 'var(--ln-ok)' }} />
                <span style={{ fontFamily: 'var(--ln-font-body)', fontWeight: 500, fontSize: 11, color: 'var(--ln-text-dim)', lineHeight: 1.3 }}>
                  {shipDestroyed
                    ? <><strong style={{ color: 'var(--ln-text)' }}>Hull lost</strong> · recovery crews are dismantling what remains</>
                    : <><strong style={{ color: 'var(--ln-text)' }}>Stage recovery scheduled</strong> · this single-use vehicle is dismantled after cargo clearance</>}
                </span>
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--ln-hairline-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>Net</span>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 26, fontWeight: 800, lineHeight: 1, color: netTotal >= 0 ? 'var(--ln-amber)' : 'var(--ln-crimson)' }}>
                  {formatCurrency(netTotal, { signed: true })}
                </span>
              </div>
            </Panel>
          ) : null
        )}
        {resolved && (
          <Panel accent={hasEarthStorage ? 'var(--ln-ok)' : 'var(--ln-cyan)'} surface="solid" style={{ animation: 'unlock-in 0.35s ease-out' }}>
            <div className="ln-section-label" style={{ marginBottom: 8 }}>Stage Recovery</div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', lineHeight: 1.45 }}>
              {hasEarthStorage
                ? 'Boosters and the operating stage are dismantled into silo materials after this mission.'
                : 'Boosters and the operating stage are dismantled, but a built Earth silo or vault is required to retain the materials.'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {recoveryEntries.map(([id, amount]) => <MineralChip key={id} mineral={id} count={amount} meta={minerals[id]} />)}
            </div>
          </Panel>
        )}
        {/* Single incomplete note (client work only) — shown once, in both the
            pre- and post-resolve states, instead of two near-identical panels. */}
        {!isFreeHaul && !isProgramOperation && !delivered && (
          <Panel accent="var(--ln-crimson)" surface="solid">
            <p style={{ margin: 0, fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', lineHeight: 1.5, textAlign: 'left' }}>
              <strong style={{ color: 'var(--ln-text)' }}>Order incomplete</strong> — the fee is only paid on a full delivery. Return and mine the rest.
            </p>
          </Panel>
        )}

      </div>

      <div className="debrief-command-dock" data-ui-zone={UI_ZONES.bottomActions}>
        {hasCoach && <TutorialHighlight borderRadius={8} />}
        {!resolved ? (
          <PrimaryBtn
            // Amber is reserved for the payout amount itself. The action that
            // resolves the mission remains the cyan primary CTA in both states.
            kind="cyan"
            full={false}
            testId="resolve-cargo-btn"
            onClick={() => {
              setResolved(true)
              setScrapping(true)
            }}
          >
            {shipDestroyed ? 'Resolve Recovered Cargo' : 'Resolve Cargo & Recovery'}
          </PrimaryBtn>
        ) : (
          <PrimaryBtn
            // Collecting a reward is still a primary action; keep payout
            // emphasis inside the payout panel rather than on the button.
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
                onDone(total, 0, delivered ? requiredMaterials : {})
              }
            }}
          >
            {isFreeHaul
              ? willStore
                ? overflowUnits > 0 ? `Store haul · sell ${overflowUnits} over cap` : 'Keep haul on Earth'
                : `Sell haul · ${formatCurrency(haulMarketValue ?? 0)}`
              : delivered
                ? isProgramOperation
                  ? 'Log Program Outcome'
                  : `Collect ${formatCurrency(total)}`
                : 'Return to Base'}
          </PrimaryBtn>
        )}
      </div>

      {scrapping && (
        <ScrapSequenceCanvas
          rocketImageSrc={rocketDisplay.img}
          onComplete={() => setScrapping(false)}
        />
      )}
    </div>
  )
}

function PayRow({ label, value }: { label: string; value: number }) {
  // Payout lines stay on full precision — this is the itemization the player
  // checks the collected total against (STS-539 policy). Rendered as a plain
  // manifest row (navy ink, light hairline divider) rather than StatRow's
  // amber-by-default styling — amber is reserved for the one Total figure
  // per the standing amber-restricted-to-payout rule (KES-211).
  return (
    <StatRow
      label={label}
      value={formatCurrency(value)}
      valueColor="var(--ln-text)"
      style={{ borderTop: '1px solid var(--ln-hairline)' }}
    />
  )
}

function ManifestRow({ id, name, meta, children }: { id: string; name: string; meta?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: '1px solid var(--ln-hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <MineralChip mineral={id} variant="avatar" size={22} />
        <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, fontWeight: 700, color: 'var(--ln-text)' }}>{name}</span>
        {meta && <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, color: 'var(--ln-text-dim)' }}>{meta}</span>}
      </div>
      {children}
    </div>
  )
}

/** The store-vs-sell choice for a self-directed haul (KES-271). Kept compact:
 *  a one-line explanation, a two-option toggle, and a single detail row that is
 *  either the silo fill (store) or the market value (sell). */
function CargoDispositionPanel({
  cargo, minerals, disposition, setDisposition, hasEarthStorage, storageUsed, storageCapacity, haulMarketValue, overflowUnits,
}: {
  cargo: Record<string, number>
  minerals: Record<string, MineralMeta>
  disposition: 'store' | 'sell'
  setDisposition: (d: 'store' | 'sell') => void
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
  const segments = Object.entries(cargo).filter(([, n]) => n > 0)
  return (
    <Panel accent="var(--ln-cyan)" surface="solid" style={{ animation: 'unlock-in 0.35s ease-out' }}>
      <div className="ln-section-label" style={{ marginBottom: 6 }}>Your ore · keep or sell</div>
      <p style={{ margin: '0 0 12px', textAlign: 'left', fontFamily: 'var(--ln-font-body)', fontSize: 12, lineHeight: 1.5, color: 'var(--ln-text-dim)' }}>
        No client is owed this haul. Keep it in the silo to sell when the price is right or spend on your own builds, or sell the lot now at market.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <DispositionOption testId="debrief-store" active={store} disabled={!hasEarthStorage} onClick={() => setDisposition('store')} title="Keep on Earth" sub={hasEarthStorage ? 'Into the silo' : 'Needs a Vault · Earth silo'} />
        <DispositionOption testId="debrief-sell" active={!store} onClick={() => setDisposition('sell')} title="Sell now" sub="At market price" />
      </div>
      <div style={{ marginTop: 12 }}>
        {store ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ font: '700 9px var(--ln-font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>Silo</span>
              <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, color: 'var(--ln-text-dim)' }}>{Math.min(storageUsed, storageCapacity)} / {storageCapacity} U</span>
            </div>
            <div style={{ height: 12, borderRadius: 6, overflow: 'hidden', display: 'flex', background: 'var(--ln-surface-2)', border: '1px solid var(--ln-hairline)' }} aria-hidden="true">
              {priorUnits > 0 && <span style={{ width: `${Math.min(100, (priorUnits / cap) * 100)}%`, background: 'var(--ln-cyan)', opacity: 0.5 }} />}
              {segments.map(([id, units]) => (
                <span key={id} style={{ width: `${Math.min(100, (units / cap) * 100)}%`, background: minerals[id]?.color ?? 'var(--ln-cyan)' }} />
              ))}
            </div>
            {overflowUnits > 0 && (
              <p style={{ margin: '8px 0 0', textAlign: 'left', fontFamily: 'var(--ln-font-body)', fontSize: 11, lineHeight: 1.4, color: 'var(--ln-text-dim)' }}>
                Silo full — <strong style={{ color: 'var(--ln-text)' }}>{overflowUnits}</strong> units over capacity are sold automatically.
              </p>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: '700 10px var(--ln-font-display)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>Sale value</span>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800, color: 'var(--ln-amber)', lineHeight: 1 }}>{formatCurrency(haulMarketValue)}</span>
          </div>
        )}
      </div>
      {!hasEarthStorage && (
        <p style={{ margin: '10px 0 0', textAlign: 'left', fontFamily: 'var(--ln-font-body)', fontSize: 11, lineHeight: 1.4, color: 'var(--ln-text-muted)' }}>
          Build a Mineral Vault in the Subsurface or a Surface Silo after the tutorial. Underground vaults provide larger capacity; until then, ore is sold on return.
        </p>
      )}
    </Panel>
  )
}

function DispositionOption({ active, disabled, onClick, title, sub, testId }: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  sub: string
  testId: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1.5px solid ${active ? 'var(--ln-cyan)' : 'var(--ln-hairline)'}`,
        background: active ? 'var(--ln-cyan-soft)' : 'var(--ln-surface-2)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ font: '800 12px var(--ln-font-display)', letterSpacing: '0.04em', textTransform: 'uppercase', color: active ? 'var(--ln-cyan)' : 'var(--ln-text)' }}>{title}</div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 10, color: 'var(--ln-text-muted)', marginTop: 2 }}>{sub}</div>
    </button>
  )
}
