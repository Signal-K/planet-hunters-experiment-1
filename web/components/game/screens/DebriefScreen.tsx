'use client'

import { useRef, useState } from 'react'
import type { Mission, Target, MineralMeta, Client, RocketConfig } from '@/lib/data'
import { calibrateOnboardingPayout, clientAffinityBonus, rocketDisplayForConfig, starterRocketForConfig, MAX_AFFINITY_BONUS, loanInstalmentFor } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn } from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import MineralChip from '@/components/game/MineralChip'
import CostSummaryRow from '@/components/game/CostSummaryRow'
import { UI_ZONES } from '@/lib/ui-zones'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import { ScrapSequenceCanvas } from '@/components/game/ScrapSequenceCanvas'
import { formatCurrency } from '@/lib/format'
import ProgressBar from '@/components/ui/ProgressBar'
import StatRow from '@/components/ui/StatRow'

export default function DebriefScreen({ mission, target, cargo, onDone, minerals, clients, clientMissions, freeOperations, annotations, missionsDone, hasCoach, shipDestroyed, rocket, deliveryTargetName, loanDebt }: {
  mission: Mission
  target: Target
  cargo: Record<string, number>
  onDone: (total: number, affinity: number, consumed?: Record<string, number>) => void
  minerals: Record<string, MineralMeta>
  clients: Record<string, Client>
  clientMissions?: Record<string, number>
  freeOperations?: boolean
  annotations?: number
  missionsDone?: number
  hasCoach?: boolean
  shipDestroyed?: boolean
  rocket?: Pick<RocketConfig, 'chassis'>
  deliveryTargetName?: string
  /** Outstanding emergency-loan debt. Collecting this payout repays an instalment, so it is itemized rather than silently deducted (STS-542). */
  loanDebt?: number
}) {
  const [resolved, setResolved] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const collectingRef = useRef(false)
  // Single-use hull recovery (SR1-SR5 during M1-M3 onboarding) plays a scrap
  // animation right after cargo is resolved. Once reusable rockets ship
  // post-onboarding, gate this on that system's own flag instead of
  // `shipDestroyed` — a reusable hull shouldn't play this at all.
  const [scrapping, setScrapping] = useState(false)
  const rocketDisplay = rocketDisplayForConfig(rocket)
  const starterRocket = starterRocketForConfig(rocket)

  const delivered = Object.entries(mission.requires.minerals).every(([id, amount]) => (cargo[id] ?? 0) >= amount)
  const client = mission.client ? clients[mission.client] : undefined
  const isStoryMission = !mission.deliveryTargetId && (mission.tag === 'STORY' || mission.payload?.type === 'satellite')
  const completedJobs = client ? (clientMissions?.[client.id] ?? 0) : 0
  const affinityMultiplier = client && !isStoryMission ? clientAffinityBonus(client, completedJobs) : 0
  const affinityBonus = delivered ? Math.round(mission.payout.francs * affinityMultiplier) : 0
  const contractPayout = delivered ? mission.payout.francs + affinityBonus : 0
  const rawTotal = contractPayout
  const total = calibrateOnboardingPayout(rawTotal, missionsDone ?? 0)
  // Two-leg jobs (mine at targetId, drop at deliveryTargetId) are paid for both
  // services — split the flat contract payout into mining/transport lines so
  // that's visible, rather than implying it's a single flat fee.
  const isTwoLegJob = !!mission.deliveryTargetId
  const miningFee = isTwoLegJob ? Math.round(mission.payout.francs * 0.5) : 0
  const transportFee = isTwoLegJob ? mission.payout.francs - miningFee : 0
  // Repaid out of this payout the moment it is collected (see onDebriefDone),
  // so it belongs in the expense panel and in Net — not silently off the balance.
  const loanRepayment = loanInstalmentFor(loanDebt)
  const netTotal = total - starterRocket.costFrancs - loanRepayment

  return (
    <div className="game-screen debrief-screen">
      <TopBar eyebrow="MISSION COMPLETE" title="Debrief" />

      <div className={`screen-scroll${hasCoach ? ' screen-scroll--coach' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-ui-zone={UI_ZONES.screenContent}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', paddingTop: 16, paddingBottom: 8 }}>
          <div className="success-mark">✓</div>
          <h2 style={{ margin: '12px 0 4px', color: 'var(--ln-text)', font: '800 28px var(--ln-font-display)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {shipDestroyed ? 'Recovered' : 'Returned'}
          </h2>
          <p style={{ margin: 0, color: 'var(--ln-text-dim)', font: '11px var(--ln-font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {shipDestroyed ? `From ${target.name} · ship destroyed on Earth return` : `From ${target.name} · Sol III orbit re-entry`}
          </p>
        </div>

        {/* ── Client ───────────────────────────────────────────────────────── */}
        {client && !isStoryMission && (
          <Panel accent={client.color} surface="glass">
            <div className="ln-section-label" style={{ marginBottom: 10 }}>Client</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15,
                border: `1.5px solid ${client.color}`, background: 'rgba(0,0,0,0.25)', color: client.color,
              }}>
                {client.initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ln-text)' }}>{client.name}</div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-dim)', margin: '2px 0 8px', lineHeight: 1.4 }}>{client.projectType}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <ClientStat label="missions" value={String(completedJobs)} />
                  {client.payoutPremium > 0 && <ClientStat label="premium" value={`${Math.round(client.payoutPremium * 100)}%`} highlight />}
                  {affinityMultiplier > 0 && <ClientStat label="affinity" value={`+${(affinityMultiplier * 100).toFixed(1)}%`} />}
                </div>
                {client.affinityBonusPerMission > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ font: '700 8px var(--ln-font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
                        Affinity · +{(affinityMultiplier * 100).toFixed(1)}%
                      </span>
                      <span style={{ font: '700 8px var(--ln-font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
                        Cap +{Math.round(MAX_AFFINITY_BONUS * 100)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={affinityMultiplier}
                      max={MAX_AFFINITY_BONUS}
                      tone="amber"
                      height={4}
                      flat
                      label="Client affinity"
                    />
                  </div>
                )}
              </div>
            </div>
          </Panel>
        )}

        {/* ── Delivery receipt ─────────────────────────────────────────────── */}
        <Panel accent={delivered ? 'var(--ln-ok)' : 'var(--ln-crimson)'} surface="glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-dim)' }}>
              {mission.title}
            </span>
            <StatusPill kind={delivered ? 'ok' : 'crit'}>{delivered ? 'Delivered' : 'Incomplete'}</StatusPill>
          </div>
          {isTwoLegJob && deliveryTargetName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingBottom: 10 }}>
              <span style={{ font: '600 9px var(--ln-font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>Route</span>
              <span style={{ font: '700 10px var(--ln-font-display)', padding: '3px 10px', borderRadius: 4, background: 'rgba(112,217,234,0.06)', border: '1px solid rgba(112,217,234,0.12)', color: 'var(--ln-cyan)' }}>{target.name}</span>
              <span style={{ color: 'var(--ln-text-muted)', fontSize: 9 }}>→</span>
              <span style={{ font: '700 10px var(--ln-font-display)', padding: '3px 10px', borderRadius: 4, background: 'rgba(112,217,234,0.06)', border: '1px solid rgba(112,217,234,0.12)', color: 'var(--ln-cyan)' }}>{deliveryTargetName}</span>
            </div>
          )}
          {Object.entries(mission.requires.minerals).map(([id, required]) => {
            const m = minerals[id]
            const collected = Math.min(cargo[id] ?? 0, required)
            const done = collected >= required
            return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <MineralChip mineral={id} variant="avatar" size={22} />
                  <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, fontWeight: 700, color: 'var(--ln-text)' }}>{m?.name ?? id}</span>
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, color: 'var(--ln-text-dim)' }}>
                    {collected} / {required}
                  </span>
                </div>
                <StatusPill kind={done ? 'ok' : 'crit'}>{done ? 'Done' : `${required - collected} short`}</StatusPill>
              </div>
            )
          })}
        </Panel>

        {/* ── Contract payment + expenses/net ─────────────────────────────── */}
        {resolved && delivered && (
          <>
            <Panel accent="var(--ln-amber)" surface="glass" style={{ animation: 'unlock-in 0.35s ease-out' }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-dim)', marginBottom: 10 }}>
                Payout
              </div>
              {isTwoLegJob ? (
                <>
                  <PayRow label={`Mining fee · ${client?.name ?? 'Client'}`} value={miningFee} />
                  <PayRow label="Transport fee · relay delivery" value={transportFee} />
                </>
              ) : (
                <PayRow label={isStoryMission ? 'Mission funding' : `Order fulfillment · ${client?.name ?? 'Client'}`} value={mission.payout.francs} />
              )}
              {!isStoryMission && affinityBonus > 0 && <PayRow label="Affinity bonus" value={affinityBonus} />}
              {total > rawTotal && <PayRow label="Onboarding bonus" value={total - rawTotal} />}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(224,165,39,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ln-text-dim)' }}>
                  Total
                </span>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 28, fontWeight: 800, color: 'var(--ln-amber)', lineHeight: 1 }}>
                  {formatCurrency(total)}
                </span>
              </div>
            </Panel>

            <Panel accent="var(--ln-crimson)" surface="glass" style={{ animation: 'unlock-in 0.35s ease-out 0.1s both' }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-dim)', marginBottom: 10 }}>
                Rocket Cost &amp; Net
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <CostSummaryRow
                  label={`${starterRocket.name} · Vehicle Cost`}
                  value={formatCurrency(-starterRocket.costFrancs, { signed: true })}
                  color="var(--ln-crimson)"
                  last={loanRepayment === 0}
                />
                {loanRepayment > 0 && (
                  <CostSummaryRow
                    label={loanRepayment >= (loanDebt ?? 0) ? 'Loan repayment · debt cleared' : 'Loan repayment · instalment'}
                    value={formatCurrency(-loanRepayment, { signed: true })}
                    color="var(--ln-crimson)"
                    last
                  />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 4px', marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: shipDestroyed ? 'var(--ln-crimson)' : 'var(--ln-ok)' }} />
                <span style={{ fontFamily: 'var(--ln-font-body)', fontWeight: 500, fontSize: 11, color: 'var(--ln-text-dim)', lineHeight: 1.3 }}>
                  {shipDestroyed
                    ? <><strong style={{ color: 'var(--ln-text)' }}>Hull lost on re-entry</strong> · a fresh {starterRocket.name} is needed next mission</>
                    : <><strong style={{ color: 'var(--ln-text)' }}>Ship returned intact</strong> · ready for next mission</>}
                </span>
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,68,56,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
                  Net
                </span>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 24, fontWeight: 800, lineHeight: 1, color: netTotal >= 0 ? 'var(--ln-amber)' : 'var(--ln-crimson)' }}>
                  {formatCurrency(netTotal, { signed: true })}
                </span>
              </div>
            </Panel>
          </>
        )}
        {resolved && !delivered && (
          <>
            <Panel accent="var(--ln-crimson)" surface="glass" style={{ animation: 'unlock-in 0.35s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ln-text-dim)' }}>
                  Francs Earned
                </span>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 28, fontWeight: 800, color: 'var(--ln-text-muted)', lineHeight: 1 }}>
                  {formatCurrency(total)}
                </span>
              </div>
            </Panel>
            <Panel accent="var(--ln-crimson)" surface="glass">
            <p style={{ margin: 0, fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--ln-text)' }}>Contract bonus forfeited</strong> — order was not fully delivered. Return to the belt and mine the remaining ore to receive payment.
            </p>
            </Panel>
          </>
        )}
        {!delivered && !resolved && (
          <Panel accent="var(--ln-crimson)" surface="glass">
            <p style={{ margin: 0, fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', lineHeight: 1.5 }}>
              Contract bonus forfeited — order was not fully delivered. Return and mine more to receive payment.
            </p>
          </Panel>
        )}

      </div>

      <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions}>
        {hasCoach && <TutorialHighlight borderRadius={8} />}
        {!resolved ? (
          <PrimaryBtn
            kind={delivered ? 'amber' : 'cyan'}
            testId="resolve-cargo-btn"
            onClick={() => {
              setResolved(true)
              if (shipDestroyed) setScrapping(true)
            }}
          >
            {shipDestroyed ? 'Resolve Recovered Cargo' : 'Resolve Cargo'}
          </PrimaryBtn>
        ) : (
          <PrimaryBtn
            kind={delivered ? 'amber' : 'cyan'}
            testId="collect-reward-btn"
            disabled={collecting}
            onClick={() => {
              if (collectingRef.current) return
              collectingRef.current = true
              setCollecting(true)
              onDone(total, delivered ? mission.payout.affinity : 0, delivered ? mission.requires.minerals : {})
            }}
          >
            {delivered ? `Collect ${formatCurrency(total)}` : 'Return to Base'}
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
  // checks the collected total against (STS-539 policy).
  return <StatRow label={label} value={formatCurrency(value)} />
}

function ClientStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '4px 8px', borderRadius: 5,
      border: `1px solid ${highlight ? 'rgba(224,165,39,0.25)' : 'rgba(255,255,255,0.06)'}`,
      background: highlight ? 'rgba(224,165,39,0.06)' : 'rgba(255,255,255,0.03)',
    }}>
      <span style={{ color: 'var(--ln-text)', fontSize: 10 }}>{value}</span>
      <span style={{ color: 'var(--ln-text-muted)' }}>{label}</span>
    </span>
  )
}
