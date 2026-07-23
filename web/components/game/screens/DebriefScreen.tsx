'use client'

import { useRef, useState } from 'react'
import type { Mission, Target, MineralMeta, Contractor, RocketConfig } from '@/lib/data'
import { calibrateOnboardingPayout, contractorAffinityBonus, rocketDisplayForConfig } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn } from '@/components/ui/Button'
import { UI_ZONES } from '@/lib/ui-zones'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import { ScrapSequenceCanvas } from '@/components/game/ScrapSequenceCanvas'
import { formatFrancs } from '@/lib/format'

export default function DebriefScreen({ mission, target, cargo, onDone, minerals, contractors, contractorMissions, freeOperations, annotations, missionsDone, hasCoach, shipDestroyed, rocket }: {
  mission: Mission
  target: Target
  cargo: Record<string, number>
  onDone: (total: number, affinity: number, consumed?: Record<string, number>) => void
  minerals: Record<string, MineralMeta>
  contractors: Record<string, Contractor>
  contractorMissions?: Record<string, number>
  freeOperations?: boolean
  annotations?: number
  missionsDone?: number
  hasCoach?: boolean
  shipDestroyed?: boolean
  rocket?: Pick<RocketConfig, 'chassis'>
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

  const delivered = Object.entries(mission.requires.minerals).every(([id, amount]) => (cargo[id] ?? 0) >= amount)
  const contractor = mission.contractor ? contractors[mission.contractor] : undefined
  const isStoryMission = !mission.deliveryTargetId && (mission.tag === 'STORY' || mission.payload?.type === 'satellite')
  const affinityMultiplier = contractor && !isStoryMission ? contractorAffinityBonus(contractor, contractorMissions?.[contractor.id] ?? 0) : 0
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

        {/* ── Delivery receipt ─────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(8,14,26,0.7)',
          border: '1px solid var(--ln-hairline)',
          borderLeft: `3px solid ${delivered ? 'var(--ln-ok)' : 'var(--ln-crit)'}`,
          borderRadius: 12, padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-dim)' }}>
              {mission.title}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 5,
              background: delivered ? 'rgba(0,220,100,0.12)' : 'rgba(220,50,50,0.12)',
              border: `1px solid ${delivered ? 'rgba(0,220,100,0.3)' : 'rgba(220,50,50,0.3)'}`,
              fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: delivered ? 'var(--ln-ok)' : 'var(--ln-crit)',
            }}>
              {delivered ? 'Delivered' : 'Incomplete'}
            </span>
          </div>
          {Object.entries(mission.requires.minerals).map(([id, required]) => {
            const m = minerals[id]
            const collected = Math.min(cargo[id] ?? 0, required)
            const done = collected >= required
            return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text)' }}>{m?.name ?? id}</span>
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 12, color: 'var(--ln-text-dim)', marginLeft: 8 }}>
                    {collected} of {required} required
                  </span>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 5, flexShrink: 0, marginLeft: 12,
                  background: done ? 'rgba(0,220,100,0.12)' : 'rgba(220,50,50,0.12)',
                  border: `1px solid ${done ? 'rgba(0,220,100,0.3)' : 'rgba(220,50,50,0.3)'}`,
                  fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: done ? 'var(--ln-ok)' : 'var(--ln-crit)',
                }}>
                  {done ? 'Done' : `${required - collected} short`}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── Contract payment ─────────────────────────────────────────────── */}
        {resolved && (
          <div style={{
            background: 'rgba(8,14,26,0.7)',
            border: '1px solid var(--ln-hairline)',
            borderLeft: `3px solid ${delivered ? 'var(--ln-amber)' : 'var(--ln-crit)'}`,
            borderRadius: 12, padding: '12px 16px',
            animation: 'unlock-in 0.35s ease-out',
          }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-dim)', marginBottom: 10 }}>
              Francs Earned
            </div>
            {delivered ? (
              <>
                {isTwoLegJob ? (
                  <>
                    <PayRow label={`Mining fee · ${contractor?.name ?? 'Client'}`} value={miningFee} />
                    <PayRow label="Transport fee · relay delivery" value={transportFee} />
                  </>
                ) : (
                  <PayRow label={isStoryMission ? 'Mission funding' : `Order fulfillment · ${contractor?.name ?? 'Client'}`} value={mission.payout.francs} />
                )}
                {!isStoryMission && affinityBonus > 0 && <PayRow label="Affinity bonus" value={affinityBonus} />}
                {total > rawTotal && <PayRow label="Onboarding bonus" value={total - rawTotal} />}
              </>
            ) : (
              <p style={{ margin: 0, fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', lineHeight: 1.5 }}>
                Contract bonus forfeited — order was not fully delivered.
              </p>
            )}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(245,166,35,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ln-text-dim)' }}>
                Total
              </span>
              <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 28, fontWeight: 800, color: 'var(--ln-amber)', lineHeight: 1 }}>
                ▲ {formatFrancs(total)}
              </span>
            </div>
          </div>
        )}
        {!delivered && !resolved && (
          <div style={{
            background: 'rgba(8,14,26,0.7)',
            border: '1px solid rgba(220,50,50,0.2)',
            borderLeft: '3px solid var(--ln-crit)',
            borderRadius: 12, padding: '12px 16px',
          }}>
            <p style={{ margin: 0, fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', lineHeight: 1.5 }}>
              Contract bonus forfeited — order was not fully delivered. Return and mine more to receive payment.
            </p>
          </div>
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
            {delivered ? `Collect ▲ ${formatFrancs(total)}` : 'Return to Base'}
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
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 12, color: 'var(--ln-amber)' }}>▲ {formatFrancs(value)}</span>
    </div>
  )
}
