'use client'

import { useRef, useState } from 'react'
import type { Mission, Target, MineralMeta, Contractor } from '@/lib/data'
import { sellCargo, calibrateOnboardingPayout, contractorAffinityBonus } from '@/lib/data'
import Panel from '@/components/ui/Panel'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn } from '@/components/ui/Button'
import { UI_ZONES } from '@/lib/ui-zones'
import TutorialHighlight from '@/components/game/TutorialHighlight'

const DEBRIEF_GUIDE = [
  { label: 'RESOLVE CARGO', desc: 'Confirm your haul and see the full breakdown of mineral value, contract bonus, and any discovery reward.' },
  { label: 'COLLECT REWARD', desc: 'Transfer all earned Francs to your balance and complete the mission. Unlocks the next mission if available.' },
  { label: 'CONTRACT PAYOUT', desc: 'Bonus Francs paid by the contractor when you fully deliver the order. Zero if the order is incomplete.' },
  { label: 'MINERAL VALUE', desc: 'Market rate for every unit of ore in your cargo. You always receive this regardless of contract status.' },
]

export default function DebriefScreen({ mission, target, cargo, onDone, minerals, contractors, contractorMissions, freeOperations, annotations, missionsDone, hasCoach }: {
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
}) {
  const [step, setStep] = useState(0)
  const [guideOpen, setGuideOpen] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const collectingRef = useRef(false)
  const subtotal = sellCargo(cargo, minerals)
  const delivered = Object.entries(mission.requires.minerals).every(([id, amount]) => (cargo[id] ?? 0) >= amount)
  const contractor = contractors[mission.contractor]
  const affinityMultiplier = contractor ? contractorAffinityBonus(contractor, contractorMissions?.[contractor.id] ?? 0) : 0
  const affinityBonus = delivered ? Math.round(mission.payout.francs * affinityMultiplier) : 0
  const contractPayout = delivered ? mission.payout.francs + affinityBonus : 0
  const discoveryBonus = freeOperations ? Math.round(subtotal * (0.10 + 0.01 * (annotations ?? 0))) : 0
  const rawTotal = subtotal + contractPayout + discoveryBonus
  const total = calibrateOnboardingPayout(rawTotal, missionsDone ?? 0)

  return (
    <div className="game-screen debrief-screen">
      <TopBar eyebrow="MISSION COMPLETE" title="Debrief" />

      {guideOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(3,6,12,0.82)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 16, gap: 8 }} onClick={() => setGuideOpen(false)}>
          <div style={{ background: 'rgba(8,16,30,0.97)', border: '1px solid rgba(100,180,255,0.3)', borderRadius: 14, padding: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: '#87CFFA', textTransform: 'uppercase', marginBottom: 10 }}>Debrief Actions</div>
            {DEBRIEF_GUIDE.map(item => (
              <div key={item.label} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#f5a623', whiteSpace: 'nowrap', minWidth: 110 }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', lineHeight: 1.4 }}>{item.desc}</span>
              </div>
            ))}
            <button onClick={() => setGuideOpen(false)} style={{ marginTop: 4, width: '100%', padding: '8px 0', background: 'rgba(100,180,255,0.1)', border: '1px solid rgba(100,180,255,0.3)', borderRadius: 8, fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#87CFFA', cursor: 'pointer', textTransform: 'uppercase' }}>Close</button>
          </div>
        </div>
      )}
      <div className="screen-scroll debrief-scroll" data-ui-zone={UI_ZONES.screenContent}>
        <div className="success-mark">✓</div>
        <h2>Returned</h2>
        <p>From {target.name} · Sol III orbit re-entry</p>

        <Panel accent={delivered ? 'var(--ln-ok)' : 'var(--ln-crit)'}>
          <div className="order-heading"><span>{mission.title}</span><strong>{delivered ? 'Delivered' : 'Incomplete'}</strong></div>
          {Object.entries(cargo).map(([id, amount]) => (
            <div className="order-row" key={id}><span>{minerals[id].name} ×{amount}</span><strong>▲ {(minerals[id].price * amount).toLocaleString()}</strong></div>
          ))}
        </Panel>

        {step >= 1 && (
          <Panel accent="var(--ln-amber)" style={{ animation: 'unlock-in 0.4s ease-out' }}>
            <div className="reward-label">Francs Earned</div>
            <div className="order-row"><span>Mineral Value</span><strong>▲ {subtotal.toLocaleString()}</strong></div>
            {delivered && <div className="order-row"><span>Contract Payout</span><strong>▲ {mission.payout.francs.toLocaleString()}</strong></div>}
            {affinityBonus > 0 && <div className="order-row"><span>Contractor Affinity Bonus</span><strong>▲ {affinityBonus.toLocaleString()}</strong></div>}
            {discoveryBonus > 0 && (
              <>
                <div className="order-row"><span>Base Discovery (10%)</span><strong>▲ {Math.round(subtotal * 0.10).toLocaleString()}</strong></div>
                {(annotations ?? 0) > 0 && (
                  <div className="order-row"><span>Annotation Bonus ({annotations} × 1%)</span><strong>▲ {Math.round(subtotal * 0.01 * (annotations ?? 0)).toLocaleString()}</strong></div>
                )}
              </>
            )}
            <div className="reward-total">▲ {total.toLocaleString()}</div>
          </Panel>
        )}
      </div>
      <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions} style={{ position: 'relative' }}>
        {hasCoach && step === 1 && <TutorialHighlight borderRadius={8} />}
        {step === 0 ? (
          <PrimaryBtn kind="cyan" testId="resolve-cargo-btn" onClick={() => setStep(1)}>Resolve Cargo</PrimaryBtn>
        ) : (
          <PrimaryBtn
            kind="amber"
            testId="collect-reward-btn"
            disabled={collecting}
            onClick={() => {
              if (collectingRef.current) return
              collectingRef.current = true
              setCollecting(true)
              onDone(total, delivered ? mission.payout.affinity : 0, delivered ? mission.requires.minerals : {})
            }}
          >Collect Reward</PrimaryBtn>
        )}
        <button
          data-testid="debrief-guide-btn"
          onClick={() => setGuideOpen(o => !o)}
          style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(8,12,22,0.7)', border: '1px solid rgba(100,180,255,0.35)', fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#87CFFA', cursor: 'pointer', textTransform: 'uppercase' }}
        >
          ? Guide
        </button>
      </div>
    </div>
  )
}
